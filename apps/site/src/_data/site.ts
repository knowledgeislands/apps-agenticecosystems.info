/**
 * The site's identity and its navigation, in reading order: the reference pages, all generated from the backpack's
 * knowledge map.
 *
 * The navigation is listed here rather than in the template, so the header and every page share one ordering. The
 * home page's sections are addressed from the root, so they work from any page.
 */
const site = {
  title: 'Agentic Ecosystems',
  url: 'https://agenticecosystems.info',
  description:
    'A public reference map of agentic ecosystems: the terms, the specifications and the products, and what each product can do, every fact sourced and dated.',
  parent: { label: 'a Knowledge Islands microsite', href: 'https://knowledgeislands.info' },
  nav: [
    { label: 'Overview', href: '/overview/' },
    { label: 'Glossary', href: '/glossary/' },
    { label: 'Specifications', href: '/specifications/' },
    { label: 'Products', href: '/#products' },
    { label: 'Matrix', href: '/matrix/' },
    { label: 'Crosswalk', href: '/crosswalk/' },
    { label: 'How to read', href: '/how-to-read/' }
  ]
}

export default site
