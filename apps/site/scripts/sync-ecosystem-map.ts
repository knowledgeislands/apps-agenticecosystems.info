/**
 * Vendors the backpack's agentic ecosystem map into site data, at one pinned commit, and checks it for drift.
 *
 * The matrix, the crosswalk and the product pages are generated from the `ki-agentic-ecosystems` skill's knowledge map
 * (ki.summit change 21, ECOSYSTEM-SHAPE a). This command reads the skill's cards and its product cards standard at an
 * immutable commit, builds the snapshot and writes `src/_data/ecosystemMap.json5`, which the build renders. The build
 * never reaches the network or the backpack, so `dist/` is reproducible from the repository alone.
 *
 * Usage, from apps/site:
 *   bun scripts/sync-ecosystem-map.ts --ref <40-character commit> [--from <backpack checkout>]
 *   bun scripts/sync-ecosystem-map.ts --check [--from <backpack checkout>]
 *
 * `--from` reads a local checkout of knowledgeislands/ki-agent-backpack and never fetches; without it, the commit is
 * fetched shallowly from GitHub into a temporary folder. `--check` is the drift check: it regenerates the snapshot from
 * the commit the committed file pins and fails if the two differ, so a hand edit or a changed generator cannot pass
 * unnoticed. With `--from`, it also says how many newer backpack commits touch the cards, which a resync would bring in.
 */

import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import JSON5 from 'json5'
import {
  buildEcosystemMap,
  COMMIT,
  type EcosystemMap,
  KNOWLEDGE_PATH,
  SKILL_PATH,
  SOURCE_REPOSITORY,
  STANDARD_PATH
} from './lib/ecosystem-map.ts'

const OUTPUT = 'src/_data/ecosystemMap.json5'
const execFileAsync = promisify(execFile)

const header = (
  ref: string
): string => `// Vendored snapshot of the backpack's agentic ecosystem map: the matrix, the crosswalk and the product pages.
//
// GENERATED FILE - do not edit. Regenerate with:
//   bun run --cwd apps/site sync:ecosystem-map -- --ref <40-character commit> [--from <backpack checkout>]
// and check it for drift with:
//   bun run --cwd apps/site check:ecosystem-map -- [--from <backpack checkout>]
//
// Generated from ${SOURCE_REPOSITORY} ${SKILL_PATH}/${KNOWLEDGE_PATH}/ and
// ${SKILL_PATH}/${STANDARD_PATH}, at ${ref}.
`

/** The file text for a snapshot; the drift check compares this text byte for byte. */
const render = (map: EcosystemMap): string => `${header(map.source.ref)}${JSON.stringify(map, null, 2)}\n`

const git = async (repo: string, args: string[]): Promise<string> => {
  const { stdout } = await execFileAsync('git', ['--no-replace-objects', '-C', repo, ...args], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    // A partial clone must fail on absent objects rather than fetching them implicitly.
    env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_TERMINAL_PROMPT: '0' }
  })
  return stdout
}

/** The skill's cards and standard at the commit, keyed by path inside the skill folder, and the commit's date. */
const readAt = async (repo: string, ref: string): Promise<{ files: Map<string, string>; committed: string }> => {
  const commit = (await git(repo, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`])).trim()
  if (commit !== ref) throw new Error(`${ref} resolves to ${commit}; pin the full commit`)
  const committed = (await git(repo, ['log', '-1', '--format=%cs', commit])).trim()
  const listed = (await git(repo, ['ls-tree', '-r', '--name-only', commit, '--', `${SKILL_PATH}/${KNOWLEDGE_PATH}`]))
    .split('\n')
    .filter((path) => path.endsWith('.md'))
  const paths = [...listed, `${SKILL_PATH}/${STANDARD_PATH}`]
  const files = new Map<string, string>()
  for (const path of paths)
    files.set(path.slice(SKILL_PATH.length + 1), await git(repo, ['cat-file', 'blob', `${commit}:${path}`]))
  return { files, committed }
}

/** Read from a local checkout, or fetch the one commit from GitHub into a temporary repository. */
const read = async (
  ref: string,
  from: string | undefined
): Promise<{ files: Map<string, string>; committed: string }> => {
  if (from !== undefined) return readAt(resolve(from), ref)
  const temp = await mkdtemp(join(tmpdir(), 'ecosystem-map-'))
  try {
    await git(temp, ['init', '--quiet'])
    await execFileAsync(
      'git',
      ['-C', temp, 'fetch', '--quiet', '--depth', '1', `https://github.com/${SOURCE_REPOSITORY}.git`, ref],
      {
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
      }
    )
    return await readAt(temp, ref)
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
}

const option = (args: string[], name: string): string | undefined => {
  const index = args.indexOf(name)
  if (index === -1) return undefined
  const value = args[index + 1]
  if (value === undefined || value.startsWith('--')) throw new Error(`${name} needs a value`)
  return value
}

const main = async (args: string[]): Promise<void> => {
  const from = option(args, '--from')
  const check = args.includes('--check')

  if (check) {
    if (!existsSync(OUTPUT)) throw new Error(`${OUTPUT} is missing; run the sync first`)
    const committedText = readFileSync(OUTPUT, 'utf8')
    const pinned = (JSON5.parse(committedText) as EcosystemMap).source?.ref
    if (typeof pinned !== 'string' || !COMMIT.test(pinned)) throw new Error(`${OUTPUT} pins no commit`)
    const { files, committed } = await read(pinned, from)
    const regenerated = render(buildEcosystemMap(files, { ref: pinned, committed }))
    if (regenerated !== committedText) {
      console.error(`check:ecosystem-map: ${OUTPUT} differs from what ${pinned} generates; resync rather than edit it`)
      process.exit(1)
    }
    console.log(`check:ecosystem-map: ${OUTPUT} matches ${SOURCE_REPOSITORY} at ${pinned}`)
    if (from !== undefined) {
      const upstream = (await git(resolve(from), ['rev-parse', '--abbrev-ref', '@{upstream}']).catch(() => '')).trim()
      if (upstream !== '') {
        const newer = (
          await git(resolve(from), [
            'rev-list',
            '--count',
            `${pinned}..${upstream}`,
            '--',
            `${SKILL_PATH}/${KNOWLEDGE_PATH}`,
            `${SKILL_PATH}/${STANDARD_PATH}`
          ])
        ).trim()
        console.log(`check:ecosystem-map: ${newer} newer commit(s) on ${upstream} touch the cards`)
      }
    }
    return
  }

  const ref = option(args, '--ref')
  if (ref === undefined || !COMMIT.test(ref)) throw new Error('pass --ref <40-character commit>')
  const { files, committed } = await read(ref, from)
  const map = buildEcosystemMap(files, { ref, committed })
  await writeFile(OUTPUT, render(map))
  console.log(
    `sync:ecosystem-map: ${map.products.length} products, ${map.capabilities.length} capabilities and ${map.crosswalk.length} terms from ${ref}`
  )
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(`ecosystem-map: ${(error as Error).message}`)
  process.exit(1)
})
