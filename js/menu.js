/* =============================================
   MENU.JS — Menu Filtering with smooth fade
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const menuCards = document.querySelectorAll('.menu-card');

  if (!filterBtns.length || !menuCards.length) return;

  function filterMenu(category) {
    menuCards.forEach(card => {
      const cardCat = card.dataset.category;
      const matches = category === 'all' || cardCat === category;

      if (matches) {
        card.style.display = '';
        // Trigger reflow then fade back in
        requestAnimationFrame(() => {
          card.style.opacity = '1';
          card.style.transform = 'scale(1)';
        });
      } else {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
          card.style.display = 'none';
        }, 300);
      }
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterMenu(btn.dataset.category);
    });
  });

  // Initialize transition styles on cards
  menuCards.forEach(card => {
    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  });

  // Activate 'All' by default
  filterMenu('all');
});
