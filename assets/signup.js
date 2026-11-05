// Sign-up forms: each email goes straight to the form's own Jotform list.
// If Jotform can't be reached, the visitor gets a link to email us instead.
(() => {
  document.querySelectorAll('form[data-jotform]').forEach((form) => {
    const button = form.querySelector('button');
    const label = button.textContent;
    const note = document.createElement('p');
    note.className = 'signup-note';
    note.setAttribute('role', 'status');
    note.hidden = true;
    form.after(note);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.dataset.jotform;
      const email = form.email.value.trim();
      const source = form.dataset.source + (form.plan ? ': ' + form.plan.value : '');
      const mail = 'mailto:admin@chinuch-lifelines.org?subject=' + encodeURIComponent('Sign-up: ' + source) + '&body=' + encodeURIComponent('My email: ' + email);
      const data = new URLSearchParams({ formID: id });
      form.querySelectorAll('[data-q]').forEach((field) => data.set(field.dataset.q, field.value.trim()));
      if (form.plan) data.set('q5_plan', form.plan.value);

      button.disabled = true;
      button.textContent = 'Saving…';
      note.hidden = true;
      const stop = new AbortController();
      const timer = setTimeout(() => stop.abort(), 12000);
      try {
        const res = await fetch('https://submit.jotform.com/submit/' + id + '/', { method: 'POST', body: data, signal: stop.signal });
        if (!res.ok || !/thank/i.test(await res.text())) throw new Error('not saved');
        note.textContent = form.dataset.thanks;
        form.querySelectorAll('[data-q]').forEach((field) => { field.value = ''; });
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
