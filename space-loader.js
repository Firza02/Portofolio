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
  // Nama hero "terbentuk" dari titik-titik cahaya — dipanggil tepat saat
  // loading selesai (bersamaan dengan fade-up elemen lain). Teks aslinya
  // (#heroNameText) tetap ada di DOM untuk screen reader/SEO walau
  // opacity 0 di awal; posisi tiap huruf diambil lewat Range.getClientRects
  // per karakter (bukan dihitung manual), jadi otomatis sinkron dengan
  // font/ukuran/line-wrap responsif apa pun yang sedang dipakai browser.
  // ---------------------------------------------------------------------
  function runHeroNameReveal() {
    var heroName = document.getElementById('heroName');
    var textEl = document.getElementById('heroNameText');
    var canvas = document.getElementById('heroNameCanvas');
    if (!textEl) return;

    function showTextInstantly() {
      textEl.classList.add('visible');
    }

    if (reduceMotion || !canvas || !heroName || !canvas.getContext) {
      showTextInstantly();
      return;
    }

    var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    ready.then(buildAndRun, showTextInstantly);

    function buildAndRun() {
      try {
        start();
      } catch (e) {
        showTextInstantly();
      }
    }

    function start() {
      var rect = heroName.getBoundingClientRect();
      var width = rect.width, height = rect.height;
      if (width < 10 || height < 10) { showTextInstantly(); return; }

      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      var ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      var cs = window.getComputedStyle(heroName);
      var fontSpec = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var WHITE = '255,255,255';
      var BLUE = '59,130,246'; // samakan dengan var(--blue) di style.css

      // Offscreen: gambar tiap KARAKTER persis di posisi nyatanya (dari
      // getClientRects per karakter, bukan baris) — otomatis benar meski
      // teks wrap ke baris berbeda di layar sempit.
      var off = document.createElement('canvas');
      off.width = canvas.width;
      off.height = canvas.height;
      var octx = off.getContext('2d');
      octx.scale(dpr, dpr);
      octx.font = fontSpec;
      octx.textBaseline = 'middle';
      octx.textAlign = 'left';

      function paintChar(textNode, index, color) {
        var r = document.createRange();
        r.setStart(textNode, index);
        r.setEnd(textNode, index + 1);
        var rects = r.getClientRects();
        if (!rects.length) return;
        var cr = rects[0];
        if (cr.width < 1 || cr.height < 1) return;
        octx.fillStyle = 'rgb(' + color + ')';
        octx.fillText(
          textNode.textContent[index],
          cr.left - rect.left,
          cr.top - rect.top + cr.height / 2
        );
      }

      function walk(node, color) {
        if (node.nodeType === 3) {
          var text = node.textContent;
          for (var i = 0; i < text.length; i++) {
            if (text[i] !== ' ') paintChar(node, i, color);
          }
        } else if (node.nodeType === 1) {
          if (node.tagName === 'BR') return;
          var childColor = (node.classList && node.classList.contains('highlight')) ? BLUE : color;
          Array.prototype.forEach.call(node.childNodes, function (child) {
            walk(child, childColor);
          });
        }
      }
      walk(textEl, WHITE);

      var imgData;
      try {
        imgData = octx.getImageData(0, 0, off.width, off.height).data;
      } catch (e) { showTextInstantly(); return; }

      var STEP = Math.max(2, Math.round(2.4 * dpr));
      var points = [];
      for (var y = 0; y < off.height; y += STEP) {
        for (var x = 0; x < off.width; x += STEP) {
          var idx = (y * off.width + x) * 4;
          if (imgData[idx + 3] > 120) {
            points.push({ x: x / dpr, y: y / dpr, r: imgData[idx], g: imgData[idx + 1], b: imgData[idx + 2] });
          }
        }
      }
      if (!points.length) { showTextInstantly(); return; }

      var MAX_POINTS = 240;
      if (points.length > MAX_POINTS) {
        points = points.sort(function () { return Math.random() - 0.5; }).slice(0, MAX_POINTS);
      }

      var diagonal = Math.hypot(width, height);
      var particles = points.map(function (p) {
        var angle = Math.random() * Math.PI * 2;
        var dist = diagonal * (0.35 + Math.random() * 0.45);
        return {
          tx: p.x, ty: p.y,
          sx: p.x + Math.cos(angle) * dist,
          sy: p.y + Math.sin(angle) * dist,
          color: p.r + ',' + p.g + ',' + p.b,
          delay: Math.random() * 0.22,
          size: 1 + Math.random() * 1.2,
        };
      });

      canvas.classList.add('visible');

      var DURATION = 1700;
      var animStart = performance.now();

      function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      function tick() {
        var now = performance.now();
        var g = Math.min(1, (now - animStart) / DURATION);

        ctx.clearRect(0, 0, width, height);
        particles.forEach(function (p) {
          var localT = Math.max(0, Math.min(1, (g - p.delay) / (1 - p.delay)));
          var ease = easeInOutCubic(localT); // mulus di awal & akhir, tidak "menyentak"
          var x = p.sx + (p.tx - p.sx) * ease;
          var y = p.sy + (p.ty - p.sy) * ease;
          var opacity = 0.2 + 0.8 * ease;

          // Jejak tipis searah gerak — membantu mata mengikuti pergerakan
          // cepat tanpa terasa patah antar-frame.
          var prevEase = easeInOutCubic(Math.max(0, Math.min(1, ((g - 0.02) - p.delay) / (1 - p.delay))));
          var px = p.sx + (p.tx - p.sx) * prevEase;
          var py = p.sy + (p.ty - p.sy) * prevEase;

          ctx.beginPath();
          ctx.strokeStyle = 'rgba(' + p.color + ',' + (opacity * 0.5) + ')';
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.moveTo(px, py);
          ctx.lineTo(x, y);
          ctx.stroke();

          // Glow murah tanpa shadowBlur (mahal di canvas 2D): lingkaran
          // luar redup + titik inti terang, dua fill datar saja.
          ctx.beginPath();
          ctx.fillStyle = 'rgba(' + p.color + ',' + (opacity * 0.3) + ')';
          ctx.arc(x, y, p.size * (1 + ease), 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.fillStyle = 'rgba(' + p.color + ',' + opacity + ')';
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });

        if (g < 1) {
          requestAnimationFrame(tick);
        } else {
          // Crossfade: teks asli (bisa diseleksi/dibaca screen reader)
          // masuk sementara canvas partikel memudar lalu dilepas.
          window.setTimeout(function () {
            textEl.classList.add('visible');
            canvas.style.opacity = '0';
            window.setTimeout(function () {
              canvas.classList.remove('visible');
            }, 400);
          }, 160);
        }
      }
      requestAnimationFrame(tick);
    }
  }

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
    var warpCanvas = document.getElementById('spaceLoadingConstellation');
    if (!overlay || !percentEl) return;

    // Durasi minimum dijaga 3-5 detik: MIN_MS menjamin animasi warp sempat
    // terlihat utuh walau halaman sudah siap lebih cepat; MAX_MS hanya
    // jaring pengaman kalau 'load' telat.
    var MIN_MS = 3600;
    var MAX_MS = 5000;
    var startTime = performance.now();
    var pageLoaded = false;
    var finished = false;

    function setPercent(p) {
      percentEl.textContent = Math.round(p) + '%';
    }

    var ctx = warpCanvas ? warpCanvas.getContext('2d') : null;
    var w, h, cx, cy;
    function resize() {
      if (!warpCanvas) return;
      w = warpCanvas.width = window.innerWidth;
      h = warpCanvas.height = window.innerHeight;
      cx = w / 2;
      cy = h / 2;
    }
    resize();
    window.addEventListener('resize', resize);

    // Bintang latar redup, berkelip tipis — tetap terlihat sepanjang loading.
    var BG_STARS = (function () {
      var arr = [];
      for (var i = 0; i < 70; i++) {
        arr.push({
          xr: Math.random(), yr: Math.random(),
          r: Math.random() * 1 + 0.4,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.002 + 0.0012,
        });
      }
      return arr;
    })();

    function drawBgStars(now) {
      BG_STARS.forEach(function (s) {
        var tw = 0.3 + 0.3 * Math.sin(now * s.speed + s.phase);
        ctx.beginPath();
        ctx.fillStyle = 'rgba(147,197,253,' + tw + ')';
        ctx.arc(s.xr * w, s.yr * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Titik-titik pembentuk galaksi spiral di pusat (lengan + inti terang),
    // dibuat sekali lewat formula spiral logaritmik — posisi relatif (rRatio,
    // baseAngle) lalu diskalakan dengan radius galaksi saat digambar, jadi
    // bentuknya tetap konsisten walau ukurannya membesar/mengecil.
    var GALAXY_ARMS = 5;
    var GALAXY_STAR_COUNT = 190;
    var GALAXY_STARS = (function () {
      var arr = [];
      for (var i = 0; i < GALAXY_STAR_COUNT; i++) {
        var arm = i % GALAXY_ARMS;
        var rRatio = Math.pow(Math.random(), 0.55);
        var armAngle = (arm / GALAXY_ARMS) * Math.PI * 2;
        var twist = rRatio * 2.6; // kelokan spiral: makin jauh dari pusat, makin memutar
        var scatter = (Math.random() - 0.5) * (0.22 + rRatio * 0.5); // lebar lengan
        arr.push({
          rRatio: rRatio,
          baseAngle: armAngle + twist + scatter,
          size: Math.random() * 1.2 + 0.5,
          blue: Math.random() < 0.4,
          phase: Math.random() * Math.PI * 2,
          // Dipakai di fase "membubar" (runDisperse): posisi acak tersebar
          // di layar (rasio, bukan piksel — aman kalau ukuran window
          // berubah) dan ukuran target menyerupai bintang starfield utama,
          // supaya frame terakhir loading sudah mirip background asli.
          sxr: Math.random(),
          syr: Math.random(),
          plainSize: Math.random() * 1.2 + 0.6,
        });
      }
      return arr;
    })();

    // Galaksi spiral yang berputar pelan di pusat — lengan + bulge keemasan
    // di tengah, meniru foto galaksi spiral asli alih-alih sekadar cincin.
    function drawGalaxy(now, galR) {
      var rotation = -now * 0.00025; // dibalik arahnya

      // Bulge: cahaya hangat di tengah galaksi.
      var bulgeR = galR * 0.38;
      var bulge = ctx.createRadialGradient(cx, cy, 0, cx, cy, bulgeR);
      bulge.addColorStop(0, 'rgba(255,248,230,0.95)');
      bulge.addColorStop(0.45, 'rgba(255,230,180,0.45)');
      bulge.addColorStop(1, 'rgba(255,230,180,0)');
      ctx.beginPath();
      ctx.fillStyle = bulge;
      ctx.arc(cx, cy, bulgeR, 0, Math.PI * 2);
      ctx.fill();

      // Lengan spiral: titik-titik tersebar sepanjang kurva, berkelip tipis.
      GALAXY_STARS.forEach(function (gs) {
        var r = gs.rRatio * galR;
        var angle = gs.baseAngle + rotation;
        var x = cx + Math.cos(angle) * r;
        var y = cy + Math.sin(angle) * r;
        var tw = 0.55 + 0.45 * Math.sin(now * 0.0025 + gs.phase);
        var core = 1 - gs.rRatio; // lebih terang & padat mendekati pusat
        var color = gs.blue ? '191,219,254' : '255,244,214';
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + color + ',' + (tw * (0.25 + core * 0.65)) + ')';
        ctx.arc(x, y, gs.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Halo redup mengelilingi galaksi.
      var halo = ctx.createRadialGradient(cx, cy, galR * 0.5, cx, cy, galR * 1.15);
      halo.addColorStop(0, 'rgba(147,197,253,0.08)');
      halo.addColorStop(1, 'rgba(147,197,253,0)');
      ctx.beginPath();
      ctx.fillStyle = halo;
      ctx.arc(cx, cy, galR * 1.15, 0, Math.PI * 2);
      ctx.fill();
    }

    var GAL_BASE_R = 70, GAL_RANGE_R = 90;

    // Galaksi spiral yang membesar pelan di pusat seiring persen loading naik.
    function drawConverge(percent, now) {
      ctx.clearRect(0, 0, w, h);
      drawBgStars(now);

      var t = percent / 100;
      drawGalaxy(now, GAL_BASE_R + t * GAL_RANGE_R);
    }

    // Fase "membubar": galaksi pelan-pelan lepas jadi titik-titik putih
    // polos yang tersebar ke seluruh layar — warna & bulge galaksinya
    // memudar sementara posisinya berpindah dari lengan spiral menuju
    // posisi acak, meniru gaya starfield utama (#spaceCanvas). Dengan ini
    // frame terakhir overlay sudah terlihat seperti background asli, jadi
    // begitu overlay fade out, perpindahannya nyaris tak terlihat.
    function runDisperse(onDone) {
      var start = performance.now();
      var DURATION = 1400;
      var galR = GAL_BASE_R + GAL_RANGE_R;

      function tick() {
        var now = performance.now();
        var g = Math.min(1, (now - start) / DURATION);
        // ease-in-out: pelan di awal & akhir, tidak terasa terburu-buru.
        var ease = g < 0.5 ? 4 * g * g * g : 1 - Math.pow(-2 * g + 2, 3) / 2;

        ctx.clearRect(0, 0, w, h);
        drawBgStars(now);

        var rotation = -now * 0.00025;
        var bulgeR = galR * 0.38 * (1 - ease);
        if (bulgeR > 0.5) {
          var bulge = ctx.createRadialGradient(cx, cy, 0, cx, cy, bulgeR);
          bulge.addColorStop(0, 'rgba(255,248,230,' + (0.95 * (1 - ease)) + ')');
          bulge.addColorStop(0.45, 'rgba(255,230,180,' + (0.45 * (1 - ease)) + ')');
          bulge.addColorStop(1, 'rgba(255,230,180,0)');
          ctx.beginPath();
          ctx.fillStyle = bulge;
          ctx.arc(cx, cy, bulgeR, 0, Math.PI * 2);
          ctx.fill();
        }

        GALAXY_STARS.forEach(function (gs) {
          var r = gs.rRatio * galR;
          var angle = gs.baseAngle + rotation;
          var sx = cx + Math.cos(angle) * r;
          var sy = cy + Math.sin(angle) * r;
          var tx = gs.sxr * w, ty = gs.syr * h;
          var x = sx + (tx - sx) * ease;
          var y = sy + (ty - sy) * ease;

          var tw = 0.55 + 0.45 * Math.sin(now * 0.0025 + gs.phase);
          var core = 1 - gs.rRatio;
          var color = gs.blue ? '191,219,254' : '255,244,214';
          var size = gs.size + (gs.plainSize - gs.size) * ease;

          if (ease < 1) {
            ctx.beginPath();
            ctx.fillStyle = 'rgba(' + color + ',' + (tw * (0.25 + core * 0.65) * (1 - ease)) + ')';
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.beginPath();
          ctx.fillStyle = 'rgba(255,255,255,' + (tw * 0.6 * ease) + ')';
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        });

        if (g < 1) {
          requestAnimationFrame(tick);
        } else {
          onDone();
        }
      }
      requestAnimationFrame(tick);
    }

    function hide() {
      if (finished) return;
      finished = true;
      setPercent(100);
      if (labelEl) labelEl.textContent = 'Warp engaged — Ready';

      function reveal() {
        overlay.classList.add('is-hidden');
        // Trigger animasi fade-up hero (lihat .fade-up di style.css) persis
        // saat overlay mulai memudar, supaya transisi loading → halaman
        // utama terasa menyambung, bukan konten yang langsung nongol instan.
        document.body.classList.add('content-revealed');
        runHeroNameReveal();
        window.setTimeout(function () {
          overlay.style.display = 'none';
        }, 550);
      }

      if (ctx) {
        runDisperse(reveal);
      } else {
        reveal();
      }
    }

    if (reduceMotion) {
      setPercent(0);
      if (ctx) drawConverge(0, performance.now());
      window.addEventListener('load', hide);
      window.setTimeout(hide, MIN_MS);
      return;
    }

    function tick() {
      if (finished) return;
      var now = performance.now();
      var elapsed = now - startTime;
      var t = Math.min(1, elapsed / MIN_MS);
      // Easing: naik stabil menuju 97% selama MIN_MS pertama (galaksi sudah
      // hampir mencapai ukuran akhirnya), baru melompat ke 100% begitu
      // halaman benar-benar siap DAN durasi minimum sudah terlewati.
      var minElapsed = elapsed >= MIN_MS;
      var target = (pageLoaded && minElapsed) ? 100 : Math.min(97, 97 * (1 - Math.pow(1 - t, 1.8)));
      setPercent(target);
      if (ctx) drawConverge(target, now);

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
  var BASE_SPEED = 0.7;      // sedikit lebih cepat lagi, tetap terasa "maju"
  var scrollFactor = 1;      // 1 = kecepatan penuh, turun sangat tipis saat scroll dalam (min ~0.75)

  // Warna bintang bervariasi (meniru suhu warna bintang asli) — sebagian
  // besar putih, selebihnya kebiruan/keemasan supaya tidak monoton.
  var STAR_COLORS = [
    { weight: 0.72, rgb: '255,255,255' },
    { weight: 0.15, rgb: '191,219,254' },
    { weight: 0.13, rgb: '253,230,138' },
  ];
  function pickStarColor() {
    var r = Math.random(), acc = 0;
    for (var i = 0; i < STAR_COLORS.length; i++) {
      acc += STAR_COLORS[i].weight;
      if (r <= acc) return STAR_COLORS[i].rgb;
    }
    return STAR_COLORS[STAR_COLORS.length - 1].rgb;
  }

  // Lapisan parallax: jauh (banyak, kecil, lambat) → dekat (sedikit, besar,
  // cepat) — selain efek perspektif z, tiap lapisan punya kelipatan
  // kecepatan/ukuran sendiri supaya kesan kedalamannya lebih kuat.
  var STAR_LAYERS = [
    { chance: 0.45, speedMult: 0.6, sizeMult: 0.75 },
    { chance: 0.80, speedMult: 1.0, sizeMult: 1.0 },
    { chance: 1.00, speedMult: 1.6, sizeMult: 1.35 },
  ];
  function pickLayer() {
    var r = Math.random();
    for (var i = 0; i < STAR_LAYERS.length; i++) {
      if (r <= STAR_LAYERS[i].chance) return STAR_LAYERS[i];
    }
    return STAR_LAYERS[STAR_LAYERS.length - 1];
  }

  function newStar() {
    var layer = pickLayer();
    return {
      x: (Math.random() * 2 - 1) * w,
      y: (Math.random() * 2 - 1) * h,
      z: Math.random() * 1400 + 300,
      twinkleSpeed: Math.random() * 0.03 + 0.012,
      twinklePhase: Math.random() * Math.PI * 2,
      speedMult: layer.speedMult,
      sizeMult: layer.sizeMult,
      color: pickStarColor(),
    };
  }

  var stars = [];
  for (var i = 0; i < STAR_COUNT; i++) stars.push(newStar());

  // ── Shooting stars — melintas cepat sesekali, lalu menghilang ──
  var shootingStars = [];
  function spawnShootingStar() {
    var startX = w * (0.1 + Math.random() * 0.6);
    var startY = h * Math.random() * 0.35;
    var angle = Math.PI / 4 + (Math.random() * 0.3 - 0.15);
    var speed = 14 + Math.random() * 8;
    shootingStars.push({
      x: startX, y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len: 80 + Math.random() * 60,
      life: 0,
      maxLife: 40 + Math.random() * 20,
    });
  }
  function scheduleShootingStar() {
    var delay = 4000 + Math.random() * 6000;
    window.setTimeout(function () {
      spawnShootingStar();
      scheduleShootingStar();
    }, delay);
  }
  function updateAndDrawShootingStars() {
    for (var i = shootingStars.length - 1; i >= 0; i--) {
      var sh = shootingStars[i];
      sh.x += sh.vx;
      sh.y += sh.vy;
      sh.life++;
      var fade = 1 - sh.life / sh.maxLife;
      if (fade <= 0 || sh.x > w + 100 || sh.y > h + 100) {
        shootingStars.splice(i, 1);
        continue;
      }
      var mag = Math.hypot(sh.vx, sh.vy);
      var tailX = sh.x - (sh.vx / mag) * sh.len;
      var tailY = sh.y - (sh.vy / mag) * sh.len;
      var grad = ctx.createLinearGradient(tailX, tailY, sh.x, sh.y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(255,255,255,' + fade + ')');
      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(sh.x, sh.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,' + fade + ')';
      ctx.arc(sh.x, sh.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

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

    stars.forEach(function (s) {
      var speed = BASE_SPEED * scrollFactor * s.speedMult;
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
      // Amplitudo lebih lebar: bintang bersinar terang lalu meredup hampir
      // habis sebelum bersinar lagi, bukan cuma sedikit berkedip.
      var twinkle = 0.25 + 0.75 * Math.sin(s.twinklePhase);
      twinkle = Math.max(0.08, twinkle);
      var opacity = depthOpacity * twinkle * 0.9;
      var size = Math.max(0.6, depthOpacity * (1.4 + twinkle * 0.8) * s.sizeMult);

      ctx.beginPath();
      ctx.fillStyle = 'rgba(' + s.color + ',' + opacity + ')';
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    });

    updateAndDrawShootingStars();

    requestAnimationFrame(draw);
  }

  if (reduceMotion) {
    drawStatic();
  } else {
    scheduleShootingStar();
    draw();
  }
})();
