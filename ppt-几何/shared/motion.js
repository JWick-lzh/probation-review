/* 入场编排（两页共用）
   - 页面里所有 .anim 元素的 CSS 动画先停在第 0 帧，字体就绪后给 <html> 加 .play 一起开始。
   - [data-to] 的数字从 0 计到 HTML 里写好的终值（终值写在 HTML 里，没有 JS 也对）。
   - prefers-reduced-motion：不计数、不动，直接是终态。
   - window.__seek(ms)：把整页停在第 ms 毫秒（自检截中间帧用）。 */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var total = +root.getAttribute('data-total') || 2000;

  var nums = Array.prototype.map.call(document.querySelectorAll('[data-to]'), function (el) {
    return {
      el: el,
      to: parseFloat(el.getAttribute('data-to')),
      suf: el.getAttribute('data-suf') || '',
      delay: +el.getAttribute('data-delay') || 0,
      dur: +el.getAttribute('data-dur') || 600,
      final: el.textContent
    };
  });
  // 和 CSS 的 --ease-out 接近：数字与填色同步停下
  function ease(t) { return 1 - Math.pow(1 - t, 4); }
  function render(ms) {
    for (var i = 0; i < nums.length; i++) {
      var n = nums[i];
      var t = Math.min(1, Math.max(0, (ms - n.delay) / n.dur));
      n.el.textContent = t >= 1 ? n.final : Math.round(n.to * ease(t)) + n.suf;
    }
  }

  var raf = 0, t0 = 0, seeking = false;
  window.__seek = function (ms) {
    seeking = true;
    cancelAnimationFrame(raf);
    // 已经播完的 CSS 动画不在 getAnimations() 里了：先把 .anim 全部重启，再停到第 ms 毫秒
    var els = document.querySelectorAll('.anim');
    Array.prototype.forEach.call(els, function (el) { el.style.animationName = 'none'; });
    void document.body.offsetHeight;
    Array.prototype.forEach.call(els, function (el) { el.style.animationName = ''; });
    root.classList.add('play');
    document.getAnimations().forEach(function (a) { a.pause(); a.currentTime = ms; });
    render(ms);
  };
  window.__finish = function () { window.__seek(1e7); };
  window.addEventListener('beforeprint', window.__finish);

  if (reduce) { root.classList.add('play'); root.setAttribute('data-done', ''); return; }

  render(0);
  function tick(now) {
    if (seeking) return;
    var ms = now - t0;
    render(ms);
    if (ms < total) raf = requestAnimationFrame(tick);
    else { render(1e7); root.setAttribute('data-done', ''); }
  }
  function play() {
    if (root.classList.contains('play')) return;
    root.classList.add('play');
    t0 = performance.now();
    raf = requestAnimationFrame(tick);
  }

  // 等标题和正文用到的字体真正下载完；外网慢时最多等 1.2 秒，之后系统字体兜底
  var timer = setTimeout(play, 1200);
  void document.body.offsetHeight;
  var loads = [];
  if (document.fonts && document.fonts.load) {
    var probe = root.getAttribute('data-probe') || '转正述职';
    loads.push(document.fonts.load('900 88px "Noto Serif SC"', probe));
    loads.push(document.fonts.load('700 28px "Noto Sans SC"', probe));
    loads.push(document.fonts.load('900 64px "Noto Sans SC"', '0123456789%/'));
    Promise.all(loads).then(function () { return document.fonts.ready; })
      .then(function () { clearTimeout(timer); play(); }, function () { clearTimeout(timer); play(); });
  } else {
    clearTimeout(timer); play();
  }
})();
