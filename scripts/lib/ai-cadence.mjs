/**
 * AI-каденция: машинный детектор машинного почерка.
 *
 * Зачем отдельно от human-signals.mjs: тот ловит типографику и вёрстку
 * (длинное тире, склеенные таблицы, незакрытый жирный). Этот ловит ПОЧЕРК:
 * риторические фигуры, канцелярит, крючки и ритм, которые выдают генерацию.
 *
 * Два слоя, принципиально разных:
 *   1. СЛОВАРИ (язык-зависимые) - антитезы, канцелярит, пафос, крючки, кальки.
 *      Считаются как ПЛОТНОСТЬ на 1000 слов, а не бинарным присутствием:
 *      одно «однако» на длинный гайд это нормальный русский, восемь - почерк.
 *   2. МЕТРИКИ РИТМА (язык-независимые) - метроном, разброс длин, параллельные
 *      старты, стаккато. Эти работают одинаково на ru и en.
 *
 * Плюс жёсткий слой невидимых символов: им в тексте не место никогда.
 *
 * И необязательный слой чужих слов: английский и транслит в тексте на другом
 * языке, по словарю сайта с готовыми заменами (findForeignTerms).
 *
 * Пороги НЕ зашиты. Их задаёт вызывающая сторона, а откалиброваны они по
 * нашему живому корпусу через `node scripts/ru-cadence-check.mjs --calibrate`.
 * Ставить порог из головы нельзя: наш собственный замер на GEO-балле уже
 * показал, чем кончается гейт по числу, выставленный до замера.
 */

// ---------------------------------------------------------------------------
// Подготовка текста: оставить прозу, выкинуть всё, что прозой не является
// ---------------------------------------------------------------------------

/**
 * Снять frontmatter, код, MDX-компоненты, таблицы, картинки и служебку.
 * Ссылки схлопываются в текст подписи: это по-прежнему проза.
 */
