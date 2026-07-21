// ── Mobile hamburger nav ──
(function () {
  const navToggle = document.getElementById('navToggle');
  const navLinksEl = document.getElementById('navLinks');
  const navOverlay = document.getElementById('navOverlay');
  if (!navToggle || !navLinksEl) return;

  function closeMenu() {
    navLinksEl.classList.remove('open');
    navToggle.classList.remove('open');
    if (navOverlay) navOverlay.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  function openMenu() {
    navLinksEl.classList.add('open');
    navToggle.classList.add('open');
    if (navOverlay) navOverlay.classList.add('open');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  navToggle.addEventListener('click', () => {
    const isOpen = navLinksEl.classList.contains('open');
    isOpen ? closeMenu() : openMenu();
  });
  if (navOverlay) navOverlay.addEventListener('click', closeMenu);
  navLinksEl.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMenu();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });
})();

// ── Scroll progress bar + back-to-top button ──
(function () {
  const progress = document.getElementById('scrollProgress');
  const backToTop = document.getElementById('backToTop');

  function onScroll() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progress) progress.style.width = pct + '%';
    if (backToTop) backToTop.classList.toggle('visible', scrollTop > 500);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();

// Smooth active nav link
  const sections = document.querySelectorAll('section, .hero, .stats-strip, .tech-bar');
  const navLinks = document.querySelectorAll('.nav-links a');

  const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      console.log("Terlihat:", e.target.id);

      const id = e.target.id;

      navLinks.forEach(a => {
        a.classList.toggle(
          'active',
          a.getAttribute('href') === '#' + id
        );
      });
    }
  });
}, { threshold: 0.1 });

  sections.forEach(el => observer.observe(el));

  // Scroll reveal
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.stat-card, .timeline-item, .skill-cat, .project-card, .cert-card, .about-highlights .highlight-row').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity .6s ease, transform .6s ease';
    revealObserver.observe(el);
  });

// Project Modal (PDF viewer)
  function openProjModal(data) {
    const backdrop = document.getElementById('projModal');
    document.getElementById('pmTag').textContent   = data.tag;
    document.getElementById('pmTitle').textContent = data.title;

    // Tech tags in footer
    const techs = document.getElementById('pmTechs');
    techs.innerHTML = data.techs.map(t => '<span class="proj-modal-tech">' + t + '</span>').join('');

    // Download / open buttons
    document.getElementById('pmOpenBtn').href = data.pdf;
    document.getElementById('pmDownBtn').href = data.pdf;
    document.getElementById('pmDownBtn').download = data.title + '.pdf';

    // PDF body — try iframe, show fallback if file missing
    const body = document.getElementById('pmBody');
    body.innerHTML = '<iframe src="' + data.pdf + '#toolbar=1&navpanes=0&scrollbar=1&view=FitH" title="' + data.title + '"></iframe>';

    // Detect load failure via onerror on object fallback
    const iframe = body.querySelector('iframe');
    iframe.onerror = showNoPdf;

    // Fallback: if after 2s the iframe height is 0 or src unreachable
    setTimeout(() => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (!doc || doc.body.innerHTML === '') showNoPdf();
      } catch(e) { /* cross-origin: PDF loaded fine */ }
    }, 2000);

    function showNoPdf() {
      body.innerHTML = '<div class="proj-modal-nopdf"><div class="proj-modal-nopdf-icon">📄</div><h3>File PDF belum tersedia</h3><p>Letakkan file PDF di folder <code>assets/</code> dengan nama <code>' + data.pdf.split('/').pop() + '</code></p></div>';
    }

    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeProjModal(e) {
    const backdrop = document.getElementById('projModal');
    if (e && e.target !== backdrop) return;
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    // Clear iframe to stop PDF rendering
    document.getElementById('pmBody').innerHTML = '';
  }

  // Certification tabs
  function switchTab(btn, paneId) {
    document.querySelectorAll('.cert-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.cert-tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(paneId).classList.add('active');
  }

  // Cert Modal
  function openCertModal(data) {
    const modal = document.getElementById('certModal');
    document.getElementById('cmIcon').textContent = data.icon;
    document.getElementById('cmIcon').className = 'cert-modal-icon' + (data.type === 'vol' ? ' vol-icon' : '');
    document.getElementById('cmName').textContent = data.name;
    document.getElementById('cmMeta').textContent = data.issuer + ' · ' + data.date;

    const preview = document.getElementById('cmPreview');
    preview.innerHTML = '<div class="cert-modal-noimg"><svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>Memuat...</p></div>';

    const img = new Image();
    img.onload = () => {
      preview.innerHTML = '<img src="' + data.img + '" alt="' + data.name + '" onclick="window.open(\'' + data.img + '\',\'_blank\')" style="cursor:zoom-in;max-width:100%;max-height:55vh;border-radius:10px;border:1px solid rgba(255,255,255,0.08);box-shadow:0 12px 40px rgba(0,0,0,0.5)">';
    };
    img.onerror = () => {
      preview.innerHTML = '<div class="cert-modal-noimg"><svg width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p>File <strong>' + data.img + '</strong> belum tersedia.<br>Letakkan file sertifikat di folder <code>assets/</code> dengan nama yang sesuai.</p></div>';
    };
    img.src = data.img;

    document.getElementById('cmOpenBtn').href = data.img;
    document.getElementById('cmDownBtn').href = data.img;
    document.getElementById('cmDownBtn').download = data.name + '.png';

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeCertModal(e) {
    const modal = document.getElementById('certModal');
    if (e && e.target !== modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Global ESC key handler
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.getElementById('certModal').classList.remove('open');
      document.getElementById('lightbox').classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  // Particle generator around photo
  const particleContainer = document.getElementById('particles');
  const colors = ['#06b6d4','#3b82f6','#7c3aed','#a855f7','#60a5fa'];
  function spawnParticle() {
    const p = document.createElement('div');
    p.className = 'particle';
    const side = Math.random();
    let x, y;
    if (side < 0.25)      { x = Math.random() * 380; y = 380 + 20; } // bottom
    else if (side < 0.5)  { x = -20; y = Math.random() * 440; }       // left
    else if (side < 0.75) { x = 380 + 20; y = Math.random() * 440; }  // right
    else                  { x = Math.random() * 380; y = -20; }        // top
    p.style.left = x + 'px';
    p.style.top  = y + 'px';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.boxShadow = `0 0 6px ${colors[Math.floor(Math.random()*colors.length)]}`;
    const dur = 2 + Math.random() * 3;
    p.style.animationDuration = dur + 's';
    p.style.animationDelay = (Math.random() * 1) + 's';
    const size = 2 + Math.random() * 3;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    particleContainer.appendChild(p);
    setTimeout(() => p.remove(), (dur + 1) * 1000);
  }
  if (particleContainer) {
    setInterval(spawnParticle, 350);
  }

  function bukaModalPDF(urlPDF) {
    // Masukkan url PDF ke dalam iframe
    document.getElementById('pdfViewer').src = urlPDF;
    // Ubah display modal menjadi flex agar muncul di layar
    document.getElementById('modalPDF').style.display = 'flex';
}

function tutupModalPDF() {
    // Sembunyikan kembali modal
    document.getElementById('modalPDF').style.display = 'none';
    // Kosongkan src iframe agar PDF berhenti dimuat di latar belakang
    document.getElementById('pdfViewer').src = '';
}