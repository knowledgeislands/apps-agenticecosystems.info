# Agentic Ecosystems

Agentic Ecosystems is a public reference map of agentic systems at [agenticecosystems.info](https://agenticecosystems.info): the terms the field uses, the layers from the machine up to the model, and the products that play each part. It is a Knowledge Islands microsite.

## Place in the Knowledge Islands ecosystem

The site is not the canonical source of the map. The knowledge is planned to live in [Knowledge Islands Principal](https://github.com/knowledgeislands/ki-principal), as the Agentic Ecosystems knowledge graph in `Resources/Agentic Ecosystems/`, layered under the terms of the [KI Agent Backpack](https://github.com/knowledgeislands/ki-agent-backpack)'s `ki-agentic-systems` skill. The page renders one data file, [`apps/site/src/_data/ecosystem.json5`](apps/site/src/_data/ecosystem.json5), which a later sync replaces from that home.

This first cut is a seed: every entry is a placeholder drawn from the plan for the map, and the page says so.

## Working on the site

```bash
bun install
bun run ki:site:dev    # Tailwind watch + Eleventy serve on http://localhost:3000
bun run ki:site:build  # compile the site to apps/site/dist/
bun run test
```

Deployment is described in [the Cloudflare guide](docs/guides/developer/cloudflare.md).
