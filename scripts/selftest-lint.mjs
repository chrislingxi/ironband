// 静态安全区 lint: 全屏面板根 padding 与绝对定位角标按钮必须引用 env(safe-area-inset-*)。
// 这是「刘海遮挡」这类 bug 的确定性回归关 (无需浏览器, 极快)。
import { readFileSync, readdirSync } from 'node:fs';

const dir = 'src/game/ui';
const findings = [];
for (const f of readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
  const css = readFileSync(`${dir}/${f}`, 'utf8');
  // 1) 全屏面板 (position:absolute; inset:0) 的根规则需在 padding 里含左右安全区
  for (const m of css.matchAll(/#[\w-]+\s*\{[^}]*position:absolute;\s*inset:0;[^}]*\}/g)) {
    const block = m[0];
    if (/padding:/.test(block) && !/env\(safe-area-inset-(left|right)/.test(block)) {
      findings.push(`${f}: 全屏面板根缺少左右安全区 padding → 横屏刘海会遮挡 (${block.slice(0, 40)}…)`);
    }
  }
  // 2) 绝对定位的右上/左上角标 (close/x) 用固定 px 偏移而无安全区
  for (const m of css.matchAll(/\.(close|x)\s*\{[^}]*position:absolute;[^}]*\}/g)) {
    const block = m[0];
    const hasRight = /right:\s*(calc\([^)]*env\(safe-area-inset-right|[\d.]+px)/.test(block);
    if (/right:/.test(block) && !/env\(safe-area-inset-right/.test(block)) {
      findings.push(`${f}: 关闭按钮 right 偏移未含 env(safe-area-inset-right) → 横屏刘海下不可点`);
    }
    void hasRight;
  }
}

if (findings.length) {
  console.log('安全区 lint 发现问题:\n' + findings.map((x) => ' - ' + x).join('\n'));
  process.exit(1);
} else {
  console.log('安全区 lint 通过: 全屏面板与角标按钮均已适配刘海。');
}
