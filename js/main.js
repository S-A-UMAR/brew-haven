/* =============================================
   MAIN.JS — Core site-wide interactions
   ============================================= */

/* =============================================
   PWA — Service Worker Registration
   ============================================= */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[PWA] Service Worker registered:', reg.scope);

        // Check for updates every 60 seconds while tab is open
        setInterval(() => reg.update(), 60_000);

        // Notify user when a new version is waiting
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateToast();
            }
          });
        });
      })
      .catch((err) => console.warn('[PWA] Service Worker registration failed:', err));
  });
}

/* ── Update available toast ── */
function showUpdateToast() {
  const toast = document.createElement('div');
  toast.id = 'pwa-update-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span>✨ New version of Brew Haven is ready!</span>
    <button id="pwaUpdateBtn" aria-label="Reload to update">Reload</button>
    <button id="pwaToastDismiss" aria-label="Dismiss">✕</button>
  `;
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add('visible'));

  document.getElementById('pwaUpdateBtn')?.addEventListener('click', () => {
    window.location.reload();
  });
  document.getElementById('pwaToastDismiss')?.addEventListener('click', () => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 400);
  });
}

/* =============================================
   PWA — Install Prompt (Add to Home Screen)
   ============================================= */
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  deferredInstallPrompt = e;

  // Show our custom install banner after a short delay
  // (give the user time to engage with the site first)
  setTimeout(showInstallBanner, 4000);
});

function showInstallBanner() {
  // Don't show if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  // Don't show if already dismissed this session
  if (sessionStorage.getItem('pwa-install-dismissed')) return;
  // Don't show if no prompt is stored
  if (!deferredInstallPrompt) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Install Brew Haven app');
  banner.innerHTML = `
    <div class="pwa-banner-icon">
      <img src="/images/icons/icon-192.jpg" alt="Brew Haven app icon" width="48" height="48" />
    </div>
    <div class="pwa-banner-text">
      <strong>Add Brew Haven to your home screen</strong>
      <span>Get the app experience — works offline too!</span>
    </div>
    <div class="pwa-banner-actions">
      <button id="pwaInstallBtn" class="pwa-install-btn" aria-label="Install app">Install</button>
      <button id="pwaInstallDismiss" class="pwa-dismiss-btn" aria-label="Dismiss install banner">Not now</button>
    </div>
  `;
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('visible'));

  document.getElementById('pwaInstallBtn')?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);
    deferredInstallPrompt = null;
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 400);
  });

  document.getElementById('pwaInstallDismiss')?.addEventListener('click', () => {
    sessionStorage.setItem('pwa-install-dismissed', '1');
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 400);
  });
}

/* Track successful install */
window.addEventListener('appinstalled', () => {
  console.log('[PWA] App installed successfully');
  deferredInstallPrompt = null;
  // Optional: show a thank-you toast
  const toast = document.createElement('div');
  toast.id = 'pwa-installed-toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span>☕ Brew Haven installed! Find it on your home screen.</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 400); }, 4000);
});

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Preloader ---- */
  const preloader = document.querySelector('.preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      setTimeout(() => preloader.classList.add('hidden'), 500);
    });
    // Fallback: hide preloader after 3s even if load event doesn't fire
    setTimeout(() => preloader.classList.add('hidden'), 3000);
  }

  /* ---- Custom Cursor ---- */
  const cursorDot = document.querySelector('.cursor-dot');
  const cursorCircle = document.querySelector('.cursor-circle');
  const body = document.body;

  if (cursorDot && cursorCircle && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    body.classList.add('custom-cursor-active');
    let mouseX = 0, mouseY = 0;
    let circleX = 0, circleY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.left = mouseX + 'px';
      cursorDot.style.top = mouseY + 'px';
    });

    // Smooth trailing circle
    function animateCursor() {
      circleX += (mouseX - circleX) * 0.12;
      circleY += (mouseY - circleY) * 0.12;
      cursorCircle.style.left = circleX + 'px';
      cursorCircle.style.top = circleY + 'px';
      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Hover state on interactive elements
    const interactiveEls = document.querySelectorAll('a, button, [role="button"], input, select, textarea, .drink-card, .menu-card, .gallery-masonry-item, .gallery-preview-item');
    interactiveEls.forEach(el => {
      el.addEventListener('mouseenter', () => body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => body.classList.remove('cursor-hover'));
    });

    document.addEventListener('mouseleave', () => body.classList.remove('custom-cursor-active'));
    document.addEventListener('mouseenter', () => body.classList.add('custom-cursor-active'));
  }

  /* ---- Sticky Header ---- */
  const header = document.querySelector('.header');
  let lastScroll = 0;

  if (header) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      if (scrollY > 80) {
        header.classList.add('sticky');
      } else {
        header.classList.remove('sticky');
      }
      lastScroll = scrollY;
    }, { passive: true });
  }

  /* ---- Scroll Progress Bar ---- */
  const progressBar = document.querySelector('.scroll-progress-bar');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      progressBar.style.width = Math.min(progress, 100) + '%';
    }, { passive: true });
  }

  /* ---- Back to Top Button ---- */
  const backToTopBtn = document.querySelector('.back-to-top');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }, { passive: true });

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---- Mobile Menu Toggle ---- */
  const menuToggle = document.querySelector('.menu-toggle');
  const navList = document.querySelector('.nav-list');

  if (menuToggle && navList) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navList.classList.toggle('active');
      document.body.style.overflow = navList.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu when a nav link is clicked
    navList.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navList.classList.remove('active');
        document.body.style.overflow = '';
      });
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (!header.contains(e.target) && navList.classList.contains('active')) {
        menuToggle.classList.remove('active');
        navList.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  /* ---- Dark Mode Toggle ---- */
  const themeBtn = document.querySelector('.theme-toggle-btn');
  const savedTheme = localStorage.getItem('brew-haven-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('brew-haven-theme', next);
      updateThemeIcon(next);
    });
  }

  function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-icon');
    if (!icon) return;
    if (theme === 'dark') {
      // Sun icon for dark mode (click to go light)
      icon.innerHTML = `<path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zm0-16a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm7.071 3.515a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0zM6.05 17.657a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0zm13.364 0a1 1 0 0 1-1.414 1.414l-.707-.707a1 1 0 1 1 1.414-1.414l.707.707zM6.05 6.343a1 1 0 0 1-1.414 1.414l-.707-.707a1 1 0 1 1 1.414-1.414l.707.707zM21 11h1a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2zM3 11h1a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2z"/>`;
    } else {
      // Moon icon for light mode (click to go dark)
      icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
    }
  }

  /* ---- Active Nav Link Detection ---- */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* ---- Scroll Reveal with IntersectionObserver (fallback) ---- */
  const supportsScrollDriven = CSS.supports('(animation-timeline: view()) and (animation-range: entry)');
  if (!supportsScrollDriven) {
    const revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length > 0) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

      revealEls.forEach(el => revealObserver.observe(el));
    }
  } else {
    // Already driven by CSS, just make sure visible class doesn't block
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }

  /* ---- Parallax Hero Background ---- */
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      heroBg.style.transform = `translateY(${scrollY * 0.4}px)`;
    }, { passive: true });
  }

  /* ---- Animated Counters ---- */
  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = Math.floor(current).toLocaleString() + suffix;
    }, 16);
  }

  const counterEls = document.querySelectorAll('.counter-number[data-target]');
  if (counterEls.length > 0) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.counted) {
          entry.target.dataset.counted = '1';
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counterEls.forEach(el => counterObserver.observe(el));
  }

  /* ---- FAQ Accordion ---- */
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      const item = question.parentElement;
      const isOpen = item.classList.contains('open');

      // Close all others
      document.querySelectorAll('.faq-item.open').forEach(openItem => {
        openItem.classList.remove('open');
      });

      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });

  /* ---- Floating Order Now Dialog ---- */
  const orderDialog = document.querySelector('#orderDialog');
  const orderBtn = document.querySelector('.floating-order-btn');

  if (orderBtn && orderDialog) {
    orderBtn.addEventListener('click', () => {
      orderDialog.showModal();
    });

    // Fallback for browsers without closedby support
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      orderDialog.addEventListener('click', (e) => {
        if (e.target !== orderDialog) return;
        const rect = orderDialog.getBoundingClientRect();
        const inside = rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
                       rect.left <= e.clientX && e.clientX <= rect.left + rect.width;
        if (!inside) orderDialog.close();
      });
    }

    orderDialog.querySelector('.dialog-close-btn')?.addEventListener('click', () => {
      orderDialog.close();
    });
  }

  /* ---- Smooth Scrolling for anchor links ---- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

});
