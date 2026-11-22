/**
 * Gate the build on the generated pages: the vendored snapshot of the backpack's ecosystem map must be well formed,
 * and the built matrix, crosswalk and product pages must carry every product, cell, term and source it holds, each
 * generated page labelled with the cards' status while they are proposals.
 *
 * It reads the committed snapshot and the built dist/ from disk rather than importing the build, so it cannot share a
 * defect with what it checks. Run from apps/site, after Eleventy. Drift from the pinned backpack commit is checked
 * separately, by `check:ecosystem-map`, because that needs the backpack.
 */

import { existsSync, readFileSync } from 'node:fs'
import JSON5 from 'json5'
import { type EcosystemMap, expectedPages, mapFaults } from './lib/ecosystem-map.ts'

const DATA = 'src/_data/ecosystemMap.json5'

const data: unknown = JSON5.parse(readFileSync(DATA, 'utf8'))
const faults = mapFaults(data).map((fault) => `${DATA}: ${fault}`)
let anchors = 0

if (faults.length === 0) {
  const map = data as EcosystemMap
  const drafts = map.products.some((product) => product.status === 'proposal')
  for (const { page, anchors: ids } of expectedPages(map)) {
    const path = `dist/${page}`
    if (!existsSync(path)) {
      faults.push(`${path} is missing; run the Eleventy build first`)
      continue
    }
    const html = readFileSync(path, 'utf8')
    for (const id of ids) if (!html.includes(`id="${id}"`)) faults.push(`${path} does not render #${id}`)
    anchors += ids.length
    if (drafts && page !== 'crosswalk/index.html' && !html.includes('Draft, as of'))
      faults.push(`${path} must say the cards are a draft, as of their review date`)
  }
}

if (faults.length > 0) {
  for (const fault of faults) console.error(`verify:ecosystem-map: ${fault}`)
  process.exit(1)
}
console.log(`verify:ecosystem-map: ${anchors} generated entries rendered`)
