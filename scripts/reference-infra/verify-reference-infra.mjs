#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  generateRobots,
  normalizeContentSignal,
  normalizeCrawlerArray,
  resolveCrawlerGroups,
} from './generate-robots.mjs'
import {
  isMarkdownContentFile,
  normalizeDate,
  parseFrontmatter,
  resolveInsideRoot,
} from './content-lastmod.mjs'

const DATE_KEYS = ['updatedDate', 'updated', 'lastmod', 'pubDate', 'date']

async function walkMarkdown(directory) {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...(await walkMarkdown(absolute)))
    else if (entry.isFile() && isMarkdownContentFile(entry.name)) {
      result.push(absolute)
    }
  }
  return result
}

export function validateConfig(config, options = {}) {
  const errors = []
  const isExampleUrl = (value) => {
    try {
      const hostname = new URL(value).hostname.toLowerCase()
      return hostname === 'example.com' || hostname.endsWith('.example.com')
    } catch {
      return false
    }
  }
  const validHttpUrl = (value) => {
    try {
      return ['https:', 'http:'].includes(new URL(value).protocol)
    } catch {
      return false
    }
  }
  let siteUrl
  try {
    siteUrl = new URL(config.siteUrl)
  } catch {
    errors.push('siteUrl must be an absolute URL')
  }
  if (siteUrl && !['https:', 'http:'].includes(siteUrl.protocol)) {
    errors.push('siteUrl must use http or https')
  }
  if (!options.allowExample && isExampleUrl(config.siteUrl)) {
    errors.push('siteUrl must not use the example.com placeholder')
  }
  if (!config.brand?.trim()) errors.push('brand is required')
  if (!config.language?.trim()) errors.push('language is required')
  if (
    config.trailingSlash !== undefined &&
    typeof config.trailingSlash !== 'boolean'
  ) {
    errors.push('trailingSlash must be boolean when provided')
  }
  for (const key of ['id', 'name', 'url']) {
    if (!config.organization?.[key]) errors.push(`organization.${key} is required`)
  }
  for (const key of ['id', 'url']) {
    if (config.organization?.[key] && !validHttpUrl(config.organization[key])) {
      errors.push(`organization.${key} must be an absolute HTTP(S) URL`)
    } else if (
      !options.allowExample &&
      config.organization?.[key] &&
      isExampleUrl(config.organization[key])
    ) {
      errors.push(`organization.${key} must not use the example.com placeholder`)
    }
  }
  if (
    config.organization?.sameAs !== undefined &&
    !Array.isArray(config.organization.sameAs)
  ) {
    errors.push('organization.sameAs must be an array')
  } else if (config.organization?.sameAs?.some((url) => !validHttpUrl(url))) {
    errors.push('every organization.sameAs entry must be an absolute HTTP(S) URL')
  } else if (
    !options.allowExample &&
    config.organization?.sameAs?.some(isExampleUrl)
  ) {
    errors.push('organization.sameAs must not use example.com placeholders')
  }
  if (!Array.isArray(config.collections) || !config.collections.length) {
    errors.push('collections must contain at least one collection')
  } else {
    config.collections.forEach((collection, index) => {
      for (const key of ['dir', 'urlPrefix', 'label']) {
        if (!collection?.[key]) errors.push(`collections[${index}].${key} is required`)
      }
      if (
        typeof collection?.dir === 'string' &&
        (path.isAbsolute(collection.dir) ||
          path.normalize(collection.dir).startsWith(`..${path.sep}`) ||
          path.normalize(collection.dir) === '..')
      ) {
        errors.push(`collections[${index}].dir must stay inside the site root`)
      }
      if (
        typeof collection?.urlPrefix === 'string' &&
        (!collection.urlPrefix.startsWith('/') || /[\r\n]/.test(collection.urlPrefix))
      ) {
        errors.push(`collections[${index}].urlPrefix must be a single-line absolute path`)
      }
    })
  }
  if (!Array.isArray(config.robots?.disallow)) {
    errors.push('robots.disallow must be an array')
  } else if (
    config.robots.disallow.some(
      (value) =>
        typeof value !== 'string' ||
        !value.startsWith('/') ||
        /[\r\n]/.test(value),
    )
  ) {
    errors.push('every robots.disallow entry must be a single-line absolute path')
  }
  for (const key of ['allowSearchCrawlers', 'allowTrainingCrawlers']) {
    if (typeof config.robots?.[key] !== 'boolean') {
      errors.push(`robots.${key} must be boolean`)
    }
  }
  let crawlerArraysValid = true
  for (const key of [
    'additionalSearchCrawlers',
    'additionalTrainingCrawlers',
  ]) {
    try {
      normalizeCrawlerArray(config.robots?.[key], `robots.${key}`)
    } catch (error) {
      crawlerArraysValid = false
      errors.push(error.message)
    }
  }
  if (crawlerArraysValid) {
    try {
      resolveCrawlerGroups(config)
    } catch (error) {
      errors.push(error.message)
    }
  }
  try {
    normalizeContentSignal(config.robots?.contentSignal)
  } catch (error) {
    errors.push(error.message)
  }
  if (typeof config.llms?.enabled !== 'boolean') {
    errors.push('llms.enabled must be boolean')
  }
  const llmsPath = config.llms?.path
  const llmsSegments =
    typeof llmsPath === 'string' ? llmsPath.split('/').filter(Boolean) : []
  if (
    typeof llmsPath !== 'string' ||
    !llmsPath.startsWith('/') ||
    llmsPath.includes('\\') ||
    llmsPath.includes('?') ||
    llmsPath.includes('#') ||
    llmsSegments.at(-1) !== 'llms.txt' ||
    llmsSegments.some((segment) => segment === '.' || segment === '..')
  ) {
    errors.push('llms.path must be a clean absolute path ending in llms.txt')
  }
  return errors
}

