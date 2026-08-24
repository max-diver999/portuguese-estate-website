#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isMarkdownContentFile,
  resolveInsideRoot,
} from './content-lastmod.mjs'

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeUrlPrefix(value) {
  const prefix = `/${String(value).replace(/^\/+|\/+$/g, '')}/`
  return prefix === '//' ? '/' : prefix
}

function humanizeSlug(value) {
  let decoded = value
  try {
    decoded = decodeURIComponent(value)
  } catch {
    // Keep malformed percent-encoding unchanged rather than guessing.
  }
  return decoded
    .replace(/[-_]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toLocaleUpperCase()}${word.slice(1)}`)
    .join(' ')
}

export function fixSlugAnchorLinks(source, options = {}) {
  const urlPrefixes = (options.urlPrefixes ?? [])
    .filter((value) => typeof value === 'string' && value.trim())
    .map(normalizeUrlPrefix)
  if (!urlPrefixes.length) return source

  // Group 1 is the anchor and group 2 is the path. The callback always returns
  // group 2 verbatim, avoiding the original "$1<number>" capture ambiguity.
  const markdownLink = /(?<!!)\[([^\]\r\n]+)\]\((\/[^)\s]+)\)/g
  return source.replace(markdownLink, (whole, anchor, capturedPath) => {
    const pathname = capturedPath.split(/[?#]/, 1)[0]
    const prefix = urlPrefixes.find((candidate) => pathname.startsWith(candidate))
    if (!prefix) return whole

    const relativePath = pathname.slice(prefix.length).replace(/\/+$/g, '')
    const slug = relativePath.split('/').filter(Boolean).at(-1)
    if (!slug) return whole
    const humanAnchor = humanizeSlug(slug)
    const normalizedAnchor = anchor.trim().replace(/^\/+|\/+$/g, '')
    const normalizedPath = pathname.replace(/^\/+|\/+$/g, '')
    const normalizedRelativePath = relativePath.replace(/^\/+|\/+$/g, '')
    const anchorIsSlug = normalizedAnchor.toLocaleLowerCase() ===
      slug.toLocaleLowerCase()
    const anchorIsPath =
      normalizedAnchor === normalizedPath ||
      normalizedAnchor === normalizedRelativePath ||
      anchor.trim() === pathname ||
      anchor.trim() === capturedPath

    if (!anchorIsSlug && !anchorIsPath) return whole
    if (anchor === humanAnchor) return whole
    return `[${humanAnchor}](${capturedPath})`
  })
}

export function fixMarkdownStructure(source, options = {}) {
  const linksFixed = fixSlugAnchorLinks(source, options)
  const prefixes = (options.prefixes ?? []).filter(
    (value) => typeof value === 'string' && value.trim(),
  )
  if (!prefixes.length) return linksFixed

  const prefixPattern = prefixes.map(escapeRegExp).join('|')
  const candidate = new RegExp(
    `^(\\s*)((?:\\d+\\.\\s+)?(?:${prefixPattern})(?:\\s+.*)?)$`,
    'i',
  )
  const lines = linksFixed.split(/\r?\n/)
  let inFence = false

  return lines
    .map((line, index) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence
        return line
      }
      if (
        inFence ||
        /^\s{0,3}#{1,6}\s/.test(line) ||
        /^\s*[-*+>]/.test(line)
      ) {
        return line
      }
      const match = line.match(candidate)
      if (!match) return line
      const separatedBefore = index === 0 || lines[index - 1].trim() === ''
      const separatedAfter =
        index === lines.length - 1 || lines[index + 1].trim() === ''
      if (!separatedBefore || !separatedAfter) return line

      // A callback is intentional. Replacement strings such as "$1${number}"
      // can be parsed as a larger capture reference (for example "$110").
      return `${match[1]}## ${match[2]}`
    })
    .join(linksFixed.includes('\r\n') ? '\r\n' : '\n')
}

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

export async function fixConfiguredCollections(config, options = {}) {
  const root = path.resolve(options.root ?? process.cwd())
  const write = options.write === true
  const prefixes =
    options.prefixes ?? config.markdownStructure?.prefixes ?? []
  const urlPrefixes =
    options.urlPrefixes ??
    (config.collections ?? []).map((collection) => collection.urlPrefix)
  const changed = []

  for (const collection of config.collections ?? []) {
    const directory = resolveInsideRoot(
      root,
      collection.dir,
      `collection ${collection.label ?? collection.dir}`,
    )
    let files
    try {
      files = await walkMarkdown(directory)
    } catch (error) {
      if (error?.code === 'ENOENT') continue
      throw error
    }
    for (const file of files) {
      const source = await readFile(file, 'utf8')
      const fixed = fixMarkdownStructure(source, { prefixes, urlPrefixes })
      if (fixed === source) continue
      const relative = path.relative(root, file).split(path.sep).join('/')
      changed.push(relative)
      if (write) await writeFile(file, fixed, 'utf8')
    }
  }

  return {
    mode: write ? 'write' : 'dry-run',
    prefixes,
    urlPrefixes,
    changed,
  }
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
  const report = await fixConfiguredCollections(config, {
    root,
    write: args.includes('--write'),
  })
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
