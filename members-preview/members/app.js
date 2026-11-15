// Members area: shared shell, demo sign-in, progress, and each page's content.
// PREVIEW MODE: sign-in and plans are stored in this browser only. Later this is
// replaced by Supabase (real accounts) and Stripe (payments) without changing the pages.
(() => {
  const C = window.CL_CONTENT;
  const TIERS = { basic: 0, premium: 1, platinum: 2 };
  const TIER_NAME = { basic: 'Basic', premium: 'Premium', platinum: 'Platinum' };
  const mem = {};
  const store = {
    get(k, d) { try { const v = localStorage.getItem('cl_' + k); return v == null ? (k in mem ? mem[k] : d) : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
    set(k, v) { mem[k] = v; try { localStorage.setItem('cl_' + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { delete mem[k]; try { localStorage.removeItem('cl_' + k); } catch (e) {} }
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtDate = (iso, opts) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', opts || { month: 'long', day: 'numeric', year: 'numeric' });
  const PLAY = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="#16231d"/></svg>';
  const inPreview = /claude|anthropic|localhost|127\.0\.0\.1|^$/.test(location.hostname) || location.protocol === 'file:';

  // ---- member + progress ----
  function member() { return store.get('member', null); }
  function tier() { const m = member(); return (m && m.tier) || 'basic'; }
  function has(t) { return TIERS[tier()] >= TIERS[t]; }
  function setTier(t) { const m = member() || { name: 'Guest', email: '' }; m.tier = t; store.set('member', m); }
  function progress() { return store.get('progress', {}); }
  function lessonState(id) { return progress()[id] || { watched: false, tasks: [], note: '' }; }
  function saveLesson(id, patch) { const p = progress(); p[id] = Object.assign(lessonState(id), patch); store.set('progress', p); }
  function lessonDone(l) { const s = lessonState(l.id); return s.watched && s.tasks.filter(Boolean).length >= l.tasks.length; }
  function doneCount() { return C.lessons.filter(lessonDone).length; }
  function nextLesson() { return C.lessons.find((l) => !lessonDone(l)) || C.lessons[C.lessons.length - 1]; }

  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 3600);
  }

  // ---- shell ----
  const NAV = [
    ['home', 'index.html', 'Home'],
    ['course', 'course.html', 'Video course'],
    ['plan', 'plan.html', 'My work plan'],
    ['tips', 'tips.html', 'Parenting tips'],
    ['live', 'live.html', 'Live sessions', 'premium'],
    ['library', 'library.html', 'Webinar library', 'premium'],
    ['inner', 'inner-circle.html', 'Inner Circle', 'platinum'],
    ['account', 'account.html', 'My plan']
  ];
  function shell(active) {
    const m = member();
    const nav = NAV.map(([k, href, label, need]) => `<a href="${href}" class="${k === active ? 'on' : ''}"${k === active ? ' aria-current="page"' : ''}>${label}${need && !has(need) ? ' <span class="lock" aria-label="locked">🔒</span>' : ''}</a>`).join('');
    const sw = ['basic', 'premium', 'platinum'].map((t) => `<button type="button" data-tier="${t}" class="${tier() === t ? 'on' : ''}">${TIER_NAME[t]}</button>`).join('');
    document.body.insertAdjacentHTML('afterbegin', `
      <header class="mbar">
        <div class="wrap mbar-top">
          <a class="logo" href="index.html"><img src="../../assets/logo-light.webp" width="1123" height="363" alt="Chinuch LifeLines members area"></a>
          <div class="who">
            <span class="name">${esc(m ? m.name : '')}</span>
            <span class="badge badge-${tier()}">${TIER_NAME[tier()]}</span>
            <button class="out" type="button" id="signout">Sign out</button>
          </div>
        </div>
        <nav class="wrap mnav" aria-label="Members area">${nav}</nav>
      </header>
      <div class="preview-note"><div class="wrap">
        <span><b>Preview.</b> Sample videos and tips, no real payments. See it as:</span>
        <span class="switch" role="group" aria-label="Preview as plan">${sw}</span>
      </div></div>`);
    document.body.insertAdjacentHTML('beforeend', `
      <footer class="mfoot"><div class="wrap">
        <span>Chinuch LifeLines · Under the auspices of Rabbi Dov Brezak</span>
        <span>Questions? <a href="mailto:admin@chinuch-lifelines.org">admin@chinuch-lifelines.org</a> · <a href="../index.html">Back to the main site</a></span>
      </div></footer>`);
    document.getElementById('signout').onclick = () => { store.del('member'); location.href = '../login.html'; };
    document.querySelectorAll('.switch button').forEach((b) => b.onclick = () => { setTier(b.dataset.tier); location.reload(); });
  }

  // ---- shared pieces ----
  function lessonCard(l, i) {
    const done = lessonDone(l);
    return `<a class="lesson-card" href="lesson.html#${l.id}">
      <div class="thumb"><img src="../../assets/webinars/${l.thumb}.webp" alt="" loading="lazy"><span class="play">${PLAY}</span><span class="dur">${l.mins} min</span>${done ? '<span class="done-flag">Done ✓</span>' : ''}</div>
      <div class="body"><span class="num">Video ${i + 1} of ${C.lessons.length}</span><h3>${esc(l.title)}</h3></div></a>`;
  }
  function tipCard(t, feature) {
    return `<a class="tip-card${feature ? ' tip-feature' : ''}" href="tips.html#${t.id}"><span class="date">${fmtDate(t.date)}</span><h3>${esc(t.title)}</h3><p class="muted">${esc(t.teaser)}</p><span class="small" style="font-weight:600;color:var(--green)">Read the tip →</span></a>`;
  }
  function gate(need, title, text, perks) {
    return `<div class="gate">
      <span class="badge badge-${need}">${TIER_NAME[need]} members</span>
      <h2>${title}</h2><p>${text}</p>
      <ul>${perks.map((p) => `<li>${p}</li>`).join('')}</ul>
      <a class="pill pill-cta" href="account.html#upgrade">See ${TIER_NAME[need]} plan</a>
    </div>`;
  }
  function sessionRow(s) {
    const d = new Date(s.date + 'T12:00:00');
    const open = has(s.tier);
    return `<div class="session"><div class="cal"><div class="m">${d.toLocaleDateString('en-US', { month: 'short' })}</div><div class="d">${d.getDate()}</div></div>
      <div><span class="small muted">${esc(s.kind)} · ${esc(s.time)}</span><h3>${esc(s.topic)}</h3></div>
      ${open ? `<button class="pill pill-dark pill-sm" type="button" data-join>Join on Zoom</button>` : `<a class="pill pill-ghost pill-sm" href="account.html#upgrade">🔒 ${TIER_NAME[s.tier]}</a>`}</div>`;
  }
  function wireJoin(root) { root.querySelectorAll('[data-join]').forEach((b) => b.onclick = () => toast('On the live site this opens the Zoom link 10 minutes before the session starts.')); }

  // ---- pages ----
  const pages = {
    home(main) {
      const m = member(); const n = doneCount(); const total = C.lessons.length; const next = nextLesson();
      const pct = n / total; const R = 52, L = 2 * Math.PI * R;
      const latest = C.tips[0];
      main.innerHTML = `
        <section class="welcome">
          <div>
            <p class="eyebrow" style="color:var(--yellow)">Welcome back</p>
            <h1>Shalom, ${esc(m.name.split(' ')[0])}</h1>
            <p>${n === 0 ? 'Start with the first video. It takes about 15 minutes, and comes with a short plan for this week.' : n === total ? 'You finished the whole course. Keep going with the tips and live sessions.' : `You’re on video ${C.lessons.indexOf(next) + 1}: “${esc(next.title)}”.`}</p>
            <div class="actions">
              <a class="pill pill-cta" href="lesson.html#${next.id}">${n === 0 ? 'Watch video 1' : 'Continue'}</a>
              <a class="pill pill-ghost" style="color:#fff;border-color:rgba(255,255,255,.35)" href="plan.html">Open my work plan</a>
            </div>
          </div>
          <div class="ring" role="img" aria-label="${n} of ${total} videos done">
            <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${R}" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="10"/><circle cx="60" cy="60" r="${R}" fill="none" stroke="#f2c14e" stroke-width="10" stroke-linecap="round" stroke-dasharray="${L * pct} ${L}"/></svg>
            <div class="val"><span><b>${n}/${total}</b>videos done</span></div>
          </div>
        </section>

        <div class="section-title"><h2>${esc(C.course.title)}</h2><a href="course.html">All videos →</a></div>
        <div class="grid g-3">${C.lessons.slice(0, 3).map(lessonCard).join('')}</div>

        <div class="split" style="margin-top:40px">
          <div style="min-width:0">
            <div class="section-title" style="margin-top:0"><h2>Latest parenting tip</h2><a href="tips.html">All tips →</a></div>
            ${tipCard(latest, true)}
            <p class="small muted" style="margin-top:10px">A new tip every other week, here and by email.</p>
          </div>
          <div style="min-width:0">
            <div class="section-title" style="margin-top:0"><h2>Coming up live</h2>${has('premium') ? '<a href="live.html">Schedule →</a>' : ''}</div>
            <div class="card" style="padding:8px 20px">${C.sessions.slice(0, 3).map(sessionRow).join('')}</div>
            ${has('premium') ? '' : '<p class="small muted" style="margin-top:10px">Live workshops and coaching with Rabbi Brezak are part of Premium.</p>'}
          </div>
        </div>`;
      wireJoin(main);
    },

    course(main) {
      main.innerHTML = `<div class="page-head"><div><p class="eyebrow">Free video course</p><h1>${esc(C.course.title)}</h1><p class="lead">${esc(C.course.blurb)}</p></div>
        <span class="small muted">${doneCount()} of ${C.lessons.length} done</span></div>
        <div class="grid g-3">${C.lessons.map(lessonCard).join('')}</div>`;
    },

    lesson(main) {
      const id = location.hash.slice(1); let i = C.lessons.findIndex((l) => l.id === id); if (i < 0) i = 0;
      const l = C.lessons[i]; const st = lessonState(l.id);
      const prev = C.lessons[i - 1], next = C.lessons[i + 1];
      document.title = l.title + ' — Chinuch LifeLines members';
      main.innerHTML = `
        <p class="small" style="margin-bottom:14px"><a href="course.html" style="color:var(--green);text-decoration:none;font-weight:600">← All videos</a></p>
        <div class="split">
          <div style="min-width:0;display:grid;gap:18px">
            <div class="player" id="player">
              <img class="poster" src="../../assets/webinars/${l.thumb}.webp" alt="">
              <div class="center"><button class="big-play" type="button" id="play" aria-label="Play video">${PLAY.replace('20', '30').replace('20', '30')}</button><span>${l.mins} minutes</span></div>
            </div>
            <div>
              <p class="eyebrow">Video ${i + 1} of ${C.lessons.length}</p>
              <h1 style="font-size:clamp(2rem,4.4vw,2.8rem)">${esc(l.title)}</h1>
              <p class="lead">${esc(l.summary)}</p>
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
              <button class="pill ${st.watched ? 'pill-ghost' : 'pill-dark'}" type="button" id="watched">${st.watched ? 'Watched ✓' : 'Mark as watched'}</button>
              ${prev ? `<a class="pill pill-ghost" href="lesson.html#${prev.id}">← Previous</a>` : ''}
              ${next ? `<a class="pill pill-ghost" href="lesson.html#${next.id}">Next video →</a>` : ''}
            </div>
          </div>
          <aside class="plan-box" aria-label="This week's work plan">
            <p class="eyebrow" style="margin:0">Work plan · week ${i + 1}</p>
            <h3>Put it into practice</h3>
            <p class="goal">${esc(l.goal)}</p>
            <ul class="tasks">${l.tasks.map((t, k) => `<li><label><input type="checkbox" id="t-${l.id}-${k}" data-k="${k}" ${st.tasks[k] ? 'checked' : ''}><span>${esc(t)}</span></label></li>`).join('')}</ul>
            <p class="reflect">${esc(l.reflect)}</p>
            <label class="small" for="note" style="font-weight:600">My notes (only you can see these)</label>
            <textarea id="note" placeholder="Write what you noticed this week…">${esc(st.note || '')}</textarea>
          </aside>
        </div>`;
      const player = main.querySelector('#player');
      main.querySelector('#play').onclick = () => {
        if (inPreview) { toast('The real video plays here. Your free videos stay private to members.'); saveLesson(l.id, { watched: true }); main.querySelector('#watched').textContent = 'Watched ✓'; main.querySelector('#watched').className = 'pill pill-ghost'; return; }
        player.innerHTML = `<iframe src="https://player.vimeo.com/video/${l.vimeo}?autoplay=1&title=0&byline=0&portrait=0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${esc(l.title)}"></iframe>`;
        saveLesson(l.id, { watched: true });
      };
      main.querySelector('#watched').onclick = (e) => { const w = !lessonState(l.id).watched; saveLesson(l.id, { watched: w }); e.target.textContent = w ? 'Watched ✓' : 'Mark as watched'; e.target.className = 'pill ' + (w ? 'pill-ghost' : 'pill-dark'); };
      main.querySelectorAll('.tasks input').forEach((cb) => cb.onchange = () => {
        const tasks = lessonState(l.id).tasks.slice(); tasks[+cb.dataset.k] = cb.checked; saveLesson(l.id, { tasks });
        if (lessonDone(l)) toast('Week ' + (i + 1) + ' complete. Well done!');
      });
      let h; main.querySelector('#note').oninput = (e) => { clearTimeout(h); h = setTimeout(() => saveLesson(l.id, { note: e.target.value }), 400); };
    },

    plan(main) {
      const rows = C.lessons.map((l, i) => {
        const s = lessonState(l.id); const t = s.tasks.filter(Boolean).length; const done = lessonDone(l);
        const pct = Math.round(((s.watched ? 1 : 0) + t) / (l.tasks.length + 1) * 100);
        return `<div class="week${done ? ' complete' : ''}"><div class="wk">Week<b>${i + 1}</b></div>
          <div style="min-width:0"><h3>${esc(l.title)}</h3><p class="small muted">${esc(l.goal)}</p><div class="bar" aria-label="${pct}% done"><i style="width:${pct}%"></i></div></div>
          <a class="pill ${done ? 'pill-ghost' : 'pill-dark'} pill-sm" href="lesson.html#${l.id}">${done ? 'Review' : pct ? 'Continue' : 'Start'}</a></div>`;
      }).join('');
      main.innerHTML = `<div class="page-head"><div><p class="eyebrow">My work plan</p><h1>Six weeks, one step at a time</h1><p class="lead">Each week has one video and a short list of things to try at home. Tick them off as you go; your notes are saved for you.</p></div>
        <span class="small muted">${doneCount()} of ${C.lessons.length} weeks complete</span></div>
        <div class="card" style="padding:4px 24px">${rows}</div>`;
    },

    tips(main) {
      const id = location.hash.slice(1); const t = C.tips.find((x) => x.id === id);
      if (t) {
        document.title = t.title + ' — Chinuch LifeLines members';
        main.innerHTML = `<p class="small" style="margin-bottom:14px"><a href="tips.html" style="color:var(--green);text-decoration:none;font-weight:600">← All tips</a></p>
          <article class="article"><p class="eyebrow">PME tip · ${fmtDate(t.date)}</p><h1>${esc(t.title)}</h1>
          <div class="body">${t.body.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
          <div class="try"><b>Try this week</b>${esc(t.tryThis)}</div></article>`;
        return;
      }
      main.innerHTML = `<div class="page-head"><div><p class="eyebrow">Every other week</p><h1>Parenting tips</h1><p class="lead">One practical idea every two weeks, from the Parenting Made Easier approach. New tips also arrive in your inbox.</p></div></div>
        <div class="grid g-2">${C.tips.map((x, i) => tipCard(x, i === 0)).join('')}</div>`;
    },

    live(main) {
      const sched = `<div class="card" style="padding:8px 24px">${C.sessions.map(sessionRow).join('')}</div>`;
      const recs = `<div class="section-title"><h2>Recordings</h2></div><div class="grid g-3">${C.recordings.map((r) => `<div class="lesson-card"><div class="thumb"><img src="../../assets/webinars/${r.thumb}.webp" alt="" loading="lazy"><span class="play">${PLAY}</span><span class="dur">${r.mins} min</span></div><div class="body"><span class="num">${fmtDate(r.date, { month: 'short', day: 'numeric' })}</span><h3>${esc(r.title)}</h3></div></div>`).join('')}</div>`;
      const head = `<div class="page-head"><div><p class="eyebrow">Premium</p><h1>Live with Rabbi Brezak</h1><p class="lead">A weekly PME mini workshop and live group coaching where you can ask about your own family. Missed one? Every session is recorded.</p></div></div>`;
      if (!has('premium')) {
        main.innerHTML = head + gate('premium', 'Ask Rabbi Brezak your questions, live', 'Join the weekly mini workshop and group coaching from home, and watch every recording.', ['Weekly PME live mini workshop', 'Live group coaching with Rabbi Brezak', 'All past recordings', 'The full webinar library']) + `<div class="teaser" aria-hidden="true">${sched}</div>`;
        return;
      }
      main.innerHTML = head + sched + recs; wireJoin(main);
      main.querySelectorAll('.lesson-card').forEach((c) => c.onclick = () => toast('The recording plays here on the live site.'));
    },

    library(main) {
      const head = `<div class="page-head"><div><p class="eyebrow">Premium</p><h1>The webinar library</h1><p class="lead">All 15 of Rabbi Brezak’s recorded webinar series, included with Premium. Stream any session, any time.</p></div></div>`;
      const grid = `<div class="grid g-3">${C.library.map(([th, title, parts]) => `<button type="button" class="lesson-card" style="border:1px solid var(--line);text-align:left;cursor:pointer;padding:0;font:inherit;color:inherit"><div class="thumb"><img src="../../assets/webinars/${th}.webp" alt="" loading="lazy"><span class="play">${PLAY}</span><span class="dur">${parts} parts</span></div><div class="body"><h3>${esc(title)}</h3></div></button>`).join('')}</div>`;
      if (!has('premium')) { main.innerHTML = head + gate('premium', 'Every webinar series, included', 'Today these series are sold one by one. Premium members can listen to all of them.', ['15 webinar series, 65 sessions', 'Listen online or on your phone', 'New series added as they are recorded']) + `<div class="teaser" aria-hidden="true">${grid}</div>`; return; }
      main.innerHTML = head + grid;
      main.querySelectorAll('.lesson-card').forEach((c) => c.onclick = () => toast('On the live site this opens the series with all its sessions.'));
    },

    inner(main) {
      const head = `<div class="page-head"><div><p class="eyebrow">Platinum</p><h1>Rabbi Brezak’s Inner Circle</h1><p class="lead">A small group of families who work closely with Rabbi Brezak: a private monthly call, direct questions, and first access to everything new.</p></div></div>`;
      const body = `<div class="grid g-2">
        <div class="card" style="display:grid;gap:14px"><h2>Ask Rabbi Brezak</h2><p class="muted">Describe a situation at home. You’ll get a personal answer, in writing or as a short voice note, within a week.</p>
          <form id="ask" style="display:grid;gap:12px"><div class="field"><label for="ask-topic">Topic</label><select id="ask-topic"><option>Discipline</option><option>Siblings</option><option>Teens</option><option>Yiddishkeit at home</option><option>Something else</option></select></div>
          <div class="field"><label for="ask-q">Your question</label><textarea id="ask-q" required placeholder="My 9-year-old refuses to…"></textarea></div>
          <button class="pill pill-dark" type="submit">Send my question</button><p class="small muted">2 questions left this month</p></form></div>
        <div style="display:grid;gap:20px;align-content:start">
          <div class="card"><h3>Next private call</h3><div style="margin-top:6px">${sessionRow(C.sessions[3])}</div></div>
          <div class="card" style="background:var(--lav);border:0"><h3>Early access</h3><p class="muted" style="margin-top:6px">New webinars and the next book reach Inner Circle members first, before they go on sale.</p></div>
        </div></div>`;
      if (!has('platinum')) { main.innerHTML = head + gate('platinum', 'Work closely with Rabbi Brezak', 'Limited to a small group so every family gets real attention.', ['Monthly private call (12 families)', 'Personal answers to your questions', 'Early access to new webinars and books', 'Everything in Premium']) + `<div class="teaser" aria-hidden="true">${body}</div>`; return; }
      main.innerHTML = head + body; wireJoin(main);
      main.querySelector('#ask').onsubmit = (e) => { e.preventDefault(); e.target.reset(); toast('Question received. On the live site this goes straight to Rabbi Brezak’s inbox.'); };
    },

    account(main) {
      const m = member(); const cur = tier();
      const plan = (t, price, items, cls) => `<div class="plan ${cls || ''}${cur === t ? ' current' : ''}">
        <span class="badge badge-${t}" style="align-self:flex-start">${cur === t ? 'Your plan' : TIER_NAME[t]}</span>
        <h3>${TIER_NAME[t]}</h3><div class="price">${price}</div>
        <ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>
        ${cur === t ? `<span class="small" style="opacity:.75">You’re on this plan</span>` : `<button class="pill ${t === 'platinum' ? 'pill-cta' : 'pill-dark'}" type="button" data-up="${t}">${TIERS[t] > TIERS[cur] ? 'Upgrade to ' : 'Switch to '}${TIER_NAME[t]}</button>`}</div>`;
      main.innerHTML = `<div class="page-head"><div><p class="eyebrow">My plan</p><h1>Your membership</h1><p class="lead">Signed in as ${esc(m.email || m.name)}. Change or cancel your plan any time.</p></div></div>
        <div class="plans" id="upgrade">
          ${plan('basic', 'Free', ['The free video course', 'Six-week work plan with notes', 'Parenting tip every other week', 'Full tips archive'])}
          ${plan('premium', 'Price coming soon', ['Weekly PME live mini workshop', 'Live group coaching with Rabbi Brezak', 'All session recordings', 'The full webinar library (15 series)', 'Everything in Basic'])}
          ${plan('platinum', 'Price coming soon', ['Rabbi Brezak’s Inner Circle', 'Monthly private call, 12 families', 'Personal answers to your questions', 'Early access to new material', 'Everything in Premium'], 'platinum')}
        </div>
        <p class="small muted" style="margin-top:18px">Payments are not connected in this preview. On the live site, upgrading opens a secure card checkout and your plan changes right away.</p>`;
      main.querySelectorAll('[data-up]').forEach((b) => b.onclick = () => { setTier(b.dataset.up); toast('Preview: you are now on ' + TIER_NAME[b.dataset.up] + '. No payment was taken.'); setTimeout(() => location.reload(), 1400); });
    }
  };

  // ---- boot ----
  window.CL = {
    store, member, tier, setTier, toast,
    page(name) {
      if (!member()) {
        let ok = false; try { localStorage.setItem('cl_t', '1'); localStorage.removeItem('cl_t'); ok = true; } catch (e) {}
        if (ok) { location.replace('../login.html'); return; }
        store.set('member', { name: 'Guest member', email: '', tier: 'basic' });
      }
      shell(name === 'lesson' ? 'course' : name);
      const main = document.querySelector('main');
      const render = () => { pages[name](main); window.scrollTo(0, 0); };
      render();
      if (name === 'lesson' || name === 'tips') window.addEventListener('hashchange', render);
    }
  };
})();
