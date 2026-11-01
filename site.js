(function () {
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* word-by-word entrance */
  document.querySelectorAll('[data-blur]').forEach(function (el) {
    var base = parseFloat(el.dataset.delay || 0);
    var text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(/\s+/).forEach(function (w, i) {
      var s = document.createElement('span');
      s.setAttribute('aria-hidden', 'true');
      s.textContent = w;
      s.style.setProperty('--d', (base + i * 0.08) + 's');
      el.appendChild(s);
    });
  });

  /* the first screen comes in on load, everything else as it scrolls into view */
  var enter = function () { document.querySelectorAll('.in-load').forEach(function (el) { el.classList.add('in'); }); };
  requestAnimationFrame(function () { requestAnimationFrame(enter); });
  setTimeout(enter, 400);  /* a browser that holds back frames must still show the words */
  var targets = document.querySelectorAll('.rv:not(.in-load),[data-blur]:not(.in-load)');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add('in'); });
  }

  /* each clip fades in, and fades out just before it loops */
  var FADE = 500, LEAD = 0.55;
  function fader(v) {
    var raf = 0, out = false;
    function to(target) {
      cancelAnimationFrame(raf);
      var from = parseFloat(v.style.opacity || '0'), t0 = performance.now();
      (function step(now) {
        var k = Math.min(1, (now - t0) / FADE);
        v.style.opacity = String(from + (target - from) * k);
        if (k < 1) raf = requestAnimationFrame(step);
      })(t0);
    }
    v.addEventListener('loadeddata', function () { if (calm) { v.style.opacity = '1'; return; } v.style.opacity = '0'; v.play().catch(function () {}); to(1); });
    v.addEventListener('timeupdate', function () { var left = v.duration - v.currentTime; if (!out && left <= LEAD && left > 0) { out = true; to(0); } });
    v.addEventListener('ended', function () { v.style.opacity = '0'; setTimeout(function () { v.currentTime = 0; v.play().catch(function () {}); out = false; to(1); }, 100); });
    if (v.readyState >= 2) v.dispatchEvent(new Event('loadeddata'));
  }
  var layers = {};
  document.querySelectorAll('.back .layer').forEach(function (el) {
    var v = el.querySelector('video');
    layers[el.dataset.k] = { el: el, v: v };
    fader(v);
  });

  /* Home: the mountains give way to the grass under Projects, then the trees under the two founders */
  var hero = document.getElementById('hero'), founders = document.getElementById('founders');
  if (hero && founders) {
    var ORDER = ['lake', 'grass', 'canopy'], warmed = {};
    var clamp = function (x) { return Math.min(1, Math.max(0, x)); };
    var smooth = function (a, b, x) { var t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
    var warm = function (k) { var v = layers[k].v; if (!warmed[k]) { warmed[k] = 1; v.preload = 'auto'; v.load(); } };
    addEventListener('load', function () { warm('grass'); });
    (function tick() {
      var H = innerHeight, hr = hero.getBoundingClientRect(), fr = founders.getBoundingClientRect();
      var d = clamp(-hr.top / hr.height), c = clamp((H - fr.top) / (H * 0.7)), g = smooth(0.3, 0.8, d);
      var w = { lake: 1 - g, grass: g, canopy: c };
      var tf = {
        lake: 'translateY(' + (-d * 8) + '%) scale(' + (1.04 + d * 0.3) + ')',
        grass: 'scale(' + (1.18 - g * 0.1) + ')',
        canopy: 'scale(' + (1.04 + c * 0.06) + ')'
      };
      ORDER.forEach(function (k, i) {
        var covered = ORDER.slice(i + 1).some(function (u) { return w[u] >= 0.999; });
        var vis = covered ? 0 : w[k], L = layers[k];
        L.el.style.opacity = vis.toFixed(3);
        if (!calm) L.el.style.transform = tf[k];
        if (vis > 0.001 && L.v.paused && L.v.readyState >= 2 && !calm) L.v.play().catch(function () {});
        if (vis <= 0.001 && !L.v.paused) L.v.pause();
      });
      if (fr.top < H * 2.5) warm('canopy');
      requestAnimationFrame(tick);
    })();
  }

  /* Projects page: step through the four summaries with the arrows, the keyboard or a swipe */
  var slides = document.querySelectorAll('.slide');
  if (slides.length) {
    var at = 0, count = document.querySelector('.count');
    var show = function (n) {
      at = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('on', i === at); s.setAttribute('aria-hidden', i === at ? 'false' : 'true'); });
      count.textContent = (at + 1) + ' / ' + slides.length;
    };
    document.querySelector('.arrow.prev').addEventListener('click', function () { show(at - 1); });
    document.querySelector('.arrow.next').addEventListener('click', function () { show(at + 1); });
    addEventListener('keydown', function (e) {
      if (scrollY > innerHeight * 0.6) return;
      if (e.key === 'ArrowLeft') show(at - 1);
      if (e.key === 'ArrowRight') show(at + 1);
    });
    var box = document.getElementById('summaries'), x0 = null;
    box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
    }, { passive: true });
    show(0);
  }
})();
