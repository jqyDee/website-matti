/* ── background luminance detection ─────────────────────── */
// WCAG relative luminance: 0 = black, 1 = white
function relLuminance([r, g, b]) {
    const lin = c => (c /= 255) <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function parseRgbs(str) {
    return [...str.matchAll(/rgba?\(([^)]+)\)/g)].map(m =>
        m[1].split(',').slice(0, 3).map(s => parseFloat(s.trim()))
    );
}

function detectIconContrast(btn) {
    const r  = btn.getBoundingClientRect();
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;

    btn.style.visibility = 'hidden';
    const stack = document.elementsFromPoint(cx, cy);
    btn.style.visibility = '';

    const luminances = [];
    for (const el of stack) {
        if (el === btn || btn.contains(el)) continue;
        const cs = getComputedStyle(el);
        const colors = parseRgbs(cs.backgroundImage + ' ' + cs.backgroundColor);
        for (const c of colors) luminances.push(relLuminance(c));
        if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
            cs.backgroundColor !== 'transparent') break;
    }
    if (!luminances.length) return;

    const minLum = Math.min(...luminances);
    btn.classList.toggle('is-on-dark',  minLum <  0.35);
    btn.classList.toggle('is-on-light', minLum >= 0.35);
}

/* ── render project cards from data/projects.json ───────── */
const cardShapes = {
    1: '<div class="box1-quadrat"></div><div class="box1-circle"></div>',
    2: '<div class="box2-quadrat1"></div><div class="box2-quadrat2"></div>',
    3: '<div class="box3-circle1"></div><div class="box3-circle2"></div>',
    4: '<div class="box4-quadrat1"></div><div class="box4-quadrat2"></div>',
};

const githubSvg = `<svg class="icon-github" aria-hidden="true"><use href="images/icons/github.svg#github"/></svg>`;

function renderTag(t) {
    const name = typeof t === 'string' ? t : t.name;
    const logo = typeof t === 'object' && t.logo
        ? `<img class="box-tag-logo" src="${t.logo}" alt="" loading="eager" decoding="sync">`
        : '';
    return `<span class="box-tag">${logo}${name}</span>`;
}

function renderTagMarquee(tags) {
    if (!tags || !tags.length) return '';
    const items = tags.map(renderTag).join('');
    // start with one copy; JS sizes it up after layout so the track is always
    // wide enough that no empty gap is ever visible
    return `
        <div class="box-tag-marquee">
            <div class="box-tag-track" data-set="${encodeURIComponent(items)}">
                ${items}
            </div>
        </div>`;
}

/* per-track marquee state — keyed by the .box-tag-track element */
const marqueeStates = new WeakMap();
const MARQUEE_SPEED = 20; // px/s

/* one shared observer toggles `visible` so off-screen tracks burn no work */
const marqueeVisibilityObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        const track = entry.target.querySelector('.box-tag-track');
        const state = track && marqueeStates.get(track);
        if (state) state.visible = entry.isIntersecting;
    });
}, { threshold: 0 });

