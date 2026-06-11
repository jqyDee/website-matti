const MAX_TILT = 13;
const rad      = MAX_TILT * Math.PI / 180;

/* ── hero buttons: 3D tilt on mouse move ────────────────── */
document.querySelectorAll('.hero-link-wrap').forEach(wrap => {
    const btn = wrap.querySelector('.hero-link');
    if (!btn) return;

    // exact padding = half-dimension * sin(maxAngle), rounded up — keeps
    // the hit area aligned with the visual after tilt
    const r    = btn.getBoundingClientRect();
    const padH = Math.ceil(r.width  / 2 * Math.sin(rad));
    const padV = Math.ceil(r.height / 2 * Math.sin(rad));
    wrap.style.padding = `${padV}px ${padH}px`;
    wrap.style.margin  = `-${padV}px -${padH}px`;

    const tilt = e => {
        const r2 = btn.getBoundingClientRect();
        const x  = (e.clientX - r2.left - r2.width  / 2) / (r2.width  / 2);
        const y  = (e.clientY - r2.top  - r2.height / 2) / (r2.height / 2);
        const mx = ((e.clientX - r2.left) / r2.width  * 100).toFixed(1);
        const my = ((e.clientY - r2.top)  / r2.height * 100).toFixed(1);
        btn.style.setProperty('--mouse-x',  `${mx}%`);
        btn.style.setProperty('--mouse-y',  `${my}%`);
        btn.style.setProperty('--shadow-x', `${(-x * 8).toFixed(1)}px`);
        btn.style.setProperty('--shadow-y', `${(-y * 8).toFixed(1)}px`);
        btn.style.transition = 'none';
        btn.style.transform  = `perspective(600px) rotateX(${-y * MAX_TILT}deg) rotateY(${x * MAX_TILT}deg)`;
    };

    wrap.addEventListener('mouseenter', tilt);
    wrap.addEventListener('mousemove',  tilt);
    wrap.addEventListener('mouseleave', () => {
        btn.style.transition = 'transform 300ms ease-out';
        btn.style.transform  = '';
    });
});

/* ── hero shape parallax (square + circle follow mouse) ── */
const heroDecoration = document.querySelector('.hero-decoration');
const shape1 = document.querySelector('.hero-shape-1');
const shape2 = document.querySelector('.hero-shape-2');

if (heroDecoration && shape1 && shape2) {
    let visible = false;
    let tx = 0, ty = 0;   // mouse target (normalised -1..1)
    let cx = 0, cy = 0;   // lerped value
    let rafId = null;

    const tick = () => {
        cx += (tx - cx) * 0.07;
        cy += (ty - cy) * 0.07;
        shape1.style.transform = `rotate(-20deg) translate(${(cx * 32).toFixed(2)}px, ${(cy * 24).toFixed(2)}px)`;
        shape2.style.transform = `translate(${(cx * 55).toFixed(2)}px, ${(cy * 40).toFixed(2)}px)`;
        rafId = requestAnimationFrame(tick);
    };

    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !rafId) {
            rafId = requestAnimationFrame(tick);
        } else if (!visible) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }).observe(heroDecoration);

    document.addEventListener('mousemove', e => {
        if (!visible) return;
        tx = (e.clientX / window.innerWidth  - 0.5) * 2;
        ty = (e.clientY / window.innerHeight - 0.5) * 2;
    });
}
