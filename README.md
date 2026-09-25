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

## 页面

- `/#/`：游戏大厅
- `/#/games/energy`：彩虹能量迷宫
- `/#/achievements`：本机成就

首个游戏已完整实现；星际记忆站、深海寻宝记是明确标注的未来游戏预告。

## 玩法

从左上角走到右下角，只能上下左右移动。支持点击相邻格子、触屏方向按钮、方向键和 WASD。没有倒计时。

- 初始能量 60，上限 100；绿色格子 +15，橙色格子扣 20～40（随关卡递增）。每格效果只触发一次，不能反复刷能量。
- 紫色怪兽触发 20 以内加减法，4 选 1。答错或能量归零会爆炸，随后鼓励重新尝试。
- 到达终点根据剩余能量获得 1～3 颗星：≥70 获得 3 星，≥35 获得 2 星，否则 1 星。
- 3 种地图尺寸：4×5、5×6、6×7；共 9 个渐进关卡。地图使用种子生成并保证存在能量足够的路径；重试保留原地图，下一关或更换难度会生成新地图。
- 音效由 Web Audio 合成，通关有旋律、掌声和可用时的中文语音欢呼。浏览器首次交互后启用，可在顶部静音。
- 成就和音效偏好保存在 localStorage；不收集个人数据。当前局进度保存在内存，刷新会重置本局。
- 支持减少动态效果偏好、键盘焦点管理、弹窗焦点限制及屏幕阅读器状态提示。

## 结构

- `src/game/engine.ts`：独立、可测试的游戏规则和地图生成
- `src/game/audio.ts`：音效和欢呼
- `src/game/storage.ts`：本地成就持久化
- `src/pages/Game.tsx`：游戏场景、控制、挑战及结算
- `src/components/Artwork.tsx`：机器人、怪兽和世界插画
- `src/App.tsx`：平台导航、大厅、成就和帮助
- `src/styles.css`：主题、动效与响应式布局

添加新游戏时创建独立页面，在 App 路由和大厅卡片中注册。静态站点部署只需发布 `dist/`；Hash 路由不需要服务器回退配置。
