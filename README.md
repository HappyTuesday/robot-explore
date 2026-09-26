# 小小探险家 · Robot Explore

面向儿童的独立小游戏平台。React 19 + TypeScript + Vite，原创 SVG 插画、CSS 动效，支持 PC、iPad 和手机触屏。

## 运行

```sh
npm install
npm run dev
```

默认开发地址为 `http://localhost:5173`；同一 Wi-Fi 下的 iPad 可以访问电脑局域网 IP 的 5173 端口。

```sh
npm run build        # TypeScript 检查 + 生产构建
npm run preview      # 本地预览构建
npm test             # 核心规则自动测试
npm run test:e2e     # 端到端测试，使用本机 Chrome 与 Playwright WebKit
```

端到端测试前请安装 Google Chrome，并执行 `npx playwright install webkit`。测试覆盖桌面 Chrome、手机触屏和 iPad WebKit。

## GitHub Pages 部署

已配置 `.github/workflows/deploy-pages.yml`：向 `main` 推送时自动运行单元测试、构建并部署；指向 `main` 的 Pull Request 只运行测试和构建。也可以在 Actions 页面手动运行 workflow，部署仅允许 `main` 分支。

首次启用：

1. 在 GitHub 仓库 **Settings → Pages → Build and deployment** 中，将 **Source** 设置为 **GitHub Actions**。
2. 将代码及 workflow 推送到 `main`，或在 **Actions → Build and deploy to GitHub Pages → Run workflow** 中选择 `main` 运行。
3. 部署成功后访问 `https://happytuesday.github.io/robot-explore/`，实际地址以部署任务输出为准。

构建使用 Node.js 22、`npm ci` 和 `npm run build`，发布目录为 `dist/`，无需额外配置部署密钥。Vite 使用相对资源路径，Web App Manifest 也使用相对入口，支持 GitHub Pages 的仓库子路径；Hash 路由无需额外的 404 回退页面。

## 页面

- `/#/`：游戏大厅
- `/#/games/energy`：彩虹能量迷宫
- `/#/games/ocean`：深海单词寻宝
- `/#/achievements`：本机成就

彩虹能量迷宫和深海单词寻宝可游玩；星际记忆站仍为未来游戏预告。

## 玩法

从左上角走到右下角，只能上下左右移动。支持点击相邻格子、触屏方向按钮、方向键和 WASD。没有倒计时。

- 初始能量 60，上限 100；绿色格子 +15，橙色格子扣 20～40（随关卡递增）。每格效果只触发一次，不能反复刷能量。
- 紫色怪兽触发分级的 20 以内加减法，先用彩色数量图形和“数一数 / 凑十法 / 拆分法 / 想双倍”提示引导计算。第一次选错会温和标记并保留挑战，第二次仍错才会爆炸；答对后才进入怪兽格。
- 可放弃挑战，扣 1 点能量、留在原格，怪兽不会消失，不增加步数或战胜数量。
- 到达终点根据剩余能量获得 1～3 颗星：≥70 获得 3 星，≥35 获得 2 星，否则 1 星。
- 3 种地图尺寸：4×5、5×6、6×7；共 9 个渐进关卡。地图使用种子生成并保证存在能量足够的路径；重试保留原地图，下一关或更换难度会生成新地图。
- 音效由 Web Audio 合成，通关有旋律、掌声和可用时的中文语音欢呼。浏览器首次交互后启用，可在顶部静音；移动和挑战提示音的峰值增益由 0.11 提高到 0.22，同时增强掌声与中文欢呼。
- 成就和音效偏好保存在 localStorage；不收集个人数据。当前局进度保存在内存，刷新会重置本局。
- 支持减少动态效果偏好、键盘焦点管理、弹窗焦点限制及屏幕阅读器状态提示。

## 深海单词寻宝

- 海底沙地、珊瑚与章鱼守卫，潜水机器人走格子寻找宝箱。初始能量 60，氧气泡 +15，海流消耗 20～40；每格效果只触发一次。
- 63 个具体名词、9 关：1～3 关动物与水果，4～6 关食物、交通工具及日用品，7～9 关混合复习并优先复现错词。
- 看英文，从四张图片中选择对应物品。答对才进入守卫格，并展示中英文；答错扣 10 点能量，同题重试，已选错图片禁用。放弃扣 1 点，留在原地。
- 绕过所有守卫时，终点宝箱仍需答对一次单词题才能开启。地图大小与原游戏一致，支持键盘、点击与触屏。
- 图片加载成功前禁用作答；失败时提供重载及放弃入口。词卡采用本地图片，无外部图片请求。
- 点击喇叭可使用浏览器英文语音（取决于设备语音支持）；关闭声音后不朗读。没有语音也可以正常完成游戏。
- 英语进度独立保存在 `little-explorer-ocean-v1`：通关、星星、答对次数、认识的单词、待复习词及最高解锁关。数学记录与成就不受影响；刷新后从最高解锁关重新开始，当前局地图不持久化。
- `src/game/ocean/` 为词库、规则和存档；`src/pages/OceanGame.tsx` 为独立页面，`src/components/WordChallenge.tsx` 为图片挑战。
- 插画制作规范见 `docs/ocean-illustrations.md`，63 个提示词见 `docs/ocean-image-prompts.jsonl`。图像 API 仅用于离线制作素材，游戏运行时不调用 API，也不包含密钥。

## 横竖屏与屏幕适配

- 游戏页占满动态可用视口（`100dvh`），棋盘根据实际可用宽度和高度计算格子尺寸；三种地图均保持完整显示，不依靠裁切来隐藏滚动条。
- iPad 横竖屏自动适配，旋转和窗口缩放保留当前局进度；手机竖屏使用底部紧凑操作区，横屏将操作区放在右侧。
- 使用浏览器可用区域自动排版，不提供浏览器全屏按钮，也不自动调用全屏 API；增大棋盘可用面积与能量、步数、战胜怪兽的文字尺寸。机器人当前格不显示边框、轮廓或格子阴影。
- 提供 Web App Manifest 与 Apple Web App 元信息，可通过 Safari“分享 → 添加到主屏幕”以独立窗口打开；未实现离线缓存。
- 自动测试在独立的生产预览服务（4175 端口）运行，避免开发服务热更新打断测试。覆盖 8 种横竖屏尺寸、全部地图难度、弹窗布局、放弃挑战及不调用浏览器全屏的行为。

## 结构

- `src/game/engine.ts`：独立、可测试的游戏规则和地图生成
- `src/game/audio.ts`：音效和欢呼
- `src/game/storage.ts`：本地成就持久化
- `src/pages/Game.tsx`：游戏场景、控制、挑战及结算
- `src/components/Artwork.tsx`：机器人、怪兽和世界插画
- `src/App.tsx`：平台导航、大厅、成就和帮助
- `src/styles.css`：主题、动效与响应式布局

添加新游戏时创建独立页面，在 App 路由和大厅卡片中注册。静态站点部署只需发布 `dist/`；Hash 路由不需要服务器回退配置。
