#!/usr/bin/env node
/**
 * Гейт картинок. Кладётся в каждый сайт как scripts/check-images.mjs и запускается после сборки.
 *
 * Зачем. Проверки, которые были на сайтах до сентября 2026, искали в собранных страницах адреса
 * прежнего хостинга картинок. После переезда на R2 таких адресов не осталось, и проверки стали зелёными всегда,
 * что бы ни случилось. В тот же период на живых сайтах оказались: обложка размером 54 байта и
 * кадром 2 на 2 пикселя, иконка приложения 180 на 180, растянутая на 1280 на 720, и полная потеря
 * выбора размера, из-за которой телефон качал файл для компьютера.
 *
 * Этот гейт ловит ровно эти четыре случая и валит сборку. Зелёный ответ здесь что-то значит.
 *
 *   node scripts/check-images.mjs              проверить dist
 *   node scripts/check-images.mjs --dir build  другая папка сборки
 *   node scripts/check-images.mjs --r2-only    картинки только из R2 и с самого сайта
 *   node scripts/check-images.mjs --forbid-r2dev  ни одной ссылки на старый адрес r2.dev
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const dirIdx = args.indexOf('--dir');
const DIST = dirIdx >= 0 ? args[dirIdx + 1] : 'dist';
/**
 * --r2-only: каждая картинка страницы (src, srcset, og:image, twitter:image) лежит в хранилище R2
 * или на самом сайте (относительный адрес или хост из canonical). Картинка с любого другого адреса
 * валит сборку, пиксели статистики 1 на 1 не в счёт. Добавлено 23.09.2026: после переезда на R2
 * новые статьи по старым инструкциям снова приносили адреса прежнего хостинга, а гейт их
 * пропускал, потому что проверял только картинки с R2. Правило через разрешённые адреса ловит
 * любой чужой хостинг, а не одно известное имя.
 */
const R2_ONLY = args.includes('--r2-only');
let seenSiteHost = null;
/**
 * Адреса хранилища. С 23.09.2026 картинки отдаёт свой домен media.oper-stack.com: r2.dev по
 * документации Cloudflare ограничен по частоте, отвечал 429 сборкам и мог так же отвечать
 * посетителям, а кэш Cloudflare на нём не работает. Файлы те же, меняется только начало адреса.
 * Старый адрес в списке, пока сайты переезжают: без него гейт перестал бы проверять их картинки.
 */
const R2_DEV_HOST = 'pub-2855c73eea384110b510f25966292c37.r2.dev';
const R2_HOSTS = ['media.oper-stack.com', R2_DEV_HOST];
const onR2 = (url) => R2_HOSTS.some((h) => url.includes(`//${h}/`));
/** --forbid-r2dev: любая ссылка на старый адрес в собранных страницах валит сборку. Ставится сайту после переезда. */
const FORBID_R2DEV = args.includes('--forbid-r2dev');

/** Картинка легче этого это не картинка, а пустышка. */
const MIN_BYTES = 2048;
/** Иконки и логотипы живут по этим путям и в роли фотографии появляться не должны. */
const NOT_A_PHOTO = /(apple-touch-icon|favicon|logo|icon-\d+|placeholder)/i;

if (!existsSync(DIST)) {
  console.error(`Гейт картинок: папки сборки ${DIST} нет. Сначала соберите сайт.`);
  process.exit(1);
}

function htmlFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) htmlFiles(join(dir, e.name), out);
    else if (e.name.endsWith('.html')) out.push(join(dir, e.name));
  }
  return out;
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, 'i')) || tag.match(new RegExp(`${name}='([^']*)'`, 'i'));
  return m ? m[1] : '';
};

