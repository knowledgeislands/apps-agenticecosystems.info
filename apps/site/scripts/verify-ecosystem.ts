/**
 * Gate the build on the ecosystem map: the data file must have a valid shape, and the built page must carry every
 * term, layer and product it holds, with the footer naming the parent site.
 *
 * It reads the committed data and the built dist/ from disk rather than importing the build, so it cannot share a
 * defect with what it checks. Run from apps/site, after Eleventy.
 */

import { existsSync, readFileSync } from 'node:fs'
import JSON5 from 'json5'
import { ecosystemFaults, expectedAnchors } from './lib/ecosystem.ts'

const DATA = 'src/_data/ecosystem.json5'
const PAGE = 'dist/index.html'
const PARENT = 'https://knowledgeislands.info'

const data: unknown = JSON5.parse(readFileSync(DATA, 'utf8'))
const faults = ecosystemFaults(data).map((fault) => `${DATA}: ${fault}`)

if (!existsSync(PAGE)) faults.push(`${PAGE} is missing; run the Eleventy build first`)
else {
  const html = readFileSync(PAGE, 'utf8')
  for (const anchor of expectedAnchors(data))
    if (!html.includes(`id="${anchor}"`)) faults.push(`${PAGE} does not render #${anchor}`)
  if (!/<footer[\s\S]*href="https:\/\/knowledgeislands\.info"[^>]*>a Knowledge Islands microsite/u.test(html))
    faults.push(`${PAGE}: the footer must read "a Knowledge Islands microsite" and link to ${PARENT}`)
}

if (faults.length > 0) {
  for (const fault of faults) console.error(`verify:ecosystem: ${fault}`)
  process.exit(1)
}
console.log(`verify:ecosystem: ${expectedAnchors(data).length} entries valid and rendered`)
