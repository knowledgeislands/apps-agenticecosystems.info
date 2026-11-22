/**
 * Reads the cards of the backpack's `ki-agentic-ecosystems` knowledge map: their front matter, their link reference
 * definitions, and the three parts of a product card a generator relies on, its capabilities table, its state of play
 * and its sources table.
 *
 * The shape is the one the skill's product cards standard (`references/standard-product-cards.md`) fixes. Every reader
 * here throws on a shape it does not recognise rather than reading less: a matrix that silently loses a row is worse
 * than a sync that refuses to run, because nobody would notice.
 *
 * Nothing here touches the disk or the network; the sync command hands in each card's text.
 */

import { parse as parseYaml } from 'yaml'

/** The values a capability row may take, in the standard's order. */
export const CAPABILITY_VALUES = ['yes', 'partial', 'no', 'unknown'] as const
export type CapabilityValue = (typeof CAPABILITY_VALUES)[number]

const DATE = /^\d{4}-\d{2}-\d{2}$/u
const CARD_ID = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u
const SOURCE_ID = /^S\d+$/u

export interface FrontMatter {
  data: Record<string, unknown>
  body: string
}

/** Split a card into its YAML front matter and its Markdown body. The fence must open the file. */
export const splitFrontMatter = (text: string, where: string): FrontMatter => {
  const open = text.match(/^---\r?\n/u)
  if (!open) throw new Error(`${where}: the card has no front matter`)
  const close = text.indexOf('\n---', open[0].length - 1)
  if (close === -1) throw new Error(`${where}: the front matter is not closed`)
  const block = text.slice(open[0].length, close)
  const lineEnd = text.indexOf('\n', close + 1)
  const body = lineEnd === -1 ? '' : text.slice(lineEnd + 1)
  const data: unknown = parseYaml(block)
  if (typeof data !== 'object' || data === null || Array.isArray(data))
    throw new Error(`${where}: the front matter is not a mapping`)
  return { data: data as Record<string, unknown>, body }
}

/** A required text property of the front matter. */
export const textProperty = (data: Record<string, unknown>, key: string, where: string): string => {
  const value = data[key]
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${where}: front matter needs a ${key}`)
  return value.trim()
}

/** A required date property of the front matter, `YYYY-MM-DD`; YAML may already have read it as a date. */
export const dateProperty = (data: Record<string, unknown>, key: string, where: string): string => {
  const value = data[key]
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : value
  if (typeof text !== 'string' || !DATE.test(text)) throw new Error(`${where}: front matter ${key} must be YYYY-MM-DD`)
  return text
}

export interface CardLink {
  target: string
  predicate: string
}

/** The front matter's typed links, keyed by target card id, in the order the card gives them. */
export const cardLinks = (data: Record<string, unknown>, where: string): CardLink[] => {
  const links = data.links
  if (links === undefined) return []
  if (typeof links !== 'object' || links === null || Array.isArray(links))
    throw new Error(`${where}: links must be a mapping keyed by card id`)
  return Object.entries(links as Record<string, unknown>).map(([target, value]) => {
    const predicate = (value as { predicate?: unknown } | null)?.predicate
    if (!CARD_ID.test(target)) throw new Error(`${where}: links names a malformed card id ${target}`)
    if (typeof predicate !== 'string' || !/^[a-z]+:[A-Za-z-]+$/u.test(predicate))
      throw new Error(`${where}: the link to ${target} needs a predicate`)
    return { target, predicate }
  })
}

/** The card's link reference definitions, `[label]: destination`, keyed by label. */
export const referenceDefinitions = (body: string): Map<string, string> => {
  const refs = new Map<string, string>()
  for (const match of body.matchAll(/^\[([^\]\n]+)\]:\s+(\S+)\s*$/gmu)) refs.set(match[1], match[2])
  return refs
}

const escapeHtml = (text: string): string =>
  text.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;')

/**
 * Render one line of a card's Markdown as inline HTML: code spans, bold, full reference links `[text][label]` and
 * shortcut references `[label]`. `resolve` turns a reference label into a URL, or `undefined` when the label is not a
 * link, in which case the text is kept as written. Everything else is escaped, so a card can never inject markup.
 */
export const renderInline = (markdown: string, resolve: (label: string) => string | undefined): string => {
  const codes: string[] = []
  // Code spans first, so nothing inside one is read as a link or as bold; each is held by a private-use placeholder.
  let html = escapeHtml(markdown).replace(/`([^`]+)`/gu, (_match, code: string) => {
    codes.push(`<code>${code}</code>`)
    return `\uE000${codes.length - 1}\uE000`
  })
  const link = (text: string, label: string, whole: string): string => {
    const url = resolve(label.replace(/&quot;/gu, '"').replace(/&amp;/gu, '&'))
    return url === undefined ? whole : `<a href="${escapeHtml(url)}">${text}</a>`
  }
  html = html.replace(/\[([^\]]+)\]\[([^\]]+)\]/gu, (whole, text: string, label: string) => link(text, label, whole))
  html = html.replace(/\[([^\]]+)\](?![[(])/gu, (whole, label: string) => link(label, label, whole))
  html = html.replace(/\*\*([^*]+)\*\*/gu, '<strong>$1</strong>')
  return html.replace(/\uE000(\d+)\uE000/gu, (_match, index: string) => codes[Number(index)])
}

