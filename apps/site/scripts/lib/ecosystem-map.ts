/**
 * Turns the cards of the backpack's `ki-agentic-ecosystems` knowledge map, read at one pinned commit, into the
 * snapshot the site renders: the capability matrix, the crosswalk of vendors' words and a page per product.
 *
 * The snapshot is generated, never edited. Every fact in it carries the card it came from, at the pinned commit, and
 * every product fact its source and the date that source was read. The cards are the skill's; their status, such as
 * `proposal`, travels with them so the pages can say so.
 *
 * Nothing here touches the disk or the network; the sync command hands in the files.
 */

import { posix } from 'node:path'
import {
  type CapabilitySpec,
  type CapabilityValue,
  cardLinks,
  dateProperty,
  leadParagraph,
  parseCapabilities,
  parseCapabilityOrder,
  parseSources,
  parseStateOfPlay,
  referenceDefinitions,
  renderInline,
  splitFrontMatter,
  textProperty
} from './cards.ts'

export const SOURCE_REPOSITORY = 'knowledgeislands/ki-agent-backpack'
/** The skill folder, from the repository root. */
export const SKILL_PATH = 'skills/keystone/ki-agentic-ecosystems'
/** The card shape the generator follows, from the skill folder. */
export const STANDARD_PATH = 'references/standard-product-cards.md'
/** The knowledge map, from the skill folder. */
export const KNOWLEDGE_PATH = 'knowledge'

export const COMMIT = /^[0-9a-f]{40}$/u

/** How a vendor's word stands to the industry's term, by the predicate on the vendor card. */
const MATCHES: Readonly<Record<string, string>> = {
  'skos:exactMatch': 'exact',
  'skos:closeMatch': 'close',
  'skos:broadMatch': 'narrower',
  'skos:relatedMatch': 'related'
}

/** Anthropic and OpenAI lead (the graph's LEADERS constraint), so their columns come first; the rest alphabetically. */
const LEADERS = ['Anthropic', 'OpenAI']

export interface Pin {
  /** The 40-character commit the cards were read at. */
  ref: string
  /** That commit's date, `YYYY-MM-DD`. */
  committed: string
}

export interface SourceRef {
  id: string
  titleHtml: string
  read: string
  url?: string
}

export interface CardRef {
  id: string
  label: string
  url: string
}

export interface ProductCapability {
  id: string
  slug: string
  value: CapabilityValue
  detailHtml: string
  sources: SourceRef[]
}

export interface Product {
  id: string
  slug: string
  name: string
  title: string
  vendor: string
  status: string
  reviewed: string
  url: string
  summaryHtml: string
  instanceOf: CardRef[]
  conformsTo: CardRef[]
  capabilities: ProductCapability[]
  stateOfPlay: { date: string; html: string; sources: SourceRef[] }[]
  sources: SourceRef[]
}

export interface Capability {
  id: string
  slug: string
  label: string
  asks: string
  url: string
}

export interface VendorWord {
  id: string
  word: string
  type: string
  match: string
  status: string
  url: string
}

export interface CrosswalkTerm {
  id: string
  slug: string
  label: string
  status: string
  url: string
  summaryHtml: string
  words: { vendor: string; entries: VendorWord[] }[]
}

export interface EcosystemMap {
  source: {
    repository: string
    path: string
    ref: string
    committed: string
    /** The latest date a product card was reviewed: what the pages are "as of". */
    reviewed: string
    /** Every date a product card's source was read, oldest first. */
    readDates: string[]
    standardUrl: string
    standardStatus: string
  }
  capabilities: Capability[]
  products: Product[]
  vendors: string[]
  crosswalk: CrosswalkTerm[]
}

/** A card's URL on GitHub at the pinned commit, from its path inside the skill folder. */
const blobUrl = (ref: string, path: string): string =>
  `https://github.com/${SOURCE_REPOSITORY}/blob/${ref}/${SKILL_PATH}/${path}`

/** The slug of a card id: its last segment, `industry.agent-host` → `agent-host`. */
const slugOf = (id: string): string => id.slice(id.indexOf('.') + 1)

interface Card {
  id: string
  path: string
  data: Record<string, unknown>
  body: string
  refs: Map<string, string>
}

