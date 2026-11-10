/* Stand-in for the Claude dashboard runtime: same page, numbers from data.json. */
(function () {
  var store = null, failed = false, calcs = {}, draws = {}, listeners = [], memo = {};
  var params = { days: 30 };
  try { var h = new URLSearchParams(location.search).get('days'); if ([1, 7, 30, 90].indexOf(Number(h)) >= 0) params.days = Number(h); } catch (e) {}
  function raw(id) {
    if (!store) return null;
    if (id === 'behavior') return store.behavior[String(params.days)] || [];
    return store[id] || null;
  }
  function data(id) {
    if (failed) return { status: 'error', data: [], message: 'Could not load numbers' };
    if (!store) return { status: 'loading', data: [] };
    if (memo[id]) return memo[id];
    var out;
    if (calcs[id]) {
      var c = calcs[id];
      try { out = { status: 'ok', data: c.fn.apply(null, c.inputs.map(function (i) { return data(i).data; })) || [] }; }
      catch (e) { out = { status: 'error', data: [] }; }
    } else {
      var r = raw(id);
      out = r ? { status: 'ok', data: r } : { status: 'missing', data: [] };
    }
    if (out.data && !Array.isArray(out.data)) out.data = [];
    memo[id] = out;
    return out;
  }
  function runAll() {
    memo = {};
    listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
    Object.keys(draws).forEach(function (name) {
      document.querySelectorAll('[data-draw="' + name + '"]').forEach(function (el) {
        try { draws[name](el); } catch (e) { console.error(name, e); }
      });
    });
  }
  window.dash = {
    data: data,
    calc: function (id, o) { calcs[id] = o; },
    loader: function () {},
    draw: function (name, fn) { draws[name] = fn; },
    onData: function (fn) { listeners.push(fn); },
    params: function () { return Object.assign({}, params); },
    setParams: function (p) {
      Object.assign(params, p);
      try { var u = new URL(location.href); u.searchParams.set('days', params.days); history.replaceState(null, '', u); } catch (e) {}
      runAll();
    },
    resetParams: function () { params = { days: 30 }; runAll(); },
    refresh: function () {},
    setLink: function (id) { try { history.replaceState(null, '', location.pathname + location.search + '#' + id); } catch (e) {} },
    colors: ['#5ff0de', '#b49bff', '#2ed47a', '#e9c776', '#f7e7b0', '#1fb5a6', '#9d7bff', '#56e0ff'],
  };
  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(runAll, 150); });
  document.addEventListener('DOMContentLoaded', function () {
    runAll();
    fetch('data.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        store = j;
        var u = document.getElementById('cl-updated');
        if (u && j.updated) u.textContent = 'Numbers updated ' + new Date(j.updated).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' · refreshed twice a day (12:00 and 00:00 Israel time)';
        runAll();
        var named = location.hash && document.getElementById(location.hash.slice(1));
        if (named) named.scrollIntoView();
      })
      .catch(function () { failed = true; runAll(); });
  });
})();
