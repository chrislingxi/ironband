/* iso.test.js — 等距投影纯函数单测 (node --test)
   无 npm/vitest 工具链, 用 Node 内置 test runner 守护核心投影逻辑。 */
const test = require('node:test');
const assert = require('node:assert/strict');
const ISO = require('./iso.js');

const approx = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

test('worldToIso 2:1 菱形投影', () => {
  assert.deepEqual(ISO.worldToIso(0, 0), { x: 0, y: 0 });
  // 世界 +x (东) → 屏幕右下; 世界 +y (南) → 屏幕左下
  assert.deepEqual(ISO.worldToIso(64, 0), { x: 32, y: 16 });
  assert.deepEqual(ISO.worldToIso(0, 64), { x: -32, y: 16 });
  // 一格对角线(64,64) → 纯下方, x 抵消
  assert.deepEqual(ISO.worldToIso(64, 64), { x: 0, y: 32 });
});

test('isoToWorld 是 worldToIso 的逆', () => {
  for (const [wx, wy] of [[0, 0], [64, 0], [0, 64], [123, -45], [-777, 888], [1e4, 2e4]]) {
    const s = ISO.worldToIso(wx, wy);
    const w = ISO.isoToWorld(s.x, s.y);
    assert.ok(approx(w.x, wx) && approx(w.y, wy), `round-trip (${wx},${wy}) -> (${w.x},${w.y})`);
  }
});

test('depthKey 随屏幕纵深单调递增 (= worldToIso.y 的单调等价量)', () => {
  // 沿任意方向远离, x+y 增大 ⇔ 投影 y 增大 ⇔ 应画在更前
  const a = { x: 100, y: 100 }, b = { x: 100, y: 200 }, c = { x: 250, y: 60 };
  const k = p => ISO.depthKey(p.x, p.y), iy = p => ISO.worldToIso(p.x, p.y).y;
  const pts = [a, b, c].sort((p, q) => k(p) - k(q));
  for (let i = 1; i < pts.length; i++) assert.ok(iy(pts[i]) >= iy(pts[i - 1]), 'depthKey 与投影 y 同序');
});

test('angleToDir8 八向取整与环绕', () => {
  assert.equal(ISO.angleToDir8(0), 0);                 // 东
  assert.equal(ISO.angleToDir8(Math.PI / 4), 1);       // 东南
  assert.equal(ISO.angleToDir8(Math.PI / 2), 2);       // 南
  assert.equal(ISO.angleToDir8(Math.PI), 4);           // 西
  assert.equal(ISO.angleToDir8(-Math.PI / 2), 6);      // 北
  assert.equal(ISO.angleToDir8(2 * Math.PI), 0);       // 环绕回东
  assert.equal(ISO.angleToDir8(2 * Math.PI + 0.01), 0);
});