/**
 * Resolve a reference destination on a card: a web URL stays as it is, and a relative path to another file in the
 * skill becomes that file's GitHub URL at the pinned commit. A path that leaves the skill is refused.
 */
const resolver =
  (card: Card, ref: string) =>
  (label: string): string | undefined => {
    const destination = card.refs.get(label)
    if (destination === undefined) return undefined
    if (/^https?:\/\//u.test(destination)) return destination
    const [path, fragment] = destination.split('#')
    const resolved = posix.normalize(posix.join(posix.dirname(card.path), path))
    if (resolved.startsWith('..')) throw new Error(`${card.path}: the reference ${label} leaves the skill`)
    return `${blobUrl(ref, resolved)}${fragment === undefined ? '' : `#${fragment}`}`
  }

const readCard = (path: string, text: string): Card => {
  const { data, body } = splitFrontMatter(text, path)
  const id = textProperty(data, 'id', path)
  // The graph root is `_graph.md`, named for its role; every other card is named after its id.
  if (data.type !== 'graph' && posix.basename(path) !== `${id}.md`)
    throw new Error(`${path}: the file is not named after its id ${id}`)
  return { id, path, data, body, refs: referenceDefinitions(body) }
}

/** The product's name: its title without the maker in brackets, as the standard writes the title. */
const productName = (title: string, vendor: string, where: string): string => {
  const suffix = ` (${vendor})`
  if (!title.endsWith(suffix)) throw new Error(`${where}: the title must end with its maker in brackets, ${suffix}`)
  return title.slice(0, -suffix.length)
}

const buildProduct = (card: Card, order: CapabilitySpec[], cards: Map<string, Card>, pin: Pin): Product => {
  const where = card.path
  const resolve = resolver(card, pin.ref)
  const title = textProperty(card.data, 'title', where)
  const vendor = textProperty(card.data, 'vendor', where)
  const sources = parseSources(card.body, card.refs, where)
  const byId = new Map(sources.map((source) => [source.id, source]))
  const cite = (ids: string[], at: string): SourceRef[] =>
    ids.map((id) => {
      const source = byId.get(id)
      if (source === undefined) throw new Error(`${at} cites ${id}, which the Sources table does not hold`)
      const titleHtml = renderInline(source.title, resolve)
      return source.url === undefined
        ? { id, titleHtml, read: source.read }
        : { id, titleHtml, read: source.read, url: source.url }
    })

  const rows = parseCapabilities(card.body, where)
  const expected = order.map((spec) => spec.term)
  const actual = rows.map((row) => row.term)
  if (expected.join(' ') !== actual.join(' '))
    throw new Error(
      `${where}: the capability rows must be the standard's, in its order: expected ${expected.join(', ')}, found ${actual.join(', ')}`
    )

  const linked = (predicate: string): CardRef[] =>
    cardLinks(card.data, where)
      .filter((link) => link.predicate === predicate)
      .map((link) => {
        const target = cards.get(link.target)
        if (target === undefined) throw new Error(`${where}: links ${link.target}, which no card holds`)
        return {
          id: target.id,
          label: textProperty(target.data, 'title', target.path),
          url: blobUrl(pin.ref, target.path)
        }
      })

  return {
    id: card.id,
    slug: slugOf(card.id),
    name: productName(title, vendor, where),
    title,
    vendor,
    status: textProperty(card.data, 'status', where),
    reviewed: dateProperty(card.data, 'reviewed', where),
    url: blobUrl(pin.ref, card.path),
    summaryHtml: renderInline(leadParagraph(card.body, where), resolve),
    instanceOf: linked('skos:broadMatch'),
    conformsTo: linked('dcterms:conformsTo'),
    capabilities: rows.map((row) => ({
      id: row.term,
      slug: slugOf(row.term),
      value: row.value,
      detailHtml: renderInline(row.detail, resolve),
      sources: cite(row.sources, `${where}: the ${row.label} row`)
    })),
    stateOfPlay: parseStateOfPlay(card.body, where).map((item) => ({
      date: item.date,
      html: renderInline(item.text, resolve),
      sources: cite(item.sources, `${where}: the ${item.date} state-of-play item`)
    })),
    sources: cite(
      sources.map((source) => source.id),
      where
    )
  }
}

/** The industry terms in the graph's reading order, from the Industry row of its Subgraphs table. */
const industryOrder = (graph: Card): string[] => {
  const row = graph.body.split('\n').find((line) => line.startsWith('| Industry |'))
  if (row === undefined) throw new Error(`${graph.path}: the Subgraphs table has no Industry row`)
  return [...row.matchAll(/\]\[(industry\.[a-z0-9-]+)\]/gu)].map((match) => match[1])
}

