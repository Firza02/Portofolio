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
