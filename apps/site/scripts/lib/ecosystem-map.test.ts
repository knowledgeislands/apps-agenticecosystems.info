import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import JSON5 from 'json5'
import { buildEcosystemMap, type EcosystemMap, expectedPages, mapFaults } from './ecosystem-map.ts'

const REF = 'ec0078018250b2ceb6f114ac0085a38e0f969a7c'

const committed = (): EcosystemMap =>
  JSON5.parse(readFileSync(join(import.meta.dir, '..', '..', 'src', '_data', 'ecosystemMap.json5'), 'utf8'))

const term = (id: string, title: string, lead: string): string =>
  `---\nid: ${id}\ntitle: ${title}\ntype: term\nstatus: agreed\n---\n\n# ${title}\n\n${lead}\n`

/** A knowledge map cut to the bone: a standard with two rows, two terms, one vendor word and one product. */
const files = (): Map<string, string> =>
  new Map([
    [
      'references/standard-product-cards.md',
      `---\nki-status: draft\n---\n\n### 4.4 Capabilities\n\n| Row | Term card | Asks |\n| --- | --- | --- |\n` +
        `| 1 | [Model](../knowledge/industry/industry.model.md) | Which models |\n` +
        `| 2 | [Session](../knowledge/industry/industry.session.md) | Whether sessions persist |\n`
    ],
    [
      'knowledge/_graph.md',
      `---\nid: ki-agentic-ecosystems\ntitle: Graph\ntype: graph\nstatus: agreed\n---\n\n# Graph\n\n` +
        `| Industry | \`industry.\` | Terms | [session][industry.session], [model][industry.model] | \`industry/\` |\n`
    ],
    ['knowledge/industry/industry.model.md', term('industry.model', 'Model', 'A model decides.')],
    ['knowledge/industry/industry.session.md', term('industry.session', 'Session', 'A session is one run.')],
    [
      'knowledge/vendors/openai/openai.chat.md',
      `---\nid: openai.chat\ntitle: Chat (OpenAI)\ntype: vendor-term\nstatus: agreed\nvendor: OpenAI\n` +
        `links:\n  industry.session:\n    predicate: skos:closeMatch\n---\n\n# Chat (OpenAI)\n\nOpenAI's chat.\n`
    ],
    [
      'knowledge/products/product.codex.md',
      `---\nid: product.codex\ntitle: Codex (OpenAI)\ntype: product\nstatus: proposal\nvendor: OpenAI\n` +
        `reviewed: 2026-11-22\nlinks:\n  industry.model:\n    predicate: skos:broadMatch\n---\n\n# Codex (OpenAI)\n\n` +
        `Codex writes code, a [model][industry.model] at work ([S1]).\n\n## Capabilities\n\n` +
        `| Term | Value | Detail | Sources |\n| --- | --- | --- | --- |\n` +
        `| [Model][industry.model] | \`yes\` | GPT models | [S1] |\n` +
        `| [Session][industry.session] | \`partial\` | Resume in preview | [S1] |\n\n` +
        `## State of play\n\n- **2026-11-20:** Released. ([S1])\n\n## Sources\n\n` +
        `| Id | Source | Read |\n| --- | --- | --- |\n| [S1] | OpenAI, Codex | 2026-11-22 |\n\n` +
        `[industry.model]: ../industry/industry.model.md\n[industry.session]: ../industry/industry.session.md\n` +
        `[S1]: https://openai.com/codex\n`
    ]
  ])

describe('buildEcosystemMap', () => {
  test('builds the matrix, the crosswalk and the product pages from the cards', () => {
    const map = buildEcosystemMap(files(), { ref: REF, committed: '2026-11-22' })
    expect(map.source.reviewed).toBe('2026-11-22')
    expect(map.source.standardStatus).toBe('draft')
    expect(map.capabilities.map((c) => c.id)).toEqual(['industry.model', 'industry.session'])
    const [codex] = map.products
    expect(codex.name).toBe('Codex')
    expect(codex.status).toBe('proposal')
    expect(codex.capabilities.map((c) => [c.slug, c.value])).toEqual([
      ['model', 'yes'],
      ['session', 'partial']
    ])
    expect(codex.capabilities[0].sources[0]).toEqual({
      id: 'S1',
      titleHtml: 'OpenAI, Codex',
      read: '2026-11-22',
      url: 'https://openai.com/codex'
    })
    expect(codex.summaryHtml).toContain(
      `<a href="https://github.com/knowledgeislands/ki-agent-backpack/blob/${REF}/skills/keystone/ki-agentic-ecosystems/knowledge/industry/industry.model.md">model</a>`
    )
    expect(codex.instanceOf.map((c) => c.label)).toEqual(['Model'])
    expect(map.crosswalk.map((t) => t.slug)).toEqual(['session', 'model'])
    expect(map.crosswalk[0].words).toEqual([
      {
        vendor: 'OpenAI',
        entries: [
          {
            id: 'openai.chat',
            word: 'Chat',
            type: 'vendor-term',
            match: 'close',
            status: 'agreed',
            url: `https://github.com/knowledgeislands/ki-agent-backpack/blob/${REF}/skills/keystone/ki-agentic-ecosystems/knowledge/vendors/openai/openai.chat.md`
          }
        ]
      }
    ])
  })

  test('refuses a product whose capability rows depart from the standard', () => {
    const broken = files()
    const path = 'knowledge/products/product.codex.md'
    broken.set(path, (broken.get(path) as string).replace(/\| \[Session\].*\n/u, ''))
    expect(() => buildEcosystemMap(broken, { ref: REF, committed: '2026-11-22' })).toThrow(
      "the standard's, in its order"
    )
  })

  test('refuses a citation of a source the card does not hold', () => {
    const broken = files()
    const path = 'knowledge/products/product.codex.md'
    broken.set(path, (broken.get(path) as string).replace('Released. ([S1])', 'Released. ([S9])'))
    expect(() => buildEcosystemMap(broken, { ref: REF, committed: '2026-11-22' })).toThrow('cites S9')
  })

  test('refuses a ref that is not a full commit', () => {
    expect(() => buildEcosystemMap(files(), { ref: 'ec00780', committed: '2026-11-22' })).toThrow('40-character')
  })
})

describe('the committed snapshot', () => {
  test('is well formed', () => {
    expect(mapFaults(committed())).toEqual([])
  })

  test('names a fault rather than rendering a torn snapshot', () => {
    const map = committed()
    map.products[0].capabilities.pop()
    expect(mapFaults(map)).toContain(
      `products ${map.products[0].slug} must hold every capability, in the matrix's order`
    )
  })

  test('expects a matrix cell for every product and capability', () => {
    const map = committed()
    const matrix = expectedPages(map).find((page) => page.page === 'matrix/index.html')
    expect(matrix?.anchors.filter((id) => id.startsWith('cell-')).length).toBe(
      map.products.length * map.capabilities.length
    )
  })
})
