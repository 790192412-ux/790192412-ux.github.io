---
title: 🎲小游戏
weight: 6
bookCollapseSection: true
---

# 小游戏实验室

拿来做实验的地方。所有游戏都是**纯前端**实现 —— HTML + CSS + 原生 JS，**零依赖、零后端、零音频文件**，源码就在仓库的 `static/games/` 目录里，可以直接点开看、直接改。

游戏本体是独立页面，通过 iframe 嵌进来的，所以它们的样式和本站主题完全隔离，不会互相污染。

## 目前有

| | 游戏 | 实现 | 特色 |
|---|---|---|---|
| 01 | [🐍 贪吃蛇](/docs/06.小游戏/01.贪吃蛇/) | Canvas 2D | 三档难度 + 穿墙模式 |
| 02 | [💣 扫雷](/docs/06.小游戏/02.扫雷/) | DOM | 初级/中级/高级，第一下防雷 |
| 03 | [💣 炸弹人](/docs/06.小游戏/03.炸弹人/) | Canvas 2D | 道具系统 + 关卡递进 |
| 04 | [🛡 坦克大战](/docs/06.小游戏/04.坦克大战/) | Canvas 2D | 可破坏地形 + 保卫老家 |

## 音效说明

四个游戏的音效**都是实时合成的，仓库里没有任何音频文件**。

实现放在 `static/games/chiptune.js`，用 Web Audio 的振荡器 + 噪声音源生成方波、三角波和低频噪声 —— 这正是红白机 2A03 音源芯片的三通道架构。所以它听起来"就是那个年代的声音"，而不是"凑合的替代品"。

好处：体积增加为零、没有版权问题、音高可以随手调（贪吃蛇吃到的音效会随连击不断升高）。

每个游戏 HUD 右上角都有 🔊 静音按钮，设置存在 `localStorage` 里，四个游戏共用。

## 怎么加新游戏

1. 在 `static/games/` 下建一个文件夹，放一个完整的 `index.html`
2. 在 `content/docs/06.小游戏/` 下建一篇 md，用短代码嵌进去：

```go-html-template
{{< game src="games/你的游戏/" title="🎮 标题" height="700" >}}
```

游戏本体如果想用音效，在 `</head>` 后面引一下共享模块：

```html
<script src="../chiptune.js"></script>
<script>
  Chip.resume();              // 必须在用户的点击事件里调用
  Chip.play('pickup');
  document.querySelector('.hud').appendChild(Chip.button());
</script>
```
