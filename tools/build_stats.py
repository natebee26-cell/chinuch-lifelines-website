"""Builds the numbers file (data.json) for the hidden stats page.

Usage:
  python3 tools/build_stats.py OUT_JSON JOTFORM_JSON WEBINARS_JSON PH_1 PH_7 PH_30 PH_90

OUT_JSON       Where to write the page's data.json.
JOTFORM_JSON   The Jotform `search` answer (form list with submission_count).
WEBINARS_JSON  Array of {"webinar", "sold", "revenue_usd"} since Nov 8, 2026.
PH_1 .. PH_90  PostHog execute-sql answers for the last 1, 7, 30 and 90 days
               (text holding the "kind|label|sub|n|users|val" table).

The page itself works out every figure the same way the Claude dashboard does.
Only totals go in the file, never names, emails or phone numbers.
"""
import json
import sys
from datetime import datetime, timezone


def posthog_rows(path):
    text = open(path, encoding='utf-8').read()
    try:  # the answer may be JSON with a "results" string
        cut = text.find('{"conversation_id"')
        j = json.loads(text[:cut] if cut > 0 else text)
        if isinstance(j, dict) and isinstance(j.get('results'), str):
            text = j['results']
    except ValueError:
        pass
    lines = text.split('\n')
    head = next(i for i, l in enumerate(lines) if l.strip() == 'kind|label|sub|n|users|val')
    rows = []
    for line in lines[head + 1:]:
        if not line.strip():
            break
        p = line.split('|')
        if len(p) < 6:
            continue
        val, users, n, sub, kind = float(p.pop()), int(float(p.pop())), int(float(p.pop())), p.pop(), p.pop(0)
        rows.append({'kind': kind, 'label': '|'.join(p), 'sub': sub, 'n': n, 'users': users, 'val': val})
    return rows


def main(out, jf_path, web_path, ph1, ph7, ph30, ph90):
    jf = json.load(open(jf_path, encoding='utf-8'))
    if isinstance(jf, str):
        jf = json.loads(jf)
    if jf.get('is_success') is False:
        raise SystemExit('Jotform answer failed: ' + str(jf.get('error')))
    forms = [{'id': str(f['id']), 'title': str(f.get('title', '')).strip(),
              'submissions': int(f.get('submission_count') or 0),
              'updated': str(f.get('updated_at', ''))[:10]}
             for f in ((jf.get('data') or {}).get('results') or [])]
    webinars = [{'webinar': str(w.get('webinar', '')), 'sold': int(w.get('sold') or 0),
                 'revenue_usd': float(w.get('revenue_usd') or 0)}
                for w in json.load(open(web_path, encoding='utf-8'))]
    data = {
        'updated': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'behavior': {'1': posthog_rows(ph1), '7': posthog_rows(ph7), '30': posthog_rows(ph30), '90': posthog_rows(ph90)},
        'forms': forms,
        'webinars_sold': webinars,
    }
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print('wrote', out, '| forms', len(forms), '| webinars', len(webinars),
          '| behavior rows', {k: len(v) for k, v in data['behavior'].items()})


if __name__ == '__main__':
    main(*sys.argv[1:8])