export function findNumericLinkCorruption(source) {
  const patterns = [
    /\]\d+\((?:https?:\/\/|\/)/g,
    /\(\d+https?:\/\//g,
    /\[[^\]\r\n]+\]\(\d+\)/g,
  ]
  return patterns.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => ({
      match: match[0],
      offset: match.index,
    })),
  )
}

export function verifyRobotsExpectations(config, robotsText) {
  const errors = []
  const crawlerGroups = resolveCrawlerGroups(config)
  const searchDirective =
    config.robots.allowSearchCrawlers === false ? 'Disallow: /' : 'Allow: /'
  const trainingDirective =
    config.robots.allowTrainingCrawlers === true ? 'Allow: /' : 'Disallow: /'

  for (const agent of crawlerGroups.search) {
    if (!robotsText.includes(`User-agent: ${agent}\n${searchDirective}`)) {
      errors.push(`robots missing search policy for ${agent}`)
    }
  }
  for (const agent of crawlerGroups.training) {
    if (!robotsText.includes(`User-agent: ${agent}\n${trainingDirective}`)) {
      errors.push(`robots missing training policy for ${agent}`)
    }
  }
  const contentSignal = normalizeContentSignal(config.robots?.contentSignal)
  if (
    contentSignal &&
    !robotsText.split(/\r?\n/).includes(`Content-Signal: ${contentSignal}`)
  ) {
    errors.push('robots missing raw Content-Signal declaration')
  }
  return errors
}

export async function verifyReferenceInfra(config, options = {}) {
  const root = path.resolve(options.root ?? process.cwd())
  const errors = validateConfig(config, {
    allowExample: options.allowExample === true,
  })
  const warnings = []
  const files = []

  for (const collection of config.collections ?? []) {
    let directory
    try {
      directory = resolveInsideRoot(
        root,
        collection.dir,
        `collection ${collection.label ?? collection.dir}`,
      )
    } catch (error) {
      errors.push(error.message)
      continue
    }
    let collectionFiles
    try {
      collectionFiles = await walkMarkdown(directory)
    } catch (error) {
      if (error?.code === 'ENOENT') {
        errors.push(`collection directory not found: ${collection.dir}`)
        continue
      }
      throw error
    }
    for (const file of collectionFiles) {
      const relative = path.relative(root, file).split(path.sep).join('/')
      files.push(relative)
      const source = await readFile(file, 'utf8')
      for (const issue of findNumericLinkCorruption(source)) {
        errors.push(`${relative}: suspicious numeric link "${issue.match}"`)
      }
      const frontmatter = parseFrontmatter(source)
      const dateKey = DATE_KEYS.find((key) => frontmatter[key] !== undefined)
      if (!dateKey) warnings.push(`${relative}: no supported frontmatter date`)
      else if (!normalizeDate(frontmatter[dateKey])) {
        errors.push(`${relative}: invalid ${dateKey} date "${frontmatter[dateKey]}"`)
      }
    }
  }

  let generatedRobots
  try {
    generatedRobots = generateRobots(config)
    errors.push(...verifyRobotsExpectations(config, generatedRobots))
  } catch (error) {
    errors.push(`robots generation failed: ${error.message}`)
  }
  if (options.robotsPath && generatedRobots) {
    try {
      const robotsPath = resolveInsideRoot(root, options.robotsPath, 'robots path')
      const actual = await readFile(robotsPath, 'utf8')
      if (actual !== generatedRobots) {
        errors.push(`${options.robotsPath}: does not match generated robots.txt`)
      }
    } catch (error) {
      errors.push(`${options.robotsPath}: ${error.message}`)
    }
  }

  return { ok: errors.length === 0, filesChecked: files.length, errors, warnings }
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
  const root = path.resolve(valueAfter(args, '--root', process.cwd()))
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const report = await verifyReferenceInfra(config, {
    root,
    robotsPath: valueAfter(args, '--robots', null),
  })
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (!report.ok) process.exitCode = 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
