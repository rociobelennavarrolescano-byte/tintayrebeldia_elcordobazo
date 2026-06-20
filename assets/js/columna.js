// Tinta y Rebeldía — interacciones de columna
// Maneja apertura/cierre de modales de "recurso gráfico" y accesibilidad básica.

document.addEventListener('DOMContentLoaded', () => {
  const overlays = document.querySelectorAll('.modal-overlay');

  const abrir = (id) => {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.add('abierto');
    const cerrarBtn = overlay.querySelector('.modal__cerrar');
    if (cerrarBtn) cerrarBtn.focus();
    document.body.style.overflow = 'hidden';
  };

  const cerrar = (overlay) => {
    overlay.classList.remove('abierto');
    document.body.style.overflow = '';
  };

  document.querySelectorAll('[data-abre-modal]').forEach((btn) => {
    btn.addEventListener('click', () => abrir(btn.getAttribute('data-abre-modal')));
  });

  overlays.forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cerrar(overlay);
    });
    const cerrarBtn = overlay.querySelector('.modal__cerrar');
    if (cerrarBtn) cerrarBtn.addEventListener('click', () => cerrar(overlay));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      overlays.forEach((overlay) => {
        if (overlay.classList.contains('abierto')) cerrar(overlay);
      });
    }
  });
});