const buildCrosswalk = (cards: Card[], graph: Card, pin: Pin): { vendors: string[]; terms: CrosswalkTerm[] } => {
  const vendorCards = cards.filter((card) => card.path.startsWith(`${KNOWLEDGE_PATH}/vendors/`))
  const vendors = [...new Set(vendorCards.map((card) => textProperty(card.data, 'vendor', card.path)))].sort(
    (a, b) =>
      (LEADERS.includes(a) ? LEADERS.indexOf(a) : LEADERS.length) -
        (LEADERS.includes(b) ? LEADERS.indexOf(b) : LEADERS.length) || a.localeCompare(b)
  )

  const terms = cards.filter((card) => card.path.startsWith(`${KNOWLEDGE_PATH}/industry/`))
  const order = industryOrder(graph)
  const rank = (id: string): number => (order.includes(id) ? order.indexOf(id) : order.length)
  terms.sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id))

  return {
    vendors,
    terms: terms.map((term) => {
      const words = vendors.map((vendor) => ({
        vendor,
        entries: vendorCards
          .filter((card) => card.data.vendor === vendor)
          .flatMap((card) =>
            cardLinks(card.data, card.path)
              .filter((link) => link.target === term.id && MATCHES[link.predicate] !== undefined)
              .map(
                (link): VendorWord => ({
                  id: card.id,
                  word: textProperty(card.data, 'title', card.path).replace(/ \([^)]*\)$/u, ''),
                  type: textProperty(card.data, 'type', card.path),
                  match: MATCHES[link.predicate],
                  status: textProperty(card.data, 'status', card.path),
                  url: blobUrl(pin.ref, card.path)
                })
              )
          )
          .sort((a, b) => Object.values(MATCHES).indexOf(a.match) - Object.values(MATCHES).indexOf(b.match))
      }))
      return {
        id: term.id,
        slug: slugOf(term.id),
        label: textProperty(term.data, 'title', term.path),
        status: textProperty(term.data, 'status', term.path),
        url: blobUrl(pin.ref, term.path),
        summaryHtml: renderInline(leadParagraph(term.body, term.path), resolver(term, pin.ref)),
        words
      }
    })
  }
}

/**
 * Build the snapshot from the skill's files, keyed by their path inside the skill folder (`knowledge/...` and the
 * standard), read at the pinned commit.
 */
export const buildEcosystemMap = (files: ReadonlyMap<string, string>, pin: Pin): EcosystemMap => {
  if (!COMMIT.test(pin.ref)) throw new Error(`${pin.ref} is not a 40-character commit`)
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(pin.committed)) throw new Error('the commit date must be YYYY-MM-DD')

  const standardText = files.get(STANDARD_PATH)
  if (standardText === undefined) throw new Error(`${STANDARD_PATH} is missing from the files read`)
  const standard = splitFrontMatter(standardText, STANDARD_PATH)
  const order = parseCapabilityOrder(standardText, STANDARD_PATH)

  const cards = [...files.entries()]
    .filter(([path]) => path.startsWith(`${KNOWLEDGE_PATH}/`) && path.endsWith('.md'))
    .map(([path, text]) => readCard(path, text))
  const byId = new Map<string, Card>()
  for (const card of cards) {
    if (byId.has(card.id)) throw new Error(`${card.path}: repeats the card id ${card.id}`)
    byId.set(card.id, card)
  }
  const graph = cards.find((card) => card.data.type === 'graph')
  if (graph === undefined) throw new Error('the knowledge map has no graph root')

  const capabilities = order.map((spec) => {
    const card = byId.get(spec.term)
    if (card === undefined) throw new Error(`${STANDARD_PATH}: capability ${spec.term} has no card`)
    return {
      id: spec.term,
      slug: slugOf(spec.term),
      label: spec.label,
      asks: spec.asks,
      url: blobUrl(pin.ref, card.path)
    }
  })

  const products = cards
    .filter((card) => card.data.type === 'product')
    .map((card) => buildProduct(card, order, byId, pin))
    .sort((a, b) => a.name.localeCompare(b.name))
  if (products.length === 0) throw new Error('the knowledge map holds no product cards')

  const { vendors, terms } = buildCrosswalk(cards, graph, pin)

  return {
    source: {
      repository: SOURCE_REPOSITORY,
      path: SKILL_PATH,
      ref: pin.ref,
      committed: pin.committed,
      reviewed: products.map((product) => product.reviewed).sort()[products.length - 1],
      readDates: [...new Set(products.flatMap((product) => product.sources.map((source) => source.read)))].sort(),
      standardUrl: blobUrl(pin.ref, STANDARD_PATH),
      standardStatus: textProperty(standard.data, 'ki-status', STANDARD_PATH)
    },
    capabilities,
    products,
    vendors,
    crosswalk: terms
  }
}