async function sizeMarquees(root) {
    // wait for every tag image to finish loading first — measurements would be
    // off by a few px otherwise
    const imgs = [...root.querySelectorAll('.box-tag-logo')];
    await Promise.all(imgs.map(img =>
        img.complete && img.naturalWidth
            ? Promise.resolve()
            : new Promise(res => {
                img.addEventListener('load',  res, { once: true });
                img.addEventListener('error', res, { once: true });
            })
    ));

    root.querySelectorAll('.box-tag-marquee').forEach(marquee => {
        const track = marquee.querySelector('.box-tag-track');
        if (!track) return;

        const setHtml = decodeURIComponent(track.dataset.set || '');
        if (!setHtml) return;

        // cancel any running RAF before remeasuring
        const prev = marqueeStates.get(track);
        if (prev && prev.rafId) cancelAnimationFrame(prev.rafId);

        track.style.transform = 'none';
        track.innerHTML = setHtml;
        if (!track.children.length) return;

        const marqueeWidth = marquee.getBoundingClientRect().width;

        // grow track until total width is at least 2× the visible area —
        // guarantees the right edge is always populated after recycling
        while (track.getBoundingClientRect().width < marqueeWidth * 2) {
            track.innerHTML += setHtml;
            if (track.children.length > 200) break;   // safety
        }

        const state = {
            offset:  0,
            visible: prev ? prev.visible : true,
            paused:  prev ? prev.paused  : false,
            rafId:   null,
        };
        marqueeStates.set(track, state);

        const card = marquee.closest('.box');
        if (card) marqueeVisibilityObserver.observe(card);

        let last = performance.now();
        const step = now => {
            const dt = now - last;
            last = now;
            if (state.visible && !state.paused) {
                state.offset += dt * MARQUEE_SPEED / 1000;

                // recycle: when the first item has fully scrolled past, move it
                // to the end and subtract its width from offset. The remaining
                // items keep their visible screen position, so this swap is
                // visually invisible.
                let firstItemWidth = track.firstElementChild
                    ? track.firstElementChild.getBoundingClientRect().width +
                      parseFloat(getComputedStyle(track.firstElementChild).marginRight || 0)
                    : 0;

                while (firstItemWidth > 0 && state.offset >= firstItemWidth) {
                    state.offset -= firstItemWidth;
                    track.appendChild(track.firstElementChild);
                    firstItemWidth = track.firstElementChild
                        ? track.firstElementChild.getBoundingClientRect().width +
                          parseFloat(getComputedStyle(track.firstElementChild).marginRight || 0)
                        : 0;
                }

                track.style.transform = `translateX(${-state.offset}px)`;
            }
            state.rafId = requestAnimationFrame(step);
        };
        state.rafId = requestAnimationFrame(step);
    });
}

(async () => {
    const projectsEl = document.getElementById('projects-container');
    if (!projectsEl) return;

    const projects = await fetch('data/projects.json').then(r => r.json());

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
                ${renderTagMarquee(p.tags)}
            </div>
            ${repoBtn}
        </div>`;
    }).join('');

    sizeMarquees(projectsEl);
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => sizeMarquees(projectsEl), 150);
    });

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

        // hover halts the marquee and reveals all tags in a wrapped grid
        const marquee = card.querySelector('.box-tag-marquee');
        const track   = marquee && marquee.querySelector('.box-tag-track');
        if (!track) return;
        const setHtml = decodeURIComponent(track.dataset.set || '');
        if (!setHtml) return;

        // fade track out, swap layout under cover of opacity:0, fade back in
        let swapTimer = null;
        const FADE_MS = 160;

        const swapTo = (toExpanded) => {
            const state = marqueeStates.get(track);
            if (!state) return;
            clearTimeout(swapTimer);
            track.style.transition = `opacity ${FADE_MS}ms ease`;
            track.style.opacity = '0';

            // pause animation immediately on enter so motion isn't still
            // happening behind the fade
            if (toExpanded) state.paused = true;

            swapTimer = setTimeout(() => {
                if (toExpanded) {
                    track.style.transform = 'none';
                    track.innerHTML = setHtml;
                    marquee.classList.add('is-expanded');
                } else {
                    marquee.classList.remove('is-expanded');
                    track.innerHTML = setHtml;
                    const marqueeWidth = marquee.getBoundingClientRect().width;
                    while (track.getBoundingClientRect().width < marqueeWidth * 2) {
                        track.innerHTML += setHtml;
                        if (track.children.length > 200) break;
                    }
                    state.offset = 0;
                    state.paused = false;
                }
                track.style.opacity = '1';
            }, FADE_MS);
        };

        card.addEventListener('mouseenter', () => swapTo(true));
        card.addEventListener('mouseleave', () => swapTo(false));
    });
    projectsEl.querySelectorAll('.box-repo').forEach(btn => {
        btn.addEventListener('click', e => e.stopPropagation());
    });

    // detect background luminance per card as it scrolls into view
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
})();
