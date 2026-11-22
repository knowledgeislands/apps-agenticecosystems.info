# Agentic Ecosystems

Agentic Ecosystems is a public reference map of agentic ecosystems at [agenticecosystems.info](https://agenticecosystems.info): the terms the field uses, the specifications that connect its parts, and the products that play each part. It is a Knowledge Islands microsite.

## Place in the Knowledge Islands ecosystem

The site is not the canonical source of the map. The knowledge lives in the [KI Agent Backpack](https://github.com/knowledgeislands/ki-agent-backpack), as the `ki-agentic-ecosystems` skill's knowledge map: the industry's terms, each vendor's own words for them, and one card per product with its capabilities, its dated state of play and its sources.

Every page is generated from that map: the home page, an overview of the parts and the products that play them, a reading note, a glossary with a page per term, the specifications with their parts, the capability matrix, the crosswalk and a page per product. A sync reads the cards at one pinned backpack commit into a vendored snapshot, [`apps/site/src/_data/ecosystemMap.json5`](apps/site/src/_data/ecosystemMap.json5), so the build never reaches the network; a drift check regenerates it from the same commit and fails on any difference. Every product fact cites its source and the date it was read, and while the product cards are proposals every page says it is a draft.

The diagrams are drawn by Limner, Knowledge Islands' designer, from [the image brief](docs/design/image-brief.md); each page shows its image once the file lands.

## Working on the site

```bash
bun install
bun run ki:site:dev    # Tailwind watch + Eleventy serve on http://localhost:3000
bun run ki:site:build  # compile the site to apps/site/dist/
bun run test
```

To bring in newer cards, resync at a backpack commit and check the result:

```bash
bun run --cwd apps/site sync:ecosystem-map -- --ref <40-character commit> [--from <backpack checkout>]
bun run --cwd apps/site check:ecosystem-map -- [--from <backpack checkout>]
```

Without `--from`, both fetch the one commit from GitHub.

Deployment is described in [the Cloudflare guide](docs/guides/developer/cloudflare.md).
