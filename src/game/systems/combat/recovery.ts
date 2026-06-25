// 受身/硬直 (Faster Hit Recovery). D2 动画提速公式:
//   animSpeed = floor(256 · (100 + FHR)/100)
//   framesEff = ceil(baseFrames · 256 / animSpeed) - 1
// 逐职业 FHR 突破点表是后续数据任务; 本函数给出连续近似 (FHR 越高帧越少, 单调).
export function hitRecoveryFrames(baseFrames: number, fhr: number): number {
  const animSpeed = Math.floor((256 * (100 + Math.max(0, fhr))) / 100);
  const eff = Math.ceil((baseFrames * 256) / animSpeed) - 1;
  return Math.max(1, eff);
}

export function hitRecoverySeconds(baseFrames: number, fhr: number, fps = 25): number {
  return hitRecoveryFrames(baseFrames, fhr) / fps;
}
