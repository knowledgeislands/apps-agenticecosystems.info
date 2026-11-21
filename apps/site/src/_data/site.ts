/**
 * The site's identity and its one page's navigation, in reading order.
 *
 * The page's sections are listed here rather than in the template, so the header, the sitemap and any later page
 * share one ordering.
 */
const site = {
  title: 'Agentic Ecosystems',
  url: 'https://agenticecosystems.info',
  description:
    'A public reference map of agentic systems: the terms, the layers and the products, and what each product can do.',
  parent: { label: 'a Knowledge Islands microsite', href: 'https://knowledgeislands.info' },
  nav: [
    { label: 'Terms', href: '#terms' },
    { label: 'Layers', href: '#layers' },
    { label: 'Products', href: '#products' }
  ]
}

export default site
