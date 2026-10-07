/* ============================================================
   chiptune.js — 8-bit 音效合成器（零素材 / 零依赖 / 零版权）
   ------------------------------------------------------------
   用 Web Audio 的振荡器 + 噪声实时合成，不加载任何音频文件。
   方波 / 三角波 / 噪声三通道 —— 就是红白机 2A03 音源的做法。

   用法：
     <script src="../chiptune.js"></script>
     Chip.resume();            // ★ 必须在用户手势（点击/按键）里调用一次
     Chip.play('pickup');      // 播放预设音效
     hud.appendChild(Chip.button());   // 拿一个 🔊/🔇 按钮插到自己的 HUD 里

   可用音效：
     click blip turn open flag pickup coin place shoot
     hit bounce explode bigboom hurt levelup win lose clear
   ============================================================ */
window.Chip = (function () {
  var ctx = null, master = null, noiseBuf = null;
  var muted = false;
  var VOL = 0.32;
  var pitch = 1;
  var listeners = [];

  try { muted = localStorage.getItem('game_muted') === '1'; } catch (e) { muted = false; }

  /* ---------- 底层 ---------- */

  function init() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOL;
    master.connect(ctx.destination);
    return true;
  }

  // 必须在用户手势里调用；否则 AudioContext 会一直停在 suspended，什么都不响
  function resume() {
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume();
  }

  function ready() { return ctx && ctx.state === 'running'; }

  // 单音：频率从 f0 滑到 f1
  function tone(f0, f1, dur, type, vol, delay) {
    var t0 = ctx.currentTime + (delay || 0);
    f0 *= pitch;
    if (f1) f1 *= pitch;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.25), t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  // 噪声：带低通扫频，用来做爆炸 / 打击
  function noise(dur, vol, f0, f1, delay) {
    if (!noiseBuf) {
      var n = Math.floor(ctx.sampleRate * 0.8);
      noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    var t0 = ctx.currentTime + (delay || 0);
    var s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(f0 || 2200, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(60, f1 || 120), t0 + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, vol || 0.25), t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + dur + 0.03);
  }

  // 琶音：一串音按间隔依次播放
  function arp(freqs, gap, dur, type, vol) {
    for (var i = 0; i < freqs.length; i++) tone(freqs[i], freqs[i], dur, type, vol, i * gap);
  }

  /* ---------- 音效预设 ---------- */

  var S = {
    click:   function () { tone(520, 620, 0.035, 'square', 0.10); },
    blip:    function () { tone(880, 1180, 0.05, 'square', 0.13); },
    turn:    function () { tone(760, 760, 0.022, 'square', 0.07); },
    open:    function () { tone(440, 560, 0.04, 'square', 0.10); },
    flag:    function () { tone(1050, 1050, 0.05, 'triangle', 0.16); },
    pickup:  function () { tone(660, 1320, 0.10, 'square', 0.18); },
    coin:    function () { tone(988, 988, 0.06, 'square', 0.16); tone(1319, 1319, 0.13, 'square', 0.16, 0.06); },
    place:   function () { tone(300, 170, 0.09, 'square', 0.16); },
    shoot:   function () { tone(1300, 320, 0.09, 'square', 0.13); },
    hit:     function () { tone(240, 110, 0.13, 'square', 0.16); noise(0.1, 0.13, 1200, 200); },
    bounce:  function () { tone(900, 1400, 0.05, 'triangle', 0.12); },
    explode: function () { noise(0.42, 0.30, 2600, 90); tone(170, 40, 0.34, 'square', 0.13); },
    bigboom: function () { noise(0.70, 0.34, 3200, 60); tone(140, 30, 0.60, 'sawtooth', 0.14); },
    hurt:    function () { tone(300, 80, 0.30, 'sawtooth', 0.20); },
    levelup: function () { arp([392, 523, 659, 880], 0.06, 0.10, 'triangle', 0.15); },
    clear:   function () { arp([659, 784, 988, 1318], 0.07, 0.12, 'square', 0.17); },
    win:     function () { arp([523, 659, 784, 1046, 1318], 0.085, 0.15, 'square', 0.17); },
    lose:    function () { arp([523, 466, 415, 349, 262], 0.13, 0.17, 'square', 0.18); }
  };

  function play(name, rate) {
    if (muted || !ready()) return;
    var f = S[name];
    if (!f) return;
    pitch = rate || 1;
    try { f(); } finally { pitch = 1; }
  }

  /* ---------- 静音开关 ---------- */

  function syncBtn(b) {
    b.textContent = muted ? '🔇' : '🔊';
    b.title = muted ? '开启音效' : '关闭音效';
    b.setAttribute('aria-label', b.title);
  }

  function setMuted(v) {
    muted = !!v;
    try { localStorage.setItem('game_muted', muted ? '1' : '0'); } catch (e) { }
    if (master) master.gain.value = muted ? 0 : VOL;
    var all = document.querySelectorAll('.chip-mute');
    for (var i = 0; i < all.length; i++) syncBtn(all[i]);
    for (var j = 0; j < listeners.length; j++) listeners[j](muted);
  }

  function button() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip-mute';
    syncBtn(b);
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      setMuted(!muted);
      if (!muted) { resume(); play('blip'); }
    });
    return b;
  }

  /* ---------- 样式（自动注入一次） ---------- */

  (function style() {
    if (typeof document === 'undefined' || document.getElementById('chip-style')) return;
    var s = document.createElement('style');
    s.id = 'chip-style';
    s.textContent =
      '.chip-mute{width:32px;height:32px;flex:0 0 auto;border-radius:9px;border:1px solid #2b3944;' +
      'background:#1b232b;color:#dfe7ee;font-size:15px;line-height:1;cursor:pointer;padding:0;' +
      'font-family:inherit;transition:background .12s}' +
      '.chip-mute:hover{background:#26313b}';
    (document.head || document.documentElement).appendChild(s);
  })();

  return {
    resume: resume,
    play: play,
    button: button,
    setMuted: setMuted,
    toggle: function () { setMuted(!muted); },
    isMuted: function () { return muted; },
    onChange: function (fn) { listeners.push(fn); }
  };
})();
