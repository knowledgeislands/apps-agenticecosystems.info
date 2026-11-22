import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import type { UserConfig } from '@11ty/eleventy'
import JSON5 from 'json5'

// ─── Eleventy config ──────────────────────────────────────────────────────────

export default function (eleventyConfig: UserConfig) {
  // The build runs from the apps/site workspace (cwd = apps/site), which owns dist/.
  const outputRoot = resolve(process.cwd(), 'dist')

  // ── Relative URL helper ──────────────────────────────────────────────────
  // Converts absolute internal URLs to relative paths from the current output
  // file. This makes the dist/ folder fully portable (no assumed root).
  const toRelativeOutputUrl = (url: string, outputPath: string): string => {
    if (!url.startsWith('/')) return url
    if (url.startsWith('//')) return url

    // A fragment is addressed within the target document, so it is set aside
    // before the path is resolved and reattached afterwards.
    const hash = url.indexOf('#')
    const fragment = hash < 0 ? '' : url.slice(hash)
    const path = hash < 0 ? url : url.slice(0, hash)

    // Make internal page URLs explicit to avoid directory-index assumptions.
    let normalized = path
    if (normalized === '/') normalized = '/index.html'
    else if (normalized.endsWith('/')) normalized = `${normalized}index.html`

    const fromDir = dirname(outputPath)
    const targetPath = resolve(outputRoot, `.${normalized}`)
    const rel = relative(fromDir, targetPath).split(sep).join('/')
    return `${rel || './'}${fragment}`
  }

  // ── Passthrough copies ───────────────────────────────────────────────────
  eleventyConfig.addPassthroughCopy('src/assets/images')
  eleventyConfig.addPassthroughCopy({ 'src/site.webmanifest': 'site.webmanifest' })

  const isPage = (path: string | undefined): path is string => !!path?.endsWith('.html')

  // ── Transform: inject external-link icons ────────────────────────────────
  // Marks any prose <a href="https://..."> link with an external-link glyph.
  // The SVG is inlined rather than drawn by an icon runtime: the marker is
  // decorative, and a client-side library for one glyph would be a script and a
  // dependency the page does not otherwise need. Sized in em so it tracks the
  // surrounding type; styled by .ext-icon.
  const externalLinkIcon =
    '<svg class="ext-icon" width="0.85em" height="0.85em" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
    ' stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/>' +
    '<path d="M15 3h6v6"/><path d="M11 13 21 3"/></svg>'

  eleventyConfig.addTransform('external-link-icons', (content: string, outputPath: string | undefined) => {
    if (!isPage(outputPath)) return content
    return content.replace(
      /<a\s+([^>]*href="https?:\/\/[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi,
      (match, attrs: string, inner: string) => {
        // A link marked data-plain, such as a source citation in the matrix, stays bare: an icon on each would bury it.
        if (/class="ext-icon"/.test(inner) || /\sdata-plain\b/.test(` ${attrs}`)) return match
        return `<a ${attrs}>${inner}${externalLinkIcon}</a>`
      }
    )
  })

  // ── Transform: rewrite absolute links to relative ────────────────────────
  // Ensures href/src attributes pointing at absolute internal paths are
  // rewritten to relative paths, making dist/ portable without a web server.
  eleventyConfig.addTransform('explicit-index-links', (content: string, outputPath: string | undefined) => {
    if (!isPage(outputPath)) return content
    return content.replace(
      /(\s(?:href|src)=)(["'])([^"']+)(\2)/gi,
      (_match, prefix: string, quote: string, url: string) => {
        if (/^(?:https?:|mailto:|tel:|javascript:|data:|#)/i.test(url)) return `${prefix}${quote}${url}${quote}`
        return `${prefix}${quote}${toRelativeOutputUrl(url, outputPath)}${quote}`
      }
    )
  })

  // ── Tailwind CSS ─────────────────────────────────────────────────────────
  // In build mode, compile Tailwind as part of the Eleventy lifecycle so the
  // build script only needs to invoke Eleventy once. In serve/watch mode the
  // Tailwind --watch process runs in parallel (see the ki:site:dev script).
  eleventyConfig.on('eleventy.before', ({ runMode }: { runMode: string }) => {
    if (runMode !== 'serve' && runMode !== 'watch') {
      // bunx, not npx: Cloudflare Workers Builds installs with Bun, so npm cannot
      // resolve the Tailwind executable there.
      execSync('bunx tailwindcss -i src/assets/css/main.css -o dist/assets/css/main.css --minify', { stdio: 'inherit' })
    }
  })
  // Watch the compiled CSS so the dev server reloads the browser whenever
  // the Tailwind --watch process writes a new dist/assets/css/main.css.
  eleventyConfig.addWatchTarget('dist/assets/css/main.css')

  // ── Data extension: TypeScript ───────────────────────────────────────────
  // Allows .ts files in src/_data/ to be used as global data files. Mirrors
  // Eleventy's built-in JS handling: calls the export if it's a function (sync
  // or async), otherwise uses the value directly.
  eleventyConfig.addDataExtension('ts', {
    read: false,
    parser: async (filePath: string) => {
      const mod = (await import(filePath)) as { default: unknown }
      const data = mod.default
      return typeof data === 'function' ? await (data as () => unknown)() : data
    }
  })

  // ── Data extension: JSON5 ────────────────────────────────────────────────
  // Allows .json5 files in src/_data/ to be used as global data files. The
  // ecosystem map arrives this way, so a later sync from its canonical home
  // replaces one data file and touches no template.
  eleventyConfig.addDataExtension('json5', {
    read: false,
    parser: (filePath: string) => JSON5.parse(readFileSync(filePath, 'utf-8')) as unknown
  })

  // ── Filters ──────────────────────────────────────────────────────────────

  // whereEq - the items of an array whose key equals a value:
  // {% for term in ecosystemMap.glossary | whereEq("kind", "industry") %}
  eleventyConfig.addFilter('whereEq', (arr: unknown, key: string, value: unknown) => {
    if (!Array.isArray(arr)) return []
    return arr.filter((item) => (item as Record<string, unknown>)[key] === value)
  })

  // labelFor - the label of the entry with an id, from a list of { id, label }:
  // {{ ecosystemMap.capabilities | labelFor(cell.id) }}
  eleventyConfig.addFilter('labelFor', (arr: unknown, id: string) => {
    if (!Array.isArray(arr)) return id
    const found = arr.find((item) => (item as { id?: unknown }).id === id) as { label?: string } | undefined
    return found?.label ?? id
  })

  // longDate - an ISO date as the page writes it: {{ "2026-11-22" | longDate }} → 22 November 2026
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ]
  eleventyConfig.addFilter('longDate', (iso: unknown) => {
    const match = typeof iso === 'string' ? iso.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null
    if (!match) throw new Error(`longDate expects YYYY-MM-DD, got ${String(iso)}`)
    return `${Number(match[3])} ${months[Number(match[2]) - 1]} ${match[1]}`
  })

  // ── Shortcode: image slot ────────────────────────────────────────────────
  // {% imageSlot "layers-stack", "fallback alt text" %} marks where one of the designer's diagrams goes. The images
  // live in src/assets/images/diagrams/ as <name>-light.svg and <name>-dark.svg, with alt text under a `## <name>`
  // heading in that folder's README.md, and its caption on a `- **Caption:**` line (docs/design/image-brief.md). The slot renders only once the light image
  // exists, so the build passes before the images land; until then it leaves only a comment in the page.
  const diagrams = 'src/assets/images/diagrams'
  /** The image's alt text, the first paragraph under its `## <name>` heading, and its `- **Caption:**` line. */
  const describe = (name: string, fallback: string): { alt: string; caption?: string } => {
    const readme = `${diagrams}/README.md`
    if (!existsSync(readme)) return { alt: fallback }
    const lines = readFileSync(readme, 'utf-8').split('\n')
    const start = lines.findIndex((line) => line.trim() === `## ${name}`)
    if (start === -1) return { alt: fallback }
    const rest = lines.slice(start + 1)
    const end = rest.findIndex((line) => line.startsWith('#'))
    const block = end === -1 ? rest : rest.slice(0, end)
    const paragraph: string[] = []
    for (const line of block) {
      if (line.trim() === '') {
        if (paragraph.length > 0) break
        continue
      }
      if (line.startsWith('- ')) break
      paragraph.push(line.trim())
    }
    const caption = block
      .find((line) => line.startsWith('- **Caption:**'))
      ?.replace('- **Caption:**', '')
      .trim()
    return { alt: paragraph.length > 0 ? paragraph.join(' ') : fallback, ...(caption ? { caption } : {}) }
  }
  const attr = (text: string): string =>
    text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  eleventyConfig.addShortcode('imageSlot', (name: string, fallbackAlt: string) => {
    if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`imageSlot: bad image name ${name}`)
    const light = `${diagrams}/${name}-light.svg`
    if (!existsSync(light)) return `<!-- image slot: ${name}, waiting for ${light} -->`
    const dark = existsSync(`${diagrams}/${name}-dark.svg`)
      ? `<source srcset="/assets/images/diagrams/${name}-dark.svg" media="(prefers-color-scheme: dark)" />`
      : ''
    const { alt, caption } = describe(name, fallbackAlt)
    return (
      `<figure class="diagram" id="figure-${name}"><picture>${dark}` +
      `<img src="/assets/images/diagrams/${name}-light.svg" alt="${attr(alt)}" loading="lazy" />` +
      `</picture>${caption ? `<figcaption>${attr(caption)}</figcaption>` : ''}</figure>`
    )
  })

  // ── Return the config ────────────────────────────────────────────────────

  return {
    dir: {
      input: 'src',
      output: 'dist',
      includes: '_includes',
      data: '_data'
    },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
    templateFormats: ['njk', 'md', 'html']
  }
}