/** The text of one `## heading` section, up to the next second-level heading. */
export const section = (body: string, heading: string, where: string): string => {
  const lines = body.split('\n')
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`)
  if (start === -1) throw new Error(`${where}: the card has no "## ${heading}" section`)
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^#{1,2} /u.test(line))
  return (end === -1 ? rest : rest.slice(0, end)).join('\n')
}

/** The first paragraph after the card's `# title`. */
export const leadParagraph = (body: string, where: string): string => {
  const lines = body.split('\n')
  const title = lines.findIndex((line) => line.startsWith('# '))
  if (title === -1) throw new Error(`${where}: the card has no title heading`)
  const paragraph: string[] = []
  for (const line of lines.slice(title + 1)) {
    if (line.trim() === '') {
      if (paragraph.length > 0) break
      continue
    }
    if (line.startsWith('#')) break
    paragraph.push(line.trim())
  }
  if (paragraph.length === 0) throw new Error(`${where}: the card has no paragraph under its title`)
  return paragraph.join(' ')
}

/**
 * Render a card's body below its `# title` as block HTML: paragraphs, `##` and `###` headings, one level of bulleted
 * or numbered list, and simple tables, each line through `renderInline`. Link reference definitions are dropped, and
 * headings are demoted by `demote` levels so they sit under the page's own. A card uses nothing richer than these.
 */
export const renderBlocks = (body: string, resolve: (label: string) => string | undefined, demote = 1): string => {
  const lines = body.split('\n')
  const title = lines.findIndex((line) => line.startsWith('# '))
  const blocks: string[] = []
  let paragraph: string[] = []
  let list: { tag: 'ul' | 'ol'; items: string[] } | undefined
  let table: string[][] = []
  const flush = (): void => {
    if (paragraph.length > 0) blocks.push(`<p>${renderInline(paragraph.join(' '), resolve)}</p>`)
    paragraph = []
    if (list !== undefined)
      blocks.push(
        `<${list.tag}>${list.items.map((item) => `<li>${renderInline(item, resolve)}</li>`).join('')}</${list.tag}>`
      )
    list = undefined
    if (table.length > 0) {
      const [head, , ...rows] = table
      const th = head.map((cell) => `<th scope="col">${renderInline(cell, resolve)}</th>`).join('')
      const tr = rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell, resolve)}</td>`).join('')}</tr>`)
      blocks.push(`<table><thead><tr>${th}</tr></thead><tbody>${tr.join('')}</tbody></table>`)
    }
    table = []
  }
  for (const raw of lines.slice(title + 1)) {
    const line = raw.trimEnd()
    if (/^\[[^\]\n]+\]:\s+\S+$/u.test(line)) continue
    if (line.trim() === '') {
      flush()
      continue
    }
    const heading = line.match(/^(#{2,4}) (.+)$/u)
    const bullet = line.match(/^- (.+)$/u)
    const numbered = line.match(/^\d+\. (.+)$/u)
    if (heading !== null) {
      flush()
      const level = Math.min(heading[1].length + demote, 6)
      blocks.push(`<h${level}>${renderInline(heading[2], resolve)}</h${level}>`)
    } else if (line.startsWith('|')) {
      if (paragraph.length > 0 || list !== undefined) flush()
      table.push(cells(line))
    } else if (bullet !== null || numbered !== null) {
      const tag = bullet !== null ? 'ul' : 'ol'
      if (paragraph.length > 0 || table.length > 0 || (list !== undefined && list.tag !== tag)) flush()
      list ??= { tag, items: [] }
      list.items.push((bullet ?? numbered)?.[1] ?? '')
    } else if (list !== undefined && /^\s+\S/u.test(raw)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`
    } else {
      if (list !== undefined || table.length > 0) flush()
      paragraph.push(line.trim())
    }
  }
  flush()
  return blocks.join('\n')
}

/** Split one Markdown table row into its trimmed cells. Cells here never hold an escaped pipe. */
const cells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/u, '')
    .replace(/\|$/u, '')
    .split('|')
    .map((cell) => cell.trim())

/** The body rows of the first table in a block of text, after checking its header names the expected columns. */
export const tableRows = (text: string, columns: readonly string[], where: string): string[][] => {
  const lines = text.split('\n').filter((line) => line.trim().startsWith('|'))
  if (lines.length < 2) throw new Error(`${where}: no table found`)
  const header = cells(lines[0])
  if (header.join('|') !== columns.join('|'))
    throw new Error(`${where}: the table's columns are ${header.join(', ')}, expected ${columns.join(', ')}`)
  if (!/^\|?\s*:?-{3,}/u.test(lines[1].trim())) throw new Error(`${where}: the table has no separator row`)
  return lines.slice(2).map((line, index) => {
    const row = cells(line)
    if (row.length !== columns.length)
      throw new Error(`${where}: table row ${index + 1} has ${row.length} cells, expected ${columns.length}`)
    return row
  })
}

/** The source ids a Sources cell or a state-of-play item cites: `[S1]`, or a bare `S10` for a source with no URL. */
export const citedSources = (text: string): string[] => [...text.matchAll(/\[?(S\d+)\]?/gu)].map((match) => match[1])

/** The card id a cell links, from `[Label][card.id]`. */
const linkedCard = (cell: string, where: string): { label: string; id: string } => {
  const match = cell.match(/^\[([^\]]+)\]\[([a-z0-9.-]+)\]$/u)
  if (!match) throw new Error(`${where}: "${cell}" must be a link to a card, [Label][card.id]`)
  return { label: match[1], id: match[2] }
}

export interface CapabilityRow {
  /** The id of the card the row is about, read from the Term cell's link, such as `industry.model`. */
  term: string
  label: string
  value: CapabilityValue
  /** The Detail cell as the card writes it, Markdown. */
  detail: string
  sources: string[]
}

/** A product card's capabilities table, each row keyed by the term card its Term cell links. */
export const parseCapabilities = (body: string, where: string): CapabilityRow[] => {
  const rows = tableRows(section(body, 'Capabilities', where), ['Term', 'Value', 'Detail', 'Sources'], where)
  return rows.map(([term, value, detail, sources], index) => {
    const at = `${where}: capability row ${index + 1}`
    const card = linkedCard(term, at)
    const bare = value.replace(/^`(.*)`$/u, '$1')
    if (!(CAPABILITY_VALUES as readonly string[]).includes(bare))
      throw new Error(`${at}: value ${value} is not one of ${CAPABILITY_VALUES.join(', ')}`)
    const cited = sources === 'None' ? [] : citedSources(sources)
    if (sources !== 'None' && cited.length === 0) throw new Error(`${at}: Sources must cite source ids or say None`)
    return { term: card.id, label: card.label, value: bare as CapabilityValue, detail, sources: cited }
  })
}

export interface StateOfPlayItem {
  date: string
  /** What happened, as the card writes it, Markdown, without the trailing citation. */
  text: string
  sources: string[]
}

/** A product card's state of play: `- **YYYY-MM-DD:** <what happened> ([S1], …)`, newest first. */
export const parseStateOfPlay = (body: string, where: string): StateOfPlayItem[] => {
  const items: StateOfPlayItem[] = []
  for (const line of section(body, 'State of play', where).split('\n')) {
    if (line.trim() === '') continue
    const match = line.match(/^- \*\*(\d{4}-\d{2}-\d{2}):\*\* (.+)$/u)
    if (!match) throw new Error(`${where}: state-of-play line "${line}" must read - **YYYY-MM-DD:** …`)
    const [, date, rest] = match
    const citation = rest.match(/\s*\(((?:\[?S\d+\]?)(?:,\s*\[?S\d+\]?)*)\)\s*$/u)
    const sources = citation ? citedSources(citation[1]) : []
    const text = citation ? rest.slice(0, citation.index).trimEnd() : rest
    items.push({ date, text, sources })
  }
  if (items.length === 0) throw new Error(`${where}: the state of play is empty`)
  for (let i = 1; i < items.length; i++)
    if (items[i].date > items[i - 1].date) throw new Error(`${where}: the state of play must be newest first`)
  return items
}

export interface Source {
  id: string
  /** The source named by its publisher and title, Markdown. */
  title: string
  read: string
  url?: string
}

/** A product card's Sources table, `| Id | Source | Read |`, each linked id resolved through the card's references. */
export const parseSources = (body: string, refs: Map<string, string>, where: string): Source[] => {
  const rows = tableRows(section(body, 'Sources', where), ['Id', 'Source', 'Read'], where)
  const seen = new Set<string>()
  return rows.map(([idCell, title, read], index) => {
    const at = `${where}: source row ${index + 1}`
    const linked = idCell.match(/^\[(S\d+)\]$/u)
    const id = linked ? linked[1] : idCell
    if (!SOURCE_ID.test(id)) throw new Error(`${at}: id ${idCell} must be [S<n>] or S<n>`)
    if (seen.has(id)) throw new Error(`${at}: repeats the id ${id}`)
    seen.add(id)
    if (!DATE.test(read)) throw new Error(`${at}: Read must be YYYY-MM-DD`)
    const url = linked ? refs.get(id) : undefined
    if (linked && url === undefined) throw new Error(`${at}: ${id} is linked but has no reference definition`)
    if (url !== undefined && !/^https?:\/\//u.test(url)) throw new Error(`${at}: ${id} must link a web page`)
    return url === undefined ? { id, title, read } : { id, title, read, url }
  })
}

export interface CapabilitySpec {
  term: string
  label: string
  asks: string
}

/** The capability rows every product card must hold, in order, read from the standard's section 4.4 table. */
export const parseCapabilityOrder = (standard: string, where: string): CapabilitySpec[] => {
  const start = standard.indexOf('### 4.4 Capabilities')
  if (start === -1) throw new Error(`${where}: no "### 4.4 Capabilities" section`)
  const rest = standard.slice(start)
  const end = rest.indexOf('\n### ', 1)
  const rows = tableRows(rest.slice(0, end === -1 ? undefined : end), ['Row', 'Term card', 'Asks'], where)
  return rows.map(([row, term, asks], index) => {
    if (Number(row) !== index + 1) throw new Error(`${where}: capability rows must be numbered in order`)
    const match = term.match(/^\[([^\]]+)\]\([^)]*\/([a-z0-9.-]+)\.md\)$/u)
    if (!match) throw new Error(`${where}: row ${row}'s term card "${term}" must link a card file`)
    return { term: match[2], label: match[1], asks }
  })
}
