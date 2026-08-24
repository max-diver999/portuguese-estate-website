#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function parseFrontmatter(source) {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/)
  if (!match) return {}

  const values = {}
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*?)\s*$/)
    if (!field) continue
    let value = field[2]
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1)
    }
    values[field[1]] = value
  }
  return values
}

export function normalizeDate(value) {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/)
  if (!match) return null
  const date = new Date(`${match[1]}T00:00:00Z`)
  return Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== match[1]
    ? null
    : match[1]
}

export function resolveInsideRoot(root, relativePath, label = 'path') {
  if (typeof relativePath !== 'string' || path.isAbsolute(relativePath)) {
    throw new Error(`${label} must be a relative path inside the site root`)
  }
  const resolved = path.resolve(root, relativePath)
  const fromRoot = path.relative(root, resolved)
  if (fromRoot === '..' || fromRoot.startsWith(`..${path.sep}`)) {
    throw new Error(`${label} escapes the site root`)
  }
  return resolved
}

export function isMarkdownContentFile(filename) {
  return /\.mdx?$/i.test(filename)
}

async function walkMarkdown(directory) {
  const files = []
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walkMarkdown(absolute)))
    else if (entry.isFile() && isMarkdownContentFile(entry.name)) {
      files.push(absolute)
    }
  }
  return files
}

function cleanUrlPart(value) {
  return String(value).replace(/^\/+|\/+$/g, '')
}

function safeSlug(value, file) {
  const slug = cleanUrlPart(value)
  if (
    !slug ||
    slug.includes('\\') ||
    slug.includes('?') ||
    slug.includes('#') ||
    slug.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error(`Invalid slug "${value}" in ${file}`)
  }
  return slug
}

export async function collectContentLastmod(config, options = {}) {
  const root = path.resolve(options.root ?? process.cwd())
  const records = []

  for (const collection of config.collections ?? []) {
    const collectionRoot = resolveInsideRoot(
      root,
      collection.dir,
      `collection ${collection.label ?? collection.dir}`,
    )
    let files
    try {
      files = await walkMarkdown(collectionRoot)
    } catch (error) {
      if (error?.code === 'ENOENT') continue
      throw error
    }

    for (const file of files) {
      const source = await readFile(file, 'utf8')
      const frontmatter = parseFrontmatter(source)
      const relative = path.relative(collectionRoot, file)
      const fallbackSlug = relative
        .replace(/\.mdx?$/i, '')
        .split(path.sep)
        .map(cleanUrlPart)
        .filter(Boolean)
        .join('/')
      const slug = safeSlug(frontmatter.slug || fallbackSlug, file)
      const lastmod = normalizeDate(
        frontmatter.updatedDate ??
          frontmatter.updated ??
          frontmatter.lastmod ??
          frontmatter.pubDate ??
          frontmatter.date,
      )
      let pathname = `/${[
        cleanUrlPart(collection.urlPrefix ?? ''),
        slug,
      ]
        .filter(Boolean)
        .join('/')}`
      if (config.trailingSlash !== false) pathname += '/'

      records.push({
        collection: collection.label ?? collection.dir,
        file: path.relative(root, file).split(path.sep).join('/'),
        slug,
        url: new URL(pathname, config.siteUrl).href,
        lastmod,
      })
    }
  }

  return records.sort((a, b) => a.url.localeCompare(b.url))
}

function argumentValue(args, name, fallback) {
  const index = args.indexOf(name)
  return index === -1 ? fallback : args[index + 1]
}

async function main() {
  const args = process.argv.slice(2)
  const configPath = path.resolve(
    argumentValue(args, '--config', 'reference-infra.config.json'),
  )
  const root = path.resolve(argumentValue(args, '--root', process.cwd()))
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const result = await collectContentLastmod(config, { root })
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
