/* Visitor tracking (PostHog) — feeds the Website Traffic Dashboard.
   Records page views, clicks, time on page, scroll depth and heatmaps,
   plus a few named events: buy / book / donate / membership-plan clicks,
   webinar cards hovered for 1s+, and time spent in each page section. */
/* Not counted: test copies (anything but chinuch-lifelines.org), and any device
   that opened the site once with ?notrack=1 (undo with ?notrack=0). */
var CL_SKIP_TRACKING = (function () {
  try {
    var q = new URLSearchParams(location.search).get('notrack');
    if (q === '1') { localStorage.setItem('cl_notrack', '1'); alert('Done: this browser is no longer counted in the visitor stats.'); }
    if (q === '0') { localStorage.removeItem('cl_notrack'); alert('Done: this browser is counted in the visitor stats again.'); }
    return localStorage.getItem('cl_notrack') === '1';
  } catch (e) { return false; }
})() || !/(^|\.)chinuch-lifelines\.org$/.test(location.hostname);

if (!CL_SKIP_TRACKING) {
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

posthog.init('phc_qAaCJG8D3WqSuaPc2SvsgXEy3zPe7giEopGRmeMkZRp3', {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'identified_only',
  capture_pageview: true,
  capture_pageleave: true,
  enable_heatmaps: true,
  disable_session_recording: true
});

(function () {
  var page = location.pathname.replace(/^\/|\.html$/g, '') || 'index';
  var FORMS = {
    '210402613239444': 'buy_webinar', '230362417357151': 'buy_webinar',
    '231416619584158': 'buy_course', '230432297151147': 'donate',
    '210261250258445': 'membership', '263077443557060': 'membership',
    '263076885508065': 'book_appointment', '263077212878060': 'mentor_training'
  };
  function text(el) { return (el && el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80); }
  function webinarOf(el) { var c = el.closest && el.closest('article.web'); return c ? text(c.querySelector('h3')) : null; }

  // Named clicks: buy, book, donate, membership plan, mail
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a, button');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var m = href.match(/jotform\.com\/(?:form\/)?(\d{12,})/);
    var kind = m ? (FORMS[m[1]] || 'jotform_form') : null;
    if (!kind && a.dataset.plan) kind = 'membership_plan';
    if (!kind && /consult\.html/.test(href)) kind = 'book_appointment';
    if (!kind && /^mailto:/.test(href)) kind = 'email_link';
    if (!kind) return;
    posthog.capture('cta_click', {
      cta: kind, label: text(a), page: page,
      webinar: webinarOf(a), plan: a.dataset.plan || null, form_id: m ? m[1] : null
    });
  }, true);

  // Webinar "See more" opened
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (d.tagName === 'DETAILS' && d.open && webinarOf(d)) posthog.capture('webinar_details_opened', { webinar: webinarOf(d), page: page });
  }, true);

  // Webinar card hovered for 1 second or more
  document.querySelectorAll('article.web').forEach(function (card) {
    var start = 0;
    card.addEventListener('mouseenter', function () { start = Date.now(); });
    card.addEventListener('mouseleave', function () {
      var ms = Date.now() - start;
      if (start && ms >= 1000) posthog.capture('webinar_hover', { webinar: text(card.querySelector('h3')), seconds: Math.round(ms / 100) / 10, page: page });
      start = 0;
    });
  });

  // Time spent in each page section (sent when the visitor leaves)
  var secs = document.querySelectorAll('section[id], header[id], footer[id]');
  var seen = {}, since = {};
  if ('IntersectionObserver' in window && secs.length) {
    var io = new IntersectionObserver(function (entries) {
      var now = Date.now();
      entries.forEach(function (en) {
        var id = en.target.id;
        if (en.isIntersecting) since[id] = now;
        else if (since[id]) { seen[id] = (seen[id] || 0) + (now - since[id]); delete since[id]; }
      });
    }, { threshold: 0.5 });
    secs.forEach(function (s) { io.observe(s); });
  }
  function flush() {
    var now = Date.now();
    Object.keys(since).forEach(function (id) { seen[id] = (seen[id] || 0) + (now - since[id]); since[id] = now; });
    Object.keys(seen).forEach(function (id) {
      if (seen[id] >= 1000) posthog.capture('section_time', { section: id, seconds: Math.round(seen[id] / 1000), page: page }, { transport: 'sendBeacon' });
    });
    seen = {};
  }
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
    else Object.keys(since).forEach(function (id) { since[id] = Date.now(); });
  });
})();
}