const problems = { tiny: [], noSrcset: [], noSize: [], iconAsPhoto: [], smallSource: [], foreign: [], r2dev: [] };
const seen = new Set();
const pages = htmlFiles(DIST);

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const page = file.replace(DIST, '').replace(/index\.html$/, '') || '/';
  if (FORBID_R2DEV && html.includes(R2_DEV_HOST)) {
    problems.r2dev.push({ page, src: (html.match(new RegExp(`[^"'\\s(]*${R2_DEV_HOST.replace(/\./g, '\\.')}[^"'\\s)<]*`)) || [R2_DEV_HOST])[0] });
  }
  if (R2_ONLY) {
    // Адрес сайта: canonical страницы, иначе og:url, иначе тот, что встречался на прошлых страницах
    // (у служебных страниц вроде /thanks/ canonical нет).
    const siteHost = (html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']https?:\/\/([^/"']+)/i) || [])[1]
      || (html.match(/<meta[^>]+property=["']og:url["'][^>]*content=["']https?:\/\/([^/"']+)/i) || [])[1]
      || seenSiteHost;
    if (siteHost) seenSiteHost = siteHost;
    const foreign = (u) => { const m = u.match(/^(?:https?:)?\/\/([^/"'\s]+)/i); return m && !R2_HOSTS.includes(m[1]) && m[1] !== siteHost; };
    // Внутри <noscript> живут пиксели счётчиков (Метрика, Pinterest): браузер с включённым JS их
    // не показывает, и размеров 1 на 1 у них может не быть. 23.09.2026 так упала выкладка
    // moregroupestate.ru на mc.yandex.ru/watch. Чужое фото с расширением файла в <noscript>
    // всё равно поймает check-image-urls.mjs.
    const visible = html.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, '');
    for (const tag of visible.match(/<img\b[^>]*>/gi) || []) {
      if (attr(tag, 'width') === '1' && attr(tag, 'height') === '1') continue;
      const urls = [attr(tag, 'src') || '', ...(attr(tag, 'srcset') || '').split(',').map((c) => c.trim().split(/\s+/)[0])];
      for (const u of urls) if (u && foreign(u)) { problems.foreign.push({ page, src: u }); break; }
    }
    for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/gi)) {
      if (foreign(m[1])) problems.foreign.push({ page, src: m[1] });
    }
  }

  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const src = attr(tag, 'src');
    if (!src || src.startsWith('data:')) continue;

    /** Иконка в роли фотографии: ловим по размерам блока, а не по вере в имя файла. */
    const boxW = Number(attr(tag, 'width') || 0);
    if (NOT_A_PHOTO.test(src) && boxW >= 600) problems.iconAsPhoto.push({ page, src });

    if (!onR2(src)) continue;

    if (!attr(tag, 'width') || !attr(tag, 'height')) problems.noSize.push({ page, src });

    const srcset = attr(tag, 'srcset');
    const candidates = srcset ? srcset.split(',').filter((c) => /\s\d+w\s*$/.test(c.trim())).length : 0;
    /**
     * Файл уже меньше самой узкой ступени (360): выбирать не из чего, телефон и так получает свой
     * размер. Это не провал выбора размера, а маленький исходник, и о нём говорим отдельно, чтобы
     * он не терялся: такое фото стоит заменить на нормальное. Найдено 22.09.2026 на Мексике, где
     * 15 туристических снимков по 323 точки попали в гейт как «телефон качает файл для компьютера».
     */
    const w = Number(attr(tag, 'width') || 0);
    if (candidates < 2 && w > 0 && w <= 400) problems.smallSource.push({ page, src, w });
    else if (candidates < 2) problems.noSrcset.push({ page, src, candidates });

    seen.add(src.split('?')[0]);
  }
}

/**
 * Вес проверяем по сети и только по разным адресам: файлов меньше, чем упоминаний.
 *
 * Лимит хранилища это не битая картинка. 22.09.2026 тринадцать сайтов выкладывались разом, r2.dev
 * ответил 429 на 160-175 картинок у четырёх из них, и гейт завалил сборки, в которых всё было в
 * порядке. Cloudflare прямо пишет, что r2.dev ограничен по частоте и при превышении отвечает 429
 * (developers.cloudflare.com/r2/platform/limits). Поэтому:
 *   - одновременно идёт не больше IMAGE_GATE_CONCURRENCY запросов (по умолчанию 4);
 *   - 429, 502, 503, 504, таймаут и обрыв сети повторяем с нарастающей паузой, а после 429 и 503
 *     пауза общая: встают все запросы, а не один;
 *   - если после всех попыток ответа так и нет, картинка «не проверена»: сборку не валит, но идёт
 *     отдельным списком, и итог не говорит «все открываются»;
 *   - 404, 403 и любой другой ответ, как и файл легче 2 КБ, валят сборку, как раньше.
 * Вся сетевая часть укладывается в IMAGE_GATE_BUDGET_SEC (по умолчанию 240): что не успели, то
 * «не проверено», сборка не висит. IMAGE_GATE_STRICT=1 валит сборку и на непроверенных.
 */
const tiny = [];
const unverified = [];
const env = (name, fallback) => (Number(process.env[name]) > 0 ? Number(process.env[name]) : fallback);
const CONCURRENCY = env('IMAGE_GATE_CONCURRENCY', 4);
const ATTEMPTS = env('IMAGE_GATE_ATTEMPTS', 5);
const BACKOFF_MS = env('IMAGE_GATE_BACKOFF_MS', 1000);
const TIMEOUT_MS = env('IMAGE_GATE_TIMEOUT_MS', 15000);
const DEADLINE = Date.now() + env('IMAGE_GATE_BUDGET_SEC', 240) * 1000;
const STRICT = process.env.IMAGE_GATE_STRICT === '1';
/** Ответы, которые говорят о хранилище, а не о картинке. */
const RETRY_STATUS = new Set([429, 502, 503, 504]);
const PAUSE_ALL = new Set([429, 503]);
const sleep = (ms) => new Promise((done) => setTimeout(done, Math.max(0, ms)));
let pauseUntil = 0;

/** Пауза перед попыткой номер attempt + 1: 1, 2, 4, 8 секунд с разбросом, или сколько просит сервер. */
function backoff(attempt, retryAfter) {
  const asked = retryAfter ? (/^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now()) : NaN;
  if (asked > 0) return Math.min(asked, 30000);
  return Math.min(BACKOFF_MS * 2 ** (attempt - 1), 20000) + Math.random() * BACKOFF_MS * 0.5;
}

async function probe(url) {
  if (!URL.canParse(url)) return { broken: 'адрес не читается' };
  let why = '';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const hold = Math.min(pauseUntil, DEADLINE) - Date.now();
    if (hold > 0) await sleep(hold);
    if (Date.now() >= DEADLINE) return { unverified: why ? `${why}, дальше вышло время гейта` : 'не дошла очередь, вышло время гейта' };
    let wait = null;
    try {
      const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (r.ok) {
        const len = Number(r.headers.get('content-length') || 0);
        return len && len < MIN_BYTES ? { broken: `${len} байт` } : {};
      }
      if (!RETRY_STATUS.has(r.status)) return { broken: `ответ ${r.status}` };
      why = `ответ ${r.status}`;
      wait = backoff(attempt, r.headers.get('retry-after'));
      if (PAUSE_ALL.has(r.status)) pauseUntil = Math.max(pauseUntil, Date.now() + wait);
    } catch (e) {
      why = e.name === 'TimeoutError' ? `нет ответа за ${TIMEOUT_MS / 1000} с` : `сеть: ${e.cause?.code || e.message}`;
    }
    if (attempt < ATTEMPTS) await sleep(Math.min(wait ?? backoff(attempt), DEADLINE - Date.now()));
  }
  return { unverified: `${why}, попыток ${ATTEMPTS}` };
}

const queue = [...seen];
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const url = queue.shift();
      const res = await probe(url);
      if (res.broken) tiny.push({ url, why: res.broken });
      else if (res.unverified) unverified.push({ url, why: res.unverified });
    }
  }),
);
problems.tiny = tiny;