/** The element ids each generated page must carry, so a dropped product, cell or term is caught in dist/. */
export const expectedPages = (map: EcosystemMap): { page: string; anchors: string[] }[] => [
  {
    page: 'matrix/index.html',
    anchors: map.products.flatMap((product) => [
      `product-${product.slug}`,
      ...product.capabilities.map((capability) => `cell-${product.slug}-${capability.slug}`)
    ])
  },
  { page: 'crosswalk/index.html', anchors: map.crosswalk.map((term) => `term-${term.slug}`) },
  ...map.products.map((product) => ({
    page: `products/${product.slug}/index.html`,
    anchors: [
      ...product.capabilities.map((capability) => `cap-${capability.slug}`),
      ...product.sources.map((source) => `source-${source.id}`)
    ]
  }))
]

const DAY = /^\d{4}-\d{2}-\d{2}$/u

/**
 * Every fault in a committed snapshot, one line each; an empty list means it may be rendered. The sync only writes a
 * snapshot it built without error, so this guards against a hand edit or a torn file rather than re-parsing the cards.
 */
export const mapFaults = (data: unknown): string[] => {
  const faults: string[] = []
  const map = data as Partial<EcosystemMap> | null
  if (typeof map !== 'object' || map === null || Array.isArray(map)) return ['the ecosystem map must be an object']
  const source = map.source
  if (source === undefined || !COMMIT.test(String(source.ref))) faults.push('source.ref must be a 40-character commit')
  if (source !== undefined && !DAY.test(String(source.reviewed))) faults.push('source.reviewed must be YYYY-MM-DD')
  const capabilities = Array.isArray(map.capabilities) ? map.capabilities : []
  if (capabilities.length === 0) faults.push('capabilities must be a non-empty list')
  const order = capabilities.map((capability) => capability.id).join(' ')
  const products = Array.isArray(map.products) ? map.products : []
  if (products.length === 0) faults.push('products must be a non-empty list')
  for (const product of products) {
    const where = `products ${String(product?.slug)}`
    if (typeof product?.status !== 'string' || product.status === '') faults.push(`${where} needs a status`)
    if (!DAY.test(String(product?.reviewed))) faults.push(`${where} reviewed must be YYYY-MM-DD`)
    const cells = Array.isArray(product?.capabilities) ? product.capabilities : []
    if (cells.map((cell) => cell.id).join(' ') !== order)
      faults.push(`${where} must hold every capability, in the matrix's order`)
    const cited = [
      ...cells.flatMap((cell) => cell.sources ?? []),
      ...(product?.stateOfPlay ?? []).flatMap((item) => item.sources ?? []),
      ...(product?.sources ?? [])
    ]
    for (const cell of cells)
      if (!['yes', 'partial', 'no', 'unknown'].includes(cell.value)) faults.push(`${where} ${cell.slug}: bad value`)
    for (const ref of cited)
      if (!DAY.test(String(ref?.read))) faults.push(`${where} source ${ref?.id} has no read date`)
  }
  if (!Array.isArray(map.crosswalk) || map.crosswalk.length === 0) faults.push('crosswalk must be a non-empty list')
  return faults
}
