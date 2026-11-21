import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import JSON5 from 'json5'
import { ecosystemFaults, expectedAnchors } from './ecosystem.ts'

const committed = (): Record<string, unknown> =>
  JSON5.parse(readFileSync(join(import.meta.dir, '..', '..', 'src', '_data', 'ecosystem.json5'), 'utf8'))

/** A minimal valid map, which each case below breaks in one place. */
const minimal = (): Record<string, any> => ({
  meta: { status: 'placeholder', revised: '2026-11-21', seededFrom: 'the plan', canonicalHome: 'Resources' },
  terms: [{ id: 'bot', label: 'Bot', definition: 'A durable identity.', placeholder: true }],
  layers: {
    note: 'Machine to model.',
    rungs: [{ id: 'model', label: 'Model', summary: 'A model.', placeholder: true }]
  },
  productRoles: [{ id: 'host', label: 'Host' }],
  productGroups: [{ id: 'hosts', label: 'Hosts' }],
  products: [{ id: 'orca', name: 'Orca', group: 'hosts', roles: ['host'], placeholder: true }]
})

describe('ecosystemFaults', () => {
  test('accepts the committed map', () => {
    expect(ecosystemFaults(committed())).toEqual([])
  })

  test('accepts a minimal map', () => {
    expect(ecosystemFaults(minimal())).toEqual([])
  })

  test('rejects data that is not an object', () => {
    expect(ecosystemFaults([])).toEqual(['the ecosystem data must be an object'])
  })

  test('names a missing meta field and a malformed date', () => {
    const data = minimal()
    data.meta = { status: 'placeholder', revised: '21 November', seededFrom: 'the plan' }
    expect(ecosystemFaults(data)).toEqual(['meta needs a canonicalHome', 'meta.revised must be a date, YYYY-MM-DD'])
  })

  test('names a repeated id, a malformed id and a missing definition', () => {
    const data = minimal()
    data.terms = [
      { id: 'bot', label: 'Bot', definition: 'One.', placeholder: true },
      { id: 'bot', label: 'Bot again', definition: 'Two.', placeholder: true },
      { id: 'Agent Host', label: 'Agent host', definition: 'Three.', placeholder: true },
      { id: 'actor', label: 'Actor', placeholder: true }
    ]
    expect(ecosystemFaults(data)).toEqual([
      'terms repeats the id bot',
      'terms[2] needs a kebab-case id',
      'terms actor needs a definition'
    ])
  })

  test('requires every entry to say whether it is a placeholder', () => {
    const data = minimal()
    delete data.products[0].placeholder
    expect(ecosystemFaults(data)).toEqual(['products orca must say whether it is a placeholder'])
  })

  test('names an unknown group and an unknown role', () => {
    const data = minimal()
    data.products[0].group = 'vendors'
    data.products[0].roles = ['orchestrator']
    expect(ecosystemFaults(data)).toEqual([
      'products orca names an unknown group vendors',
      'products orca names an unknown role orchestrator'
    ])
  })

  test('rejects an empty list and a layer set without its note', () => {
    const data = minimal()
    data.products = []
    data.layers = { rungs: data.layers.rungs }
    expect(ecosystemFaults(data)).toEqual(['layers needs a note', 'products must be a non-empty list'])
  })
})

describe('expectedAnchors', () => {
  test('lists one anchor per term, rung and product', () => {
    expect(expectedAnchors(minimal())).toEqual(['term-bot', 'layer-model', 'product-orca'])
  })

  test('covers every committed entry', () => {
    const data = committed() as { terms: unknown[]; layers: { rungs: unknown[] }; products: unknown[] }
    expect(expectedAnchors(data)).toHaveLength(data.terms.length + data.layers.rungs.length + data.products.length)
  })
})