const uniq = (list, key) => [...new Map(list.map((x) => [x[key], x])).values()];
const noSrcset = uniq(problems.noSrcset, 'src');
const noSize = uniq(problems.noSize, 'src');
const icons = uniq(problems.iconAsPhoto, 'src');

console.log(`Гейт картинок: страниц ${pages.length}, разных картинок с R2 ${seen.size}`);

let failed = false;
const report = (title, list, format) => {
  if (!list.length) return;
  failed = true;
  console.log(`\n${title}: ${list.length}`);
  for (const x of list.slice(0, 15)) console.log(`  ${format(x)}`);
  if (list.length > 15) console.log(`  и ещё ${list.length - 15}`);
};

report('Пустые или неоткрывающиеся картинки', problems.tiny, (x) => `${x.why}  ${x.url}`);
report('Без выбора размера (телефон качает файл для компьютера)', noSrcset, (x) => `${x.page}  ${x.src}`);
report('Без размеров кадра (страница прыгает при загрузке)', noSize, (x) => `${x.page}  ${x.src}`);
report('Иконка в роли фотографии', icons, (x) => `${x.page}  ${x.src}`);
report('Картинки не из хранилища R2 и не с сайта', uniq(problems.foreign, 'src'), (x) => `${x.page}  ${x.src.slice(0, 100)}`);
report('Страницы со ссылкой на старый адрес r2.dev (картинки теперь на media.oper-stack.com)', problems.r2dev, (x) => `${x.page}  ${x.src.slice(0, 110)}`);

const small = uniq(problems.smallSource, 'src');
if (small.length) {
  console.log(`\nМаленькие исходники, их стоит заменить нормальным фото (сборку не валят): ${small.length}`);
  for (const x of small.slice(0, 15)) console.log(`  ${x.w}px  ${x.page}  ${x.src}`);
  if (small.length > 15) console.log(`  и ещё ${small.length - 15}`);
}

if (unverified.length) {
  const verdict = STRICT ? 'в режиме IMAGE_GATE_STRICT сборку валят' : 'сборку не валят';
  console.log(`\nНе проверены по сети, хранилище не ответило (${verdict}): ${unverified.length} из ${seen.size}`);
  for (const x of unverified.slice(0, 15)) console.log(`  ${x.why}  ${x.url}`);
  if (unverified.length > 15) console.log(`  и ещё ${unverified.length - 15}`);
  console.log('Это лимит или сбой хранилища, а не битая картинка. Перепроверить: запустить гейт ещё раз позже.');
  if (STRICT) failed = true;
}

if (failed) {
  console.log('\nСборка не принимается. Это те самые случаи, которые в сентябре 2026 доехали до живых сайтов.');
  process.exit(1);
}
if (unverified.length) {
  console.log(`Картинки в порядке по тому, что удалось проверить: ${seen.size - unverified.length} из ${seen.size} открываются, у всех есть выбор размера и размеры кадра.`);
} else {
  console.log('Картинки в порядке: все открываются, у всех есть выбор размера и размеры кадра.');
}
