/* =============================================
   GALLERY.JS — Masonry Lightbox with <dialog>
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
  const galleryItems = document.querySelectorAll('.gallery-masonry-item');
  const lightboxDialog = document.querySelector('#lightboxDialog');
  const lightboxImg = document.querySelector('#lightboxImg');
  const lightboxCaption = document.querySelector('#lightboxCaption');
  const closeLightbox = document.querySelector('.lightbox-close');
  const prevBtn = document.querySelector('.lightbox-prev');
  const nextBtn = document.querySelector('.lightbox-next');

  if (!galleryItems.length || !lightboxDialog) return;

  let currentIndex = 0;
  const images = Array.from(galleryItems).map(item => ({
    src: item.querySelector('img').src,
    caption: item.querySelector('img').alt || ''
  }));

  function openLightbox(index) {
    currentIndex = index;
    showImage(currentIndex);
    lightboxDialog.showModal();
  }

  function showImage(index) {
    const img = images[index];
    lightboxImg.style.opacity = '0';
    setTimeout(() => {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.caption;
      if (lightboxCaption) lightboxCaption.textContent = img.caption;
      lightboxImg.style.opacity = '1';
    }, 150);
  }

  function navigateLightbox(direction) {
    currentIndex = (currentIndex + direction + images.length) % images.length;
    showImage(currentIndex);
  }

  // Open on click
  galleryItems.forEach((item, i) => {
    item.addEventListener('click', () => openLightbox(i));
  });

  // Controls
  closeLightbox?.addEventListener('click', () => lightboxDialog.close());
  prevBtn?.addEventListener('click', () => navigateLightbox(-1));
  nextBtn?.addEventListener('click', () => navigateLightbox(1));

  // Keyboard navigation
  lightboxDialog?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });

  // Light-dismiss fallback for Safari (closedby not supported)
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    lightboxDialog.addEventListener('click', (e) => {
      if (e.target !== lightboxDialog) return;
      const rect = lightboxDialog.getBoundingClientRect();
      const inside = rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
                     rect.left <= e.clientX && e.clientX <= rect.left + rect.width;
      if (!inside) lightboxDialog.close();
    });
  }

  // Touch swipe in lightbox
  let swipeStartX = 0;
  lightboxDialog?.addEventListener('touchstart', e => { swipeStartX = e.touches[0].clientX; }, { passive: true });
  lightboxDialog?.addEventListener('touchend', e => {
    const diff = swipeStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) navigateLightbox(diff > 0 ? 1 : -1);
  }, { passive: true });

  // Image transition style
  if (lightboxImg) {
    lightboxImg.style.transition = 'opacity 0.15s ease';
  }
});
