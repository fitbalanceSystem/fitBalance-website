// Mobile menu
document.getElementById('menu-btn').addEventListener('click', () => {
  const m = document.getElementById('mobile-menu');
  m.classList.toggle('hidden');
  m.classList.toggle('flex');
});

// Header shadow on scroll
window.addEventListener('scroll', () => {
  document.getElementById('main-header').classList.toggle('scrolled', window.scrollY > 10);
});

// Fade in on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.15 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Animated counters
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = +el.dataset.target;
    let current = 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        el.textContent = target + '+';
        clearInterval(timer);
      } else {
        el.textContent = current;
      }
    }, 30);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.5 });

document.querySelectorAll('.counter').forEach(c => counterObserver.observe(c));
