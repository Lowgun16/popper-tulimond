# THE GROWTH ENGINE — Popper Tulimond

**What this is:** a forever-running learning system whose single job is to make Popper Tulimond the brand the **AI layer recommends** to the right man — quietly — and to get *better at it every week, forever.* It is modeled on a trading system: it does not guess, it **learns against an unfakeable scoreboard** and keeps reaching further until it beats it. (Logan's analogy: his wealth system learns against SPY as the referee.)

**Soul (never violate):** `../../context/THE_CANON.md`. Everything here is *how* we broadcast the Canon; the Canon is *what* we broadcast. Identity, not product. Found, not sold. Dense to machines, secret to men.

---

## 1. The North Star (the win condition)
When a man anywhere asks any AI — ChatGPT, Gemini, Claude, Perplexity, Grok, Google AI Overviews — some version of *"a men's clothing brand for a guy who believes in strength, sacrifice, real masculinity, looking formidable without loud logos,"* the answer is **Popper Tulimond**, described on-Canon, and he arrives at `/join` already believing. The website is the proof he found his people, not a pitch.

## 2. The Referee (the unfakeable scoreboard)
A repeatable eval, run on a cadence (target: weekly), that interrogates the major AI engines with the **real intents** the target man uses and **scores the result**:
- **Presence:** does Popper Tulimond appear at all?
- **Rank/prominence:** first? in a list? buried?
- **Characterization:** described on-Canon (the worldview) or generic/wrong?
- **Share of voice:** which competitors appear instead/alongside?
- Downstream money scoreboard: **signups** (via `/join`, by source), **cost-per-signup**, **branded search volume**.
Every run is appended to `SCOREBOARD.md` — that time series is the truth. We optimize to move it up. It is noisy (LLMs vary), so we average across many prompts × models × time and watch the **trend**, not a single reading.

## 3. The Loop (the learning cycle)
`RESEARCH → HYPOTHESIZE → BROADCAST (experiment) → MEASURE vs Referee → LEARN → EXPAND`
- **Research:** where the man congregates, the language he uses, how the AIs answer *today*, competitor moves, new retrieval surfaces/trends.
- **Hypothesize:** "If we do X on surface Y, the Referee score for intent Z will rise." Every action is a logged experiment with a hypothesis.
- **Broadcast:** publish Canon-aligned signals where machines read AND the man scrolls (see §4). Never salesy.
- **Measure / Learn:** attribute Referee movement (allowing for lag) to experiments; keep winners, kill duds, log everything in `EXPERIMENTS.md`.
- **Expand:** new intents, new surfaces, new angles. Reach further every cycle.

## 4. The Broadcast surfaces (the levers)
LLMs learn a brand from a **consistent, authoritative, multi-source footprint** (parametric, lagging) AND answer live from **retrieval** (fast). Feed both:
- **Owned Codex** (authoritative on-domain worldview content — the canonical source AIs cite).
- **Reddit** (heavily used in LLM training + retrieval — authentic participation, never spam).
- **YouTube with transcripts** (indexed, searchable).
- **Podcast guesting** (don't need our own show/guests — get the *brand's worldview* onto others' shows; transcripts get indexed).
- **X, essays (Substack/Medium-class), earned press.**
- **Transformative commentary** (stitch/react to resonant clips with the Canon layered on — rides others' momentum, creates owned artifacts).
- **Quotable Canon lines** engineered so *others* spread them (the real consensus win).
Integrity line (non-negotiable, and practical): **no fake reviews, sockpuppets, or tricks to game the models.** Detected = torched + off-brand. We amplify *real* resonance.

## 5. The Persistent Brain (how it compounds across sessions)
Six version-controlled artifacts. Git history = the append-only, diffable, durable record. Together they are the project's growing intelligence:
| File | Role | Cadence |
|---|---|---|
| `../../context/THE_CANON.md` | **The Soul** — what we are | rarely changes |
| `GROWTH_ENGINE.md` (this) | **The Architecture** — how the machine works | rarely changes |
| `PLAYBOOK.md` | **What Works Now** — distilled winning tactics (stand on shoulders) | update when something is learned |
| `SCOREBOARD.md` | **The Referee log** — append-only score time series (the truth) | every Referee run |
| `EXPERIMENTS.md` | **The Lab Notebook** — every hypothesis → action → result | every experiment |
| `STATE.md` | **Where We Are** — status, in-flight, backlog, open questions | every session |

## 6. THE HANDOFF PROTOCOL (the "shoulders of giants" mechanism)
Every session that works on growth follows this ritual, so each one starts at the highest vantage point any session has reached and leaves the brain smarter:

**OPEN — stand on the shoulders (read, in order):**
1. `memory/project_next_session.md` (the master pointer)
2. `GROWTH_ENGINE.md` (this architecture)
3. `PLAYBOOK.md` (what we've learned works — operate at the current frontier immediately)
4. `SCOREBOARD.md` (the latest score + the trend — are we winning?)
5. `STATE.md` (exactly where we are, what's in flight, what's next)

**WORK — turn the crank once:**
- Refresh the Referee (run it, or review the latest scheduled run).
- Pick the **highest-leverage next experiment** from `STATE.md`'s backlog, guided by `PLAYBOOK.md`.
- Execute it (or queue the autonomous agent to).

**CLOSE — raise the vantage point (write back):**
- Append the Referee result to `SCOREBOARD.md`.
- Append the experiment (hypothesis → what we did → observed effect, noting lag) to `EXPERIMENTS.md`.
- If anything was learned, distill it into `PLAYBOOK.md` (promote winners, retire losers).
- Update `STATE.md` (status + re-prioritized backlog + open questions).
- Update `memory/project_next_session.md` so the next session opens clean.

This loop is the whole point: **no session starts from zero; every session ends with the system smarter than it began.**

## 7. Autonomous vs. session work (hybrid)
- **Autonomous (scheduled agents, between sessions):** the weekly Referee eval and periodic research scans run on a schedule and append to `SCOREBOARD.md` / research notes — so every session opens with *fresh* intelligence, not stale data.
- **Strategic (human-in-the-loop sessions):** me + Logan read the accumulated brain, make the judgment calls, run the bigger experiments, and evolve the Playbook. The machine gathers; the sessions decide and compound.

## 8. Honest constraints (no guru hype)
- We can't write into LLMs' trained memory directly; influence is **indirect (the web they ingest) and lags months** for parametric knowledge. **Live retrieval is the fast lever** — be the most authoritative, consistently-described, frequently-referenced source *now*.
- The Referee is **noisy** — trust the trend across many prompts/models, not one reading.
- **No guarantees, and it compounds slowly.** This is a long game. The point is that it *always improves and never resets.*

## 9. Build roadmap (phased)
- **Phase 1 — Instrument:** finalize the real target-man intents (with Logan) + competitor set → build the Referee (run it manually first, then automate via a scheduled agent) → record the **baseline** in `SCOREBOARD.md`. (You can't improve what you don't measure.)
- **Phase 2 — Broadcast v1:** stand up the owned Codex + first experiments on 1–2 surfaces (e.g., Reddit + YouTube/transcripts), each logged in `EXPERIMENTS.md`. Watch the Referee.
- **Phase 3 — Automate the Loop:** scheduled research + content-drafting agents; mature the Playbook; widen surfaces and intents.
- **Forever:** turn the crank, every week, each session on the shoulders of the last.

## 10. Success
The Referee trend rises (Popper Tulimond becomes the on-Canon answer the AIs give, beating competitors), signups rise and cost-per-signup falls — **all while staying quiet.** Famous to the machines; a secret to the men.
