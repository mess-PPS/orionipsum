/* =========================================================
   Orion Ipsum · Boceto web · JavaScript sin librerías
   1. Idioma ES/EN
   2. Cabecera que cambia sobre fondo claro
   3. Cielo con la constelación de Orión (hero y contacto)
   4. Escena con scroll: la constelación se convierte en el plano de una villa
   5. Lente termográfica
   6. Línea de progreso del proceso
   ========================================================= */
(() => {
  'use strict';

  // Nota: muchos Windows traen desactivados los "Efectos de animación", y eso hace que
  // prefers-reduced-motion se active sin que el usuario lo sepa. Las animaciones de esta web
  // son suaves y casi todas responden al scroll, así que no se anulan; solo se suaviza el CSS.
  const reduceMotion = false;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /* ---------- 1. Idioma ----------
     En el boceto el inglés vive en atributos data-en.
     En la web final conviene generar /es/ y /en/ como páginas separadas (mejor para Google). */
  const langBtn = document.getElementById('lang');
  const i18nNodes = [...document.querySelectorAll('[data-en]')];
  i18nNodes.forEach(n => { n.dataset.es = n.textContent; });
  function setLang(lang) {
    document.documentElement.lang = lang;
    i18nNodes.forEach(n => { n.textContent = lang === 'en' ? n.dataset.en : n.dataset.es; });
    try { localStorage.setItem('oi-lang', lang); } catch (e) { /* sin almacenamiento */ }
  }
  langBtn.addEventListener('click', () => setLang(document.documentElement.lang === 'es' ? 'en' : 'es'));
  try { const saved = localStorage.getItem('oi-lang'); if (saved === 'en') setLang('en'); } catch (e) { /* nada */ }

  /* ---------- 2. Cabecera ---------- */
  const header = document.querySelector('.site-header');
  const lightBands = [...document.querySelectorAll('.band-light')];
  function updateHeader() {
    const y = 36;
    const overLight = lightBands.some(s => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom >= y; });
    header.classList.toggle('is-light', overLight);
    header.classList.toggle('is-solid', !overLight && window.scrollY > 40);
  }

  /* ---------- Datos de Orión ----------
     Mismas coordenadas que la constelación del dossier (assets/orion-coordenadas.json),
     normalizadas a una caja 0..1 de proporción 780 x 960. m = tamaño relativo (brillo). */
  const STARS = {
    club1   : { p: [0.0641, 0.0646], m: 1.18 },
    club2   : { p: [0.1474, 0.0500], m: 1.18 },
    club3   : { p: [0.0872, 0.2458], m: 1.36 },
    club4   : { p: [0.1987, 0.3823], m: 1.36 },
    betel   : { p: [0.2885, 0.4323], m: 3.18, warm: true },
    meissa  : { p: [0.4487, 0.3229], m: 1.64 },
    bella   : { p: [0.5769, 0.3906], m: 2.27 },
    s1      : { p: [0.6667, 0.0802], m: 1.27 },
    s2      : { p: [0.7590, 0.1198], m: 1.27 },
    s3      : { p: [0.8103, 0.2062], m: 1.27 },
    s4      : { p: [0.8590, 0.2469], m: 1.27 },
    s5      : { p: [0.9013, 0.3021], m: 1.45 },
    s6      : { p: [0.9128, 0.4240], m: 1.27 },
    alnitak : { p: [0.5128, 0.6667], m: 2.0 },
    alnilam : { p: [0.5641, 0.6385], m: 2.09 },
    mintaka : { p: [0.6090, 0.6115], m: 1.91 },
    saiph   : { p: [0.5577, 0.9135], m: 2.09 },
    rigel   : { p: [0.8333, 0.8125], m: 3.18 },
    sw1     : { p: [0.6256, 0.7083], m: 0.82 },
    sw3     : { p: [0.6564, 0.8177], m: 0.82 }
  };
  const LINKS = [
    ['club1', 'club3'], ['club2', 'club3'], ['club3', 'club4'], ['club4', 'betel'], ['betel', 'meissa'], ['meissa', 'bella'], ['bella', 's5'], ['s1', 's2'], ['s2', 's3'], ['s3', 's4'], ['s4', 's5'], ['s5', 's6'], ['bella', 'mintaka'], ['betel', 'alnitak'], ['alnitak', 'alnilam'], ['alnilam', 'mintaka'], ['alnitak', 'saiph'], ['mintaka', 'rigel'], ['saiph', 'rigel']
  ];
  const NEBULA = [0.6474, 0.7708];   // Nebulosa de Orión (rosada), igual que en el dossier

  function fitCanvas(c) {
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * DPR); c.height = Math.round(r.height * DPR);
    return { w: r.width, h: r.height };
  }

  function makeField(n) {
    return Array.from({ length: n }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.1 + .2,
      a: Math.random() * .6 + .2, tw: Math.random() * Math.PI * 2, d: Math.random() * .8 + .2
    }));
  }

  /* ---------- 3. Cielo ---------- */
  function sky(canvas, { constellation = true, density = 1 } = {}) {
    const ctx = canvas.getContext('2d');
    let size, field, t0 = performance.now(), mx = 0, my = 0, tx = 0, ty = 0, visible = true;

    function layout() {
      size = fitCanvas(canvas);
      field = makeField(Math.round(size.w * size.h / 3800 * density));
    }
    function box() {
      // Constelación a la derecha en escritorio; centrada y más tenue en móvil.
      const wide = size.w > 820;
      const h = Math.min(size.h * .78, wide ? size.w * .42 : size.w * .95);
      const w = h * .8125;
      return { x: wide ? size.w * .62 : (size.w - w) / 2, y: (size.h - h) / 2, w, h, wide };
    }
    function frame(now) {
      if (!visible) return requestAnimationFrame(frame);
      const t = (now - t0) / 1000;
      tx = lerp(tx, mx, .05); ty = lerp(ty, my, .05);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);

      for (const s of field) {
        const a = s.a * (reduceMotion ? 1 : .75 + .25 * Math.sin(t * 1.3 + s.tw));
        ctx.fillStyle = `rgba(238,242,247,${a})`;
        ctx.beginPath();
        ctx.arc(s.x * size.w + tx * 14 * s.d, s.y * size.h + ty * 14 * s.d, s.r, 0, 6.283);
        ctx.fill();
      }

      if (constellation) {
        const b = box();
        const pos = k => [b.x + STARS[k].p[0] * b.w + tx * 26, b.y + STARS[k].p[1] * b.h + ty * 26];
        const draw = reduceMotion ? 1 : clamp((t - .4) / 2.6);
        ctx.lineWidth = 1;
        {   // nebulosa de Orión: un resplandor rosado muy suave, como en el dossier
          const nx = b.x + NEBULA[0] * b.w + tx * 26, ny = b.y + NEBULA[1] * b.h + ty * 26, nr = b.h * .075;
          const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
          const nk = (b.wide ? 1 : .5) * clamp((t - 1.2) / 1.6);
          ng.addColorStop(0, `rgba(232,121,185,${.5 * nk})`); ng.addColorStop(.5, `rgba(139,92,246,${.2 * nk})`); ng.addColorStop(1, 'rgba(139,92,246,0)');
          ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(nx, ny, nr, 0, 6.283); ctx.fill();
        }
        LINKS.forEach(([a, c], i) => {
          const lt = ease(clamp(draw * LINKS.length - i * .7, 0, 1));
          if (lt <= 0) return;
          const [x1, y1] = pos(a), [x2, y2] = pos(c);
          ctx.strokeStyle = `rgba(156,200,240,${b.wide ? .35 : .22})`;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(lerp(x1, x2, lt), lerp(y1, y2, lt)); ctx.stroke();
        });
        for (const k in STARS) {
          const s = STARS[k], [x, y] = pos(k);
          const pulse = reduceMotion ? 1 : .85 + .15 * Math.sin(t * 2 + s.m);
          const r = s.m * 1.25 * pulse;
          const k2 = b.wide ? 1 : .45;   // en móvil, detrás del texto: más tenue
          const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
          const col = s.warm ? '245,185,33' : '214,232,250';
          g.addColorStop(0, `rgba(${col},${.55 * k2})`); g.addColorStop(1, `rgba(${col},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 6, 0, 6.283); ctx.fill();
          ctx.fillStyle = s.warm ? `rgba(245,185,33,${k2})` : `rgba(244,248,252,${k2})`;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
        }
      }
      requestAnimationFrame(frame);
    }

    layout();
    addEventListener('resize', layout);
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);
    requestAnimationFrame(frame);
  }

  /* ---------- 4. De la constelación al plano ----------
     Las estrellas de Orión bajan y se convierten en los puntos de arranque
     del plano; después una "pluma" dibuja el alzado de la villa trazo a trazo.
     El dibujo avanza solo al entrar en la sección y el scroll lo completa:
     cotas, niveles, cajetín y, al final, las incidencias detectadas.
     Coordenadas del dibujo en una caja de 1.8 x 1.12. */
  const circle = (cx, cy, r, n = 28) => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos(-Math.PI / 2 + i / n * 6.283) * r, cy + Math.sin(-Math.PI / 2 + i / n * 6.283) * r]);
  const VILLA = [
    [[0.00, 0.85], [1.60, 0.85]],                                                   // terreno
    [[0.20, 0.85], [0.20, 0.57]],                                                   // muro izquierdo
    [[0.12, 0.55], [1.12, 0.55], [1.12, 0.575], [0.12, 0.575], [0.12, 0.55]],         // forjado
    [[1.05, 0.575], [1.05, 0.85]],                                                  // muro derecho
    [[0.45, 0.55], [0.45, 0.33]],                                                   // muro planta alta
    [[0.35, 0.30], [1.36, 0.30], [1.36, 0.33], [0.35, 0.33], [0.35, 0.30]],          // cubierta
    [[1.26, 0.33], [1.26, 0.52], [1.12, 0.52]],                                     // voladizo
    [[0.60, 0.37], [1.16, 0.37], [1.16, 0.50], [0.60, 0.50], [0.60, 0.37]],          // ventanal alto
    [[0.74, 0.37], [0.74, 0.50]], [[0.88, 0.37], [0.88, 0.50]], [[1.02, 0.37], [1.02, 0.50]],
    [[0.63, 0.475], [0.68, 0.395]], [[0.65, 0.48], [0.70, 0.40]], [[0.91, 0.475], [0.96, 0.395]],
    [[0.48, 0.35], [0.48, 0.52]], [[0.51, 0.35], [0.51, 0.52]], [[0.54, 0.35], [0.54, 0.52]], [[0.57, 0.35], [0.57, 0.52]], // lamas
    [[0.13, 0.55], [0.13, 0.49], [0.45, 0.49]],                                     // barandilla de vidrio
    [[0.30, 0.85], [0.30, 0.61], [0.98, 0.61], [0.98, 0.85]],                        // carpintería baja
    [[0.47, 0.61], [0.47, 0.85]], [[0.64, 0.61], [0.64, 0.85]], [[0.81, 0.61], [0.81, 0.85]],
    [[0.33, 0.80], [0.39, 0.68]], [[0.67, 0.80], [0.73, 0.68]],
    [[0.04, 0.85], [0.04, 0.60]], [[0.00, 0.60], [0.20, 0.60]],                      // pérgola
    [[0.035, 0.585], [0.035, 0.615]], [[0.075, 0.585], [0.075, 0.615]], [[0.115, 0.585], [0.115, 0.615]], [[0.155, 0.585], [0.155, 0.615]],
    [[1.12, 0.85], [1.12, 0.895], [1.55, 0.895], [1.55, 0.85]],                      // piscina
    [[1.15, 0.87], [1.52, 0.87]],
    circle(1.42, 0.60, 0.085), [[1.42, 0.685], [1.42, 0.85]],                        // árbol
    [[1.47, 0.85], [1.47, 0.76]], circle(1.47, 0.735, 0.03, 16)
  ];
  const ANCHOR_STARS = Object.keys(STARS);
  const DIMS = [
    { l: [0.20, 0.95, 1.05, 0.95], label: '14,20 m' },
    { l: [1.64, 0.30, 1.64, 0.85], label: '7,35 m', v: true }
  ];
  const LEVELS = [[0.85, '+0,00'], [0.55, '+3,40'], [0.30, '+6,60']];
  const MARKS = [
    { p: [0.70, 0.30], es: 'Fisura en falso techo', en: 'Ceiling crack' },
    { p: [0.26, 0.70], es: 'Humedad en paramento', en: 'Damp on wall' },
    { p: [1.30, 0.87], es: 'Rebose irregular', en: 'Uneven overflow' }
  ];
  const segLen = pts => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  const VLEN = VILLA.map(segLen), VTOTAL = VLEN.reduce((a, b) => a + b, 0);

  function blueprint(canvas) {
    const ctx = canvas.getContext('2d');
    const section = document.getElementById('morph');
    const caps = [...section.querySelectorAll('.cap')];
    let size, field, target = 0, shown = 0, dp = 0, autoStart = 0, visible = false, raf = 0, last = 0;

    function layout() { size = fitCanvas(canvas); field = makeField(Math.round(size.w * size.h / 5200)); }
    function box() {
      // El plano siempre cabe entero en pantalla (sin desbordarse). En vertical se ajusta al ancho
      // disponible y se centra entre la cabecera y el texto.
      const port = size.w < 1000 && size.w < size.h;
      const base = Math.min(size.w * (size.w < 600 ? .96 : .90) / 1.8, size.h * .62 / 1.12);
      if (!port) return { S: base, x: (size.w - 1.8 * base) / 2, y: size.h * .08 };
      const capBlock = 190, top = 78, availH = size.h - top - capBlock;
      return { S: base, x: (size.w - 1.8 * base) / 2, y: top + (availH - .85 * base) / 2 - .25 * base };
    }
    function drawPolyline(pts, len, X, Y) {
      // dibuja la polilínea hasta la longitud "len" y devuelve la punta
      ctx.beginPath(); ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
      let left = len, tip = pts[0];
      for (let i = 1; i < pts.length && left > 0; i++) {
        const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const t = Math.min(1, left / l); tip = [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
        ctx.lineTo(X(tip[0]), Y(tip[1])); left -= l;
      }
      ctx.stroke();
      return tip;
    }
    const p0 = () => dp;
    function draw(now) {
      const p = dp, { S, x: ox, y: oy } = box(p0());
      const X = u => ox + u * S, Y = v => oy + v * S;
      const t = now / 1000;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);

      // cielo de fondo que se apaga según aparece el plano
      const fieldA = 1 - clamp((p - .12) / .4) * .75;
      for (const s of field) {
        ctx.fillStyle = `rgba(238,242,247,${s.a * fieldA * (.75 + .25 * Math.sin(t * 1.4 + s.tw))})`;
        ctx.beginPath(); ctx.arc(s.x * size.w, s.y * size.h, s.r, 0, 6.283); ctx.fill();
      }

      // retícula y líneas de construcción
      const gridA = clamp((p - .16) / .2);
      if (gridA > 0) {
        ctx.lineWidth = 1; ctx.strokeStyle = `rgba(156,200,240,${gridA * .06})`;
        const step = S / 10;
        for (let gx = ox % step; gx < size.w; gx += step) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, size.h); ctx.stroke(); }
        for (let gy = oy % step; gy < size.h; gy += step) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(size.w, gy); ctx.stroke(); }
        ctx.strokeStyle = `rgba(156,200,240,${gridA * .18})`; ctx.setLineDash([2, 6]);
        [0.30, 0.55, 0.85].forEach(v => { ctx.beginPath(); ctx.moveTo(X(-0.05), Y(v)); ctx.lineTo(X(-0.05) + (X(1.75) - X(-0.05)) * gridA, Y(v)); ctx.stroke(); });
        ctx.setLineDash([]);
      }

      // estrellas: de Orión a los puntos de arranque del plano
      const fall = ease(clamp((p - .06) / .18));
      const starA = 1 - clamp((p - .3) / .12);
      if (starA > 0) {
        const lineA = (1 - fall) * .45;
        if (lineA > .01) {
          ctx.strokeStyle = `rgba(156,200,240,${lineA})`; ctx.lineWidth = 1;
          LINKS.forEach(([a, b]) => {
            const A = STARS[a].p, B = STARS[b].p;
            ctx.beginPath(); ctx.moveTo(X(.45 + A[0] * .9), Y(.02 + A[1] * .8)); ctx.lineTo(X(.45 + B[0] * .9), Y(.02 + B[1] * .8)); ctx.stroke();
          });
        }
        ANCHOR_STARS.forEach((k, i) => {
          const s = STARS[k], from = [.45 + s.p[0] * .9, .02 + s.p[1] * .8], to = VILLA[i % VILLA.length][0];
          const x = X(lerp(from[0], to[0], fall)), y = Y(lerp(from[1], to[1], fall));
          const r = lerp(s.m * 1.3, 2, fall);
          const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
          const col = s.warm ? '245,185,33' : '214,232,250';
          g.addColorStop(0, `rgba(${col},${.5 * starA})`); g.addColorStop(1, `rgba(${col},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 5, 0, 6.283); ctx.fill();
          ctx.fillStyle = s.warm ? `rgba(245,185,33,${starA})` : `rgba(244,248,252,${starA})`;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
        });
      }

      // trazos del plano
      const drawn = clamp((p - .24) / .44) * VTOTAL;
      let acc = 0, tip = null;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      VILLA.forEach((pts, i) => {
        const l = drawn - acc; acc += VLEN[i];
        if (l <= 0) return;
        ctx.strokeStyle = 'rgba(170,208,242,.92)'; ctx.lineWidth = i === 0 ? 1.8 : 1.3;
        const tp = drawPolyline(pts, l, X, Y);
        if (l < VLEN[i]) tip = tp;
      });
      // rayado del terreno, aparece con la línea de tierra
      const hatchA = clamp(drawn / VLEN[0]);
      if (hatchA > 0) {
        ctx.strokeStyle = `rgba(156,200,240,${.28 * hatchA})`; ctx.lineWidth = 1;
        for (let u = 0; u < 1.6 * hatchA; u += .025) {
          if (u > 1.11 && u < 1.56) continue;
          ctx.beginPath(); ctx.moveTo(X(u), Y(.85)); ctx.lineTo(X(u + .025), Y(.875)); ctx.stroke();
        }
      }
      // punta de la pluma
      if (tip && drawn < VTOTAL) {
        const x = X(tip[0]), y = Y(tip[1]);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 16);
        g.addColorStop(0, 'rgba(245,185,33,.9)'); g.addColorStop(1, 'rgba(245,185,33,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 16, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#FFE8A8'; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.283); ctx.fill();
      }

      // cotas y niveles
      const dimT = clamp((p - .66) / .1);
      if (dimT > 0) {
        ctx.strokeStyle = 'rgba(156,200,240,.7)'; ctx.lineWidth = 1;
        ctx.font = `500 ${Math.max(11, S * .028)}px "IBM Plex Mono", monospace`;
        DIMS.forEach(d => {
          const [a, b, c, e] = d.l, ex = lerp(a, c, dimT), ey = lerp(b, e, dimT);
          ctx.beginPath(); ctx.moveTo(X(a), Y(b)); ctx.lineTo(X(ex), Y(ey)); ctx.stroke();
          [[a, b], [ex, ey]].forEach(([u, w]) => { ctx.beginPath(); ctx.moveTo(X(u) - 5, Y(w) + 5); ctx.lineTo(X(u) + 5, Y(w) - 5); ctx.stroke(); });
          ctx.fillStyle = `rgba(238,242,247,${dimT})`; ctx.textAlign = 'center';
          if (d.v) { ctx.save(); ctx.translate(X(a) - 16, Y((b + e) / 2)); ctx.rotate(-Math.PI / 2); ctx.fillText(d.label, 0, 0); ctx.restore(); }
          else ctx.fillText(d.label, X((a + c) / 2), Y(b) + 20);
        });
        ctx.textAlign = 'left';
        LEVELS.forEach(([v, txt], i) => {
          const a = clamp(dimT * 3 - i); if (a <= 0) return;
          const x = X(1.72), y = Y(v);
          ctx.strokeStyle = `rgba(245,185,33,${a})`; ctx.beginPath(); ctx.moveTo(x - 6, y - 9); ctx.lineTo(x + 6, y - 9); ctx.lineTo(x, y); ctx.closePath(); ctx.stroke();
          ctx.fillStyle = `rgba(238,242,247,${a * .85})`; ctx.fillText(txt, x + 10, y - 2);
        });
      }

      // cajetín
      const tbA = clamp((p - .72) / .08);
      if (tbA > 0) {
        const w = Math.max(0.6 * S, 128), h = Math.max(0.12 * S, 40), x0 = Math.min(X(1.18), size.w - w - 8), y0 = Y(0.98) + (h > .12 * S ? 4 : 0);
        ctx.strokeStyle = `rgba(156,200,240,${.55 * tbA})`; ctx.lineWidth = 1;
        ctx.strokeRect(x0, y0, w * tbA, h);
        ctx.beginPath(); ctx.moveTo(x0 + w * .55, y0); ctx.lineTo(x0 + w * .55, y0 + h); ctx.moveTo(x0 + w * .55, y0 + h / 2); ctx.lineTo(x0 + w, y0 + h / 2); ctx.stroke();
        const en = document.documentElement.lang === 'en';
        ctx.fillStyle = `rgba(238,242,247,${tbA * .9})`; ctx.font = `600 ${Math.max(10, S * .026)}px Sora, sans-serif`;
        ctx.fillText('ORION IPSUM', x0 + 10, y0 + h * .42);
        ctx.font = `400 ${Math.max(10, S * .022)}px Manrope, sans-serif`; ctx.fillStyle = `rgba(169,180,194,${tbA})`;
        ctx.fillText(en ? 'Main elevation' : 'Alzado principal', x0 + 10, y0 + h * .78);
        ctx.font = `500 ${Math.max(10, S * .022)}px "IBM Plex Mono", monospace`;
        ctx.fillText(en ? 'Scale 1:100' : 'E 1:100', x0 + w * .55 + 10, y0 + h * .36);
        ctx.fillText(en ? 'Sheet 01' : 'Hoja 01', x0 + w * .55 + 10, y0 + h * .84);
      }

      // incidencias
      const markA = clamp((p - .8) / .12);
      if (markA > 0) {
        const en = document.documentElement.lang === 'en';
        ctx.font = `500 ${Math.max(12, S * .03)}px Manrope, sans-serif`;
        MARKS.forEach((m, i) => {
          const a = clamp(markA * 3 - i); if (a <= 0) return;
          const x = X(m.p[0]), y = Y(m.p[1]), pulse = 9 + Math.sin(t * 3 + i) * 2;
          ctx.strokeStyle = `rgba(245,185,33,${a})`; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x, y, pulse, 0, 6.283); ctx.stroke();
          ctx.fillStyle = `rgba(245,185,33,${a})`; ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.283); ctx.fill();
          const label = en ? m.en : m.es;
          const left = x + 30 + ctx.measureText(label).width > size.w - 12, dir = left ? -1 : 1;
          ctx.beginPath(); ctx.moveTo(x + 9 * dir, y - 9); ctx.lineTo(x + 26 * dir, y - 26); ctx.stroke();
          ctx.fillStyle = `rgba(238,242,247,${a})`; ctx.textAlign = left ? 'right' : 'left';
          ctx.fillText(label, x + 30 * dir, y - 28); ctx.textAlign = 'left';
        });
      }

      const step = p < .3 ? 0 : p < .76 ? 1 : 2;
      if (step !== shown) { caps[shown].classList.remove('is-on'); caps[step].classList.add('is-on'); shown = step; }
    }
    function scrollProgress() {
      const r = section.getBoundingClientRect();
      return clamp(-r.top / (r.height - innerHeight));
    }
    function loop(now) {
      raf = 0;
      const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      // avance automático al entrar: dibuja la villa aunque no se haga scroll
      if (visible && !autoStart && section.getBoundingClientRect().top < innerHeight * .35) autoStart = now;
      const auto = autoStart ? Math.min(1, (now - autoStart) / 13000) : 0;
      target = Math.max(scrollProgress(), auto);
      dp += (target - dp) * Math.min(1, dt * 2.2);
      draw(now);
      if (visible) raf = requestAnimationFrame(loop);
    }
    const request = () => { if (!raf) raf = requestAnimationFrame(loop); };
    layout();
    addEventListener('resize', () => { layout(); request(); });
    addEventListener('scroll', request, { passive: true });
    langBtn.addEventListener('click', request);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { last = 0; request(); } }, { threshold: .25 }).observe(section.querySelector('.morph-sticky'));
    request();
  }

  /* ---------- 5. Lente termográfica ----------
     Dos imágenes de la misma pared: la visible y la térmica (generada a partir
     de un campo de temperaturas). La lente muestra la térmica bajo el cursor
     y cuenta las anomalías que el visitante va encontrando. */
  function thermo(canvas) {
    const ctx = canvas.getContext('2d');
    const out = document.getElementById('readout'), outSub = document.getElementById('readout-sub');
    const outLabel = document.getElementById('thermo-label'), outCount = document.getElementById('thermo-count');
    const W = 800, H = 500, REF = 22.5;
    const WIN = { u0: .58, u1: .90, v0: .14, v1: .70 };   // ventana

    // Anomalías: d = diferencia de temperatura en °C (negativa = zona fría/húmeda)
    const SPOTS = [
      { u: .19, v: .79, rx: .17, ry: .075, d: -3.2, es: 'Humedad por capilaridad junto al rodapié', en: 'Rising damp at the skirting' },
      { u: .74, v: .775, rx: .12, ry: .045, d: -2.4, es: 'Condensación bajo el alféizar', en: 'Condensation below the sill' },
      { u: .06, v: .11, rx: .12, ry: .11, d: -2.8, es: 'Filtración en el encuentro con el techo', en: 'Leak at the wall–ceiling junction' },
      { u: .41, v: .47, rx: .02, ry: .30, d: 2.7, es: 'Fuga en tubería de agua caliente empotrada', en: 'Leak in an embedded hot-water pipe' }
    ];
    const found = new Set();

    function g2(dx, dy) { return Math.exp(-(dx * dx + dy * dy)); }
    function strength(s, u, v) { return g2((u - s.u) / s.rx, (v - s.v) / s.ry); }
    function temp(u, v) {
      let t = REF + (v - .5) * -0.5;
      if (v > .86) t += 1.6;                                              // suelo radiante
      const inWin = u > WIN.u0 && u < WIN.u1 && v > WIN.v0 && v < WIN.v1;
      if (inWin) {
        const edge = Math.min(u - WIN.u0, WIN.u1 - u, v - WIN.v0, WIN.v1 - v);
        t = edge < .016 ? 17.6 : 19.3 + (v - WIN.v0) * 1.2;                 // marco de aluminio más frío que el vidrio
        if (Math.abs(u - (WIN.u0 + WIN.u1) / 2) < .008) t = 17.8;            // encuentro de hojas
      }
      if (!inWin) for (const s of SPOTS) t += s.d * strength(s, u, v);
      t -= 1.4 * g2((u - .41) / .07, (v - .76) / .045);                    // mancha húmeda al pie de la fuga
      return t;
    }
    const STOPS = [[0, [10, 4, 40]], [.25, [70, 12, 120]], [.5, [190, 40, 110]], [.72, [238, 110, 30]], [.9, [252, 200, 60]], [1, [255, 248, 210]]];
    function ironbow(x) {
      x = clamp(x);
      for (let i = 1; i < STOPS.length; i++) if (x <= STOPS[i][0]) {
        const [p0, c0] = STOPS[i - 1], [p1, c1] = STOPS[i], k = (x - p0) / (p1 - p0);
        return c0.map((c, j) => Math.round(lerp(c, c1[j], k)));
      }
      return STOPS[STOPS.length - 1][1];
    }

    // --- Imagen visible ---
    const vis = document.createElement('canvas'); vis.width = W; vis.height = H;
    const v = vis.getContext('2d');
    const U = x => x * W, V = y => y * H;
    let g = v.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#E9E5DE'); g.addColorStop(1, '#DAD5CD');
    v.fillStyle = g; v.fillRect(0, 0, W, H);
    // textura suave de pintura
    for (let i = 0; i < 2600; i++) { v.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '120,110,100'},.035)`; v.fillRect(Math.random() * W, Math.random() * H * .86, 2, 2); }
    // techo y moldura
    v.fillStyle = '#F3F0EB'; v.fillRect(0, 0, W, V(.055));
    v.fillStyle = '#E2DDD5'; v.fillRect(0, V(.055), W, 5);
    v.fillStyle = 'rgba(0,0,0,.07)'; v.fillRect(0, V(.055) + 5, W, 2);

    // ventana: exterior (cielo, mar, colinas)
    const wx = U(WIN.u0), wy = V(WIN.v0), ww = U(WIN.u1 - WIN.u0), wh = V(WIN.v1 - WIN.v0);
    g = v.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, '#BFD8EA'); g.addColorStop(.55, '#E6EFF4'); g.addColorStop(.56, '#6F9DBB'); g.addColorStop(1, '#5B8BAA');
    v.fillStyle = g; v.fillRect(wx, wy, ww, wh);
    v.fillStyle = '#9DB3BF';
    v.beginPath(); v.moveTo(wx, wy + wh * .55);
    for (let i = 0; i <= 20; i++) v.lineTo(wx + ww * i / 20, wy + wh * (.47 + .05 * Math.sin(i * .9) + .02 * Math.sin(i * 2.3)));
    v.lineTo(wx + ww, wy + wh * .56); v.closePath(); v.fill();
    // palmera en silueta
    v.strokeStyle = '#4C5B52'; v.lineWidth = 3; v.beginPath(); v.moveTo(wx + ww * .2, wy + wh); v.quadraticCurveTo(wx + ww * .18, wy + wh * .7, wx + ww * .24, wy + wh * .42); v.stroke();
    v.fillStyle = '#4C5B52';
    for (let a = 0; a < 7; a++) { v.save(); v.translate(wx + ww * .24, wy + wh * .42); v.rotate(-2.6 + a * .72); v.beginPath(); v.ellipse(18, 0, 20, 3.2, 0, 0, 6.283); v.fill(); v.restore(); }
    // reflejos del vidrio
    v.fillStyle = 'rgba(255,255,255,.22)';
    v.beginPath(); v.moveTo(wx + ww * .08, wy); v.lineTo(wx + ww * .2, wy); v.lineTo(wx + ww * .02, wy + wh * .55); v.lineTo(wx, wy + wh * .55); v.closePath(); v.fill();
    v.beginPath(); v.moveTo(wx + ww * .62, wy); v.lineTo(wx + ww * .68, wy); v.lineTo(wx + ww * .55, wy + wh * .4); v.lineTo(wx + ww * .52, wy + wh * .4); v.closePath(); v.fill();
    // carpintería: marco, dos hojas correderas, tiradores
    v.strokeStyle = '#2E3338'; v.lineWidth = 12; v.strokeRect(wx, wy, ww, wh);
    v.lineWidth = 5; v.strokeRect(wx + 8, wy + 8, ww / 2 - 8, wh - 16); v.strokeRect(wx + ww / 2, wy + 8, ww / 2 - 8, wh - 16);
    v.fillStyle = '#2E3338'; v.fillRect(wx + ww / 2 - 4, wy + 6, 8, wh - 12);
    v.fillStyle = '#8A9097'; v.fillRect(wx + ww / 2 - 14, wy + wh * .5 - 16, 4, 32); v.fillRect(wx + ww / 2 + 10, wy + wh * .5 - 16, 4, 32);
    // sombra del marco en la pared y alféizar de piedra
    v.fillStyle = 'rgba(0,0,0,.08)'; v.fillRect(wx + ww + 6, wy + 4, 6, wh);
    v.fillStyle = '#F2ECE2'; v.fillRect(wx - 14, wy + wh + 4, ww + 28, V(.028));
    v.fillStyle = 'rgba(0,0,0,.12)'; v.fillRect(wx - 14, wy + wh + 4 + V(.028), ww + 28, 4);
    // interruptor y enchufe
    v.fillStyle = '#F7F5F1'; v.strokeStyle = 'rgba(0,0,0,.12)'; v.lineWidth = 1;
    v.fillRect(U(.49), V(.47), 26, 26); v.strokeRect(U(.49), V(.47), 26, 26);
    v.fillRect(U(.27), V(.74), 26, 26); v.strokeRect(U(.27), V(.74), 26, 26);
    v.fillStyle = 'rgba(0,0,0,.35)'; v.beginPath(); v.arc(U(.27) + 9, V(.74) + 13, 2, 0, 6.283); v.arc(U(.27) + 17, V(.74) + 13, 2, 0, 6.283); v.fill();
    // suelo de piedra y rodapié
    v.fillStyle = '#C8C0B2'; v.fillRect(0, V(.86), W, V(.14));
    v.strokeStyle = 'rgba(0,0,0,.08)'; for (let x = 0; x < W; x += 128) { v.beginPath(); v.moveTo(x, V(.86)); v.lineTo(x - 30, H); v.stroke(); }
    v.fillStyle = '#F5F2ED'; v.fillRect(0, V(.83), W, V(.03));
    // manchas apenas visibles (a simple vista casi no se aprecian)
    function stain(u, vv, rx, ry, col, a) {
      const gg = v.createRadialGradient(U(u), V(vv), 0, U(u), V(vv), U(rx));
      gg.addColorStop(0, `rgba(${col},${a})`); gg.addColorStop(1, `rgba(${col},0)`);
      v.save(); v.translate(U(u), V(vv)); v.scale(1, (ry * H) / (rx * W)); v.translate(-U(u), -V(vv));
      v.fillStyle = gg; v.beginPath(); v.arc(U(u), V(vv), U(rx), 0, 6.283); v.fill(); v.restore();
    }
    stain(.19, .80, .15, .06, '150,135,110', .16);
    stain(.06, .10, .1, .09, '170,150,90', .14);
    stain(.74, .78, .09, .035, '110,115,110', .12);
    stain(.41, .76, .05, .04, '140,130,115', .12);

    // --- Imagen térmica ---
    const th = document.createElement('canvas'); th.width = W; th.height = H;
    const tc = th.getContext('2d');
    const lowW = 240, lowH = 150, img = tc.createImageData(lowW, lowH);
    for (let y = 0; y < lowH; y++) for (let x = 0; x < lowW; x++) {
      const c = ironbow((temp((x + .5) / lowW, (y + .5) / lowH) - 16.5) / 9), i = (y * lowW + x) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
    }
    const low = document.createElement('canvas'); low.width = lowW; low.height = lowH;
    low.getContext('2d').putImageData(img, 0, 0);
    tc.imageSmoothingQuality = 'high'; tc.drawImage(low, 0, 0, W, H);
    // contornos tenues de la escena sobre la térmica, como hacen las cámaras con fusión de imagen
    tc.globalAlpha = .18; tc.globalCompositeOperation = 'overlay'; tc.drawImage(vis, 0, 0); tc.globalAlpha = 1; tc.globalCompositeOperation = 'source-over';

    let lens = { u: .22, v: .74 }, target = { ...lens }, size, raf = 0;
    function layout() { size = fitCanvas(canvas); }
    function update() {
      const en = document.documentElement.lang === 'en';
      const t = temp(lens.u, lens.v), dt = t - REF;
      out.textContent = t.toFixed(1).replace('.', ',') + ' °C';
      outSub.textContent = 'ΔT ' + (dt >= 0 ? '+' : '−') + Math.abs(dt).toFixed(1).replace('.', ',') + ' °C';
      let hit = null;
      SPOTS.forEach((s, i) => { if (strength(s, lens.u, lens.v) > .35) { hit = s; found.add(i); } });
      outLabel.textContent = hit ? (en ? hit.en : hit.es) : (en ? 'No anomaly under the lens' : 'Sin anomalías bajo la lente');
      outLabel.classList.toggle('is-hit', !!hit);
      outCount.textContent = (en ? 'Found ' : 'Detectadas ') + found.size + (en ? ' of ' : ' de ') + SPOTS.length;
    }
    function draw() {
      raf = 0;
      lens.u = lerp(lens.u, target.u, .2); lens.v = lerp(lens.v, target.v, .2);
      const { w, h } = size, R = Math.max(56, w * .14), cx = lens.u * w, cy = lens.v * h;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.drawImage(vis, 0, 0, w, h);
      // anomalías ya encontradas: marcadas en la imagen visible
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(214,150,10,.9)'; ctx.lineWidth = 1.5;
      found.forEach(i => { const s = SPOTS[i]; ctx.beginPath(); ctx.ellipse(s.u * w, s.v * h, Math.max(s.rx * w, 14), Math.max(s.ry * h, 14), 0, 0, 6.283); ctx.stroke(); });
      ctx.setLineDash([]);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.clip();
      ctx.drawImage(th, 0, 0, w, h); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8); ctx.stroke();
      update();
      if (Math.abs(lens.u - target.u) + Math.abs(lens.v - target.v) > .001) raf = requestAnimationFrame(draw);
    }
    const request = () => { if (!raf) raf = requestAnimationFrame(draw); };
    function move(e) {
      const r = canvas.getBoundingClientRect();
      target = { u: clamp((e.clientX - r.left) / r.width), v: clamp((e.clientY - r.top) / r.height) };
      request();
    }
    layout(); draw();
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', move);
    addEventListener('resize', () => { layout(); request(); });
    langBtn.addEventListener('click', request);
  }

  /* ---------- 5b. Fisurómetro ----------
     Techo con una fisura que nace en la esquina de un difusor lineal.
     La tarjeta fisurométrica se arrastra: su ventana circular lee el ancho
     de la fisura en ese punto y resalta la línea de referencia más parecida. */
  function crackGauge(canvas) {
    const ctx = canvas.getContext('2d');
    const outW = document.getElementById('crack-w'), outC = document.getElementById('crack-class');
    const REFS = [0.1, 0.2, 0.3, 0.5, 0.7, 1.0];

    // generador pseudoaleatorio con semilla: la fisura es siempre la misma
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const crack = [];
    let u = .305, vv = .43, ang = .42;
    for (let i = 0; i <= 70; i++) {
      const k = i / 70;
      crack.push({ u, v: vv, mm: Math.max(.06, 1.05 * Math.pow(1 - k, 1.25) + (rnd() - .5) * .12) });
      ang += (rnd() - .5) * .55; ang = lerp(ang, .38, .25);
      u += Math.cos(ang) * .0095; vv += Math.sin(ang) * .0095 * 1.9;
    }
    const branch = []; { let bu = crack[30].u, bv = crack[30].v, a = -.5; for (let i = 0; i <= 18; i++) { branch.push({ u: bu, v: bv, mm: Math.max(.05, .3 * (1 - i / 18)) }); a += (rnd() - .5) * .6; bu += Math.cos(a) * .008; bv += Math.sin(a) * .008 * 1.9; } }

    let size, k, plaster, card = null, drag = null;
    function layout() {
      size = fitCanvas(canvas);
      k = size.w / 150;                                     // píxeles por milímetro (vista ampliada)
      plaster = document.createElement('canvas'); plaster.width = size.w * DPR; plaster.height = size.h * DPR;
      const p = plaster.getContext('2d'); p.scale(DPR, DPR);
      p.fillStyle = '#F4F2EE'; p.fillRect(0, 0, size.w, size.h);
      for (let i = 0; i < size.w * size.h / 18; i++) { p.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '90,80,70'},${Math.random() * .05})`; p.fillRect(Math.random() * size.w, Math.random() * size.h, 1.5, 1.5); }
      // luz rasante
      const lg = p.createLinearGradient(0, 0, size.w, size.h); lg.addColorStop(0, 'rgba(255,255,255,.35)'); lg.addColorStop(1, 'rgba(0,0,0,.06)');
      p.fillStyle = lg; p.fillRect(0, 0, size.w, size.h);
      // difusor lineal
      const dx = size.w * .03, dy = size.h * .36, dw = size.w * .275, dh = size.h * .1;
      p.fillStyle = '#E7E4DE'; p.fillRect(dx - 4, dy - 4, dw + 8, dh + 8);
      p.fillStyle = '#2A2E33'; p.fillRect(dx, dy, dw, dh);
      p.strokeStyle = '#5A6068'; p.lineWidth = 1.5;
      for (let x = dx + 6; x < dx + dw; x += 7) { p.beginPath(); p.moveTo(x, dy + 2); p.lineTo(x + 3, dy + dh - 2); p.stroke(); }
      // fisura
      [crack, branch].forEach(line => {
        for (let i = 1; i < line.length; i++) {
          const a = line[i - 1], b = line[i];
          p.lineCap = 'round';
          p.strokeStyle = 'rgba(255,255,255,.7)'; p.lineWidth = b.mm * k + 1.4;
          p.beginPath(); p.moveTo(a.u * size.w - .6, a.v * size.h - .6); p.lineTo(b.u * size.w - .6, b.v * size.h - .6); p.stroke();
          p.strokeStyle = '#3A342E'; p.lineWidth = b.mm * k;
          p.beginPath(); p.moveTo(a.u * size.w, a.v * size.h); p.lineTo(b.u * size.w, b.v * size.h); p.stroke();
        }
      });
      const cw = clamp(size.w * .34, 170, 250), ch = cw * .46;
      if (!card) { const s = crack[16]; card = { x: s.u * size.w + cw * .32, y: s.v * size.h, cw, ch }; }
      else { card.cw = cw; card.ch = ch; }
    }
    function windowCenter() { return { x: card.x - card.cw * .32, y: card.y, r: card.ch * .3 }; }
    function measure() {
      const c = windowCenter(); let best = null, bd = Infinity;
      [crack, branch].forEach(line => line.forEach(pt => {
        const d = Math.hypot(pt.u * size.w - c.x, pt.v * size.h - c.y); if (d < bd) { bd = d; best = pt; }
      }));
      return bd <= c.r ? best.mm : null;
    }
    function draw() {
      const en = document.documentElement.lang === 'en';
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(plaster, 0, 0);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const mm = measure();
      const ref = mm == null ? -1 : REFS.reduce((bi, r, i) => Math.abs(r - mm) < Math.abs(REFS[bi] - mm) ? i : bi, 0);
      const { x, y, cw, ch } = card, x0 = x - cw / 2, y0 = y - ch / 2;
      // tarjeta transparente
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
      ctx.fillStyle = 'rgba(232,242,250,.62)'; roundRect(x0, y0, cw, ch, 6); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(30,143,225,.75)'; ctx.lineWidth = 1; roundRect(x0, y0, cw, ch, 6); ctx.stroke();
      // ventana de medida
      const c = windowCenter();
      ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 6.283); ctx.clip();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(plaster, 0, 0);                                     // dentro de la ventana, sin tinte
      ctx.restore(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.strokeStyle = mm == null ? '#1E8FE1' : '#D99A00'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 6.283); ctx.stroke();
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c.x - c.r, c.y); ctx.lineTo(c.x - c.r * .55, c.y); ctx.moveTo(c.x + c.r * .55, c.y); ctx.lineTo(c.x + c.r, c.y); ctx.stroke();
      // líneas de referencia impresas
      const rx0 = x0 + cw * .4, step = (cw * .56) / REFS.length;
      ctx.font = `500 ${Math.max(8, Math.min(ch * .13, step / 2.1))}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center';
      REFS.forEach((r, i) => {
        const lx = rx0 + step * (i + .5);
        ctx.strokeStyle = i === ref ? '#D99A00' : '#0E1726'; ctx.lineWidth = r * k;
        ctx.beginPath(); ctx.moveTo(lx, y0 + ch * .16); ctx.lineTo(lx, y0 + ch * .6); ctx.stroke();
        ctx.fillStyle = i === ref ? '#B07C00' : '#0E1726';
        ctx.fillText(r.toFixed(1).replace('.', ','), lx, y0 + ch * .84);
      });
      // lectura
      if (mm == null) {
        outW.textContent = '— mm';
        outC.textContent = en ? 'Place the gauge window over the crack' : 'Coloque la ventana del fisurómetro sobre la fisura';
      } else {
        outW.textContent = mm.toFixed(2).replace('.', ',') + ' mm';
        outC.textContent = mm < .2 ? (en ? 'Hairline crack (< 0.2 mm)' : 'Microfisura (< 0,2 mm)')
          : mm < 1 ? (en ? 'Crack (0.2–1 mm)' : 'Fisura (0,2–1 mm)') : (en ? 'Wide crack (> 1 mm)' : 'Grieta (> 1 mm)');
      }
    }
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function pos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function inCard(p) { return Math.abs(p.x - card.x) < card.cw / 2 && Math.abs(p.y - card.y) < card.ch / 2; }
    canvas.addEventListener('pointerdown', e => {
      const p = pos(e);
      if (inCard(p)) { drag = { dx: p.x - card.x, dy: p.y - card.y }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-dragging'); }
    });
    canvas.addEventListener('pointermove', e => {
      const p = pos(e);
      canvas.classList.toggle('can-grab', inCard(p));
      if (!drag) return;
      card.x = clamp(p.x - drag.dx, card.cw * .2, size.w - card.cw * .2);
      card.y = clamp(p.y - drag.dy, card.ch * .2, size.h - card.ch * .2);
      requestAnimationFrame(draw);
    });
    const end = () => { drag = null; canvas.classList.remove('is-dragging'); };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    // teclado: flechas mueven la tarjeta
    canvas.addEventListener('keydown', e => {
      const d = { ArrowLeft: [-6, 0], ArrowRight: [6, 0], ArrowUp: [0, -6], ArrowDown: [0, 6] }[e.key];
      if (!d) return; e.preventDefault(); card.x += d[0]; card.y += d[1]; draw();
    });
    layout(); draw();
    addEventListener('resize', () => { const ox = card.x / size.w, oy = card.y / size.h; layout(); card.x = ox * size.w; card.y = oy * size.h; draw(); });
    langBtn.addEventListener('click', draw);
  }

  /* ---------- 5c. Dron sobre la cubierta ----------
     Al hacer scroll, el dron recorre la cubierta en pasadas paralelas.
     Lo que ya ha "fotografiado" se ve nítido; lo demás, en penumbra.
     Cuando pasa sobre un hallazgo, este se marca y se tacha en la lista. */
  function drone(canvas) {
    const ctx = canvas.getContext('2d');
    const section = document.getElementById('dron');
    const items = [...document.querySelectorAll('#drone-finds li')];
    const FINDS = [
      { p: [0.255, 0.585], es: 'Sumidero obstruido', en: 'Blocked roof drain' },
      { p: [0.46, 0.47], es: 'Encharcamiento', en: 'Ponding water' },
      { p: [0.72, 0.31], es: 'Sellado del lucernario deteriorado', en: 'Failed skylight seal' },
      { p: [1.37, 0.49], es: 'Tejas desplazadas', en: 'Slipped roof tiles' }
    ];
    // ruta en pasadas paralelas (coordenadas del mundo: 1.6 x 1.05)
    const PATH = [];
    for (let i = 0; i < 8; i++) { const y = .16 + i * .108; (i % 2 ? [1.5, .16] : [.16, 1.5]).forEach(x => PATH.push([x, y])); }
    const SEG = []; let total = 0;
    for (let i = 1; i < PATH.length; i++) { const l = Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]); SEG.push({ a: PATH[i - 1], b: PATH[i], s0: total, l }); total += l; }
    const SWATH = .125;
    function at(s) {
      s = clamp(s, 0, total);
      for (const g of SEG) if (s <= g.s0 + g.l) { const t = (s - g.s0) / g.l; return { x: lerp(g.a[0], g.b[0], t), y: lerp(g.a[1], g.b[1], t), dir: Math.sign(g.b[0] - g.a[0]) }; }
      const last = SEG[SEG.length - 1]; return { x: last.b[0], y: last.b[1], dir: 1 };
    }
    FINDS.forEach(f => { for (let s = 0; s <= total; s += .004) { const q = at(s); if (Math.hypot(q.x - f.p[0], q.y - f.p[1]) < SWATH * .5) { f.s = s; break; } } });
    const lastFind = Math.max(...FINDS.map(f => f.s)) / total;   // fracción del vuelo en la que aparece la 4.ª incidencia

    let size, S, ox, oy, bright, dim, mask, progress = 0, visible = false, raf = 0;
    const X = u => ox + u * S, Y = v => oy + v * S;

    function layout() {
      size = fitCanvas(canvas);
      const wide = !matchMedia('(max-width: 860px), (orientation: portrait)').matches;
      const area = wide ? { x: size.w * .36, y: 90, w: size.w * .6, h: size.h - 150 } : { x: 12, y: 14, w: size.w - 24, h: size.h - 28 };
      S = Math.min(area.w / 1.4, area.h / .9);
      ox = area.x + (area.w - 1.4 * S) / 2 - .13 * S; oy = area.y + (area.h - .9 * S) / 2 - .11 * S;
      bright = document.createElement('canvas'); bright.width = canvas.width; bright.height = canvas.height;
      const b = bright.getContext('2d'); b.scale(DPR, DPR); drawWorld(b);
      dim = document.createElement('canvas'); dim.width = canvas.width; dim.height = canvas.height;
      const d = dim.getContext('2d'); d.drawImage(bright, 0, 0); d.fillStyle = 'rgba(6,10,18,.66)'; d.fillRect(0, 0, dim.width, dim.height);
      mask = document.createElement('canvas'); mask.width = canvas.width; mask.height = canvas.height;
    }

    function drawWorld(c) {
      let s2 = 11; const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
      const R = (u0, v0, u1, v1, col) => { c.fillStyle = col; c.fillRect(X(u0), Y(v0), (u1 - u0) * S, (v1 - v0) * S); };
      // jardín
      c.fillStyle = '#3B4A39'; c.fillRect(0, 0, size.w, size.h);
      for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${r2() < .5 ? '20,35,22' : '90,110,80'},.25)`; c.beginPath(); c.arc(r2() * size.w, r2() * size.h, r2() * 3 + 1, 0, 6.283); c.fill(); }
      // árboles
      for (let i = 0; i < 26; i++) {
        let u = r2() * 1.9 - .15, v = r2() * 1.3 - .1;
        if (u > .1 && u < 1.52 && v > .1 && v < 1.0) continue;
        const r = (.03 + r2() * .04) * S;
        c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(X(u) + r * .3, Y(v) + r * .35, r, 0, 6.283); c.fill();
        c.fillStyle = '#2C3B2A'; c.beginPath(); c.arc(X(u), Y(v), r, 0, 6.283); c.fill();
        c.fillStyle = 'rgba(120,140,100,.25)'; c.beginPath(); c.arc(X(u) - r * .3, Y(v) - r * .3, r * .55, 0, 6.283); c.fill();
      }
      // sombra del edificio
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(X(.24), Y(.18), .84 * S, .46 * S); c.fillRect(X(1.08), Y(.28), .40 * S, .54 * S);
      // terraza con pérgola
      R(.18, .62, .82, .87, '#B9B2A5');
      c.strokeStyle = 'rgba(0,0,0,.08)'; c.lineWidth = 1;
      for (let u = .18; u < .82; u += .04) { c.beginPath(); c.moveTo(X(u), Y(.62)); c.lineTo(X(u), Y(.87)); c.stroke(); }
      c.strokeStyle = 'rgba(92,74,56,.75)'; c.lineWidth = Math.max(2, S * .006);
      for (let v = .645; v < .86; v += .028) { c.beginPath(); c.moveTo(X(.2), Y(v)); c.lineTo(X(.56), Y(v)); c.stroke(); }
      // piscina
      R(.84, .83, 1.42, .99, '#E6E0D4'); R(.86, .85, 1.40, .97, '#3E93B8');
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1.2;
      for (let i = 0; i < 9; i++) { c.beginPath(); const yy = Y(.87 + i * .011); c.moveTo(X(.88), yy); for (let u = .88; u < 1.38; u += .03) c.lineTo(X(u), yy + Math.sin(u * 40 + i) * 1.5); c.stroke(); }
      // cubierta plana transitable con grava
      R(.22, .16, 1.06, .62, '#E3DFD7');
      R(.235, .175, 1.045, .605, '#C5C1B8');
      for (let i = 0; i < 2400; i++) { c.fillStyle = `rgba(${r2() < .5 ? '255,255,255' : '80,75,70'},.18)`; c.fillRect(X(.235 + r2() * .81), Y(.175 + r2() * .43), 1.2, 1.2); }
      // encharcamiento
      c.fillStyle = 'rgba(70,85,95,.38)'; c.beginPath(); c.ellipse(X(.46), Y(.47), .07 * S, .035 * S, -.2, 0, 6.283); c.fill();
      c.fillStyle = 'rgba(160,190,205,.25)'; c.beginPath(); c.ellipse(X(.45), Y(.465), .04 * S, .015 * S, -.2, 0, 6.283); c.fill();
      // sumideros
      [[.255, .585], [1.025, .585], [.255, .195], [1.025, .195]].forEach(([u, v], i) => {
        c.fillStyle = '#5C5F61'; c.beginPath(); c.arc(X(u), Y(v), .009 * S, 0, 6.283); c.fill();
        if (i === 0) { c.fillStyle = 'rgba(110,80,40,.85)'; for (let j = 0; j < 14; j++) { c.beginPath(); c.ellipse(X(u + (r2() - .5) * .04), Y(v + (r2() - .5) * .03), 3, 1.6, r2() * 3, 0, 6.283); c.fill(); } }
      });
      // lucernario
      R(.56, .26, .72, .38, '#DDE2E5'); R(.568, .268, .712, .372, '#6E8FA3');
      c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.moveTo(X(.57), Y(.37)); c.lineTo(X(.62), Y(.27)); c.lineTo(X(.64), Y(.27)); c.lineTo(X(.59), Y(.37)); c.fill();
      c.strokeStyle = '#2E2A26'; c.lineWidth = 2; c.beginPath(); c.moveTo(X(.715), Y(.28)); c.lineTo(X(.715), Y(.34)); c.stroke();
      // placas solares
      for (let r = 0; r < 2; r++) for (let k = 0; k < 5; k++) {
        const u = .78 + k * .048, v = .22 + r * .085;
        R(u, v, u + .042, v + .072, '#1D2D48');
        c.strokeStyle = 'rgba(160,190,230,.25)'; c.lineWidth = .7;
        for (let j = 1; j < 3; j++) { c.beginPath(); c.moveTo(X(u + .014 * j), Y(v)); c.lineTo(X(u + .014 * j), Y(v + .072)); c.stroke(); }
        for (let j = 1; j < 6; j++) { c.beginPath(); c.moveTo(X(u), Y(v + .012 * j)); c.lineTo(X(u + .042), Y(v + .012 * j)); c.stroke(); }
      }
      // máquinas de climatización
      [[.3, .46], [.38, .46]].forEach(([u, v]) => { R(u, v, u + .06, v + .05, '#D9DADB'); c.strokeStyle = '#7D8287'; c.lineWidth = 1; c.beginPath(); c.arc(X(u + .03), Y(v + .025), .017 * S, 0, 6.283); c.stroke(); });
      // ala con cubierta de teja a cuatro aguas
      const L = 1.08, T = .28, Rr = 1.48, B = .82, rx = 1.28, r0 = .44, r1 = .66;
      const plane = (pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach(([u, v], i) => i ? c.lineTo(X(u), Y(v)) : c.moveTo(X(u), Y(v))); c.closePath(); c.fill(); };
      plane([[L, T], [rx, r0], [rx, r1], [L, B]], '#B8673F');
      plane([[Rr, T], [rx, r0], [rx, r1], [Rr, B]], '#94502F');
      plane([[L, T], [Rr, T], [rx, r0]], '#A95C38');
      plane([[L, B], [Rr, B], [rx, r1]], '#A0552F');
      c.strokeStyle = 'rgba(60,25,10,.28)'; c.lineWidth = 1;
      for (let v = T + .012; v < B; v += .014) { c.beginPath(); c.moveTo(X(L), Y(v)); c.lineTo(X(Rr), Y(v)); c.stroke(); }
      c.strokeStyle = 'rgba(255,220,190,.5)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(X(L), Y(T)); c.lineTo(X(rx), Y(r0)); c.lineTo(X(Rr), Y(T)); c.moveTo(X(L), Y(B)); c.lineTo(X(rx), Y(r1)); c.lineTo(X(Rr), Y(B)); c.moveTo(X(rx), Y(r0)); c.lineTo(X(rx), Y(r1)); c.stroke();
      // tejas desplazadas
      c.fillStyle = '#D2875C';
      for (let i = 0; i < 5; i++) { c.save(); c.translate(X(1.36 + (i % 3) * .018), Y(.48 + Math.floor(i / 3) * .02)); c.rotate(.3 + i * .25); c.fillRect(-.009 * S, -.005 * S, .018 * S, .01 * S); c.restore(); }
    }

    function drawDrone(x, y, t, dir) {
      const r = Math.max(9, S * .022);
      ctx.save(); ctx.translate(x + r * 1.4, y + r * 1.6); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.6, r * 1.3, 0, 0, 6.283); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(x, y); ctx.rotate(dir < 0 ? Math.PI : 0);
      ctx.strokeStyle = '#E9EDF2'; ctx.lineWidth = Math.max(2, r * .22);
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(a * r, b * r); ctx.stroke(); });
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b], i) => {
        ctx.fillStyle = 'rgba(233,237,242,.18)'; ctx.beginPath(); ctx.arc(a * r, b * r, r * .62, 0, 6.283); ctx.fill();
        ctx.strokeStyle = 'rgba(233,237,242,.75)'; ctx.lineWidth = 1.2;
        const s = t * 40 + i; ctx.beginPath(); ctx.moveTo(a * r + Math.cos(s) * r * .6, b * r + Math.sin(s) * r * .6); ctx.lineTo(a * r - Math.cos(s) * r * .6, b * r - Math.sin(s) * r * .6); ctx.stroke();
      });
      ctx.fillStyle = '#F4F6F8'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r * .45, -r * .32, r * .9, r * .64, 3) : ctx.rect(-r * .45, -r * .32, r * .9, r * .64); ctx.fill();
      ctx.fillStyle = '#F5B921'; ctx.beginPath(); ctx.arc(r * .35, 0, r * .12, 0, 6.283); ctx.fill();
      ctx.restore();
    }

    function frame(now) {
      raf = 0;
      advance(now);
      const en = document.documentElement.lang === 'en';
      const t = now / 1000, s = progress * total, q = at(s);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(dim, 0, 0);
      // zona ya fotografiada
      const m = mask.getContext('2d');
      m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, mask.width, mask.height);
      if (s > 0) {
        m.setTransform(DPR, 0, 0, DPR, 0, 0);
        m.strokeStyle = '#fff'; m.lineWidth = SWATH * S; m.lineCap = 'square'; m.lineJoin = 'miter';
        m.beginPath(); m.moveTo(X(PATH[0][0]), Y(PATH[0][1]));
        for (const g of SEG) { if (g.s0 + g.l < s) m.lineTo(X(g.b[0]), Y(g.b[1])); else { m.lineTo(X(q.x), Y(q.y)); break; } }
        m.stroke();
        m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-in'; m.drawImage(bright, 0, 0);
        ctx.drawImage(mask, 0, 0);
      }
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      // huella de la cámara
      const fw = SWATH * S;
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
      ctx.strokeRect(X(q.x) - fw / 2, Y(q.y) - fw / 2, fw, fw); ctx.setLineDash([]);
      // hallazgos
      ctx.font = `600 ${Math.max(12, S * .026)}px Manrope, sans-serif`;
      let nFound = 0;
      FINDS.forEach((f, i) => {
        const ok = s >= f.s; items[i].classList.toggle('is-found', ok);
        if (!ok) return; nFound++;
        const x = X(f.p[0]), y = Y(f.p[1]);
        ctx.strokeStyle = '#F5B921'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, Math.max(11, S * .03), 0, 6.283); ctx.stroke();
        const label = en ? f.en : f.es, tw = ctx.measureText(label).width;
        const left = x + 20 + tw + 12 > size.w - 6, lx = Math.max(6, left ? x - 20 - tw - 10 : x + 20), ly = Math.max(6, y - 30);
        ctx.fillStyle = 'rgba(6,10,18,.78)'; ctx.fillRect(lx, ly - 2, tw + 12, 22);
        ctx.fillStyle = '#F5B921'; ctx.textAlign = 'left'; ctx.fillText(label, lx + 6, ly + 14);
      });
      drawDrone(X(q.x), Y(q.y), t, q.dir);
      // datos del vuelo
      const pad = 18, bx0 = X(.1), by0 = Y(.1), bx1 = X(1.56), by1 = Y(1.02);
      ctx.strokeStyle = 'rgba(238,242,247,.55)'; ctx.lineWidth = 1.2;
      [[bx0, by0, 1, 1], [bx1, by0, -1, 1], [bx0, by1, 1, -1], [bx1, by1, -1, -1]].forEach(([x, y, a, b]) => { ctx.beginPath(); ctx.moveTo(x + a * pad, y); ctx.lineTo(x, y); ctx.lineTo(x, y + b * pad); ctx.stroke(); });
      ctx.font = `500 12px "IBM Plex Mono", monospace`; ctx.fillStyle = 'rgba(238,242,247,.85)'; ctx.textAlign = 'left';
      ctx.fillText((en ? 'Altitude ' : 'Altura ') + '32 m', bx0 + 8, by1 - 26);
      ctx.fillText((en ? 'Coverage ' : 'Cobertura ') + Math.round(progress * 100) + ' %', bx0 + 8, by1 - 10);
      ctx.textAlign = 'right';
      ctx.fillText((en ? 'Findings ' : 'Hallazgos ') + nFound, bx1 - 8, by1 - 10);
      if (visible) raf = requestAnimationFrame(frame);
    }
    let playing = false, lastT = 0;
    const replay = document.getElementById('drone-replay');
    function advance(now) {
      const dt = Math.min(.05, (now - (lastT || now)) / 1000); lastT = now;
      if (playing) {
        // velocidad base: 12 s de vuelo. Cuando ya ha encontrado las 4 incidencias solo falta
        // terminar de sobrevolar la imagen, así que acelera de forma progresiva (hasta x2,1 sobre la base).
        const k = clamp((progress - lastFind) / .1), boost = 1 + 1.1 * k * k * (3 - 2 * k);
        progress = Math.min(1, progress + dt * boost / 12);
        if (progress >= 1) { playing = false; replay.hidden = false; }
      }
    }
    const request = () => { if (!raf) raf = requestAnimationFrame(frame); };
    layout(); request();
    addEventListener('resize', () => { layout(); request(); });
    langBtn.addEventListener('click', request);
    replay.addEventListener('click', () => { progress = 0; playing = true; replay.hidden = true; lastT = 0; request(); });
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) { if (progress === 0) playing = true; lastT = 0; request(); }
    }, { threshold: .6, rootMargin: '0px 0px -22% 0px' }).observe(canvas);
  }

  /* ---------- 7. Cielo del contacto ----------
     Estrellas que centellean y giran muy despacio, alguna estrella fugaz
     y, al mover el ratón, las estrellas cercanas se unen formando
     constelaciones efímeras. */
  function nightSky(canvas) {
    const ctx = canvas.getContext('2d');
    let size, stars, shooting = [], nextShoot = 0, mouse = null, visible = false, raf = 0, t0 = performance.now();
    function layout() {
      size = fitCanvas(canvas);
      const n = Math.round(size.w * size.h / 1400);
      stars = Array.from({ length: n }, () => {
        const hue = Math.random();
        return {
          x: Math.random() * size.w, y: Math.random() * size.h, r: Math.random() < .08 ? Math.random() * 1.2 + 1.2 : Math.random() * .9 + .3,
          a: Math.random() * .55 + .4, tw: Math.random() * 6.283, sp: Math.random() * 2 + .6,
          col: hue < .08 ? '245,185,33' : hue < .25 ? '170,205,245' : '238,242,247'
        };
      });
    }
    function frame(now) {
      raf = 0;
      const t = (now - t0) / 1000, { w, h } = size;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, w, h);
      // deriva muy lenta y siempre dentro de la pantalla (las estrellas dan la vuelta por los bordes)
      const pos = st => [(((st.x + t * (1.2 + st.r * 1.6)) % w) + w) % w, st.y + Math.sin(t * .05 + st.tw) * 4];
      const near = [];
      for (const s of stars) {
        const [x, y] = pos(s);
        let a = s.a * (.55 + .45 * Math.sin(t * s.sp + s.tw)), r = s.r;
        if (mouse) { const d = Math.hypot(x - mouse.x, y - mouse.y); if (d < 170) { a = Math.min(1, a + (1 - d / 170) * .6); r += (1 - d / 170) * .8; near.push([x, y, d]); } }
        if (r > 1.3) { const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4); g.addColorStop(0, `rgba(${s.col},${a * .35})`); g.addColorStop(1, `rgba(${s.col},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, 6.283); ctx.fill(); }
        ctx.fillStyle = `rgba(${s.col},${a})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      }
      // constelación efímera alrededor del cursor
      if (near.length > 1) {
        near.sort((a, b) => a[2] - b[2]);
        const pts = near.slice(0, 7);
        ctx.lineWidth = 1;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i], al = .35 * (1 - b[2] / 170);
          ctx.strokeStyle = `rgba(156,200,240,${al})`; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      }
      // estrellas fugaces
      if (t > nextShoot) {
        const fromLeft = Math.random() < .5;
        shooting.push({ x: Math.random() * w * .8 + w * .1, y: Math.random() * h * .4, vx: (fromLeft ? 1 : -1) * (520 + Math.random() * 300), vy: 200 + Math.random() * 140, life: 0, max: .9 + Math.random() * .5 });
        nextShoot = t + 3.5 + Math.random() * 5;
      }
      shooting = shooting.filter(s => s.life < s.max);
      for (const s of shooting) {
        s.life += 1 / 60; s.x += s.vx / 60; s.y += s.vy / 60;
        const fade = Math.sin(Math.PI * s.life / s.max), len = .09;
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * len, s.y - s.vy * len);
        g.addColorStop(0, `rgba(255,248,225,${fade})`); g.addColorStop(1, 'rgba(255,248,225,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * len, s.y - s.vy * len); ctx.stroke();
      }
      if (visible) raf = requestAnimationFrame(frame);
    }
    layout();
    addEventListener('resize', layout);
    const host = canvas.parentElement;
    host.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; });
    host.addEventListener('pointerleave', () => { mouse = null; });
    // En pantallas táctiles el navegador se queda con el gesto al hacer scroll y deja de enviar pointermove;
    // por eso se escuchan también los toques (sin bloquear el desplazamiento).
    let fade = 0;
    const touchAt = e => { const t = e.touches[0]; if (!t) return; clearTimeout(fade); const r = canvas.getBoundingClientRect(); mouse = { x: t.clientX - r.left, y: t.clientY - r.top }; };
    host.addEventListener('touchstart', touchAt, { passive: true });
    host.addEventListener('touchmove', touchAt, { passive: true });
    host.addEventListener('touchend', () => { fade = setTimeout(() => { mouse = null; }, 1200); }, { passive: true });
    host.addEventListener('touchcancel', () => { fade = setTimeout(() => { mouse = null; }, 1200); }, { passive: true });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }).observe(canvas);
  }

  /* ---------- 8. Dibujos de servicios y mapa ----------
     Las ilustraciones de línea se dibujan solas al aparecer en pantalla, despacio,
     para que dé tiempo a verlas hacerse mientras se baja por la página.
     Sin JavaScript se ven completas desde el principio.
     dur = duración de cada trazo (s) · gap = retraso entre trazos (s) · stagger = retraso entre tarjetas (s) */
  function drawOnView(selector, { dur = 2.2, gap = .15, stagger = .35 } = {}) {
    const items = [...document.querySelectorAll(selector)];
    items.forEach(svg => {
      svg.classList.add('will-draw');
      svg.querySelectorAll('.ln').forEach(p => {
        const L = Math.ceil(p.getTotalLength ? p.getTotalLength() : 600);
        p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      });
    });
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const svg = e.target, base = (items.indexOf(svg) % 3) * stagger;
      svg.querySelectorAll('.ln').forEach((p, i) => {
        p.style.transition = `stroke-dashoffset ${dur}s cubic-bezier(.45,0,.25,1) ${base + i * gap}s`;
        p.style.strokeDashoffset = 0;
      });
      svg.classList.remove('will-draw'); svg.classList.add('is-drawn');
      io.unobserve(svg);
    }), { threshold: .55, rootMargin: '0px 0px -18% 0px' });
    items.forEach(s => io.observe(s));
  }

  /* ---------- 9. Ficha: notas enlazadas ----------
     Una sola regla, siempre la misma: se ilumina el paso que estás viendo.
     · Al bajar por la página, el paso de la ficha más cercano al centro de la pantalla.
     · Si pasas el ratón (o tocas con el dedo) sobre una nota o sobre una parte de la ficha,
       se ilumina ese paso. Con ratón vuelve al paso "por scroll" al salir; con el dedo
       se mantiene hasta que vuelves a desplazarte.
     Nada cambia por sí solo. */
  function sheetNotes() {
    const notes = [...document.querySelectorAll('.sheet-notes li')];
    const wrap = document.querySelector('.sheet-wrap');
    if (!notes.length || !wrap) return;
    const targets = notes.map(li => document.querySelector(li.dataset.target));
    let current = -1, locked = -1, ticking = false;
    function set(n) {
      if (n === current) return;
      current = n;
      notes.forEach((li, k) => {
        li.classList.toggle('is-active', k === n);
        if (targets[k]) targets[k].classList.toggle('is-lit', k === n);
      });
    }
    function byScroll() {
      const r = wrap.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const line = innerHeight * .5;
      let best = 0, bd = Infinity;
      targets.forEach((t, k) => {
        if (!t) return;
        const b = t.getBoundingClientRect(), d = line < b.top ? b.top - line : line > b.bottom ? line - b.bottom : 0;
        const dc = Math.abs((b.top + b.bottom) / 2 - line);
        const score = d * 1000 + dc;           // primero el que contiene la línea; si ninguno, el más cercano
        if (score < bd) { bd = score; best = k; }
      });
      set(best);
    }
    function refresh() { if (locked >= 0) set(locked); else byScroll(); }
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => { ticking = false; if (locked >= 0 && lockTouch) locked = -1; refresh(); });
    }
    let lockTouch = false;
    const hold = (k, e) => { locked = k; lockTouch = e.pointerType !== 'mouse'; set(k); };
    const release = e => { if (e.pointerType === 'mouse') { locked = -1; refresh(); } };
    notes.forEach((li, k) => {
      li.tabIndex = 0;
      li.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hold(k, e); });
      li.addEventListener('pointerleave', release);
      li.addEventListener('pointerdown', e => hold(k, e));
      li.addEventListener('focus', () => { locked = k; lockTouch = false; set(k); });
      li.addEventListener('blur', () => { locked = -1; refresh(); });
      const t = targets[k];
      if (t) {
        t.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hold(k, e); });
        t.addEventListener('pointerleave', release);
        t.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') hold(k, e); });
      }
    });
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    refresh();
  }

  /* ---------- 10. Contadores ----------
     Pausados (unos 2,6 s) para que se vean subir. data-count = valor final,
     data-suffix = texto detrás, data-dur = duración en ms (opcional). */
  function counters() {
    const els = [...document.querySelectorAll('[data-count]')];
    const fmt = n => n >= 1000 ? n.toLocaleString(document.documentElement.lang === 'en' ? 'en-GB' : 'es-ES') : String(n);
    els.forEach(el => { el.textContent = '0' + (el.dataset.suffix || ''); });
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      const el = e.target, end = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now(), dur = +el.dataset.dur || 2600;
      const step = now => { const k = ease(clamp((now - t0) / dur)); el.textContent = fmt(Math.round(end * k)) + suf; if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }), { threshold: .6, rootMargin: '0px 0px -16% 0px' });
    els.forEach(el => io.observe(el));
  }

  /* ---------- 6. Proceso: la línea avanza con el scroll ---------- */
  const steps = document.querySelector('.steps');
  function updateSteps() {
    if (reduceMotion || !steps) return;
    const r = steps.getBoundingClientRect();
    steps.style.setProperty('--progress', clamp((innerHeight * .85 - r.top) / (r.height + innerHeight * .4)).toFixed(3));
  }

  /* ---------- 11. Aparición suave de bloques y menú ---------- */
  function revealOnView() {
    const els = [...document.querySelectorAll('.reveal')];
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { threshold: .12, rootMargin: '0px 0px -16% 0px' });
    els.forEach(e => io.observe(e));
  }
  function menu() {
    const btn = document.getElementById('menu-btn'), panel = document.getElementById('menu');
    if (!btn || !panel) return;
    const set = open => { panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', () => set(panel.hidden));
    panel.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
    addEventListener('resize', () => { if (innerWidth > 860) set(false); });
  }

  /* ---------- Arranque ---------- */
  sky(document.getElementById('sky'));
  nightSky(document.getElementById('sky2'));
  drawOnView('.svc-art');
  drawOnView('.map-art', { dur: 3.4, gap: 0, stagger: 0 });
  revealOnView();
  menu();
  sheetNotes();
  counters();
  blueprint(document.getElementById('blueprint'));
  thermo(document.getElementById('thermo'));
  crackGauge(document.getElementById('crack'));
  drone(document.getElementById('drone'));
  const onScroll = () => { updateHeader(); updateSteps(); };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
