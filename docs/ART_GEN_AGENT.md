# Mac 端美术生成会话 · Prompt

把下面 `===` 之间整段，粘进 **Mac 上一个独立的 Claude Code 会话**（仓库已 clone、在
`claude/game-art-requirements-prompt-uoakkz` 分支、Chrome 已登录 ChatGPT）。该会话会用
Chrome 自动驱动 ChatGPT 出图、去背裁切压缩、落到 `public/assets/`、自动提交开 PR。

前置（人工一次性确认）：
- Chrome 正在运行，已登录 `chatgpt.com`，当前模型支持「生成图片 / create image」。
- Python 可用，允许会话自行 `pip install rembg pillow pngquant-cli`（或 `brew install pngquant`）。
- Claude Code 已开启浏览器控制（chrome-in-claude / computer use）。

---

```
你是本仓库（Ironband，D2 风格等距 ARPG）的美术生产会话。你的工作：用 Chrome 驱动已登录的
ChatGPT 网页批量出图，自动后处理，落到 public/assets/，最后提交并开 PR。全程自动，遇到
真正的歧义或反复失败再停下问我。

== 单一事实源 ==
读 docs/ART_ASSETS.md，它是 worklist：包含每张素材的 key、文件路径、尺寸、内容描述、
风格前缀、输出规格与「自动后处理」规则。读 docs/ART_GEN_AGENT.md（本文件）了解流程细节。
任何清单/尺寸/路径冲突，以 docs/ART_ASSETS.md 为准。

== 范围与顺序 ==
1. 默认只做 A 组（✅ 即插即用）：char/ (3) + mon/ 含 Boss (13) + tile/ (5)，共 21 张。
   这组放图即在游戏里生效，先把它做完并提交，验证整条链路。
2. A 组全部成功并提交后，继续做 B 组（npc/ ui/ item/，27 张）。B 组出图先落地，
   显示需代码侧接线（见 docs/ART_ASSETS.md 第 7 节），不影响你出图与提交。
3. C 组（技能图标）本批不做。

== 断点续跑 ==
每次开工先扫 public/assets/，已存在且尺寸合规的 key 跳过。被中断后重跑可继续。

== 每张素材的流程 ==
对清单里每个待做 key：
1) 组装 prompt = docs/ART_ASSETS.md 第 2 节「通用风格前缀」+ 该项「内容描述」+ 对应类别的
   「输出要求」（tile/item 用各自专属前缀，见该文档第 3D/3G 与附录）。
2) 在 ChatGPT 网页：开新对话（避免上下文串味），把 prompt 贴进输入框，发送。
3) 等图生成完成（轮询页面，直到出现生成结果图与下载按钮；典型 10–40s，最多等 120s）。
4) 取图：优先点图片的下载按钮拿原图；拿不到就对图片元素的包围盒精确截图。存到 art-raw/<key>.png。
5) 后处理（按 docs/ART_ASSETS.md 第 4 节该类别规则），用 Python：
   - 主体类(char/mon/Boss/npc/item)：rembg 去背 → 按 alpha 包围盒裁切 → 补成正方形 →
     缩放到目标尺寸(char/mon/npc=512²、Boss=768²、item=128²) → pngquant 压到 <300KB。
   - tile：中心裁切方形 → 缩放 256×128 → 套 2:1 菱形 alpha 蒙版(四角透明) → 压缩。
   - ui/hp_orb·mana_orb·btn_frame：rembg(btn_frame 保留中央镂空) → 256² → 压缩。
   - ui/panel：缩放 512²，勿裁掉金属边框(九宫格) → 压缩。
   - 菱形蒙版与去背写成可复用的小脚本放 scripts/art_postprocess.py，反复调用。
6) 质检：输出须是 PNG、含 alpha、尺寸正确；主体 alpha 占比 < 5% 视为抠空 → 不提交该张，
   记入「待复核」清单，继续下一张。
7) 落地：写到 public/assets/<key>.png（路径大小写必须与 docs/ART_ASSETS.md 完全一致）。

== 提交与 PR ==
- A 组做完（成功的那些）→ git add public/assets → commit：
  "feat(art): A组真实精灵图(角色/怪物/Boss/地砖)" → git push -u origin
  claude/game-art-requirements-prompt-uoakkz（失败按指数退避 2/4/8/16s 重试至多 4 次）。
- 本分支若无 PR 则开一个 **draft** PR；已有则只推不重复开。
- B 组做完后再追加一个 commit 并推。
- art-raw/ 是中间产物，不要提交（必要时加进 .gitignore）。

== 报告 ==
每组结束给我一行式汇总：成功 key 列表、跳过(已存在)、待复核(抠空/失败)及原因。
不要逐张刷屏；只在「整组完成」或「卡住需要我决定」时找我。

== 出错与停下的边界 ==
- ChatGPT 拒绝/限流/要重登 → 停下告诉我，不要绕过登录或改 TLS。
- 同一张连续失败 3 次 → 跳过记入待复核，继续别的，最后一并报。
- 需要改本仓库 src 代码（B/C 组接线）不归你做，只管出图落地。
```

---

## 设计要点（给你/我看，不必粘给 Mac 会话）

- **为什么先 A 组**：只有 `char/ mon/ tile/` 走了 `tryLoadTexture`，放图即在游戏里可见，能立刻
  端到端验证 Chrome→出图→去背→菱形蒙版→提交→PR 整条链路；B 组要等代码接线才显示。
- **透明背景**：ChatGPT 网页不出 alpha，统一「纯色背景 + rembg 去背」；tile 不是抠主体，而是
  程序化套 2:1 菱形蒙版做四角透明。
- **部署**：图进 `public/assets/`；合并到 `main` 后 `build-site.yml` 自动 rsync 到根 `assets/`
  上线，PNG 不进 index.html，无需重建。
