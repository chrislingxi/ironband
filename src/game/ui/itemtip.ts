// 共享物品 tooltip 渲染 (角色页 + 背包页共用)。含: 名称/基础/需求(不满足红)/词缀/套装/镶孔/符文之语/价值/职业适配。
import type { ItemInstance, RolledAffix } from '@game/systems/items/index.ts';
import { openSockets, matchRuneword } from '@game/systems/items/index.ts';
import { runeById } from '@game/data/runes.ts';
import { setById } from '@game/data/sets.ts';

export const RARITY_HEX: Record<string, string> = {
  normal: '#c8c8c8', magic: '#7a9cff', rare: '#ffe85a', set: '#33cc33', unique: '#c8945a',
};

const STAT_TPL: Record<string, string> = {
  maxhp: '+{v} 生命', maxmana: '+{v} 法力', tohit: '+{v} 命中', tohit_perc: '+{v}% 命中',
  defense: '+{v} 防御', defense_perc: '+{v}% 防御', mindam: '+{v} 最小伤害', maxdam: '+{v} 最大伤害',
  dmg_perc: '+{v}% 增强伤害', str: '+{v} 力量', dex: '+{v} 敏捷', vit: '+{v} 体能', energy: '+{v} 精力',
  res_fire: '+{v}% 火抗', res_cold: '+{v}% 冰抗', res_lght: '+{v}% 电抗', res_pois: '+{v}% 毒抗',
  res_all: '+{v}% 全抗', lifeleech: '{v}% 吸血', ias: '+{v}% 攻击速度', fhr: '+{v}% 受身恢复',
};
export function affixText(a: { stat: string; value: number }): string {
  return (STAT_TPL[a.stat] ?? `+{v} ${a.stat}`).replace('{v}', String(a.value));
}

// 职业适配提示: 按词缀倾向猜测最适合的职业 (法师=精力/法力, 战士=力量/增伤, 敏系=敏捷/命中)。
export function classHint(it: ItemInstance): string {
  let caster = 0, warrior = 0, ranger = 0;
  for (const a of it.affixes) {
    if (a.stat === 'energy' || a.stat === 'maxmana') caster += a.value;
    if (a.stat === 'str' || a.stat === 'maxdam' || a.stat === 'dmg_perc') warrior += a.value;
    if (a.stat === 'dex' || a.stat === 'tohit' || a.stat === 'tohit_perc') ranger += a.value;
  }
  if (it.base.reqStr && it.base.reqStr >= 18) warrior += 10; // 高力量需求偏战士
  const max = Math.max(caster, warrior, ranger);
  if (max < 3) return '通用';
  if (caster === max) return '法师友好';
  if (ranger === max) return '亚马逊友好';
  return '野蛮人友好';
}

export interface TipCtx { level: number; str: number; dex: number; value?: number }
function reqLine(label: string, need: number, have: number): string {
  const ok = have >= need;
  return `<span style="color:${ok ? '#9a8a66' : '#ff6a5a'}">${label} ${need}${ok ? '' : ` (当前 ${have})`}</span>`;
}

export function itemTip(it: ItemInstance, ctx?: TipCtx): string {
  const dispName = it.identified ? it.name : `${it.base.name} <span style="color:#caa24a">(未鉴定)</span>`;
  const dispColor = it.identified ? RARITY_HEX[it.rarity] : '#c8c8c8';
  const lines = [`<b style="color:${dispColor}">${dispName}</b>`, `<span style="opacity:.55">${it.base.name} (ilvl ${it.ilvl})</span>`];
  if (it.base.baseDamage) lines.push(`<span style="opacity:.7">伤害 ${it.base.baseDamage[0]}-${it.base.baseDamage[1]}</span>`);
  if (it.base.baseDefense) lines.push(`<span style="opacity:.7">防御 ${it.base.baseDefense[0]}-${it.base.baseDefense[1]}</span>`);
  const reqs: string[] = [];
  if (it.base.reqLevel > 1) reqs.push(reqLine('需要等级', it.base.reqLevel, ctx?.level ?? 99));
  if (it.base.reqStr) reqs.push(reqLine('需要力量', it.base.reqStr, ctx?.str ?? 999));
  if (it.base.reqDex) reqs.push(reqLine('需要敏捷', it.base.reqDex, ctx?.dex ?? 999));
  if (reqs.length) lines.push(reqs.join(' · '));
  if (!it.identified) {
    lines.push('<span style="opacity:.5">回营地鉴定后揭示属性</span>');
    if (ctx?.value) lines.push(`<span style="color:#c8a860">价值 ⦿${ctx.value}</span>`);
    return lines.join('<br>');
  }
  for (const a of it.affixes) lines.push(`<span style="color:#7a9cff">${affixText(a)}</span>`);
  if (it.setId) {
    const set = setById(it.setId);
    if (set) {
      lines.push(`<span style="color:#33cc33;font-weight:700">套装: ${set.name}</span>`);
      for (const tier of set.bonuses) {
        const mods = tier.mods.map((m) => affixText(m)).join(', ');
        lines.push(`<span style="color:#2a9e2a">${tier.count}件: ${mods}</span>`);
      }
    }
  }
  if (it.sockets && it.sockets > 0) {
    const filled = (it.socketed ?? []).map((id) => `<span style="color:#c8945a">●${runeById(id)?.name ?? '?'}</span>`);
    const empty = Array.from({ length: openSockets(it) }, () => '<span style="opacity:.4">○空孔</span>');
    lines.push(`<span style="opacity:.85">镶孔 ${[...filled, ...empty].join(' ')}</span>`);
    const rw = matchRuneword(it);
    if (rw) {
      lines.push(`<span style="color:#caa24a;font-weight:700">符文之语: ${rw.name}</span>`);
      for (const m of rw.mods) lines.push(`<span style="color:#caa24a">${affixText(m)}</span>`);
    }
  }
  lines.push(`<span style="opacity:.7">适合: ${classHint(it)}</span>`);
  if (ctx?.value) lines.push(`<span style="color:#c8a860">价值 ⦿${ctx.value}</span>`);
  return lines.join('<br>');
}

export type { RolledAffix };
