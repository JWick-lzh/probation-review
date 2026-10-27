/* deck-p5 · 入场编排（每页一次）
   原则：终态写在 HTML/CSS 里——不跑脚本、减少动效、打印，看到的都是终态；动画只描述「从哪来」。
   用法：P5.tween(el, keyframes, {delay, duration, easing})；P5.count(el, {delay, duration})；最后 P5.go()。 */
(function () {
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var EASE = 'cubic-bezier(.16,1,.3,1)';
  var anims = [];
  var counters = [];
  var started = false;

  function tween(el, frames, opt) {
    if (reduce || !el || !el.animate) return null;
    var o = { fill: 'backwards', easing: EASE, duration: 600, delay: 0 };
    for (var k in opt) o[k] = opt[k];
    var a = el.animate(frames, o);
    a.pause();                      // 先停在起点，等字体到了一起开播
    anims.push(a);
    return a;
  }

  // 数字滚动计数：元素里写终值（如 1,305），data-to 写数值，data-comma 表示千分位
  function count(el, opt) {
    if (!el) return;
    var to = parseFloat(el.getAttribute('data-to'));
    var comma = el.hasAttribute('data-comma');
    var c = {
      el: el, to: to, done: false, finalText: el.textContent,
      delay: (opt && opt.delay) || 0, duration: (opt && opt.duration) || 800,
      fmt: function (v) { v = Math.round(v); return comma ? v.toLocaleString('en-US') : String(v); }
    };
    counters.push(c);
    if (!reduce) el.textContent = c.fmt(0);
  }

  function runCounter(c, t0) {
    function frame(now) {
      if (c.done) return;
      var t = (now - t0 - c.delay) / c.duration;
      if (t >= 1) { c.el.textContent = c.finalText; c.done = true; return; }
      if (t > 0) c.el.textContent = c.fmt(c.to * (1 - Math.pow(1 - t, 3)));
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function start() {
    if (started) return;
    started = true;
    var t0 = performance.now();
    anims.forEach(function (a) { a.play(); });
    counters.forEach(function (c) { runCounter(c, t0); });
  }

  function finish() {
    anims.forEach(function (a) { try { a.finish(); } catch (e) {} });
    counters.forEach(function (c) { c.done = true; c.el.textContent = c.finalText; });
  }

  // 定格到第 ms 毫秒（截中途帧、做缩略图用）
  function seek(ms) {
    started = true;
    anims.forEach(function (a) { a.pause(); a.currentTime = ms; });
    counters.forEach(function (c) {
      c.done = true;
      var t = (ms - c.delay) / c.duration;
      c.el.textContent = t >= 1 ? c.finalText : c.fmt(t <= 0 ? 0 : c.to * (1 - Math.pow(1 - t, 3)));
    });
  }

  // 外壳在后台预载的页面（iframe 还没显示）等到真正有尺寸再播
  function whenShown(fn) {
    if (window.innerWidth > 0 && window.innerHeight > 0) { fn(); return; }
    var on = function () {
      if (window.innerWidth > 0 && window.innerHeight > 0) { window.removeEventListener('resize', on); fn(); }
    };
    window.addEventListener('resize', on);
  }

  // 等字体（最多 1.5 秒），免得巨数字播到一半换字形
  function go() {
    if (reduce) return;
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var cap = new Promise(function (r) { setTimeout(r, 1500); });
    Promise.race([fonts, cap]).then(function () {
      whenShown(function () { requestAnimationFrame(start); });
    });
  }

  window.addEventListener('beforeprint', finish);
  window.P5 = { reduce: reduce, tween: tween, count: count, go: go, finish: finish, seek: seek };
})();
