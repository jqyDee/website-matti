/* ── render about section from data/about.json ──────────── */
(async () => {
    const root = document.getElementById('chat-container');
    if (!root) return;

    let items;
    try {
        items = await fetch('data/about.json').then(r => r.json());
    } catch {
        return;
    }

    root.innerHTML = items.map(item => `
        <p class="left">${item.question}</p>
        <div class="answer-group" role="button" tabindex="0" aria-expanded="false">
            <span class="bubble-dots-pill"><span></span><span></span><span></span></span>
            <div class="bubble-list"><div class="bubble-list-inner">
                ${item.answers.map(a => `<span class="msg">${a}</span>`).join('')}
            </div></div>
        </div>
    `).join('');

    /* randomize blob morph per question bubble */
    root.querySelectorAll('.left').forEach(q => {
        const rand = (min, max) => (Math.random() * (max - min) + min).toFixed(2);
        q.style.setProperty('--morph-dur',   rand(6, 11)  + 's');
        q.style.setProperty('--morph-delay', rand(-8, 0)  + 's');
        q.style.setProperty('--spin-dur',    rand(10, 22) + 's');
        q.style.setProperty('--spin-delay',  rand(-14, 0) + 's');
        q.style.setProperty('--spin-dir', Math.random() < 0.5 ? 'reverse' : 'normal');
    });

    /* expand/collapse answer groups + stagger indices */
    root.querySelectorAll('.answer-group').forEach(group => {
        group.querySelectorAll('.bubble-list-inner > .msg').forEach((m, i) => {
            m.style.setProperty('--i', i);
        });

        const toggle = () => {
            const open = group.getAttribute('aria-expanded') === 'true';
            if (open) {
                group.classList.add('closing');
                group.setAttribute('aria-expanded', 'false');
                setTimeout(() => group.classList.remove('closing'), 700);
            } else {
                group.setAttribute('aria-expanded', 'true');
            }
        };

        group.addEventListener('click', toggle);
        group.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
            }
        });
    });
})();
