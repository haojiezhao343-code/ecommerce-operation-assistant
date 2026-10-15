/* ==========================================================================
   图标注入器 · 统一设计系统的一部分
   --------------------------------------------------------------------------
   13 枚图标：24 网格 / 描边统一 1.5 / round cap+join / currentColor
   线宽全集合一律统一 1.5 —— 并排时线宽不一致比尺寸不一致更刺眼。
   重量差靠「延展到安全区」解决，不用线宽解决。

   用法：<svg class="ic"><use href="#i-ext"></use></svg>
   可用 id：i-ext i-arrow-r i-chev i-copy i-repo i-server i-db i-search
             i-agent i-terminal i-doc i-check i-warn
   ========================================================================== */
(function () {
  'use strict';
  var SYMBOLS = [
    ['i-ext', '<path d="M12.5 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6.5"/><path d="M12 12 20 4"/><path d="M15.5 4H20v4.5"/>'],
    ['i-arrow-r', '<path d="M4 12h16"/><path d="M14 6l6 6-6 6"/>'],
    ['i-chev', '<path d="M6 9l6 6 6-6"/>'],
    ['i-copy', '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 4H6a2 2 0 0 0-2 2v10"/>'],
    ['i-repo', '<path d="M9 6 3.5 12 9 18"/><path d="M15 6 20.5 12 15 18"/>'],
    ['i-server', '<rect x="5.5" y="5" width="13" height="5.5" rx="1.5"/><rect x="5.5" y="13.5" width="13" height="5.5" rx="1.5"/>'],
    ['i-db', '<ellipse cx="12" cy="6.5" rx="7" ry="3"/><path d="M5 6.5V17a7 3 0 0 0 14 0V6.5"/>'],
    /* i-search：图形实为漏斗（filter/funnel），不是放大镜。
       id 保留 i-search 属历史命名；语义为检索/收敛 ——
       适合做「筛选/检索」图标，不适合做「工作台/导航」图标。 */
    ['i-search', '<path d="M3.5 5.5h17l-6 7.5h-5L3.5 5.5Z"/><path d="M10.25 13v5.5M13.75 13v5.5"/>'],
    ['i-terminal', '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M8 9l3 3-3 3"/><path d="M13.5 15h4"/>'],
    ['i-doc', '<path d="M7 4h5l7 7v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M8.5 13.5h7M8.5 17h4.5"/>'],
    ['i-check', '<path d="M4.5 12 9.5 17 19.5 7"/>']
  ];
  /* 填充型图标：描边圆在 16px 下内白会归零，必须用填充 */
  var FILLED = [
    ['i-agent', '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="4.2" r="1.75"/><circle cx="5.25" cy="15.9" r="1.75"/><circle cx="18.75" cy="15.9" r="1.75"/>']
  ];
  var W = '<symbol viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">';
  var F = '<symbol viewBox="0 0 24 24" fill="currentColor" stroke="none">';

  function build() {
    if (document.getElementById('od-sprite')) return;
    var html = '<svg id="od-sprite" width="0" height="0" style="position:absolute;overflow:hidden" aria-hidden="true" focusable="false"><defs>';
    /* symbol 必须带 id，否则页面里的 <use href="#i-xxx"> 全部解析不到图形。
       W / F 模板本身不含 id，这里统一在拼接时补上。 */
    SYMBOLS.forEach(function (s) { html += W.replace('<symbol', '<symbol id="' + s[0] + '"') + s[1] + '</symbol>'; });
    FILLED.forEach(function (s) { html += F.replace('<symbol', '<symbol id="' + s[0] + '"') + s[1] + '</symbol>'; });
    /* 警告：三角必须描边，点必须填充 */
    html += '<symbol id="i-warn" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M12 4 20 19H4L12 4Z" fill="none"/><path d="M12 8.75v4" fill="none"/>' +
            '<circle cx="12" cy="16" r="1.35" fill="currentColor" stroke="none"/></symbol>';
    html += '</defs></svg>';
    document.body.insertAdjacentHTML('afterbegin', html);
  }

  /* 品牌标志《收束》：1 主核 + 4 子模块，从拓扑图降维成模数比例。
     16px 下四条连线只有 0.5px 必然糊，所以删掉连线改用网格对齐承担关系表达。 */
  var MARK = '<svg class="mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
    '<rect x="12" y="12" width="8" height="8" rx="2"/>' +
    '<rect x="4" y="4" width="4" height="4" rx="1"/>' +
    '<rect x="24" y="4" width="4" height="4" rx="1"/>' +
    '<rect x="4" y="24" width="4" height="4" rx="1"/>' +
    '<rect x="24" y="24" width="4" height="4" rx="1"/></svg>';
  var FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E" +
    "%3Crect width='32' height='32' fill='%23f8f7f4'/%3E%3Cg fill='%230d1218'%3E" +
    "%3Crect x='12' y='12' width='8' height='8'/%3E%3Crect x='4' y='4' width='4' height='4'/%3E" +
    "%3Crect x='24' y='4' width='4' height='4'/%3E%3Crect x='4' y='24' width='4' height='4'/%3E" +
    "%3Crect x='24' y='24' width='4' height='4'/%3E%3C/g%3E%3C/svg%3E";

  /* ---- 主题切换（记忆到 localStorage） ---- */
  function bootTheme() {
    var root = document.documentElement;
    var saved = null;
    try { saved = localStorage.getItem('hzj-theme'); } catch (e) {}
    if (saved) root.setAttribute('data-theme', saved);
    var btn = document.getElementById('themeBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('hzj-theme', next); } catch (e) {}
    });
  }

  /* ---- 滚动 reveal ---- */
  function bootReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      for (var i = 0; i < els.length; i++) els[i].classList.add('is-in');
      return;
    }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); obs.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    for (var j = 0; j < els.length; j++) io.observe(els[j]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      build(); bootTheme(); bootReveal();
    });
  } else { build(); bootTheme(); bootReveal(); }

  window.OD = { MARK: MARK, FAVICON: FAVICON };
})();