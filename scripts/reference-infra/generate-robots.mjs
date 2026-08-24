#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const SEARCH_AND_USER_FETCH_CRAWLERS = [
  'Googlebot',
  'Bingbot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'Claude-User',
  'Claude-SearchBot',
  'DuckAssistBot',
  'MistralAI-User',
]

export const TRAINING_CRAWLERS = [
  'GPTBot',
  'Google-Extended',
  'CCBot',
  'anthropic-ai',
  'ClaudeBot',
  'Applebot-Extended',
  'FacebookBot',
  'meta-externalagent',
  'Bytespider',
]

const SAFE_CRAWLER_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

export function normalizeCrawlerArray(value, fieldName) {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array of strings`)
  }
  const result = []
  const seen = new Set()
  for (const raw of value) {
    if (typeof raw !== 'string') {
      throw new Error(`${fieldName} must contain only strings`)
    }
    const crawler = raw.trim()
    if (
      !crawler ||
      /[\r\n\u0000-\u001f\u007f]/.test(crawler) ||
      !SAFE_CRAWLER_TOKEN.test(crawler)
    ) {
      throw new Error(`${fieldName} contains an unsafe crawler name`)
    }
    const key = crawler.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(crawler)
  }
  return result
}

function mergeCrawlers(canonical, additional) {
  const result = []
  const seen = new Set()
  for (const crawler of [...canonical, ...additional]) {
    const key = crawler.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(crawler)
  }
  return result
}

export function resolveCrawlerGroups(config) {
  const robots = config.robots ?? {}
  const search = mergeCrawlers(
    SEARCH_AND_USER_FETCH_CRAWLERS,
    normalizeCrawlerArray(
      robots.additionalSearchCrawlers,
      'robots.additionalSearchCrawlers',
    ),
  )
  const training = mergeCrawlers(
    TRAINING_CRAWLERS,
    normalizeCrawlerArray(
      robots.additionalTrainingCrawlers,
      'robots.additionalTrainingCrawlers',
    ),
  )
  const searchKeys = new Set(search.map((crawler) => crawler.toLowerCase()))
  const overlap = training.find((crawler) =>
    searchKeys.has(crawler.toLowerCase()),
  )
  if (overlap) {
    throw new Error(
      `Crawler "${overlap}" cannot belong to both search and training groups`,
    )
  }
  return { search, training }
}

export function normalizeContentSignal(value) {
  if (value === undefined) return null
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > 512 ||
    /[\r\n\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error('robots.contentSignal must be one non-empty safe line')
  }
  return value.trim()
}

function crawlerBlock(userAgent, allowed, privatePaths) {
  return [
    `User-agent: ${userAgent}`,
    allowed ? 'Allow: /' : 'Disallow: /',
    ...(allowed
      ? privatePaths.map((pathname) => `Disallow: ${pathname}`)
      : []),
  ].join('\n')
}

export function generateRobots(config) {
  const robots = config.robots ?? {}
  const allowSearch = robots.allowSearchCrawlers !== false
  const allowTraining = robots.allowTrainingCrawlers === true
  const disallow = Array.isArray(robots.disallow) ? robots.disallow : []
  const crawlerGroups = resolveCrawlerGroups(config)
  if (
    disallow.some(
      (pathname) =>
        typeof pathname !== 'string' ||
        !pathname.startsWith('/') ||
        /[\r\n]/.test(pathname),
    )
  ) {
    throw new Error('Every robots.disallow entry must be a single-line absolute path')
  }
  const contentSignal = normalizeContentSignal(robots.contentSignal)
  const blocks = [
    [
      'User-agent: *',
      ...disallow.map((pathname) => `Disallow: ${pathname}`),
    ].join('\n'),
    '# Search indexing and user-requested fetchers',
    ...crawlerGroups.search.map((agent) =>
      crawlerBlock(agent, allowSearch, disallow),
    ),
    '# Model-training crawlers',
    ...crawlerGroups.training.map((agent) =>
      crawlerBlock(agent, allowTraining, disallow),
    ),
  ]

  // Content-Signal may be emitted as an additional declaration, but crawler
  // access above remains authoritative and is never replaced by this header.
  if (contentSignal) {
    blocks.push(`Content-Signal: ${contentSignal}`)
  }
  blocks.push(`Sitemap: ${new URL('/sitemap-index.xml', config.siteUrl).href}`)
  return `${blocks.join('\n\n')}\n`
}

function valueAfter(args, name, fallback) {
  const index = args.indexOf(name)
  return index < 0 ? fallback : args[index + 1]
}

async function main() {
  const args = process.argv.slice(2)
  const configPath = path.resolve(
    valueAfter(args, '--config', 'reference-infra.config.json'),
  )
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const output = generateRobots(config)
  const outputPath = valueAfter(args, '--output', null)
  if (outputPath) await writeFile(path.resolve(outputPath), output, 'utf8')
  else process.stdout.write(output)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
