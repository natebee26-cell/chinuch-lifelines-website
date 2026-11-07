// Pick list: + opens a row's full card; the circles pick items, and
// "Buy selected" opens the Jotform order form with those products already ticked
// (Jotform reads ?myProducts[][id]=1000,1003 and fills in the total).
(() => {
  const update = (list) => {
    const bar = document.getElementById(list.dataset.bar);
    if (!bar) return;
    const sel = [...list.querySelectorAll('.pk-row.sel')];
    const price = parseFloat(list.dataset.price || '0');
    bar.hidden = sel.length === 0;
    bar.querySelector('span').innerHTML = `<b>${sel.length}</b> picked · $${(sel.length * price).toFixed(2)}`;
    bar.querySelector('a').href = `${list.dataset.form}?myProducts[][id]=${sel.map(r => r.dataset.pid).join(',')}`;
  };
  document.addEventListener('click', (e) => {
    const pick = e.target.closest('.pk-pick');
    if (pick) {
      const row = pick.closest('.pk-row');
      row.classList.toggle('sel');
      pick.setAttribute('aria-pressed', row.classList.contains('sel'));
      update(row.closest('.pk-list'));
      return;
    }
    const head = e.target.closest('.pk-head');
    if (head) {
      const row = head.closest('.pk-row');
      const open = row.classList.toggle('open');
      head.setAttribute('aria-expanded', open);
      row.querySelector('.pk-body').hidden = !open;
      return;
    }
    const clear = e.target.closest('.pk-clear');
    if (clear) {
      const list = document.getElementById(clear.dataset.list);
      list.querySelectorAll('.pk-row.sel').forEach((r) => {
        r.classList.remove('sel');
        r.querySelector('.pk-pick').setAttribute('aria-pressed', 'false');
      });
      update(list);
    }
  });
})();
