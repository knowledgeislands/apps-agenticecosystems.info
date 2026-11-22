# Sources for the diagrams

Every label comes from the `ki-agentic-ecosystems` knowledge map in the KI Agent Backpack at commit `9177e3080f4f38ebbfc8a2c1fc30d89313a58879` (22 November 2026), the commit the site's snapshot `apps/site/src/_data/ecosystemMap.json5` is now generated from. The content and placement of each image follow `docs/design/image-brief.md`.

Card paths are relative to `skills/keystone/ki-agentic-ecosystems/knowledge/`. The term, specification and vendor cards are agreed. The product cards and the bot card are proposals, which is why the counts and the bot carry "Draft".

## layers-stack

| Label | Card |
| --- | --- |
| Reading order, model to client | `SKILL.md` (industry cards, read in order); snapshot `glossary` order |
| Model: decides; acts on nothing alone | `industry/industry.model.md` |
| Agent harness: turns the model into an agent | `industry/industry.agent-harness.md` |
| Agent: a model working through a harness | `industry/industry.agent.md` |
| Session: one run of an agent | `industry/industry.session.md` |
| Execution environment: where tool calls run | `industry/industry.environment.md` |
| Machine: a computer, physical or virtual | `industry/industry.machine.md` |
| Agent host: runs harnesses, owns sessions; not the machine or the environment, though it may provide one | `industry/industry.agent-host.md`, `industry/industry.environment.md` |
| Client: a window onto a session | `industry/industry.client.md` |

## ecosystem-map

| Label | Source |
| --- | --- |
| Parts and their counts | snapshot `glossary[].instances`: the product cards' "an instance of" links (`products/*.md`) |
| Model as the base every part builds on | `industry/industry.model.md` |
| The specifications and how many products conform | snapshot `specifications[].conforming` (`specs/*/spec.*.md`, product cards' `dcterms:conformsTo`) |
| Where each specification sits | image brief 3.6; `specs/mcp/spec.mcp.md`, `specs/acp/spec.acp.md`, `specs/ahp/spec.ahp.md`, `specs/a2a/spec.a2a.md`, `specs/agent-skills/spec.agent-skills.md` |
| Bot: a durable, named agent with its own memory and processes, which its host keeps and wakes | `system/system.bot.md` (proposal) |

## crosswalk

| Label | Source |
| --- | --- |
| Session: one run of an agent, its context, record and place | `industry/industry.session.md` |
| Each vendor's words and matches | snapshot `crosswalk` for `session`, from `vendors/anthropic/anthropic.session.md`, `anthropic.conversation.md`, `vendors/openai/openai.chat.md`, `openai.task.md`, `openai.thread.md`, `vendors/google/google.session.md`, `google.conversation.md`, `vendors/microsoft/microsoft.agent-session.md`, `microsoft.chat.md` |
| The key's four matches and their meanings | `_graph.md` link vocabulary; the site's crosswalk key (`crosswalk.njk`) |

## product-card-anatomy

| Label | Source |
| --- | --- |
| The four parts and their order | `references/standard-product-cards.md` 4.3; the site's `products.njk` |
| Columns term, value, detail, sources; values yes, partial, no, unknown | `references/standard-product-cards.md` 4.4 |
| The glyphs (filled, half-filled, empty circle, question mark) | the site's `macros/map.njk` `valueGlyph` |
| State of play dated, newest first, added never rewritten | `references/standard-product-cards.md` 4.3 |
| Sources each with the date read | `references/standard-product-cards.md` 4.3, 4.5 |
| Row terms Model, Skill, Channel, A2A | capability rows 1, 5, 12 and 16 of the standard; the values beside them are illustrative, not any product's |

## roles

| Label | Card |
| --- | --- |
| Client: a window onto a session | `industry/industry.client.md` |
| Agent host owns the sessions and runs the harnesses | `industry/industry.agent-host.md` |
| Agent harness runs the session; turns a model into an agent | `industry/industry.session.md`, `industry/industry.agent-harness.md` |
| Subagent: started by the agent for part of its work, returning the result | `industry/industry.subagent.md` |
| Agent team: several sessions messaging each other | `industry/industry.agent-team.md` |
| Bot: a named agent its host keeps and wakes | `system/system.bot.md` (proposal) |

## protocols

| Label | Card |
| --- | --- |
| AHP: client and agent host; several clients share sessions and the same live state | `specs/ahp/spec.ahp.md` |
| ACP: client and agent; any editor drives any coding agent, which it launches | `specs/acp/spec.acp.md` |
| Agent Skills: a folder with a SKILL.md; any harness loads it by progressive disclosure | `specs/agent-skills/spec.agent-skills.md`, `spec.agent-skills.progressive-disclosure.md` |
| MCP: agent harness and MCP server; servers offer tools and data | `specs/mcp/spec.mcp.md`, `industry/industry.tool.md` |
| A2A: agent and remote agent in another system; memory and tools unseen | `specs/a2a/spec.a2a.md`, `industry/industry.remote-agent.md` |

## names-senses (optional)

Generated from the snapshot `crosswalk`: every vendor word listed as a narrower match under two or more terms, from the vendor-name cards `vendors/anthropic/anthropic.claude.md`, `anthropic.claude-code.md`, `vendors/openai/openai.codex.md`, `openai.chatgpt.md`, `vendors/google/google.gemini.md` and `vendors/microsoft/microsoft.copilot.md`.
