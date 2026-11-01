/* =====================================================================
   SPACE THEME — additive script
   =====================================================================
   Starfield canvas ambient (#spaceCanvas) — bintang bergerak pelan
   seolah maju, melambat sangat tipis saat pengguna scroll ke konten.

   File ini TIDAK menyentuh script.js asli — hapus tag <script> yang
   memuat file ini di index.html untuk melepas seluruh perilaku tema
   luar angkasa tanpa memengaruhi fungsi lain (nav, form, modal, dll).
   ===================================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------
  // Loading screen — percentage counter tied to window 'load'.
  // Dibatasi maksimum 2 detik: naik bertahap ke 90% sambil menunggu
  // resource selesai dimuat, lalu loncat ke 100% begitu 'load' terpicu
  // (atau begitu batas 2s tercapai, mana lebih dulu) dan fade out.
  // ---------------------------------------------------------------------
  (function loadingScreen() {
    var overlay = document.getElementById('spaceLoading');
    var percentEl = document.getElementById('spaceLoadingPercent');
    var labelEl = document.getElementById('spaceLoadingLabel');
    var conCanvas = document.getElementById('spaceLoadingConstellation');
    if (!overlay || !percentEl) return;

    // Durasi minimum dijaga 3-5 detik: MIN_MS menjamin animasi "membentuk
    // rasi bintang" selalu sempat selesai dilihat walau halaman sudah
    // siap lebih cepat; MAX_MS hanya jaring pengaman kalau 'load' telat.
    var MIN_MS = 3600;
    var MAX_MS = 5000;
    var startTime = performance.now();
    var pageLoaded = false;
    var finished = false;

    function setPercent(p) {
      percentEl.textContent = Math.round(p) + '%';
    }

    function hide() {
      if (finished) return;
      finished = true;
      setPercent(100);
      if (labelEl) labelEl.textContent = 'Ursa Major — Ready';
      if (conCtx) drawConstellation(100, performance.now());
      overlay.classList.add('is-hidden');
      window.setTimeout(function () {
        overlay.style.display = 'none';
      }, 550);
    }

    // Pola 7 bintang ala Big Dipper (gagang + mangkuk) — menyala &
    // tersambung garis satu per satu seiring persen naik.
    var POINTS = [
      [18, 140], [62, 118], [102, 130], [142, 92],
      [184, 100], [208, 56], [248, 66],
    ];
    // Bintang latar redup, posisi acak tapi tetap (seed sekali saat load)
    // supaya terasa seperti langit malam di sekitar rasi yang terbentuk.
    var BG_STARS = (function () {
      var arr = [];
      for (var i = 0; i < 26; i++) {
        arr.push({
          x: Math.random() * 260,
          y: Math.random() * 170,
          r: Math.random() * 0.9 + 0.4,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.002 + 0.0012,
        });
      }
      return arr;
    })();
    var conCtx = conCanvas ? conCanvas.getContext('2d') : null;

    function drawConstellation(percent, now) {
      var w = conCanvas.width, h = conCanvas.height;
      conCtx.clearRect(0, 0, w, h);

      // Latar: bintang redup berkelip, selalu terlihat penuh dari awal.
      BG_STARS.forEach(function (s) {
        var tw = 0.35 + 0.35 * Math.sin(now * s.speed + s.phase);
        conCtx.beginPath();
        conCtx.fillStyle = 'rgba(147, 197, 253, ' + tw + ')';
        conCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        conCtx.fill();
      });

      var segments = POINTS.length - 1;
      var reach = (percent / 100) * segments; // 0..segments
      var twinkle = 0.75 + 0.25 * Math.sin(now / 260);

      // Garis penghubung rasi bintang
      conCtx.lineWidth = 1.5;
      conCtx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
      conCtx.beginPath();
      for (var i = 0; i < segments; i++) {
        var a = POINTS[i], b = POINTS[i + 1];
        var segT = Math.max(0, Math.min(1, reach - i));
        if (segT <= 0) break;
        var bx = a[0] + (b[0] - a[0]) * segT;
        var by = a[1] + (b[1] - a[1]) * segT;
        conCtx.moveTo(a[0], a[1]);
        conCtx.lineTo(bx, by);
      }
      conCtx.stroke();

      // Titik-titik bintang utama (rasi)
      for (var j = 0; j < POINTS.length; j++) {
        var lit = Math.max(0, Math.min(1, reach - (j - 1)));
        if (j === 0) lit = 1;
        if (lit <= 0) continue;
        var p = POINTS[j];
        var isLast = j === POINTS.length - 1;
        var r = 3 + lit * 2.4 * (isLast && percent >= 100 ? twinkle : 1);
        conCtx.beginPath();
        conCtx.fillStyle = 'rgba(251, 191, 36, ' + (0.55 + lit * 0.45) + ')';
        conCtx.shadowColor = 'rgba(251, 191, 36, 0.85)';
        conCtx.shadowBlur = 9 * lit;
        conCtx.arc(p[0], p[1], r, 0, Math.PI * 2);
        conCtx.fill();
      }
      conCtx.shadowBlur = 0;
    }

    if (reduceMotion) {
      setPercent(0);
      if (conCtx) drawConstellation(0, performance.now());
      window.addEventListener('load', hide);
      window.setTimeout(hide, MIN_MS);
      return;
    }

    function tick() {
      if (finished) return;
      var now = performance.now();
      var elapsed = now - startTime;
      var t = Math.min(1, elapsed / MIN_MS);
      // Easing: naik stabil menuju 97% selama MIN_MS pertama (rasi bintang
      // selesai terbentuk), baru melompat ke 100% begitu halaman benar2
      // siap DAN durasi minimum sudah terlewati.
      var minElapsed = elapsed >= MIN_MS;
      var target = (pageLoaded && minElapsed) ? 100 : Math.min(97, 97 * (1 - Math.pow(1 - t, 1.8)));
      setPercent(target);
      if (conCtx) drawConstellation(target, now);

      if ((pageLoaded && minElapsed) || elapsed >= MAX_MS) {
        hide();
        return;
      }
      requestAnimationFrame(tick);
    }

    window.addEventListener('load', function () { pageLoaded = true; });
    requestAnimationFrame(tick);
  })();

  var canvas = document.getElementById('spaceCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var w, h, cx, cy;
  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    cx = w / 2;
    cy = h / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  var STAR_COUNT = window.innerWidth < 768 ? 90 : 160;
  var BASE_SPEED = 0.35;     // bergerak pelan, terasa "maju" tanpa terburu-buru
  var scrollFactor = 1;      // 1 = kecepatan penuh, turun sangat tipis saat scroll dalam (min ~0.75)

  function newStar() {
    return {
      x: (Math.random() * 2 - 1) * w,
      y: (Math.random() * 2 - 1) * h,
      z: Math.random() * 1400 + 300,
      twinkleSpeed: Math.random() * 0.015 + 0.004,
      twinklePhase: Math.random() * Math.PI * 2,
    };
  }

  var stars = [];
  for (var i = 0; i < STAR_COUNT; i++) stars.push(newStar());

  function project(s) {
    var k = 160 / s.z;
    return { x: cx + s.x * k * 0.5, y: cy + s.y * k * 0.5 };
  }

  function updateScrollFactor() {
    var y = window.scrollY || window.pageYOffset || 0;
    var t = Math.min(1, y / 1400); // melambat sangat halus & bertahap
    scrollFactor = 1 - t * 0.25;   // minimal 75% kecepatan — konsisten di semua bagian halaman
  }
  window.addEventListener('scroll', updateScrollFactor, { passive: true });
  updateScrollFactor();

  function drawStatic() {
    // Mode prefers-reduced-motion: satu frame statis, tanpa animasi.
    ctx.clearRect(0, 0, w, h);
    stars.forEach(function (s) {
      var p = project(s);
      if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) return;
      var opacity = Math.min(1, (1700 - s.z) / 1700);
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,' + (opacity * 0.6) + ')';
      ctx.arc(p.x, p.y, Math.max(0.6, opacity * 1.6), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    var speed = BASE_SPEED * scrollFactor;

    stars.forEach(function (s) {
      s.z -= speed;
      s.twinklePhase += s.twinkleSpeed;

      if (s.z <= 1) {
        Object.assign(s, newStar(), { z: 1700 });
        return;
      }

      var p = project(s);
      if (p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) {
        Object.assign(s, newStar(), { z: 1700 });
        return;
      }

      var depthOpacity = Math.min(1, (1700 - s.z) / 1200);
      var twinkle = 0.65 + 0.35 * Math.sin(s.twinklePhase);
      var opacity = depthOpacity * twinkle * 0.75;
      var size = Math.max(0.6, depthOpacity * 1.8);

      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,' + opacity + ')';
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  if (reduceMotion) {
    drawStatic();
  } else {
    draw();
  }
})();
