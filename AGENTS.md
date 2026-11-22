# AGENTS.md — Agentic Ecosystems

Always-loaded orientation for an agent working in this repo, whichever runtime you are. [README.md](README.md) has the full picture; this file is the short anchor.

## What this repo is

The Agentic Ecosystems microsite at `agenticecosystems.info`: a public reference map of agentic ecosystems, their terms, specifications and products. It is built with the house web stack, Eleventy 3, Nunjucks, TypeScript on Bun and config-less Tailwind 4, into a portable `apps/site/dist/` that a Cloudflare Worker serves.

## Working here

- **The site is not the canonical source.** The map's knowledge lives in the KI Agent Backpack, as the `ki-agentic-ecosystems` skill's knowledge map (`skills/keystone/ki-agentic-ecosystems/knowledge/`): one card per product beside the term and vendor cards. Change a card there and resync, rather than writing facts into templates.
- **Every page is generated.** `apps/site/scripts/sync-ecosystem-map.ts` reads the cards and the skill's product cards standard at one pinned 40-character backpack commit and writes the vendored snapshot `apps/site/src/_data/ecosystemMap.json5`, which every page renders: the home page, `/overview/`, `/how-to-read/`, `/glossary/` with a page per term, `/specifications/`, `/matrix/`, `/crosswalk/` and `/products/<slug>/`. Never edit the snapshot; resync with `bun run --cwd apps/site sync:ecosystem-map -- --ref <commit> [--from <backpack checkout>]`. `check:ecosystem-map` is the drift check: it regenerates from the pinned commit and fails on any difference. While the product cards are proposals, every page says "Draft, as of" their latest review date.
- **One gate guards the build.** `verify:ecosystem-map` validates the snapshot and checks that every generated page renders each product, cell, term, specification and source, with the draft label and the footer's link to knowledgeislands.info.
- **Images are the designer's.** Limner commits the diagrams to `apps/site/src/assets/images/diagrams/` (light and dark SVGs, alt text in its README) and editable sources to `docs/design/`, from the brief in `docs/design/image-brief.md`. Templates mark each image with an `imageSlot`, which renders only once its file exists; never write to the diagrams folder.
- **The repository contract** is declared in `.ki.toml`; `ki repo audit --repo .` is the gate. The website seam, the Eleventy layout, the Cloudflare hosting and the toolchain each follow their declared skill.
- **The repo shape mirrors the KI Website** (`knowledgeislands/apps-knowledgeislands.info`): a Bun workspace monorepo with the site in `apps/site`, dependency boundaries in `.dependency-cruiser.ts` proved by the Vitest workspace `packages/boundaries/` through the isolated checker at `tooling/depcruise/`, and Turborepo owning the task graph.
- **Hosting**: `apps/site/wrangler.jsonc` declares the Worker `info-agenticecosystems` with the custom domains `agenticecosystems.info` and `www.agenticecosystems.info`. Never run `ki:site:deploy` or `ki:site:upload` without the owner's explicit authority; both change Cloudflare.

## Toolchain

```bash
bun install            # install deps and bind the commit hooks
bun run ki:site:dev    # Tailwind watch + Eleventy serve on http://localhost:3000
bun run ki:site:build  # compile the site to apps/site/dist/
bun run ki:site:clean  # remove dist/ and local Wrangler state
bun run test           # the site's suites and the boundary proof
ki repo audit --repo . # the repository gate
```

## Commits

Commits follow `ki-git`. If a unit cannot yet be verified, report the checkpoint and leave it uncommitted until its verification is complete.

## Cross-repository choreography

Knowledge Islands repositories hand work and rollouts to one another as a line in the receiving work's `messages.md`, never as a record in one another's roadmap or triage, as Kris set under HANDOFF-AS-MESSAGE on 2026-10-20. The receiving repository owns its priority, plan and execution.
