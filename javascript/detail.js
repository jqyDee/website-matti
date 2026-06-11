/* ── repo button: same 3D tilt as hero buttons ────────────── */
const MAX_TILT = 13;
const _rad = MAX_TILT * Math.PI / 180;

document.querySelectorAll('.hero-link-wrap').forEach(wrap => {
    const btn = wrap.querySelector('.hero-link');
    if (!btn) return;

    const r    = btn.getBoundingClientRect();
    const padH = Math.ceil(r.width  / 2 * Math.sin(_rad));
    const padV = Math.ceil(r.height / 2 * Math.sin(_rad));
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

/* ── detail page: morph the logo blob toward the mouse ──── */
const logo = document.querySelector('.detail-logo');

if (logo) {
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    document.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const BASE    = 62;     // base roundness (%)
    const AMP_MAX = 22;     // max variation when mouse is right on top
    const FALLOFF = 360;    // px range over which morph fades to zero

    // smoothed direction values
    let cx = 0, cy = 0, cf = 0;

    function tick() {
        const r  = logo.getBoundingClientRect();
        const lx = r.left + r.width  / 2;
        const ly = r.top  + r.height / 2;

        const dxAbs = mouseX - lx;
        const dyAbs = mouseY - ly;
        const dist  = Math.hypot(dxAbs, dyAbs);
        const proximity = Math.max(0, 1 - dist / FALLOFF);   // 1 close, 0 far

        // unit direction from logo to mouse (0 vector when mouse is on the logo)
        const tx = dist > 0 ? dxAbs / dist : 0;
        const ty = dist > 0 ? dyAbs / dist : 0;

        // ease everything for smooth motion
        cx += (tx - cx) * 0.1;
        cy += (ty - cy) * 0.1;
        cf += (proximity - cf) * 0.1;

        const amp = AMP_MAX * cf;

        const radii = corners.map(([nx, ny]) => {
            const align = (nx * cx + ny * cy) / Math.SQRT2; // -1..1
            return (BASE - align * amp).toFixed(1) + '%';
        });

        logo.style.borderRadius = radii.join(' ') + ' / ' + radii.join(' ');
        requestAnimationFrame(tick);
    }
    tick();
}
