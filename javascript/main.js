const MAX_TILT = 13;
const rad      = MAX_TILT * Math.PI / 180;

/* ── background luminance detection ─────────────────────── */
// WCAG relative luminance: 0 = black, 1 = white
function relLuminance([r, g, b]) {
    const lin = c => (c /= 255) <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// extract every rgb()/rgba() triple from a computed background string
function parseRgbs(str) {
    return [...str.matchAll(/rgba?\(([^)]+)\)/g)].map(m =>
        m[1].split(',').slice(0, 3).map(s => parseFloat(s.trim()))
    );
}

function detectIconContrast(btn) {
    const r  = btn.getBoundingClientRect();
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;

    // hide button so elementsFromPoint sees what's underneath
    btn.style.visibility = 'hidden';
    const stack = document.elementsFromPoint(cx, cy);
    btn.style.visibility = '';

    // collect luminances from every shape covering the icon, not just the topmost
    const luminances = [];
    for (const el of stack) {
        if (el === btn || btn.contains(el)) continue;
        const cs = getComputedStyle(el);
        const colors = parseRgbs(cs.backgroundImage + ' ' + cs.backgroundColor);
        for (const c of colors) luminances.push(relLuminance(c));
        // stop once we hit a non-transparent layer (the card body usually)
        if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
            cs.backgroundColor !== 'transparent') break;
    }
    if (!luminances.length) return;

    // bias toward the DARKER stop — gradients have both light/dark colors and
    // the icon often sits near the darker end. Safer contrast either way.
    const minLum = Math.min(...luminances);

    btn.classList.toggle('is-on-dark',  minLum <  0.35);
    btn.classList.toggle('is-on-light', minLum >= 0.35);
}

/* ── content renderers ──────────────────────────────────── */
const cardShapes = {
    1: '<div class="box1-quadrat"></div><div class="box1-circle"></div>',
    2: '<div class="box2-quadrat1"></div><div class="box2-quadrat2"></div>',
    3: '<div class="box3-circle1"></div><div class="box3-circle2"></div>',
    4: '<div class="box4-quadrat1"></div><div class="box4-quadrat2"></div>',
};

const githubSvg = `<svg class="icon-github" aria-hidden="true"><use href="images/icons/github.svg#github"/></svg>`;

async function loadContent() {
    const projects = await fetch('data/projects.json').then(r => r.json());

    const projectsEl = document.getElementById('projects-container');
    if (projectsEl) {
        projectsEl.innerHTML = projects.map(p => {
            const repoBtn = p['repo-url']
                ? `<a class="box-repo" href="${p['repo-url']}" target="_blank" rel="noopener" aria-label="github repository">${githubSvg}</a>`
                : '';
            return `
            <div class="box" data-href="projects/${p.slug}.html" tabindex="0" role="link" aria-label="${p.title}">
                ${cardShapes[p.card] || cardShapes[1]}
                <div class="box-text">
                    <h3>${p.title}</h3>
                    <p>${p.description}</p>
                    ${p.tags.map(t => `<span class="box-tag">${t}</span>`).join('')}
                </div>
                ${repoBtn}
            </div>`;
        }).join('');

        // card navigates on click; nested repo link handles itself + stops bubble
        projectsEl.querySelectorAll('.box').forEach(card => {
            card.addEventListener('click', () => {
                window.location.href = card.dataset.href;
            });
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    window.location.href = card.dataset.href;
                }
            });
        });
        projectsEl.querySelectorAll('.box-repo').forEach(btn => {
            btn.addEventListener('click', e => e.stopPropagation());
        });

        // detect background luminance under each repo icon when card scrolls into view
        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const btn = entry.target.querySelector('.box-repo');
                    if (btn) detectIconContrast(btn);
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        projectsEl.querySelectorAll('.box').forEach(card => io.observe(card));
    }
}

loadContent();

/* ── about: expand/collapse answer groups ───────────────── */
document.querySelectorAll('.answer-group').forEach(group => {
    // stagger reveal index for each message
    group.querySelectorAll('.bubble-list-inner > .msg').forEach((m, i) => {
        m.style.setProperty('--i', i);
    });

    const toggle = () => {
        const open = group.getAttribute('aria-expanded') === 'true';
        group.setAttribute('aria-expanded', String(!open));
    };

    group.addEventListener('click', toggle);
    group.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
        }
    });
});

/* ── hero shape parallax ───────────────────────────────── */
const heroDecoration = document.querySelector('.hero-decoration');
const shape1 = document.querySelector('.hero-shape-1');
const shape2 = document.querySelector('.hero-shape-2');

if (heroDecoration && shape1 && shape2) {
    let visible = false;
    let tx = 0, ty = 0;   // mouse target (normalised -1..1)
    let cx = 0, cy = 0;   // current lerped value
    let rafId = null;

    const tick = () => {
        cx += (tx - cx) * 0.07;
        cy += (ty - cy) * 0.07;
        // shape1 (square) moves less — feels further back
        shape1.style.transform = `rotate(-20deg) translate(${(cx * 32).toFixed(2)}px, ${(cy * 24).toFixed(2)}px)`;
        // shape2 (circle) moves more — feels closer
        shape2.style.transform = `translate(${(cx * 55).toFixed(2)}px, ${(cy * 40).toFixed(2)}px)`;
        rafId = requestAnimationFrame(tick);
    };

    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        console.log('[parallax]', visible ? 'active' : 'paused');
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

/* ── hero buttons ───────────────────────────────── */
document.querySelectorAll('.hero-link-wrap').forEach(wrap => {
    const btn = wrap.querySelector('.hero-link');

    // exact padding = half-dimension * sin(maxAngle), rounded up
    const r   = btn.getBoundingClientRect();
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
