// Sign-up forms: each email is saved to the Google Sheet with the form it came from.
// If the sheet can't be reached, the visitor gets a link to email us instead.
(() => {
  const SHEET_URL = ''; // the Google Sheet's web app address; while empty, forms open an email as before

  document.querySelectorAll('form[data-source]').forEach((form) => {
    const button = form.querySelector('button');
    const label = button.textContent;
    const note = document.createElement('p');
    note.className = 'signup-note';
    note.setAttribute('role', 'status');
    note.hidden = true;
    form.after(note);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      const source = form.dataset.source + (form.plan ? ': ' + form.plan.value : '');
      const mail = 'mailto:admin@chinuch-lifelines.org?subject=' + encodeURIComponent('Sign-up: ' + source) + '&body=' + encodeURIComponent('My email: ' + email);
      if (!SHEET_URL) { location.href = mail; return; }

      button.disabled = true;
      button.textContent = 'Saving…';
      note.hidden = true;
      const stop = new AbortController();
      const timer = setTimeout(() => stop.abort(), 12000);
      try {
        const res = await fetch(SHEET_URL, { method: 'POST', body: new URLSearchParams({ email, source }), signal: stop.signal });
        if ((await res.text()).trim() !== 'ok') throw new Error('not saved');
        note.textContent = form.dataset.thanks;
        form.email.value = '';
      } catch {
        const link = document.createElement('a');
        link.href = mail;
        link.textContent = 'email us';
        note.textContent = "We couldn't save that. Please ";
        note.append(link, ' instead.');
      }
      clearTimeout(timer);
      button.disabled = false;
      button.textContent = label;
      note.hidden = false;
    });
  });
})();
