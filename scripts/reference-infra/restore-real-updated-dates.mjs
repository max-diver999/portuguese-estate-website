#!/usr/bin/env node
import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isMarkdownContentFile,
  normalizeDate,
  parseFrontmatter,
  resolveInsideRoot,
} from './content-lastmod.mjs'

const execFile = promisify(execFileCallback)
const DATE_ONLY_FIELD = /^\s*(?:updatedDate|updated|lastmod):\s*/i

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

export function replaceFrontmatterDate(source, date) {
  const frontmatter = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/)
  if (!frontmatter) return null

  const values = parseFrontmatter(source)
  const publicationDate = normalizeDate(values.pubDate ?? values.date)
  const finalDate =
    publicationDate && date < publicationDate ? publicationDate : date
  const updatedDateField =
    /^(\s*updatedDate:\s*)(["']?)(\d{4}-\d{2}-\d{2})(?:[T ][^"'\r\n]*)?\2(\s*)$/m

  if (updatedDateField.test(frontmatter[1])) {
    const nextFrontmatter = frontmatter[1].replace(
      updatedDateField,
      (_whole, prefix, quote, _oldDate, trailing) =>
        `${prefix}${quote}${finalDate}${quote}${trailing}`,
    )
    return source.replace(frontmatter[1], nextFrontmatter)
  }
  if (Object.hasOwn(values, 'updatedDate')) return null

  const publicationField =
    /^(\s*(?:pubDate|date):\s*)(["']?)(\d{4}-\d{2}-\d{2})(?:[T ][^"'\r\n]*)?\2(\s*)$/m
  const publicationMatch = frontmatter[1].match(publicationField)
  if (!publicationMatch || !publicationDate) return null
  const lineEnding = source.includes('\r\n') ? '\r\n' : '\n'
  const quote = publicationMatch[2]
  const nextFrontmatter = frontmatter[1].replace(
    publicationField,
    (whole) =>
      `${whole}${lineEnding}updatedDate: ${quote}${finalDate}${quote}`,
  )
  return source.replace(frontmatter[1], nextFrontmatter)
}

async function isShallowRepository(root) {
  const { stdout } = await execFile(
    'git',
    ['rev-parse', '--is-shallow-repository'],
    { cwd: root },
  )
  return stdout.trim() === 'true'
}

function parseFollowLog(output, initialPath) {
  const commits = []
  let current = null
  for (const line of output.split(/\r?\n/)) {
    if (line.startsWith('@@@')) {
      const [hash, authoredAt] = line.slice(3).split('\t')
      current = { hash, authoredAt, statuses: [] }
      commits.push(current)
    } else if (current && /^[A-Z]\d*\t/.test(line)) {
      current.statuses.push(line.split('\t'))
    }
  }

  let trackedPath = initialPath
  return commits.map((commit) => {
    const pathAtCommit = trackedPath
    const rename = commit.statuses.find(
      ([status, _oldPath, newPath]) =>
        status.startsWith('R') && newPath === trackedPath,
    )
    if (rename) trackedPath = rename[1]
    return { ...commit, pathAtCommit }
  })
}

function diffHasContentChange(diff) {
  for (const line of diff.split(/\r?\n/)) {
    if (
      !line ||
      line.startsWith('+++') ||
      line.startsWith('---') ||
      line.startsWith('@@')
    ) {
      continue
    }
    if (line[0] !== '+' && line[0] !== '-') continue
    if (!DATE_ONLY_FIELD.test(line.slice(1))) return true
  }
  return false
}

async function latestHistoricalContentDate(root, file) {
  const relative = path.relative(root, file)
  try {
    const { stdout } = await execFile(
      'git',
      [
        'log',
        '--follow',
        '--find-renames',
        '--format=@@@%H%x09%aI',
        '--name-status',
        '--',
        relative,
      ],
      { cwd: root, maxBuffer: 10 * 1024 * 1024 },
    )
    for (const commit of parseFollowLog(stdout, relative)) {
      const relevantRename = commit.statuses.find(
        ([status, _oldPath, newPath]) =>
          status.startsWith('R') && newPath === commit.pathAtCommit,
      )
      if (relevantRename?.[0] === 'R100') continue
      const commitPaths = relevantRename
        ? [relevantRename[1], relevantRename[2]]
        : [commit.pathAtCommit]
      const { stdout: diff } = await execFile(
        'git',
        [
          'show',
          '--format=',
          '--root',
          '--unified=0',
          '--find-renames',
          commit.hash,
          '--',
          ...commitPaths,
        ],
        { cwd: root, maxBuffer: 10 * 1024 * 1024 },
      )
      if (diffHasContentChange(diff)) {
        return commit.authoredAt?.slice(0, 10) ?? null
      }
    }
    return null
  } catch {
    return null
  }
}

export async function restoreDates(config, options = {}) {
  const root = path.resolve(options.root ?? process.cwd())
  const write = options.write === true
  const shallow = await isShallowRepository(root)
  if (write && shallow) {
    throw new Error(
      'Refusing --write in a shallow repository: full history is required.',
    )
  }

  const changed = []
  const unresolved = []
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
      if (error?.code === 'ENOENT') {
        unresolved.push({ file: collection.dir, reason: 'collection missing' })
        continue
      }
      throw error
    }

    for (const file of files) {
      const relative = path.relative(root, file).split(path.sep).join('/')
      const date = await latestHistoricalContentDate(root, file)
      if (!date) {
        unresolved.push({ file: relative, reason: 'no git history found' })
        continue
      }
      const source = await readFile(file, 'utf8')
      const updated = replaceFrontmatterDate(source, date)
      if (updated === null) {
        unresolved.push({
          file: relative,
          reason: 'no supported frontmatter date',
        })
        continue
      }
      if (updated === source) continue
      changed.push({ file: relative, date })
      if (write) await writeFile(file, updated, 'utf8')
    }
  }

  return { mode: write ? 'write' : 'dry-run', shallow, changed, unresolved }
}

function valueAfter(args, name, fallback) {
  const index = args.indexOf(name)
  return index < 0 ? fallback : args[index + 1]
}

async function main() {
  const args = process.argv.slice(2)
  const write = args.includes('--write')
  const configPath = path.resolve(
    valueAfter(args, '--config', 'reference-infra.config.json'),
  )
  const root = path.resolve(valueAfter(args, '--root', process.cwd()))
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const report = await restoreDates(config, { root, write })
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.unresolved.length) process.exitCode = 2
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
