#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  collectContentLastmod,
  parseFrontmatter,
  resolveInsideRoot,
} from './content-lastmod.mjs'

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

function inlineText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function linkText(value) {
  return inlineText(value).replace(/([\\[\]])/g, '\\$1')
}

function humanizeSlug(slug) {
  const lastSegment = slug.split('/').filter(Boolean).at(-1) ?? slug
  let decoded = lastSegment
  try {
    decoded = decodeURIComponent(lastSegment)
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

function safeLabel(value, fallback) {
  const normalized = inlineText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || fallback
}

function safeLlmsPath(value) {
  const pathname = value || '/llms.txt'
  if (
    typeof pathname !== 'string' ||
    !pathname.startsWith('/') ||
    pathname.includes('\\') ||
    pathname.includes('?') ||
    pathname.includes('#')
  ) {
    throw new Error('llms.path must be a clean absolute URL path')
  }
  const segments = pathname.split('/').filter(Boolean)
  if (
    !segments.length ||
    segments.at(-1) !== 'llms.txt' ||
    segments.some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error('llms.path must end in llms.txt and must not contain dot segments')
  }
  return segments.join('/')
}

function entryLine(entry) {
  const description = inlineText(entry.description)
  return `- [${linkText(entry.title)}](${entry.url})${
    description ? `: ${description}` : ''
  }`
}

function indexHeader(title, description) {
  return [
    `# ${inlineText(title)}`,
    '',
    ...(inlineText(description) ? [inlineText(description), ''] : []),
    '> Optional compact reference index. It does not affect search rankings.',
    '',
  ]
}

export async function buildAgentMarkdown(config, options = {}) {
  const root = path.resolve(options.root ?? process.cwd())
  const usedLabels = new Map()
  const sections = []
  let entryCount = 0

  for (const [index, collection] of (config.collections ?? []).entries()) {
    const records = await collectContentLastmod(
      { ...config, collections: [collection] },
      { root },
    )
    const entries = []
    for (const record of records) {
      const source = await readFile(
        resolveInsideRoot(root, record.file, 'indexed MDX file'),
        'utf8',
      )
      const frontmatter = parseFrontmatter(source)
      entries.push({
        title: inlineText(frontmatter.title) || humanizeSlug(record.slug),
        description: inlineText(frontmatter.description),
        url: record.url,
      })
    }
    entries.sort((a, b) => compareText(a.url, b.url))
    entryCount += entries.length

    const label = inlineText(collection.label || collection.dir)
    const base = safeLabel(label, `section-${index + 1}`)
    const seen = usedLabels.get(base) ?? 0
    usedLabels.set(base, seen + 1)
    sections.push({
      label,
      fileLabel: seen === 0 ? base : `${base}-${seen + 1}`,
      entries,
    })
  }
  sections.sort((a, b) => compareText(a.fileLabel, b.fileLabel))

  const title = inlineText(config.llms?.title) || `${config.brand} references`
  const description = inlineText(config.llms?.description)
  const mainLines = indexHeader(title, description)
  for (const section of sections) {
    mainLines.push(`## ${section.label}`, '')
    if (section.entries.length) {
      mainLines.push(...section.entries.map(entryLine), '')
    } else {
      mainLines.push('_No indexed entries._', '')
    }
  }

  return {
    main: `${mainLines.join('\n').trimEnd()}\n`,
    sections: sections.map((section) => ({
      label: section.fileLabel,
      entries: section.entries.length,
      content: `${[
        ...indexHeader(`${title}: ${section.label}`, description),
        ...section.entries.map(entryLine),
      ]
        .join('\n')
        .trimEnd()}\n`,
    })),
    entries: entryCount,
  }
}

export async function generateAgentMarkdown(config, options = {}) {
  const write = options.write === true
  if (config.llms?.enabled !== true) {
    return {
      status: 'skipped',
      mode: write ? 'write' : 'dry-run',
      reason: 'llms.enabled is false',
      entries: 0,
      files: [],
    }
  }

  const root = path.resolve(options.root ?? process.cwd())
  const outputDirectory = options.outputDirectory ?? 'public'
  const outputRoot = resolveInsideRoot(
    root,
    outputDirectory,
    'llms output directory',
  )
  const relativeMainPath = safeLlmsPath(config.llms?.path)
  const mainDirectory = path.dirname(relativeMainPath)
  const generated = await buildAgentMarkdown(config, { root })
  const planned = [
    {
      relativePath: path.join(outputDirectory, relativeMainPath),
      content: generated.main,
      entries: generated.entries,
    },
    ...generated.sections.map((section) => ({
      relativePath: path.join(
        outputDirectory,
        mainDirectory,
        `llms-${section.label}.txt`,
      ),
      content: section.content,
      entries: section.entries,
    })),
  ].sort((a, b) => compareText(a.relativePath, b.relativePath))

  if (write) {
    for (const file of planned) {
      const destination = resolveInsideRoot(root, file.relativePath, 'llms output file')
      if (
        destination !== outputRoot &&
        !destination.startsWith(`${outputRoot}${path.sep}`)
      ) {
        throw new Error('llms output file escapes the configured output directory')
      }
      await mkdir(path.dirname(destination), { recursive: true })
      await writeFile(destination, file.content, 'utf8')
    }
  }

  return {
    status: write ? 'written' : 'planned',
    mode: write ? 'write' : 'dry-run',
    entries: generated.entries,
    files: planned.map((file) => ({
      path: file.relativePath.split(path.sep).join('/'),
      entries: file.entries,
      bytes: Buffer.byteLength(file.content),
    })),
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
  const report = await generateAgentMarkdown(config, {
    root,
    outputDirectory: valueAfter(args, '--output-dir', 'public'),
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
