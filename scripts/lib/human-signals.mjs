/**
 * Shared human-readability metrics (audit + validate + fix).
 */

export const EM_DASH_LIMIT = {
  guides: 8,
  gajdy: 8,
  comparisons: 8,
  sravneniya: 8,
  areas: 8,
  rajony: 8,
  projects: 9,
  proekty: 9,
  news: 10,
  novosti: 10,
  default: 8,
};

export const SCENARIO_SPAM_MIN = 4;
export const LIST_DASH_STEPS_MIN = 6;

export function parseMdx(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  return m ? { fm: m[1], body: raw.slice(m[0].length) } : { fm: '', body: raw };
}

export function wordCount(body) {
  return (body.match(/\b[\w']+\b/g) || []).length;
}

export function emDashPer500(body) {
  const w = wordCount(body);
  if (!w) return 0;
  const dashes = (body.match(/—/g) || []).length;
  return (dashes / w) * 500;
}

export function analyzeHumanSignals(body, { emLimit = 8 } = {}) {
  const issues = [];
  const words = wordCount(body);
  if (words < 80) return { words, issues, emPer500: 0 };

  const stars = (body.match(/\*\*/g) || []).length;
  if (stars % 2 !== 0) issues.push({ kind: 'unclosed-bold', detail: `odd ** count: ${stars}` });

  if (/^[^\n|]+ — \| /m.test(body)) {
    issues.push({ kind: 'glued-table', detail: 'text glued to markdown table' });
  }
  if (/\{\/\* corpus:/.test(body)) {
    issues.push({ kind: 'corpus-stamp', detail: 'wave17 corpus comment' });
  }

  const em = (body.match(/—/g) || []).length;
  const emPer500 = words ? (em / words) * 500 : 0;
  if (emPer500 > emLimit) {
    issues.push({ kind: 'em-dash-heavy', detail: `${em} typographic dashes (${emPer500.toFixed(1)}/500w, limit ${emLimit})` });
  }

  const scenarios = (body.match(/^Scenario [A-D] —/gm) || []).length;
  if (scenarios >= SCENARIO_SPAM_MIN) {
    issues.push({ kind: 'scenario-spam', detail: `${scenarios} Scenario A–D lines` });
  }

  const dashSteps = (body.match(/^\d+\. [^\n]+ — /gm) || []).length;
  if (dashSteps >= LIST_DASH_STEPS_MIN) {
    issues.push({ kind: 'list-dash-steps', detail: `${dashSteps} numbered steps with em dash` });
  }

  return { words, issues, emPer500, em, scenarios, dashSteps };
}

/** Reduce AI-style em dashes; skip component/import lines only. */
export function humanizeBodyLines(body, { includeTables = true } = {}) {
  const lines = body.split('\n');
  let changed = 0;
  const out = lines.map((line) => {
    if (!line.trim()) return line;
    if (/^\s*import\s/.test(line)) return line;
    if (/^\s*<\/?[A-Z]/.test(line)) return line;
    if (/^\s*\{/.test(line) && !/^\s*\|/.test(line)) return line;

    const isTable = /^\s*\|/.test(line);
    if (isTable && !includeTables) return line;

    let s = line;
    const before = s;

    // Headings: ## Topic — subtitle
    s = s.replace(/^(#{1,6}\s+[^—\n]+) — ([^\n]+)$/, '$1: $2');

    s = s.replace(/^Scenario ([A-D]) — /, 'Scenario $1: ');
    s = s.replace(/^(\d+)\. ([^—\n]{1,120}) — /, '$1. $2: ');

    const subs = [
      [/ — not /g, ', not '],
      [/ — and /g, ', and '],
      [/ — or /g, ', or '],
      [/ — if /g, '; if '],
      [/ — but /g, ', but '],
      [/ — so /g, ', so '],
      [/ — which /g, ', which '],
      [/ — who /g, ', who '],
      [/ — where /g, ', where '],
      [/ — while /g, ', while '],
      [/ — though /g, ', though '],
      [/ — because /g, ', because '],
      [/ — see /g, '; see '],
      [/ — often /g, ', often '],
      [/ — still /g, ', still '],
      [/ — rarely /g, ', rarely '],
      [/ — never /g, ', never '],
      [/ — always /g, ', always '],
      [/ — usually /g, ', usually '],
      [/ — e\.g\./g, ', e.g.'],
      [/ — i\.e\./g, ', i.e.'],
      [/ — absent /g, ', absent '],
      [/ — illegal /g, ', illegal '],
      [/ — especially /g, ', especially '],
      [/ — plus /g, ', plus '],
      // Russian
      [/ — и /g, ', и '],
      [/ — но /g, ', но '],
      [/ — а /g, ', а '],
      [/ — или /g, ', или '],
      [/ — если /g, '; если '],
      [/ — не /g, ', не '],
      [/ — это /g, ', это '],
      [/ — от /g, ', от '],
      [/ — до /g, ', до '],
      [/ — при /g, ', при '],
      [/ — без /g, ', без '],
      [/ — для /g, ', для '],
      [/ — что /g, ', что '],
      [/ — чтобы /g, ', чтобы '],
      [/ — когда /g, ', когда '],
      [/ — где /g, ', где '],
      [/ — который /g, ', который '],
      [/ — которая /g, ', которая '],
      [/ — которые /g, ', которые '],
      [/ — также /g, ', также '],
      [/ — уже /g, ', уже '],
      [/ — ещё /g, ', ещё '],
      [/ — еще /g, ', еще '],
      [/ — только /g, ', только '],
      [/ — особенно /g, ', особенно '],
      [/ — обычно /g, ', обычно '],
      [/ — часто /g, ', часто '],
      [/ — редко /g, ', редко '],
      [/ — см\. /g, '; см. '],
      [/ — см /g, '; см '],
    ];
    for (const [re, rep] of subs) s = s.replace(re, rep);

    let guard = 0;
    while (s.includes(' — ') && guard < 16) {
      s = s.replace(' — ', ', ');
      guard++;
    }

    if ((s.match(/—/g) || []).length > 0 && !isTable) {
      s = s.replace(/—/g, ', ');
    }

    if (s !== before) changed++;
    return s;
  });

  return { body: out.join('\n'), changed };
}

/** Light pass on YAML frontmatter FAQ / description strings */
export function humanizeFrontmatter(fm) {
  if (!fm) return { fm, changed: 0 };
  let changed = 0;
  const out = fm.split('\n').map((line) => {
    if (!/^(description|title|answer):/.test(line.trim()) && !line.trim().startsWith('answer:')) {
      // multiline yaml answers handled below via whole-fm replace for quoted strings
      return line;
    }
    const before = line;
    let s = line.replace(/ — /g, ', ');
    if (s !== before) changed++;
    return s;
  }).join('\n');

  let s2 = out.replace(/(answer:\s*"[^"]*) — ([^"]*")/g, (_, a, b) => {
    changed++;
    return `${a}, ${b}`;
  });
  // global quoted strings in fm
  s2 = s2.replace(/"([^"]*) — ([^"]*)"/g, (m) => {
    if (!m.includes('—')) return m;
    changed++;
    return m.replace(/ — /g, ', ');
  });

  return { fm: s2, changed };
}

/** Force corpus under em limit — last resort */
export function forceUnderEmLimit(body, emLimit) {
  let s = body;
  let guard = 0;
  while (guard < 200) {
    const { emPer500 } = analyzeHumanSignals(s, { emLimit });
    if (emPer500 <= emLimit) break;
    const next = s.replace(/ — /, ', ');
    if (next === s) {
      s = s.replace(/—/, ',');
      if (s === next) break;
    } else {
      s = next;
    }
    guard++;
  }
  return s;
}
