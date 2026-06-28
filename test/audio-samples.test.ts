import { describe, it, expect, vi, afterEach } from 'vitest';
import { decodeSample, SFX_BASENAMES, BGM_BASENAME } from '../src/engine/audio/samples.ts';

// 采样回退: 文件缺失 / 网络失败时 decodeSample 必须返回 null, 让 audio 层回退合成 (优雅降级)。
describe('音频采样层回退', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('fetch 404 → 返回 null (回退合成)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const ctx = { decodeAudioData: vi.fn() } as unknown as AudioContext;
    expect(await decodeSample(ctx, 'hit')).toBeNull();
  });

  it('fetch 抛错 → 返回 null 而非崩溃', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const ctx = { decodeAudioData: vi.fn() } as unknown as AudioContext;
    expect(await decodeSample(ctx, 'skill')).toBeNull();
  });

  it('解码成功 → 返回 AudioBuffer', async () => {
    const fakeBuf = { duration: 1 } as AudioBuffer;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }));
    const ctx = { decodeAudioData: (_b: ArrayBuffer, res: (b: AudioBuffer) => void) => res(fakeBuf) } as unknown as AudioContext;
    expect(await decodeSample(ctx, 'coin')).toBe(fakeBuf);
  });

  it('基名表覆盖全部短音效名 + BGM', () => {
    for (const k of ['hit', 'hurt', 'skill', 'pickup', 'coin', 'levelup', 'death', 'select']) {
      expect(SFX_BASENAMES[k]).toBeTruthy();
    }
    expect(BGM_BASENAME).toBe('bgm');
  });
});
