import { describe, expect, test } from 'bun:test'
import {
  cardLinks,
  dateProperty,
  parseCapabilities,
  parseCapabilityOrder,
  parseSources,
  parseStateOfPlay,
  referenceDefinitions,
  renderInline,
  splitFrontMatter
} from './cards.ts'

/** A product card in the standard's shape, cut to two capability rows; each case below breaks it in one place. */
const card = `---
id: product.zed
title: Zed (Zed Industries)
type: product
status: proposal
vendor: Zed Industries
reviewed: 2026-11-22
links:
  industry.client:
    predicate: skos:broadMatch
  spec.acp:
    predicate: dcterms:conformsTo
---

# Zed (Zed Industries)

Zed lets developers write code with agents ([S1]).

## Contents

- [Capabilities](#capabilities)

## Capabilities

| Term | Value | Detail | Sources |
| --- | --- | --- | --- |
| [Model][industry.model] | \`yes\` | Zed-hosted models and \`ollama\` | [S1], S2 |
| [ACP][spec.acp] | \`unknown\` | No source found | None |

## State of play

- **2026-11-20:** Version 1.29.3 fixes caching; 1.29.1 added a setting. ([S1], S2)
- **2026-08-12:** Delta "Now in Beta". ([S1])

## Sources

| Id | Source | Read |
| --- | --- | --- |
| [S1] | Zed Industries, External Agents | 2026-11-22 |
| S2 | Zed CLI help, read on sol, no URL | 2026-11-21 |

[industry.model]: ../industry/industry.model.md
[spec.acp]: ../specs/acp/spec.acp.md
[S1]: https://zed.dev/docs/ai/external-agents
`

const body = (): string => splitFrontMatter(card, 'zed').body

describe('front matter', () => {
  test('reads the properties, the review date and the links in order', () => {
    const { data } = splitFrontMatter(card, 'zed')
    expect(data.id).toBe('product.zed')
    expect(data.vendor).toBe('Zed Industries')
    expect(dateProperty(data, 'reviewed', 'zed')).toBe('2026-11-22')
    expect(cardLinks(data, 'zed')).toEqual([
      { target: 'industry.client', predicate: 'skos:broadMatch' },
      { target: 'spec.acp', predicate: 'dcterms:conformsTo' }
    ])
  })

  test('refuses a card with no front matter, or with it unclosed', () => {
    expect(() => splitFrontMatter('# Zed\n', 'zed')).toThrow('the card has no front matter')
    expect(() => splitFrontMatter('---\nid: x\n', 'zed')).toThrow('the front matter is not closed')
  })

  test('refuses a malformed review date and a link with no predicate', () => {
    expect(() => dateProperty({ reviewed: '22 November' }, 'reviewed', 'zed')).toThrow('must be YYYY-MM-DD')
    expect(() => cardLinks({ links: { 'industry.client': {} } }, 'zed')).toThrow('needs a predicate')
  })
})

describe('capabilities table', () => {
  test('keys each row by the card its Term cell links, with value, detail and sources', () => {
    expect(parseCapabilities(body(), 'zed')).toEqual([
      {
        term: 'industry.model',
        label: 'Model',
        value: 'yes',
        detail: 'Zed-hosted models and `ollama`',
        sources: ['S1', 'S2']
      },
      { term: 'spec.acp', label: 'ACP', value: 'unknown', detail: 'No source found', sources: [] }
    ])
  })

  test('refuses a Term cell that does not link a card', () => {
    const broken = body().replace('[Model][industry.model]', 'Model')
    expect(() => parseCapabilities(broken, 'zed')).toThrow('must be a link to a card')
  })

  test('refuses a value outside the closed list', () => {
    const broken = body().replace('`yes`', '`mostly`')
    expect(() => parseCapabilities(broken, 'zed')).toThrow('is not one of yes, partial, no, unknown')
  })

  test('refuses a table with the wrong columns', () => {
    const broken = body().replace('| Term | Value | Detail | Sources |', '| Term | Value | Sources |')
    expect(() => parseCapabilities(broken, 'zed')).toThrow('expected Term, Value, Detail, Sources')
  })

  test('reads the standard row order by the linked card file', () => {
    const standard = `### 4.4 Capabilities

| Row | Term card | Asks |
| --- | --- | --- |
| 1 | [Model](../knowledge/industry/industry.model.md) | Which models it runs |
| 2 | [ACP](../knowledge/specs/acp/spec.acp.md) | Whether it speaks ACP |

### 4.5 Evidence
`
    expect(parseCapabilityOrder(standard, 'standard')).toEqual([
      { term: 'industry.model', label: 'Model', asks: 'Which models it runs' },
      { term: 'spec.acp', label: 'ACP', asks: 'Whether it speaks ACP' }
    ])
  })
})

describe('state of play', () => {
  test('reads each dated line, its text and its cited sources, linked or bare', () => {
    expect(parseStateOfPlay(body(), 'zed')).toEqual([
      { date: '2026-11-20', text: 'Version 1.29.3 fixes caching; 1.29.1 added a setting.', sources: ['S1', 'S2'] },
      { date: '2026-08-12', text: 'Delta "Now in Beta".', sources: ['S1'] }
    ])
  })

  test('refuses a line that is not dated', () => {
    const broken = body().replace('- **2026-08-12:**', '- Earlier:')
    expect(() => parseStateOfPlay(broken, 'zed')).toThrow('must read - **YYYY-MM-DD:**')
  })

  test('refuses items out of order', () => {
    const broken = body().replace('2026-08-12', '2026-12-01')
    expect(() => parseStateOfPlay(broken, 'zed')).toThrow('newest first')
  })
})

describe('sources and inline Markdown', () => {
  test('resolves linked sources through the references and keeps a source with no URL', () => {
    const text = body()
    expect(parseSources(text, referenceDefinitions(text), 'zed')).toEqual([
      {
        id: 'S1',
        title: 'Zed Industries, External Agents',
        read: '2026-11-22',
        url: 'https://zed.dev/docs/ai/external-agents'
      },
      { id: 'S2', title: 'Zed CLI help, read on sol, no URL', read: '2026-11-21' }
    ])
  })

  test('renders code, links and bold, and escapes everything else', () => {
    const refs = new Map([
      ['S1', 'https://example.com/a'],
      ['industry.model', 'https://example.com/model']
    ])
    expect(renderInline('A [model][industry.model] runs `<cmd>` **now** ([S1], S2) <b>', (l) => refs.get(l))).toBe(
      'A <a href="https://example.com/model">model</a> runs <code>&lt;cmd&gt;</code> <strong>now</strong> ' +
        '(<a href="https://example.com/a">S1</a>, S2) &lt;b&gt;'
    )
  })
})