export function extractProse(raw) {
  let t = raw;
  t = t.replace(/^---\n[\s\S]*?\n---\n/, '\n');          // frontmatter
  t = t.replace(/^import\s+[^\n]+$/gm, '');               // MDX-импорты
  t = t.replace(/```[\s\S]*?```/g, '\n');                 // блоки кода
  t = t.replace(/`[^`\n]*`/g, ' ');                       // инлайн-код
  t = t.replace(/<[A-Z][A-Za-z0-9]*\b[\s\S]*?\/>/g, '\n'); // самозакрытые компоненты
  t = t.replace(/<\/?[A-Za-z][^>\n]*>/g, ' ');            // остальные теги
  t = t.replace(/^\s*\|.*\|\s*$/gm, '');                  // строки таблиц
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');            // картинки
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');          // ссылки -> подпись
  t = t.replace(/^\s*[-*+]\s+/gm, '');                    // маркеры списка
  t = t.replace(/^\s*\d+\.\s+/gm, '');                    // номера списка
  t = t.replace(/[*_~]{1,3}/g, '');                       // жирный/курсив
  t = t.replace(/^\s*>\s?/gm, '');                        // цитаты-выноски
  return t;
}

/** Заголовки отдельно: крючки живут и в них, а ритм по ним мерить нельзя. */
export function extractHeadings(raw) {
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, '\n').replace(/```[\s\S]*?```/g, '\n');
  return (body.match(/^#{2,4}\s+.+$/gm) || []).map((h) => h.replace(/^#+\s+/, '').trim());
}

/** Проза без заголовков - вход для метрик ритма. */
export function proseWithoutHeadings(raw) {
  return extractProse(raw).replace(/^#{1,6}\s+.*$/gm, '');
}

export function countWords(text) {
  return (text.match(/[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9'-]*/g) || []).length;
}

/** Разбиение на предложения с защитой от сокращений и инициалов. */
export function splitSentences(text) {
  const guarded = text
    .replace(/\b(т\.\s?е|т\.\s?к|т\.\s?д|т\.\s?п|см|стр|рис|гл|ст|п|пп|руб|тыс|млн|млрд|кв)\.\s/gi, '$1<ABBR> ')
    .replace(/\b([A-ZА-ЯЁ])\.\s(?=[A-ZА-ЯЁ])/g, '$1<ABBR> ')
    .replace(/(\d)\.\s(?=\d)/g, '$1<ABBR> ');
  return guarded
    .split(/(?<=[.!?…])["»)]?\s+/)
    .map((s) => s.replace(/<ABBR>/g, '.').trim())
    .filter((s) => countWords(s) > 0);
}

export function splitParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => countWords(p) >= 8);
}

// ---------------------------------------------------------------------------
// Слой 0: невидимые символы. Жёстко, без порога.
// ---------------------------------------------------------------------------

export const INVISIBLE = [
  { code: 'U+200B', re: new RegExp('\\u200B', 'g'), name: 'zero-width space' },
  { code: 'U+200C', re: new RegExp('\\u200C', 'g'), name: 'zero-width non-joiner' },
  { code: 'U+200D', re: new RegExp('\\u200D', 'g'), name: 'zero-width joiner' },
  { code: 'U+FEFF', re: new RegExp('\\uFEFF', 'g'), name: 'BOM' },
  { code: 'U+00AD', re: new RegExp('\\u00AD', 'g'), name: 'soft hyphen' },
  { code: 'U+2060', re: new RegExp('\\u2060', 'g'), name: 'word joiner' },
  { code: 'U+2028', re: new RegExp('\\u2028', 'g'), name: 'line separator' },
  { code: 'U+2029', re: new RegExp('\\u2029', 'g'), name: 'paragraph separator' },
  { code: 'U+00A0', re: new RegExp('\\u00A0', 'g'), name: 'non-breaking space', soft: true },
];

export function findInvisible(raw) {
  const out = [];
  for (const m of INVISIBLE) {
    const n = (raw.match(m.re) || []).length;
    if (n > 0) out.push({ code: m.code, name: m.name, count: n, soft: Boolean(m.soft) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Слой 1: словари. Русский.
// ---------------------------------------------------------------------------

/**
 * Антитеза «ложный вариант - отрицание - правильный». Четыре формы, потому что
 * одна регулярка ловит только первую, а остальные три проходят мимо неё.
 * Считаем СУММАРНО: это одна фигура речи, разложенная на варианты записи.
 */
const RU_ANTITHESIS = [
  { id: 'не-X-а-Y', re: /(?:^|[\s(«"])[Нн]е\s+[^.,;:!?\n]{2,45},\s+а\s+[^.,;:!?\n]{2,45}/gm },
  { id: 'не-просто-X-а-Y', re: /[Нн]е\s+просто\s+[^.,;:!?\n]{2,45},\s+а\s+/gm },
  { id: 'Y-а-не-X', re: /,\s+а\s+не\s+[^.,;:!?\n]{2,45}/gm },
  { id: 'это-не-X-это-Y', re: /(?:^|[\s«"])(?:это|дело|речь)\s+не\s+[^.,;:!?\n]{2,45}[.,;:!?]\s*(?:и\s+|а\s+)?(?:это|дело|речь)\s/gim },
  { id: 'ты-не-X-ты-Y', re: /(?:^|[^А-Яа-яЁё])(?:ты|вы)\s+не\s+[^.,;:!?\n]{2,40},\s+(?:ты|вы)\s/gim },
  { id: 'X-вместо-Y', re: /(?:^|[^А-Яа-яЁё])[А-ЯЁа-яё]+\s+вместо\s+[а-яё]+(?:\s|[,.])/gm, weight: 0.5 },
];

/** Канцелярит и связки сочинения. */
const RU_CLERICAL = [
  'однако', 'таким образом', 'важно отметить', 'стоит отметить', 'стоит сказать',
  'стоит подчеркнуть', 'следует понимать', 'следует учитывать', 'необходимо учитывать',
  'как было сказано выше', 'как уже отмечалось', 'вышеупомянут', 'кроме того',
  'более того', 'при этом важно', 'также стоит', 'в заключение', 'подведём итог',
  'подводя итог', 'в современном мире', 'играет ключевую роль', 'играет важную роль',
  'представляет собой', 'является неотъемлемой', 'обеспечивает возможность',
  'не стоит забывать', 'в первую очередь стоит', 'необходимо отметить',
];

/** Пафос и литературные крючки. */
const RU_LITERARY = [
  'эпоха\\s+\\S+\\s+(?:закончил|заканчива|ушл|прошл)', 'настал[аи]?\\s+эра', 'новая\\s+эра',
  'в\\s+мире,\\s+где', 'настоящая\\s+революция', 'меняет\\s+всё', 'изменил[ои]?\\s+рынок',
  'будущее\\s+за\\s+теми', 'мы\\s+стоим\\s+на\\s+пороге', 'на\\s+пороге\\s+перемен',
  'фундаментальн', 'кардинальн', 'радикальн', 'по-настоящему', 'не\\s+просто\\s+\\S+,\\s+а\\s+целый',
];

/** Безличный учительский тон и служебные крючки. */
const RU_IMPERSONAL = [
  'вам\\s+расскаж', 'вы\\s+узнаете', 'здесь\\s+объясн', 'здесь\\s+покаж',
  'давайте\\s+разбер', 'давайте\\s+рассмотрим', 'рассмотрим\\s+подробнее',
  'обратите\\s+внимание', 'следует\\s+помнить', 'стоит\\s+помнить',
  'важно\\s+понимать,?\\s+что', 'в\\s+этой\\s+статье\\s+вы\\s+узнаете',
  'разберём\\s+по\\s+порядку', 'как\\s+мы\\s+видели\\s+выше', 'ниже\\s+мы\\s+рассмотрим',
  'и\\s+самое\\s+(?:главное|важное|интересное)', 'вот\\s+в\\s+чём\\s+суть',
  'а\\s+теперь\\s+представьте', 'самое\\s+(?:интересное|важное)(?![А-Яа-яЁё])',
];

/** Кальки с английского машинного стиля. */
const RU_CALQUE = [
  'погружаемся\\s+в', 'погрузимся\\s+в', 'меняющемся\\s+ландшафте', 'ландшафт\\s+рынка',
  'бесшовн', 'всеобъемлющ', 'открывает\\s+двери', 'золотая\\s+середина',
  'палитра\\s+возможностей', 'ключ\\s+к\\s+успеху', 'надёжное\\s+решение',
  'в\\s+условиях\\s+постоянно', 'не\\s+является\\s+исключением',
];

/**
 * Крючок-двоеточие: перед двоеточием стоит ОЦЕНКА важности, а не факт.
 * Их собственный замер: греп по списку фраз дал ноль, семантический проход
 * нашёл пятнадцать штук, ни одной из словаря. Поэтому ловим конструкцию,
 * а не конкретные слова.
 */
const RU_COLON_HOOK = new RegExp(
  '(?:^|[.!?]\\s+)[^.!?\\n]{0,60}(?:^|[^А-Яа-яЁё])'
  + '(?:важн[А-Яа-яЁё]*|ключев[А-Яа-яЁё]*|главн[А-Яа-яЁё]*|полезн[А-Яа-яЁё]*|интересн[А-Яа-яЁё]*'
  + '|тонкост[А-Яа-яЁё]*|нюанс[А-Яа-яЁё]*|деталь|момент|оговорк[А-Яа-яЁё]*|мелочь|правило'
  + '|новость|подвох|ловушк[А-Яа-яЁё]*|секрет)'
  + '[^.!?\\n:]{0,40}:\\s',
  'gim',
);

/**
 * Суперлатив-анонс: предложение открывается оценкой значимости, факт приезжает
 * следом. Убираешь анонс - смысл не теряется, ритм оживает.
 */
const RU_SUPERLATIVE_OPENER =
  /(?:^|[.!?]\s+)(Сам(?:ое|ый|ая)\s|Лучше\s+всего\b|Практичнее\s+всего\b|Хуже\s+всего\b|Важнее\s+всего\b|Главн(?:ое|ый|ая)\b|Ключев(?:ое|ой|ая)\b|Дальше\s+начинается\b|Что\s+это\s+значит\b|Означает\s+одно\b)/gm;

// ---------------------------------------------------------------------------
// Слой 1: словари. Английский. Те же семьи, свои формы.
// ---------------------------------------------------------------------------

const EN_ANTITHESIS = [
  { id: 'not-X-but-Y', re: /\b(?:is|are|was|were|it['’]s|that['’]s)?\s*not\s+(?:just|only|merely|simply)?\s*[^.,;:!?\n]{2,45},?\s+but\s+(?:rather\s+)?[^.,;:!?\n]{2,45}/gim },
  { id: 'X-not-Y', re: /,\s+not\s+[^.,;:!?\n]{2,45}/gm },
  { id: 'this-isnt-X-its-Y', re: /\b(?:this|that|it)\s+(?:is\s*n[o']t|isn['’]t|['’]s\s+not)\s+[^.,;:!?\n]{2,45}[.;,]\s*(?:it|this|that)\s+(?:is|['’]s)\s/gim },
  { id: 'less-about-more-about', re: /\bless\s+about\s+[^.,;:!?\n]{2,45}\s+(?:and|than)\s+more\s+about\s/gim },
];

const EN_CLERICAL = [
  'moreover', 'furthermore', 'in conclusion', 'it is important to note',
  'it is worth noting', 'it should be noted', 'that being said', 'needless to say',
  'in today[\'’]s (?:evolving|rapidly|fast-paced|competitive)', 'plays a (?:key|crucial|vital) role',
  'serves as a', 'when it comes to', 'at the end of the day', 'in the realm of',
  'it goes without saying', 'a testament to', 'paving the way',
];

const EN_LITERARY = [
  'unlock the (?:potential|power|secrets)', 'game[- ]chang(?:er|ing)', 'the landscape of',
  'ever[- ]evolving', 'in a world where', 'a new era', 'the dawn of',
  'revolutioniz', 'transformative journey', 'delve into', 'navigate the complexities',
  'tapestry', 'realm of possibilit',
];

const EN_IMPERSONAL = [
  'in this (?:article|guide|section),? (?:we|you)', 'let[\'’]s (?:dive|explore|take a look|break)',
  'as we (?:saw|discussed) (?:above|earlier)', 'below,? we will', 'it is worth mentioning',
  'you will learn', 'we will explore', 'stay tuned', 'without further ado',
];

const EN_CALQUE = [
  'robust solution', 'comprehensive framework', 'seamless(?:ly)?', 'holistic approach',
  'leverage the', 'operational excellence', 'regional diversification',
  'best practices dictate', 'cutting[- ]edge',
];

const EN_COLON_HOOK =
  /(?:^|[.!?]\s+)[^.!?\n]{0,60}\b(important|crucial|key|critical|good news|bad news|the catch|the trick|worth noting|pro tip|bottom line)\b[^.!?\n:]{0,40}:\s/gim;

const EN_SUPERLATIVE_OPENER =
  /(?:^|[.!?]\s+)(The (?:most|best|biggest|hardest|trickiest)\s|Most importantly\b|The key (?:here|thing|point)\b|What (?:this|that) means\b|Here[\'’]s (?:the|where|what)\b|And the best part\b)/gm;

// ---------------------------------------------------------------------------
// Сборка языковых пакетов
// ---------------------------------------------------------------------------

function toRegexList(arr, flags = 'gim') {
  return arr.map((p) => new RegExp(`(?:^|[^А-Яа-яЁёA-Za-z])(?:${p})`, flags));
}

export const PACKS = {
  ru: {
    label: 'русский',
    antithesis: RU_ANTITHESIS,
    clerical: toRegexList(RU_CLERICAL),
    literary: toRegexList(RU_LITERARY),
    impersonal: toRegexList(RU_IMPERSONAL),
    calque: toRegexList(RU_CALQUE),
    colonHook: RU_COLON_HOOK,
    superlativeOpener: RU_SUPERLATIVE_OPENER,
  },
  en: {
    label: 'english',
    antithesis: EN_ANTITHESIS,
    clerical: toRegexList(EN_CLERICAL),
    literary: toRegexList(EN_LITERARY),
    impersonal: toRegexList(EN_IMPERSONAL),
    calque: toRegexList(EN_CALQUE),
    colonHook: EN_COLON_HOOK,
    superlativeOpener: EN_SUPERLATIVE_OPENER,
  },
};

// ---------------------------------------------------------------------------
// Слой 2: метрики ритма. Язык-независимые.
// ---------------------------------------------------------------------------

/**
 * Метроном. Их находка, которой у нас не было: разброс длин предложений (CV)
 * НЕ видит позицию финала. Текст может иметь отличный CV и при этом закрывать
 * чеканной фразой каждый второй абзац - при чтении вслух это слышно сразу.
 * Меряем долю абзацев, чьё последнее предложение короче порога.
 */
export function metronome(prose, { shortChars = 75 } = {}) {
  const paras = splitParagraphs(prose);
  if (paras.length < 4) return { paragraphs: paras.length, shortEndings: 0, pct: 0 };
  let short = 0;
  for (const p of paras) {
    const sents = splitSentences(p);
    const last = sents[sents.length - 1];
    if (last && last.length < shortChars) short += 1;
  }
  return { paragraphs: paras.length, shortEndings: short, pct: (short / paras.length) * 100 };
}

/** Разброс длин предложений. Живая речь дышит, генерация выравнивает. */
export function burstiness(prose) {
  const lens = splitSentences(prose).map((s) => countWords(s)).filter((n) => n > 1);
  if (lens.length < 8) return { sentences: lens.length, mean: 0, cv: null };
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const varc = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length;
  return { sentences: lens.length, mean, cv: Math.sqrt(varc) / mean };
}

const CONNECTOR_STARTS = new Set([
  'и', 'а', 'но', 'это', 'то', 'так', 'там', 'тут', 'здесь', 'если', 'когда', 'что',
  'для', 'при', 'по', 'на', 'в', 'с', 'у', 'из', 'до', 'за', 'от', 'о', 'же', 'ещё',
  'или', 'уже', 'также', 'потому', 'значит', 'все', 'всё', 'я', 'вы', 'мы', 'он', 'она', 'они',
  'the', 'a', 'an', 'and', 'but', 'or', 'if', 'when', 'it', 'this', 'that', 'you', 'we', 'they',
  'for', 'in', 'on', 'at', 'to', 'of', 'as', 'so', 'there', 'here',
]);

/** Два предложения подряд с одинаковым содержательным стартом. */
export function parallelStarts(prose) {
  const sents = splitSentences(prose);
  const first = (s) => {
    const m = s.match(/[A-Za-zА-Яа-яЁё]+/);
    return m ? m[0].toLowerCase() : '';
  };
  const hits = [];
  for (let i = 0; i < sents.length - 1; i += 1) {
    const a = first(sents[i]);
    const b = first(sents[i + 1]);
    if (a && a === b && a.length > 2 && !CONNECTOR_STARTS.has(a)) {
      hits.push(`«${a}…» ×2: ${sents[i].slice(0, 40)} || ${sents[i + 1].slice(0, 40)}`);
    }
  }
  return hits;
}

/** Три и больше односложных предложения подряд: «Просто. Понятно. Выгодно.» */
export function staccato(prose) {
  const sents = splitSentences(prose);
  const hits = [];
  let run = [];
  const flush = () => {
    if (run.length >= 3) hits.push(run.slice(0, 5).join(' '));
    run = [];
  };
  for (const s of sents) {
    if (countWords(s) === 1 && /[.!?]$/.test(s.trim())) run.push(s.trim());
    else flush();
  }
  flush();
  return hits;
}

/**
 * Страховка «правка сама становится шаблоном». Их прецедент: механическая
 * замена восьми антитез на одну и ту же формулировку дала четыре подряд -
 * тот же выровненный ритм другими словами. Считаем частоту любой повторяющейся
 * связки из 3-4 слов; если одна и та же встречается чаще предела, это новый шаблон.
 */
export function repeatedPhrases(prose, { n = 4, minCount = 3 } = {}) {
  const words = (prose.toLowerCase().match(/[a-zа-яё0-9]+/g) || []);
  const seen = new Map();
  for (let i = 0; i + n <= words.length; i += 1) {
    const gram = words.slice(i, i + n).join(' ');
    seen.set(gram, (seen.get(gram) || 0) + 1);
  }
  return [...seen.entries()]
    .filter(([, c]) => c >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([gram, c]) => ({ gram, count: c }));
}

// ---------------------------------------------------------------------------
// Слой 3: чужие слова по словарю сайта (необязательный)
// ---------------------------------------------------------------------------

/**
 * Английские слова и транслит в тексте на другом языке: «shortlist», «yield»,
 * «кейс», «фрихолд». Словарь с заменами задаёт сайт в scripts/lib/cadence-terms.mjs;
 * нет файла - слой молчит.
 *
 * Зачем отдельный слой, а не разовая чистка. На русском сайте исправитель уже
 * заменял 108 английских терминов, и часть вернулась: shortlist 13 раз, yield 25,
 * compliance 13. Разовая чистка без проверки не держит.
 *
 * Главная ловушка - названия. «Serene Condo Layan», «Gardens of Eden», «LTR visa»
 * законная латиница. Правило: слово из словаря не считается, если стоит внутри
 * латинского оборота, где есть слово С ЗАГЛАВНОЙ буквы, которого нет в словаре.
 * «Shortlist» в начале предложения ловится: в обороте нет других слов.
 *
 * Формат словаря:
 *   { dictionary: [{ match: 'cash flow', replace: 'денежный поток' },
 *                  { re: 'кейс[а-яё]*', replace: 'пример' }],
 *     // evenCapitalized: true - метить и в названии («Land Department» → «земельный отдел»)
 *     allowLatin: ['vs', ...],        // строчная латиница, которую не метить
 *     flagUnknownLatin: true,         // метить незнакомую строчную латиницу
 *     scanFrontmatter: ['title', 'description'] }
 */

const LATIN_TOKEN = /[A-Za-z][A-Za-z0-9'’&.%/+-]*/;
const LATIN_SPAN = new RegExp(
  `(?<![\\p{L}\\p{N}])${LATIN_TOKEN.source}(?:[ \\t]+[A-Za-z0-9][A-Za-z0-9'’&.%/+-]*)*(?![\\p{L}\\p{N}])`,
  'gu',
);
const NAME_GLUE = new Set(['the', 'of', 'de', 'la', 'le', 'and', 'by', 'at', 'on', 'in', 'du', 'des', 'del', 'di', 'da', 'van', 'von', '&']);

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileTerms(terms) {
  if (terms.__compiled) return terms.__compiled;
  const entries = (terms.dictionary || []).map((e, i) => {
    let src;
    if (e.re) src = e.re;
    else src = e.match.trim().split(/\s+/).map(escapeRe).join('[\\s-]+');
    const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${src})(?![\\p{L}\\p{N}])`, 'giu');
    return {
      id: i, label: e.label || e.match || e.re, replace: e.replace, re, latin: /[A-Za-z]/.test(src),
      evenCapitalized: Boolean(e.evenCapitalized), wordCount: e.match ? e.match.trim().split(/\s+/).length : 1,
    };
  });
  const dictWords = new Set();
  for (const e of terms.dictionary || []) {
    if (e.match) for (const w of e.match.toLowerCase().split(/[\s-]+/)) dictWords.add(w);
  }
  const allow = new Set((terms.allowLatin || []).map((w) => w.toLowerCase()));
  terms.__compiled = { entries, dictWords, allow };
  return terms.__compiled;
}

function frontmatterFields(raw, fields) {
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fm || !fields || !fields.length) return '';
  const out = [];
  for (const f of fields) {
    const m = fm[1].match(new RegExp(`^${f}:\\s*(.+)$`, 'm'));
    if (m) out.push(m[1].replace(/^["']|["']$/g, ''));
  }
  return out.join('.\n\n');
}

/** Латинские обороты текста: [начало, конец, слова]. */
function latinSpans(text) {
  const spans = [];
  for (const m of text.matchAll(LATIN_SPAN)) {
    spans.push({ start: m.index, end: m.index + m[0].length, words: m[0].split(/[ \t]+/) });
  }
  return spans;
}

/**
 * Пояснение оригиналом: «документ о праве (Chanote)», «обещают “guaranteed return”».
 * Правило русского текста это прямо разрешает: русское слово и оригинал в скобках.
 * Латиница, которая целиком стоит в скобках или кавычках, не метится.
 */
function isGloss(text, span) {
  const before = text.slice(Math.max(0, span.start - 3), span.start);
  const after = text.slice(span.end, span.end + 3);
  if (/\(\s*$/.test(before) && /^\s*[),;]/.test(after)) return true;
  if (/[«"“‘']\s*$/.test(before) && /^\s*[»"”’']/.test(after)) return true;
  return false;
}

/**
 * Оборот считается названием, если:
 *  - в нём есть слово с заглавной, которого нет в словаре («Serene Condo Layan»);
 *  - или в нём два слова и больше, и все значимые слова с заглавной («The Title»,
 *    «Pool Villa»). Так пишутся имена проектов, и слово из словаря внутри имени
 *    не жаргон.
 * Одно слово с заглавной («Shortlist» в начале предложения) названием не считается.
 */
function isNameSpan(span, dictWords) {
  const clean = span.words.map((w) => ({ w, low: w.toLowerCase().replace(/[.,'’]+$/, '') }));
  const unknownCapital = clean.some(({ w, low }) => /^[A-Z]/.test(w) && !NAME_GLUE.has(low) && !dictWords.has(low));
  if (unknownCapital) return true;
  // «The Title», «Pool Villa», «Gardens of Eden»: два слова с заглавной и больше,
  // строчными допускаются только служебные («of», «de»).
  const capitals = clean.filter(({ w }) => /^[A-Z0-9]/.test(w)).length;
  const allNameLike = clean.every(({ w, low }) => /^[A-Z0-9]/.test(w) || NAME_GLUE.has(low));
  return capitals >= 2 && allNameLike;
}

/** Слова, которые правило велит писать по-русски даже как имя: «Land Department». */
function isForcedEvenAsName(entry, span) {
  return Boolean(entry.evenCapitalized) && span.words.length <= entry.wordCount + 1;
}

export function findForeignTerms(raw, terms) {
  if (!terms) return { hits: [], unknown: [] };
  const { entries, dictWords, allow } = compileTerms(terms);
  const text = `${frontmatterFields(raw, terms.scanFrontmatter)}\n\n${extractProse(raw)}`
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, ' ');
  const spans = latinSpans(text);
  const spanAt = (pos) => spans.find((s) => pos >= s.start && pos < s.end);

  // Все совпадения словаря, длинные раньше коротких, без наложений.
  const raw_hits = [];
  for (const e of entries) {
    e.re.lastIndex = 0;
    for (const m of text.matchAll(e.re)) raw_hits.push({ e, start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  raw_hits.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);
  const taken = [];
  const counted = new Map();
  for (const h of raw_hits) {
    if (taken.some((t) => h.start < t.end && h.end > t.start)) continue;
    if (h.e.latin) {
      const span = spanAt(h.start);
      if (span && isGloss(text, span)) continue;
      if (span && isNameSpan(span, dictWords) && !isForcedEvenAsName(h.e, span)) continue;
    }
    taken.push(h);
    const c = counted.get(h.e.id) || { term: h.e.label, replace: h.e.replace, count: 0, samples: [] };
    c.count += 1;
    if (c.samples.length < 2) {
      c.samples.push(text.slice(Math.max(0, h.start - 40), Math.min(text.length, h.end + 40)).replace(/\s+/g, ' ').trim());
    }
    counted.set(h.e.id, c);
  }

  // Незнакомая строчная латиница вне названий.
  const unknown = new Map();
  if (terms.flagUnknownLatin) {
    for (const span of spans) {
      if (isNameSpan(span, dictWords) || isGloss(text, span)) continue;
      let pos = span.start;
      for (const w of span.words) {
        const at = text.indexOf(w, pos);
        pos = at + w.length;
        const low = w.toLowerCase().replace(/[.,'’]+$/, '');
        if (!/^[a-z]/.test(w) || low.length < 2) continue;
        if (/\.[a-z]{2,}/.test(low)) continue; // домен
        if (allow.has(low) || NAME_GLUE.has(low)) continue;
        if (taken.some((t) => at >= t.start && at < t.end)) continue;
        unknown.set(low, (unknown.get(low) || 0) + 1);
      }
    }
  }

  return {
    hits: [...counted.values()].sort((a, b) => b.count - a.count),
    unknown: [...unknown.entries()].sort((a, b) => b[1] - a[1]).map(([word, count]) => ({ word, count })),
  };
}

// ---------------------------------------------------------------------------
// Главная функция
// ---------------------------------------------------------------------------

function countMatches(text, patterns) {
  const hits = [];
  for (const p of patterns) {
    const re = p instanceof RegExp ? p : p.re;
    const weight = p instanceof RegExp ? 1 : (p.weight ?? 1);
    const id = p instanceof RegExp ? null : p.id;
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      hits.push({ id, weight, text: m[0].replace(/\s+/g, ' ').trim().slice(0, 70) });
    }
  }
  return hits;
}

function weighted(hits) {
  return hits.reduce((a, h) => a + h.weight, 0);
}

/**
 * @param {string} raw полный текст файла (с frontmatter)
 * @param {object} opts
 * @param {'ru'|'en'} opts.lang
 * @param {object|null} opts.terms словарь чужих слов сайта (scripts/lib/cadence-terms.mjs)
 * @returns подробный разбор: счётчики, плотность, примеры
 */
export function analyzeCadence(raw, { lang = 'ru', terms = null } = {}) {
  const pack = PACKS[lang];
  if (!pack) throw new Error(`неизвестный язык: ${lang}`);

  const prose = proseWithoutHeadings(raw);
  const headings = extractHeadings(raw);
  const words = countWords(prose);

  const cats = {
    antithesis: countMatches(prose, pack.antithesis),
    clerical: countMatches(prose, pack.clerical),
    literary: countMatches(prose, pack.literary),
    impersonal: countMatches(prose, pack.impersonal),
    calque: countMatches(prose, pack.calque),
    colonHook: countMatches(prose, [pack.colonHook]),
    superlativeOpener: countMatches(prose, [pack.superlativeOpener]),
    headingHook: countMatches(headings.join('\n'), [pack.superlativeOpener, pack.colonHook]),
  };

  const markerTotal = Object.values(cats).reduce((a, h) => a + weighted(h), 0);
  const per1k = words ? (markerTotal * 1000) / words : 0;

  return {
    lang,
    words,
    per1k,
    markerTotal,
    counts: Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, Number(weighted(v).toFixed(1))])),
    examples: Object.fromEntries(
      Object.entries(cats).filter(([, v]) => v.length).map(([k, v]) => [k, v.slice(0, 4).map((h) => h.text)]),
    ),
    metronome: metronome(prose),
    burstiness: burstiness(prose),
    parallelStarts: parallelStarts(prose),
    staccato: staccato(prose),
    repeated: repeatedPhrases(prose),
    invisible: findInvisible(raw),
    foreignTerms: findForeignTerms(raw, terms),
  };
}

/**
 * Превратить разбор в список замечаний по переданным порогам.
 * Порог null означает «не проверять».
 */
export function cadenceIssues(analysis, thresholds = {}) {
  const {
    maxPer1k = null,
    maxMetronomePct = null,
    minCv = null,
    maxParallel = null,
    maxRepeated = null,
    minWords = 250,
  } = thresholds;

  const issues = [];
  const hard = [];

  for (const inv of analysis.invisible) {
    (inv.soft ? issues : hard).push({
      kind: 'invisible-char',
      detail: `${inv.name} (${inv.code}) ×${inv.count}`,
    });
  }

  // Чужие слова считаются на любой длине: «shortlist» в короткой новости
  // такая же ошибка, как в длинном гайде.
  const ft = analysis.foreignTerms;
  if (ft && ft.hits.length) {
    const list = ft.hits.slice(0, 6).map((h) => `«${h.term}» → ${h.replace}${h.count > 1 ? ` ×${h.count}` : ''}`).join('; ');
    issues.push({ kind: 'foreign-term', detail: `английские слова и жаргон: ${list}${ft.hits.length > 6 ? ` и ещё ${ft.hits.length - 6}` : ''}` });
  }
  if (ft && ft.unknown.length) {
    const list = ft.unknown.slice(0, 8).map((u) => `${u.word}${u.count > 1 ? ` ×${u.count}` : ''}`).join(', ');
    issues.push({ kind: 'latin-word', detail: `латиница без перевода: ${list}${ft.unknown.length > 8 ? ` и ещё ${ft.unknown.length - 8}` : ''} (если это законное слово - добавить в allowLatin)` });
  }

  if (analysis.words < minWords) return { issues, hard };

  if (maxPer1k !== null && analysis.per1k > maxPer1k) {
    const top = Object.entries(analysis.counts)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ');
    issues.push({
      kind: 'ai-marker-density',
      detail: `${analysis.per1k.toFixed(1)} маркеров на 1000 слов (порог ${maxPer1k}); больше всего ${top}`,
    });
  }

  if (maxMetronomePct !== null && analysis.metronome.pct > maxMetronomePct) {
    issues.push({
      kind: 'metronome',
      detail: `${analysis.metronome.shortEndings} из ${analysis.metronome.paragraphs} абзацев закрыты короткой фразой (${analysis.metronome.pct.toFixed(0)}%, порог ${maxMetronomePct}%)`,
    });
  }

  if (minCv !== null && analysis.burstiness.cv !== null && analysis.burstiness.cv < minCv) {
    issues.push({
      kind: 'flat-rhythm',
      detail: `разброс длин предложений ${analysis.burstiness.cv.toFixed(2)} (минимум ${minCv}) - слишком ровно`,
    });
  }

  if (maxParallel !== null && analysis.parallelStarts.length > maxParallel) {
    issues.push({
      kind: 'parallel-starts',
      detail: `${analysis.parallelStarts.length} пар предложений с одинаковым стартом (порог ${maxParallel})`,
    });
  }

  if (analysis.staccato.length) {
    issues.push({ kind: 'staccato', detail: `стаккато из односложных: ${analysis.staccato[0]}` });
  }

  if (maxRepeated !== null) {
    const over = analysis.repeated.filter((r) => r.count > maxRepeated);
    if (over.length) {
      issues.push({
        kind: 'repeated-phrase',
        detail: `связка «${over[0].gram}» повторена ${over[0].count} раз (порог ${maxRepeated})`,
      });
    }
  }

  return { issues, hard };
}
