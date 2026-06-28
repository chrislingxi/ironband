// 程序化音频引擎 (零素材, 纯 WebAudio 合成).
//
// 设计目标:
//  - 不加载任何外部音频文件, 全部用振荡器 / 白噪声 + 包络实时合成.
//  - 哥特黑暗氛围: 低沉失谐 drone, 缓慢 LFO 呼吸, 极低音量不喧宾夺主.
//  - 对浏览器自动播放策略友好: 延迟创建 AudioContext, 首个用户手势后 unlock().
//  - 严格 tsc 友好: AudioContext 可能不存在(SSR / 无 DOM), 全程做空守卫.
//
// 时间来源全部走 ctx.currentTime (WebAudio 时钟), 不依赖 Date.now().
// Math.random 仅用于音色微扰(失谐 / 起音抖动), 不参与任何游戏逻辑.

// 可发出的短音效名集合.
export type SfxName =
  | 'hit'      // 打击命中: 短促噪声爆
  | 'skill'    // 释放技能: 下扫方波
  | 'pickup'   // 拾取物品: 上行正弦双音
  | 'levelup'  // 升级: 上行琶音
  | 'death'    // 死亡: 低频下坠
  | 'hurt'     // 受伤: 低噪短爆
  | 'coin'     // 金币: 上行正弦双音(更清亮)
  | 'select';  // 界面选择: 清脆点击

import { decodeSample, SFX_BASENAMES, BGM_BASENAME } from './samples.ts';

// 跨浏览器 AudioContext 构造器(含旧 Safari 的 webkit 前缀).
type AudioCtor = typeof AudioContext;

function resolveAudioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null;
  // 标准 AudioContext, 退回 webkit 前缀.
  const w = window as unknown as {
    AudioContext?: AudioCtor;
    webkitAudioContext?: AudioCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export class GameAudio {
  // 延迟创建: 在首个用户手势(unlock)前保持 null, 避免被浏览器挂起.
  private ctx: AudioContext | null = null;
  // 主增益: 所有声音的总出口, 受 setVolume / setEnabled 控制.
  private master: GainNode | null = null;

  // 背景氛围节点(drone). 启动后常驻, stopBgm 时拆除.
  private bgmGain: GainNode | null = null;
  private bgmOsc: OscillatorNode[] = [];
  private bgmLfo: OscillatorNode[] = [];
  private bgmFilter: BiquadFilterNode | null = null;

  private _enabled = true;
  private _volume = 0.6; // 主音量 0..1.
  private bgmRunning = false;

  // 采样层: 命中真音效(assets/audio/<name>.<ext>)则优先播放, 缺则回退合成。
  private samples = new Map<string, AudioBuffer>();
  private samplesPreloaded = false;
  private bgmSampleSrc: AudioBufferSourceNode | null = null;

  // 构造时不创建 AudioContext, 只解析构造器. 真正实例化推迟到 unlock().
  private readonly Ctor: AudioCtor | null;

  constructor() {
    this.Ctor = resolveAudioCtor();
  }

  // 是否启用. 关闭则静音且不再合成发声.
  get enabled(): boolean {
    return this._enabled;
  }

  // 解锁音频: 应在首个 pointerdown / 用户手势中调用.
  // iOS / 部分浏览器要求 AudioContext 在手势内 resume 才能出声.
  unlock(): void {
    if (!this.Ctor) return;
    if (!this.ctx) {
      this.ctx = new this.Ctor();
      // 主增益链: master -> destination.
      this.master = this.ctx.createGain();
      this.master.gain.value = this._enabled ? this._volume : 0;
      this.master.connect(this.ctx.destination);
    }
    // resume 返回 Promise, 这里无需等待(吞掉拒绝, 避免未处理拒绝告警).
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }
    // 首次解锁后异步预载采样(有真音效文件则用之, 全缺则保持合成, 不阻塞).
    this.preloadSamples();
  }

  // 预载 assets/audio 下的真音效到缓存; 全部失败则采样层为空, sfx/bgm 自动回退合成。
  private preloadSamples(): void {
    if (this.samplesPreloaded) return;
    const ctx = this.ctx;
    if (!ctx) return;
    this.samplesPreloaded = true;
    const want: Array<[string, string]> = Object.entries(SFX_BASENAMES);
    want.push(['__bgm', BGM_BASENAME]);
    for (const [name, base] of want) {
      void decodeSample(ctx, base).then((buf) => { if (buf) this.samples.set(name, buf); }).catch(() => undefined);
    }
  }

  // 用已加载采样播放一次; 无采样返回 false 让调用方回退合成。
  private playSample(name: string, gain = 1): boolean {
    const ctx = this.ctx;
    const master = this.master;
    const buf = this.samples.get(name);
    if (!ctx || !master || !buf) return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(master);
    src.start(ctx.currentTime);
    src.onended = () => { src.disconnect(); g.disconnect(); };
    return true;
  }

  // 设置启用状态. 关闭时立即把主增益拉到 0(平滑), 但不销毁 BGM 节点.
  setEnabled(b: boolean): void {
    this._enabled = b;
    this.applyMasterGain();
  }

  // 设置主音量 0..1(自动夹取). 启用时立即平滑生效.
  setVolume(v: number): void {
    this._volume = v < 0 ? 0 : v > 1 ? 1 : v;
    this.applyMasterGain();
  }

  // 把当前 enabled/volume 平滑写入主增益, 避免突变产生爆音.
  private applyMasterGain(): void {
    if (!this.ctx || !this.master) return;
    const target = this._enabled ? this._volume : 0;
    const now = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(target, now + 0.05);
  }

  // 合成并播放一个短音效. 未解锁 / 已禁用 / 无上下文则静默返回.
  sfx(name: SfxName): void {
    if (!this._enabled) return;
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    // 优先真音效采样; 缺文件则走下面的程序化合成。
    if (this.playSample(name)) return;
    const t = ctx.currentTime;

    switch (name) {
      case 'hit':
        // 短促噪声爆 + 低频体感 thump: 噪声给"金属/血肉"质感, 低频正弦给"重量", 合起来更扎实不单薄.
        this.noiseBurst(t, 0.09, 1200, 0.55, 0.55);
        this.tone(t, 'sine', 190, 72, 0.12, 0.34, 420);
        break;
      case 'hurt':
        // 受伤: 更低沉的噪声短爆, 偏闷.
        this.noiseBurst(t, 0.12, 480, 0.9, 0.45);
        break;
      case 'skill': {
        // 下扫方波 + 谐音层 + 噪声呼啸: 三层叠加, 让"放技能"厚而有能量感, 不再单薄.
        const f0 = 660 + (Math.random() - 0.5) * 40; // 微扰避免机械感.
        this.tone(t, 'square', f0, 110, 0.22, 0.28, 1400);
        this.tone(t, 'sine', f0 * 1.5, 240, 0.2, 0.14, 2200);  // 五度谐音, 增亮
        this.noiseBurst(t, 0.18, 760, 0.7, 0.16);              // 释放呼啸尾
        break;
      }
      case 'pickup':
        // 拾取: 上行正弦双音(柔和).
        this.tone(t, 'sine', 520, 520, 0.08, 0.3);
        this.tone(t + 0.07, 'sine', 780, 780, 0.1, 0.28);
        break;
      case 'coin':
        // 金币: 上行正弦双音, 更高更亮.
        this.tone(t, 'sine', 880, 880, 0.06, 0.32);
        this.tone(t + 0.05, 'sine', 1320, 1320, 0.09, 0.3);
        break;
      case 'levelup': {
        // 升级: 上行琶音(小调上行, 庄严), 三音 + 收尾长音.
        const root = 392; // G4 附近.
        const steps = [1, 1.2, 1.5, 2]; // 近似小三/五度上行.
        for (let i = 0; i < steps.length; i++) {
          const last = i === steps.length - 1;
          this.tone(
            t + i * 0.1,
            'triangle',
            root * steps[i],
            root * steps[i],
            last ? 0.4 : 0.12,
            last ? 0.3 : 0.26,
          );
        }
        // 收尾高频闪光: 庄严之上加一缕"升华"亮音.
        this.tone(t + 0.32, 'sine', root * 3, root * 4, 0.5, 0.12);
        break;
      }
      case 'death':
        // 死亡: 低频下坠, 由低频继续下滑到极低, 缓慢消亡.
        this.tone(t, 'sine', 220, 40, 0.9, 0.5);
        this.tone(t, 'triangle', 110, 28, 0.9, 0.3);
        break;
      case 'select':
        // 界面选择: 极短清脆点击(高频三角 + 快包络).
        this.tone(t, 'triangle', 1500, 1700, 0.04, 0.25);
        break;
    }
  }

  // 单振荡器音 + 频率滑音 + ADSR 简化包络(快起快落).
  // type: 波形; fFrom/fTo: 起止频率; dur: 时长; peak: 峰值增益; lpHz: 可选低通.
  private tone(
    when: number,
    type: OscillatorType,
    fFrom: number,
    fTo: number,
    dur: number,
    peak: number,
    lpHz?: number,
  ): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    const osc = ctx.createOscillator();
    osc.type = type;
    const env = ctx.createGain();
    env.gain.value = 0;

    // 频率滑音: 用指数滑音更接近自然音高变化(频率须 > 0).
    osc.frequency.setValueAtTime(Math.max(1, fFrom), when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, fTo), when + dur);

    // 包络: 极短起音, 指数衰减到近零(避免 0 触发 exponential 异常).
    const a = Math.min(0.01, dur * 0.2);
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(peak, when + a);
    env.gain.exponentialRampToValueAtTime(0.0001, when + dur);

    let tail: AudioNode = env;
    osc.connect(env);

    // 可选低通让音色更"暗".
    if (lpHz !== undefined) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = lpHz;
      env.connect(lp);
      tail = lp;
    }

    tail.connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.02);
    // 结束后自动断开释放(节点用后即弃).
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
  }

  // 白噪声爆: 一段带通/低通噪声 + 快包络. 用于打击 / 受伤.
  // dur: 时长; centerHz: 滤波中心; q: 品质因数(越大越窄越"金属"); peak: 峰值增益.
  private noiseBurst(
    when: number,
    dur: number,
    centerHz: number,
    q: number,
    peak: number,
  ): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    // 临时生成一小段白噪声缓冲(时长足够覆盖本次爆音).
    const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      // Math.random 仅作噪声源, 不影响游戏确定性.
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = centerHz;
    bp.Q.value = q;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(peak, when + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, when + dur);

    src.connect(bp);
    bp.connect(env);
    env.connect(master);

    src.start(when);
    src.stop(when + dur + 0.02);
    src.onended = () => {
      src.disconnect();
      bp.disconnect();
      env.disconnect();
    };
  }

  // 启动低沉哥特氛围 drone.
  // 2~3 个失谐振荡器叠成厚重低音, 经低通滤波后由缓慢 LFO 调制音量/截止频率.
  startBgm(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    if (this.bgmRunning) return;
    this.bgmRunning = true;

    // 有 BGM 采样(assets/audio/bgm.*)则循环播放真音乐, 不再合成 drone。
    const bgmBuf = this.samples.get('__bgm');
    if (bgmBuf) {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 3);
      const src = ctx.createBufferSource();
      src.buffer = bgmBuf;
      src.loop = true;
      src.connect(gain);
      gain.connect(master);
      src.start(ctx.currentTime);
      this.bgmSampleSrc = src;
      this.bgmGain = gain;
      return;
    }

    // BGM 总增益(极低, 仅作氛围底噪).
    const bgmGain = ctx.createGain();
    bgmGain.gain.value = 0;

    // 低通滤波: 让 drone 暗沉, 截止频率由 LFO 缓慢扫动制造"呼吸".
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 1.2;

    // 三个略微失谐的低频振荡器(根音 + 失谐 + 五度), 形成阴郁不协和的厚墙.
    const base = 55; // A1 附近, 极低.
    const partials: Array<{ type: OscillatorType; mult: number; detune: number }> = [
      { type: 'sawtooth', mult: 1, detune: -7 },
      { type: 'sawtooth', mult: 1, detune: +9 },
      { type: 'triangle', mult: 1.5, detune: -4 }, // 五度泛音, 增加哥特感.
    ];

    for (const p of partials) {
      const osc = ctx.createOscillator();
      osc.type = p.type;
      osc.frequency.value = base * p.mult;
      // 叠加细微随机失谐, 避免静止的电子味.
      osc.detune.value = p.detune + (Math.random() - 0.5) * 4;
      osc.connect(filter);
      osc.start();
      this.bgmOsc.push(osc);
    }

    filter.connect(bgmGain);
    bgmGain.connect(master);

    // LFO #1: 缓慢调制 BGM 音量(呼吸感), 周期约 11 秒.
    const ampLfo = ctx.createOscillator();
    ampLfo.type = 'sine';
    ampLfo.frequency.value = 1 / 11;
    const ampDepth = ctx.createGain();
    ampDepth.gain.value = 0.012; // 调制深度(围绕基准音量).
    ampLfo.connect(ampDepth);
    ampDepth.connect(bgmGain.gain);
    ampLfo.start();

    // LFO #2: 更慢地扫动低通截止频率(约 17 秒), 让音色明暗起伏.
    const filterLfo = ctx.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.value = 1 / 17;
    const filterDepth = ctx.createGain();
    filterDepth.gain.value = 180; // ±180Hz 的截止扫动.
    filterLfo.connect(filterDepth);
    filterDepth.connect(filter.frequency);
    filterLfo.start();

    this.bgmLfo.push(ampLfo, filterLfo);

    // 基准音量极低, 缓慢淡入(4 秒)避免突兀.
    const now = ctx.currentTime;
    bgmGain.gain.setValueAtTime(0, now);
    bgmGain.gain.linearRampToValueAtTime(0.03, now + 4);

    this.bgmGain = bgmGain;
    this.bgmFilter = filter;
  }

  // 停止背景氛围: 缓慢淡出后拆除所有 BGM 节点.
  stopBgm(): void {
    const ctx = this.ctx;
    if (!ctx || !this.bgmRunning) return;
    this.bgmRunning = false;

    const now = ctx.currentTime;
    const fade = 1.5;

    // 采样 BGM: 淡出后停止 source, 拆增益。
    if (this.bgmSampleSrc) {
      const src = this.bgmSampleSrc;
      const gain = this.bgmGain;
      this.bgmSampleSrc = null;
      this.bgmGain = null;
      if (gain) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fade);
      }
      src.stop(now + fade + 0.05);
      src.onended = () => { src.disconnect(); if (gain) gain.disconnect(); };
      return;
    }

    // 先淡出主 BGM 增益.
    if (this.bgmGain) {
      const g = this.bgmGain.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0, now + fade);
    }

    // 捕获引用供延迟停止使用, 随后清空成员.
    const oscs = this.bgmOsc;
    const lfos = this.bgmLfo;
    const gain = this.bgmGain;
    const filter = this.bgmFilter;
    this.bgmOsc = [];
    this.bgmLfo = [];
    this.bgmGain = null;
    this.bgmFilter = null;

    const stopAt = now + fade + 0.05;
    for (const o of oscs) {
      o.stop(stopAt);
      o.onended = () => o.disconnect();
    }
    for (const l of lfos) {
      l.stop(stopAt);
      l.onended = () => l.disconnect();
    }
    // 滤波/增益节点在振荡器停止后随 GC 回收; 这里在最后一个 osc 结束时断开.
    if (oscs.length > 0) {
      oscs[oscs.length - 1].onended = () => {
        for (const o of oscs) o.disconnect();
        if (filter) filter.disconnect();
        if (gain) gain.disconnect();
      };
    }
  }
}
