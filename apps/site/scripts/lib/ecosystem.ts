/**
 * The shape of `src/_data/ecosystem.json5`, and the checks that keep a sync or a hand edit from publishing a broken map.
 *
 * The page renders whatever the data file holds, so a missing label, a product in a group that does not exist or a
 * role nobody defined would render as an empty or misleading card rather than fail. These checks name each such fault.
 */

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

type Record_ = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is Record_ =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown): boolean => typeof value === 'string' && value.trim() !== ''

/** Check one list of entries: each a record with a unique, well-formed id and every named text field present. */
const entries = (
  faults: string[],
  where: string,
  list: unknown,
  fields: readonly string[],
  placeholder: boolean
): Record_[] => {
  if (!Array.isArray(list) || list.length === 0) {
    faults.push(`${where} must be a non-empty list`)
    return []
  }
  const seen = new Set<string>()
  const valid: Record_[] = []
  list.forEach((entry, index) => {
    if (!isRecord(entry)) {
      faults.push(`${where}[${index}] must be an object`)
      return
    }
    const id = entry.id
    const label = typeof id === 'string' ? id : String(index)
    if (typeof id !== 'string' || !ID.test(id)) faults.push(`${where}[${index}] needs a kebab-case id`)
    else if (seen.has(id)) faults.push(`${where} repeats the id ${id}`)
    else seen.add(id)
    for (const field of fields) if (!text(entry[field])) faults.push(`${where} ${label} needs a ${field}`)
    if (placeholder && typeof entry.placeholder !== 'boolean')
      faults.push(`${where} ${label} must say whether it is a placeholder`)
    valid.push(entry)
  })
  return valid
}

/** Every fault in an ecosystem map, as one line each; an empty list means the map may be rendered. */
export const ecosystemFaults = (data: unknown): string[] => {
  const faults: string[] = []
  if (!isRecord(data)) return ['the ecosystem data must be an object']

  const meta = data.meta
  if (!isRecord(meta)) faults.push('meta must be an object')
  else {
    for (const field of ['status', 'revised', 'seededFrom', 'canonicalHome'])
      if (!text(meta[field])) faults.push(`meta needs a ${field}`)
    if (typeof meta.revised === 'string' && !/^\d{4}-\d{2}-\d{2}$/u.test(meta.revised))
      faults.push('meta.revised must be a date, YYYY-MM-DD')
  }

  for (const term of entries(faults, 'terms', data.terms, ['label', 'definition'], true)) {
    const also = term.alsoCalled
    if (also !== undefined && (!Array.isArray(also) || !also.every(text)))
      faults.push(`terms ${String(term.id)} alsoCalled must be a list of words`)
  }

  const layers = data.layers
  if (!isRecord(layers)) faults.push('layers must be an object')
  else {
    if (!text(layers.note)) faults.push('layers needs a note')
    entries(faults, 'layers.rungs', layers.rungs, ['label', 'summary'], true)
  }

  const roles = new Set(entries(faults, 'productRoles', data.productRoles, ['label'], false).map((r) => r.id))
  const groups = new Set(entries(faults, 'productGroups', data.productGroups, ['label'], false).map((g) => g.id))

  for (const product of entries(faults, 'products', data.products, ['name'], true)) {
    const id = String(product.id)
    if (!groups.has(product.group)) faults.push(`products ${id} names an unknown group ${String(product.group)}`)
    const played = product.roles
    if (!Array.isArray(played)) faults.push(`products ${id} roles must be a list`)
    else for (const role of played) if (!roles.has(role)) faults.push(`products ${id} names an unknown role ${role}`)
    for (const field of ['maker', 'note'])
      if (product[field] !== undefined && !text(product[field])) faults.push(`products ${id} ${field} must be text`)
  }

  return faults
}

/** The element ids the page must carry, one per term, rung and product, so a dropped entry is caught in dist/. */
export const expectedAnchors = (data: unknown): string[] => {
  if (!isRecord(data)) return []
  const ids = (list: unknown, prefix: string): string[] =>
    Array.isArray(list) ? list.filter(isRecord).map((entry) => `${prefix}-${String(entry.id)}`) : []
  const layers = isRecord(data.layers) ? data.layers.rungs : undefined
  return [...ids(data.terms, 'term'), ...ids(layers, 'layer'), ...ids(data.products, 'product')]
}
