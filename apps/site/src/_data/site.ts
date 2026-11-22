/**
 * The site's identity and its navigation, in reading order: the home page's sections, then the pages generated from
 * the backpack's knowledge map.
 *
 * The navigation is listed here rather than in the template, so the header and every page share one ordering. The
 * home page's sections are addressed from the root, so they work from any page.
 */
const site = {
  title: 'Agentic Ecosystems',
  url: 'https://agenticecosystems.info',
  description:
    'A public reference map of agentic systems: the terms, the layers and the products, and what each product can do.',
  parent: { label: 'a Knowledge Islands microsite', href: 'https://knowledgeislands.info' },
  nav: [
    { label: 'Terms', href: '/#terms' },
    { label: 'Layers', href: '/#layers' },
    { label: 'Products', href: '/#products' },
    { label: 'Matrix', href: '/matrix/' },
    { label: 'Crosswalk', href: '/crosswalk/' }
  ]
}

export default site
