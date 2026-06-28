// 采样加载层: 按名抓取 assets/audio/<name>.<ext> → decodeAudioData → 缓存 AudioBuffer。
// 命中则用真音效播放(见 audio.ts), 缺文件/解码失败则回退现有程序化合成。优雅降级零风险。
//
// 与渲染层的 loader.ts 同思路(按 key 找文件, 缺则回退), 不臆造素材存在性。
// 时间/随机不参与: 纯 IO + 解码, 失败静默。

// 短音效逻辑名 → 候选文件基名 (扩展名在加载时按 EXT 顺序探测)。
export const SFX_BASENAMES: Record<string, string> = {
  hit: 'hit', hurt: 'hurt', skill: 'skill', pickup: 'pickup',
  coin: 'coin', levelup: 'levelup', death: 'death', select: 'select',
};

// BGM 基名 (单曲循环; 后续可按幕扩成 bgm_act1 等)。
export const BGM_BASENAME = 'bgm';

// 资产根 (与部署一致: dist 下 assets/ 与 index.html 同级)。
const ROOT = 'assets/audio/';
// 浏览器普遍可解码的容器, 按优先级探测 (有谁算谁)。
const EXT = ['ogg', 'mp3', 'webm', 'wav'];

// 抓取 + 解码一个基名到 AudioBuffer; 逐个扩展名尝试, 全失败返回 null (静默回退)。
export async function decodeSample(ctx: AudioContext, basename: string): Promise<AudioBuffer | null> {
  for (const ext of EXT) {
    try {
      const res = await fetch(`${ROOT}${basename}.${ext}`);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      // decodeAudioData 在部分浏览器只支持回调式, 这里包一层兼容。
      const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
        const p = ctx.decodeAudioData(buf, resolve, reject) as unknown as Promise<AudioBuffer> | undefined;
        if (p && typeof p.then === 'function') p.then(resolve, reject);
      });
      if (decoded) return decoded;
    } catch {
      // 404 / 解码失败 / 网络错误 → 试下一个扩展名, 最终回退合成。
    }
  }
  return null;
}
