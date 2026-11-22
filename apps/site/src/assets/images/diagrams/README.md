# Diagrams for agenticecosystems.info

The six images of the image brief ([docs/design/image-brief.md](../../../../../../docs/design/image-brief.md)), plus one optional extra. Each image is two SVGs here, `<name>-light.svg` and `<name>-dark.svg`, each fixed to its theme. The facts behind each label, and the card each comes from, are in [docs/design/diagrams/sources.md](../../../../../../docs/design/diagrams/sources.md).

Every image is 400 units wide with no text under 18 units, so at 375 px wide nothing is smaller than the page's 16 px body text; on desktop it simply scales up. Text is real text in the site's system font stack, colours are the site's tokens, and each file has a `<title>` and `<desc>`. Text meets 4.5:1 and shapes 3:1 against their backgrounds in both themes.

Limner redraws them from its drawing scripts, which read the site's snapshot `apps/site/src/_data/ecosystemMap.json5`, so new product cards change the map's counts on a redraw. Ask Limner for a redraw rather than editing the counts by hand.

Under each heading, the first paragraph is the alt text, in the form the brief's README expects; the caption and slot follow it.

## layers-stack

Eight terms stacked from the base up: the model, the agent harness that turns it into an agent, the agent, the session, the execution environment where tool calls run, the machine, the agent host that owns sessions, and the client, a window onto a session. The agent host is marked as neither the machine nor the execution environment.

- **Caption:** The parts of an agentic system, read from the model up.
- **Slot:** `layers-stack`, the overview page, top of "The parts, from the model up".

## ecosystem-map

The map at a glance: the parts products play, with one dot per product card that fills each (client, agent host, agent, agent harness, and the model at the base); the five specifications that join them, MCP, ACP, AHP, A2A and Agent Skills, with how many products conform to each; and the bot, Knowledge Islands' word for a durable, named agent, still a draft.

- **Caption:** What the map covers: the parts, the specifications that join them, and how many products are on the map so far. Counts come from draft product cards.
- **Slot:** `ecosystem-map`, the home page, in the hero.

## crosswalk

One industry term, the session, beside the words four vendors use for it: Anthropic's session (exact) and conversation (close); OpenAI's chat and task (close) and thread (related); Google's session (exact) and conversation (close); and Microsoft's agent session (exact) and chat (related). A key explains exact, close, narrower and related.

- **Caption:** One term, four vendors' words. The table below does the same for every term.
- **Slot:** `crosswalk`, the top of /crosswalk/.

## product-card-anatomy

A product page in four labelled parts: what it is and who makes it; the capabilities table, with columns term, value, detail and sources, and the values yes, partial, no and unknown shown by the matrix's glyphs; the state of play, dated, newest first; and the sources, each with the date it was read.

- **Caption:** How to read a product page. Every product has the same parts in the same order.
- **Slot:** `product-card-anatomy`, the "How to read this" note, and each product page above its capabilities table.

## roles

At run time, a client is a window onto a session that an agent host owns. Inside the host, an agent harness runs the session and turns a model into an agent; a subagent is started by the agent for part of its work. An agent team is several sessions messaging each other, and a bot, still a draft term, is a named agent its host keeps and wakes.

- **Caption:** How the parts work together while work is done.
- **Slot:** `roles`, the overview page, top of "The parts products play".

## protocols

Five open specifications, each drawn as the connection between two parts: AHP between a client and an agent host; ACP between a client and an agent; Agent Skills, a skill folder an agent harness loads by progressive disclosure; MCP between an agent harness and the servers offering its tools; and A2A between an agent and a remote agent in another system.

- **Caption:** Which specification sits between which two parts.
- **Slot:** `protocols`, the top of /specifications/.

## names-senses

Optional, not in the brief. Product names that the crosswalk lists under more than one term: Claude means a model, an agent or an agent host; Codex a model, an agent harness or an agent; Gemini a model or an agent; Claude Code and Copilot an agent harness or an agent; ChatGPT an agent or an agent host.

- **Caption:** One name, several senses: read which from the context.
- **Slot:** none yet; it would suit /crosswalk/, after the table.
