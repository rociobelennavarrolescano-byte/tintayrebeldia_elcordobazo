// ============================================================
// TINTA Y REBELDÍA — Editor de intervención gráfica
// Editor de dibujo a medida sobre <canvas>, sin librerías externas.
// Soporta: lápiz libre, texto, rectángulo, círculo, línea, deshacer,
// borrar todo, y exportar el resultado combinado (imagen + dibujo).
// ============================================================

function crearEditorIntervencion(contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return null;

  // --- Estado interno ---
  let imagenFondo = null;       // objeto Image() ya cargado
  let imagenFondoSrc = null;
  let herramienta = 'lapiz';    // 'lapiz' | 'texto' | 'rectangulo' | 'circulo' | 'linea'
  let color = '#f2ede3';
  let grosor = 4;
  let dibujando = false;
  let inicioX = 0;
  let inicioY = 0;

  // Cada acción de dibujo queda guardada como un objeto, para poder
  // redibujar todo desde cero (necesario para deshacer y para formas
  // con previsualización en vivo).
  let acciones = []; // { tipo, color, grosor, puntos:[{x,y}], ... }
  let accionActual = null;

  // --- Construcción del DOM interno ---
  contenedor.innerHTML = `
    <div class="ei-barra" role="toolbar" aria-label="Herramientas de dibujo">
      <div class="ei-grupo">
        <button type="button" class="ei-btn" data-herramienta="lapiz" aria-pressed="true" title="Lápiz">✏️</button>
        <button type="button" class="ei-btn" data-herramienta="texto" aria-pressed="false" title="Texto">🅣</button>
        <button type="button" class="ei-btn" data-herramienta="linea" aria-pressed="false" title="Línea">／</button>
        <button type="button" class="ei-btn" data-herramienta="rectangulo" aria-pressed="false" title="Rectángulo">▭</button>
        <button type="button" class="ei-btn" data-herramienta="circulo" aria-pressed="false" title="Círculo">◯</button>
      </div>
      <div class="ei-grupo">
        <input type="color" class="ei-color" value="${color}" aria-label="Elegir color" />
        <input type="range" class="ei-grosor" min="1" max="24" value="${grosor}" aria-label="Grosor del trazo" />
      </div>
      <div class="ei-grupo">
        <button type="button" class="ei-btn ei-btn-accion" data-accion="deshacer" title="Deshacer">↶ Deshacer</button>
        <button type="button" class="ei-btn ei-btn-accion" data-accion="borrar" title="Borrar todo">🗑 Borrar todo</button>
      </div>
    </div>
    <div class="ei-lienzo-envoltorio">
      <canvas class="ei-canvas"></canvas>
    </div>
  `;

  const canvas = contenedor.querySelector('.ei-canvas');
  const ctx = canvas.getContext('2d');
  const envoltorio = contenedor.querySelector('.ei-lienzo-envoltorio');
  const inputColor = contenedor.querySelector('.ei-color');
  const inputGrosor = contenedor.querySelector('.ei-grosor');
  const botonesHerramienta = contenedor.querySelectorAll('[data-herramienta]');
  const botonDeshacer = contenedor.querySelector('[data-accion="deshacer"]');
  const botonBorrar = contenedor.querySelector('[data-accion="borrar"]');

  // --- Tamaño del canvas: entra completo en pantalla, sin necesidad de scroll ---
  function ajustarTamano() {
    const ratio = imagenFondo ? imagenFondo.naturalHeight / imagenFondo.naturalWidth : 0.75;
    const anchoDisponible = envoltorio.clientWidth;

    // Alto máximo que puede ocupar el lienzo sin obligar a hacer scroll:
    // alto de la ventana, menos un margen para la barra de herramientas,
    // el texto de ayuda, los botones de abajo y un respiro visual.
    const margenReservado = 180;
    const altoMaximoPantalla = Math.max(window.innerHeight - margenReservado, 280);

    let ancho = anchoDisponible;
    let alto = Math.round(ancho * ratio);

    if (alto > altoMaximoPantalla) {
      alto = altoMaximoPantalla;
      ancho = Math.round(alto / ratio);
    }

    const dpr = window.devicePixelRatio || 1;

    canvas.style.width = ancho + 'px';
    canvas.style.height = alto + 'px';
    canvas.width = Math.round(ancho * dpr);
    canvas.height = Math.round(alto * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    redibujarTodo();
  }

  // --- Carga de imagen de fondo ---
  function cargarImagenDeFondo(src) {
    return new Promise((resolve) => {
      imagenFondoSrc = src;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imagenFondo = img;
        acciones = [];
        ajustarTamano();
        resolve(true);
      };
      img.onerror = () => {
        imagenFondo = null;
        resolve(false);
      };
      img.src = src;
    });
  }

  // --- Dibujo ---
  function redibujarTodo() {
    const anchoCss = parseInt(canvas.style.width, 10) || canvas.width;
    const altoCss = parseInt(canvas.style.height, 10) || canvas.height;

    ctx.clearRect(0, 0, anchoCss, altoCss);

    if (imagenFondo) {
      ctx.drawImage(imagenFondo, 0, 0, anchoCss, altoCss);
    } else {
      ctx.fillStyle = '#141210';
      ctx.fillRect(0, 0, anchoCss, altoCss);
    }

    acciones.forEach((accion) => dibujarAccion(accion));
    if (accionActual) dibujarAccion(accionActual);
  }

  function dibujarAccion(accion) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = accion.color;
    ctx.fillStyle = accion.color;
    ctx.lineWidth = accion.grosor;

    if (accion.tipo === 'lapiz') {
      if (accion.puntos.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(accion.puntos[0].x, accion.puntos[0].y);
      for (let i = 1; i < accion.puntos.length; i++) {
        ctx.lineTo(accion.puntos[i].x, accion.puntos[i].y);
      }
      ctx.stroke();
    }

    if (accion.tipo === 'linea') {
      const [a, b] = accion.puntos;
      if (!a || !b) return;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    if (accion.tipo === 'rectangulo') {
      const [a, b] = accion.puntos;
      if (!a || !b) return;
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }

    if (accion.tipo === 'circulo') {
      const [a, b] = accion.puntos;
      if (!a || !b) return;
      const rx = Math.abs(b.x - a.x) / 2;
      const ry = Math.abs(b.y - a.y) / 2;
      const cx = a.x + (b.x - a.x) / 2;
      const cy = a.y + (b.y - a.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (accion.tipo === 'texto') {
      const tamano = Math.max(accion.grosor * 4, 16);
      ctx.font = `600 ${tamano}px Poppins, sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(accion.texto, accion.puntos[0].x, accion.puntos[0].y);
    }
  }

  // --- Coordenadas relativas al canvas (funciona con mouse y touch) ---
  function obtenerCoordenadas(evento) {
    const rect = canvas.getBoundingClientRect();
    const punto = evento.touches ? evento.touches[0] : evento;
    return {
      x: punto.clientX - rect.left,
      y: punto.clientY - rect.top,
    };
  }

  // --- Interacción: empezar / continuar / terminar trazo ---
  function empezarTrazo(evento) {
    if (herramienta === 'texto') {
      manejarClickTexto(evento);
      return;
    }
    dibujando = true;
    const { x, y } = obtenerCoordenadas(evento);
    inicioX = x;
    inicioY = y;
    accionActual = {
      tipo: herramienta,
      color,
      grosor,
      puntos: herramienta === 'lapiz' ? [{ x, y }] : [{ x, y }, { x, y }],
    };
    redibujarTodo();
  }

  function continuarTrazo(evento) {
    if (!dibujando || !accionActual) return;
    const { x, y } = obtenerCoordenadas(evento);
    if (herramienta === 'lapiz') {
      accionActual.puntos.push({ x, y });
    } else {
      accionActual.puntos[1] = { x, y };
    }
    redibujarTodo();
  }

  function terminarTrazo() {
    if (!dibujando || !accionActual) return;
    dibujando = false;
    acciones.push(accionActual);
    accionActual = null;
    redibujarTodo();
  }

  function manejarClickTexto(evento) {
    const { x, y } = obtenerCoordenadas(evento);
    const texto = window.prompt('Escribí tu consigna o texto:');
    if (texto && texto.trim()) {
      acciones.push({
        tipo: 'texto',
        color,
        grosor,
        texto: texto.trim(),
        puntos: [{ x, y }],
      });
      redibujarTodo();
    }
  }

  // --- Eventos de mouse y touch ---
  canvas.addEventListener('mousedown', empezarTrazo);
  canvas.addEventListener('mousemove', continuarTrazo);
  window.addEventListener('mouseup', terminarTrazo);

  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); empezarTrazo(e); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); continuarTrazo(e); }, { passive: false });
  canvas.addEventListener('touchend', (e) => { e.preventDefault(); terminarTrazo(e); }, { passive: false });

  // --- Barra de herramientas ---
  botonesHerramienta.forEach((btn) => {
    btn.addEventListener('click', () => {
      herramienta = btn.getAttribute('data-herramienta');
      botonesHerramienta.forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    });
  });

  inputColor.addEventListener('input', (e) => { color = e.target.value; });
  inputGrosor.addEventListener('input', (e) => { grosor = parseInt(e.target.value, 10); });

  botonDeshacer.addEventListener('click', () => {
    acciones.pop();
    redibujarTodo();
  });

  botonBorrar.addEventListener('click', () => {
    if (acciones.length === 0) return;
    const confirmar = window.confirm('¿Borrar todo el dibujo? Esta acción no se puede deshacer.');
    if (confirmar) {
      acciones = [];
      redibujarTodo();
    }
  });

  window.addEventListener('resize', ajustarTamano);

  // --- Exportar el resultado como dataURL (imagen + dibujo combinados) ---
  function exportarComoDataUrl() {
    return canvas.toDataURL('image/png');
  }

  function hayDibujo() {
    return acciones.length > 0;
  }

  return {
    cargarImagenDeFondo,
    exportarComoDataUrl,
    hayDibujo,
  };
}
