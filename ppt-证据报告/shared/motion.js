/* 每页入场编排的开关。
   - 放在 <head> 里同步执行：先加 html.motion，CSS 动画以暂停态停在第一帧
   - 字体就绪后加 html.play，整页动画同时从 0 开始（时间轴写在各页 CSS 的 delay 里）
   - prefers-reduced-motion：什么都不加，页面直接是终态
   - [data-count]：数字跟着所在 [data-ride] 组的位移同步滚动（读实际 transform，和点的位置永远一致） */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  root.classList.add('motion');

  var started = false;
  function play() {
    if (started) return;
    started = true;
    requestAnimationFrame(function () {
      root.classList.add('play');
      requestAnimationFrame(tick);
    });
  }

  function progressOf(host) {
    var dx = parseFloat(getComputedStyle(host).getPropertyValue('--dx')) || 0;
    if (!dx) return 1;
    var tf = getComputedStyle(host).transform;
    var tx = 0;
    if (tf && tf !== 'none') { try { tx = new DOMMatrixReadOnly(tf).e; } catch (e) { tx = 0; } }
    return Math.max(0, Math.min(1, 1 + tx / dx));
  }

  function tick() {
    var pending = false;
    var els = document.querySelectorAll('[data-count]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var host = el.closest('[data-ride]');
      if (!host) continue;
      var anims = host.getAnimations ? host.getAnimations() : [];
      if (anims.length && anims[0].playState !== 'finished') pending = true;
      var target = parseFloat(el.getAttribute('data-count'));
      var fmt = el.getAttribute('data-fmt') || '{}';
      el.textContent = fmt.replace('{}', String(Math.round(target * progressOf(host))));
    }
    if (pending) requestAnimationFrame(tick);
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(play);
  else window.addEventListener('load', play);
  setTimeout(play, 1500); // 字体迟迟不来也照常播放
})();
