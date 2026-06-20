document.addEventListener('DOMContentLoaded', () => {
  const elementos = document.querySelectorAll('.reveal');

  if (!elementos.length) return;

  const prefiereSinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefiereSinMovimiento) {
    elementos.forEach((el) => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('visible');
        observer.unobserve(entrada.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  elementos.forEach((el) => observer.observe(el));
});
