/* iso.js — 真等距投影纯函数 (T1: 真等距渲染 + FLARE 整合)
   玩法/物理保持笛卡尔世界坐标 (px); 仅渲染与输入用这里的纯函数做等距投影。
   单一真源: 浏览器挂 window.ISO_MATH, Node 走 module.exports (供 Vitest/node:test)。
   2:1 菱形: 世界方块 TILE×TILE → 屏幕菱形 TILE×(TILE/2)。 */
(function(root){
  'use strict';
  const KX = 0.5, KY = 0.25;            // 投影系数 (worldToIso 线性映射)
  const TAU = Math.PI * 2;

  // 世界(wx,wy) → 屏幕等距(相机前). x=(wx-wy)*KX, y=(wx+wy)*KY
  function worldToIso(wx, wy){ return { x: (wx - wy) * KX, y: (wx + wy) * KY }; }

  // 屏幕等距(相机前) → 世界. worldToIso 的逆变换 (点击/摇杆逆投影用)
  function isoToWorld(sx, sy){
    const a = sx / KX, b = sy / KY;     // a = wx-wy, b = wx+wy
    return { x: (a + b) / 2, y: (b - a) / 2 };
  }

  // 深度键: 越大越靠前(靠屏幕下方)。等距 y 排序的单调等价量, 实体层用它排序。
  function depthKey(wx, wy){ return wx + wy; }

  // 世界朝向角 → 8 向精灵索引 (E,SE,S,SW,W,NW,N,NE = 0..7)。FLARE 多向裁帧用。
  function angleToDir8(ang){
    let i = Math.round((((ang % TAU) + TAU) % TAU) / (TAU / 8));
    return ((i % 8) + 8) % 8;
  }

  const API = { KX, KY, worldToIso, isoToWorld, depthKey, angleToDir8 };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.ISO_MATH = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
