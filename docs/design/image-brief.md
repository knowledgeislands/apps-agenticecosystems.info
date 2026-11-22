# Image brief

A brief for Limner, the designer, for the diagrams that help a reader understand agenticecosystems.info. Kris asked for it on 22 November 2026 (ECOSYSTEMS-SITE, ki.summit change 21): "some images and things like that that supplement the understanding of it all". Six images are planned, agreed with Limner, each with its purpose, its content and where it goes on the site.

## Contents

- [1. How the images reach the site](#1-how-the-images-reach-the-site)
- [2. Ground rules](#2-ground-rules)
- [3. The images](#3-the-images)
  - [3.1 layers-stack: the layers stack](#31-layers-stack-the-layers-stack)
  - [3.2 ecosystem-map: the ecosystem map at a glance](#32-ecosystem-map-the-ecosystem-map-at-a-glance)
  - [3.3 crosswalk: the crosswalk picture](#33-crosswalk-the-crosswalk-picture)
  - [3.4 product-card-anatomy: a product card's anatomy](#34-product-card-anatomy-a-product-cards-anatomy)
  - [3.5 roles: how the roles relate](#35-roles-how-the-roles-relate)
  - [3.6 protocols: which protocols connect which parts](#36-protocols-which-protocols-connect-which-parts)

## 1. How the images reach the site

- **The files.** Each image is two SVGs in `apps/site/src/assets/images/diagrams/`, `<name>-light.svg` and `<name>-dark.svg`, the names below. Editable sources go in `docs/design/`. Limner owns both folders; the site's templates never write to them.
- **Alt text** goes in that folder's `README.md`, one `## <name>` heading per image with its alt text as the paragraph under it. The site reads it from there; until it does, each slot carries a fallback alt text of its own.
- **The slots.** Each template marks its slot with `{% imageSlot "<name>", "<fallback alt>" %}`. A slot renders only once `<name>-light.svg` exists, so the build passes before the images land; the dark file is shown under `prefers-color-scheme: dark` when it exists. Nothing else needs changing to bring an image in.

## 2. Ground rules

- **Draw only what the cards say.** The site is generated from the `ki-agentic-ecosystems` skill's knowledge map in the KI Agent Backpack. Every label is a term, specification or product from those cards, in their words; the pages to read are named under each image.
- **Draft.** The cards are drafts until Kris reviews them. Leave product names out where an image works without them, so a changed card does not stale the picture; where products appear, they are examples.
- **Light and dark.** Both versions read alone, at phone width as well as desktop, with no text smaller than the page's body text at 375 pixels wide.

## 3. The images

### 3.1 layers-stack: the layers stack

- **Purpose.** Show how an agentic system is built up, so a reader holds the whole stack before reading any one term.
- **Content.** The industry's terms in reading order, from the model at the base: the model, the agent harness that turns it into an agent, the agent, the session, the execution environment the session's tool calls run in, the machine it runs on, the agent host that owns sessions, and the client, a window onto them. Mark that the agent host is distinct from the machine and the execution environment. Read the [overview](https://agenticecosystems.info/overview/#layers) and each term's glossary page.
- **Where.** The overview page, top of "The parts, from the model up".

### 3.2 ecosystem-map: the ecosystem map at a glance

- **Purpose.** Give a first-time visitor the whole map on one picture: what parts there are and how many products fill each.
- **Content.** The parts products play, from the overview's "The parts products play" (the terms product cards say they are instances of: model, agent harness, agent host, client and others), the specifications that join them, and the bot as Knowledge Islands' word for a durable, named agent. Products, if drawn, are examples from the home page's product list.
- **Where.** The home page, in the hero.

### 3.3 crosswalk: the crosswalk picture

- **Purpose.** Explain what the crosswalk shows before the reader meets the table: one industry term, several vendors' words for it.
- **Content.** One term, the session, beside the words Anthropic, OpenAI, Google and Microsoft use for it, each word marked with how it matches: exact, close, narrower or related, the crosswalk's key. Read the [crosswalk](https://agenticecosystems.info/crosswalk/) and the session's glossary page for the words and matches.
- **Where.** The top of `/crosswalk/`.

### 3.4 product-card-anatomy: a product card's anatomy

- **Purpose.** Teach the reader to read a product page: what each part is and where the evidence sits.
- **Content.** A product card's parts, labelled: what it is and who makes it; the capabilities table, its columns term, value, detail and sources, and the four values yes, partial, no and unknown with the matrix's glyphs; the dated state of play, newest first; and the sources, each with the date it was read. Read [How to read this](https://agenticecosystems.info/how-to-read/) and any product page.
- **Where.** The "How to read this" note, and each product page above its capabilities table.

### 3.5 roles: how the roles relate

- **Purpose.** Show how the parts work together at run time, where the layers stack shows how they build up.
- **Content.** A client is a window onto a session an agent host owns; the agent host runs agent harnesses; each harness turns a model into an agent; a subagent is started by an agent for part of its work; an agent team is several sessions messaging each other; a bot is a named agent its host keeps and wakes. Read the glossary pages for client, agent host, agent harness, subagent, agent team and bot.
- **Where.** The overview page, top of "The parts products play".

### 3.6 protocols: which protocols connect which parts

- **Purpose.** Show which open specification sits between which two parts, so a reader can place MCP, ACP, AHP, A2A and Agent Skills at a glance.
- **Content.** Each specification as a connection, in its card's words: MCP between an agent's harness and the servers offering its tools; ACP between a client and an agent; AHP between a client and an agent host; A2A between an agent and a remote agent; and Agent Skills as what an agent harness loads, by progressive disclosure. Read the [specifications page](https://agenticecosystems.info/specifications/), each specification and its parts.
- **Where.** The top of `/specifications/`.
