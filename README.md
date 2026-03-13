# WireText

**You describe the UI. Claude builds the mock. You see it rendered.**

WireText is a lightweight markup language for UI mockups, designed for
Claude Code Desktop. Ask Claude for a dashboard, a signup flow, or a
five-screen onboarding journey and get a clickable prototype in seconds
-- right in your conversation. No design tool. No drag-and-drop. Just
words in, wireframes out.

```wiretext
screen: dashboard
theme: saas-light
use: [app-shell]
---
row
  stat MRR | $4,200 | +18%
  stat Active Users | 1,240 | +92
  stat Churn Rate | 2.1% | -0.4%
row
  data-table
    .columns Customer, Plan, MRR, Status
    .row Acme Corp -> customer-detail | Pro | $1,200 | Active*
    .row Globex Inc -> customer-detail | Starter | $89 | Active*
    .row Initech -> customer-detail | Pro | $890 | Churned
    .actions View -> customer-detail, Edit -> customer-edit, Delete -> #confirm-delete
  feed Team Activity
    item ~user Alice: Upgraded to Pro | 2h ago
    item ~credit-card New payment received | 5h ago
    item ~warning Initech payment failed | 1d ago

#confirm-delete
  modal Confirm Deletion
    alert This cannot be undone. | danger
    row 6, 6
      button Cancel -> !close
      button ~trash Delete+ -> dashboard
```

---

## The problem

You're building something. You need to show people what it looks like
before writing code. Your options:

- **Figma** -- powerful, but slow to set up, requires a designer, and
  your AI can't generate Figma files
- **ASCII art / markdown tables** -- fast, but unreadable past two boxes
- **Just start coding** -- expensive way to find out everyone imagined
  something different
- **Ask AI to generate HTML** -- looks great once, but when you need
  changes the AI regenerates the whole page, loses what worked, or
  drifts from your intent. There's no stable structure to iterate on.

WireText fixes the iteration problem. It's a lightweight markup that AI
generates reliably and modifies predictably -- change a line, not a page.
Because the structure is simple and declarative, Claude can swap a
component, add a screen, or rearrange a layout without losing context or
starting over. Mermaid did this for diagrams. WireText does it for
interfaces.

---

## Setup

### For Claude Code Desktop users (primary use case)

**Prerequisites:** Node.js 20+

```bash
git clone https://github.com/wiretext/wiretext
cd wiretext
npm install
npm run build
```

The `/wiretext` Claude skill lives at `skill/SKILL.md` in the project
root. When you open Claude Code Desktop from the WireText project
directory, the skill is automatically available.

To use the skill in **other** projects, symlink it into your Claude
skills directory:

```bash
ln -s /path/to/wiretext/skill ~/.claude/skills/wiretext
```

Then type `/wiretext` in Claude Code Desktop and describe the UI you
want. The skill generates WireText DSL, Claude runs the library via
`node dist/...` to produce HTML, and the result appears as an
interactive preview artifact in your conversation.

### For developers integrating the library

```bash
npm install wiretext  # once published to npm
```

```typescript
import { parseDocument, renderDocument } from "wiretext"

const { blocks, errors: parseErrors } = parseDocument(markdownWithWiretextBlocks)
const { html, errors: renderErrors } = renderDocument(blocks)
// html is a complete standalone HTML document
```

---

## How it works

**1. Ask Claude** -- describe what you need in plain language

> "Show me a settings page with profile, security, and billing tabs"

**2. Get WireText** -- the `/wiretext` skill generates structured DSL
blocks with layout and screen-to-screen navigation

**3. See it rendered** -- Claude Code Desktop runs the WireText library
(via bash/node) to produce a standalone HTML file, then displays it as
an interactive preview artifact inside your conversation

**4. Iterate** -- tell Claude what to change. It edits the markup
surgically instead of regenerating everything.

```
Describe -> Generate -> Render -> "Move the stats above the table" -> Update -> Render -> ...
```

Because WireText is compact and structured, iteration works the way you
expect. "Add a sidebar" is one edit, not a full rewrite. "Make this a
three-step journey" restructures the flow without touching the
components inside each screen.

---

## Quick start

Make sure you've completed the [Setup](#setup) steps above so the
`/wiretext` skill is available. Then ask Claude to mock up any UI in
Claude Code Desktop:

> "Create a journey for user onboarding -- welcome, profile, plan"

> "Mock up a CRM dashboard with customer stats and a data table"

> "Add a delete confirmation modal to the projects screen"

The rendered prototype appears as a preview artifact inline in your
Claude Code Desktop conversation -- no separate tool or browser tab
needed.

---

## What Claude generates

You don't need to learn the syntax -- Claude handles it. But the markup
is readable enough that you can scan it and suggest edits in plain
language. Here's what the building blocks look like:

### Screens

A screen is one page of your app. Most of the time you just describe
what goes on it:

```wiretext
screen: login
theme: saas-light
---
login-form
  .logo ~cube Acme
  .providers google, github
  .footer No account? Sign up -> signup
```

### Macros

Shared layout (headers, sidebars, footers) defined once and reused
across screens:

```wiretext
macro: app-shell
use: [topbar, sidebar-nav]
---
@footer
  left
    text (c) 2026 Acme Inc.
  right
    nav Privacy | Terms
```

### Journeys

Multi-screen flows -- onboarding wizards, CRUD workflows, checkout
funnels -- in a single block:

```wiretext
journey: onboarding
theme: saas-light
use: [topbar]
---
screen: welcome
  heading Welcome to Acme
  progress 1 | 3
  button Continue+ -> profile

screen: profile
  heading About you
  progress 2 | 3
  input Full Name
  input Work Email
  button Continue+ -> plan

screen: plan
  heading Choose your plan
  progress 3 | 3
  pricing-table
    .plan Starter | Free | 5 projects, 1 member
    .plan Pro* | $29/mo | Unlimited projects, 10 members
    .plan Enterprise | Custom | SSO, Dedicated support
  button Start free trial+ -> dashboard
```

### Themes

Design tokens that apply across all screens. The body requires a
`tokens:` wrapper with indented key-value pairs:

```wiretext
theme: brand-blue
---
tokens:
  primary: "#2563eb"
  surface: "#f8fafc"
  text: "#0f172a"
  radius: 8px
  font: "Inter, sans-serif"
```

---

## Syntax at a glance

WireText has 53 components in a closed vocabulary -- high-level
constructs like `data-table`, `login-form`, `card`, and `modal` where a
single line can represent what would take dozens of HTML elements. You
won't need to memorize the syntax, but here's a quick reference if you
want to read or tweak the markup directly.

See [PROJECT.md](./PROJECT.md) for the complete language specification.

| Symbol  | Meaning                                          |
|---------|--------------------------------------------------|
| `*`     | active/selected state                            |
| `+`     | primary button variant                           |
| `~name` | icon (from Phosphor icon library)                |
| `\|`    | separates fields or items                        |
| `->`    | navigates to another screen or opens an overlay  |
| `#id`   | defines a hidden overlay (modal, drawer)         |
| `.slot` | named slot inside a compound component           |
| `@zone` | layout zone label (@header, @sidebar, @main, @aside, @footer) |

---

## For AI systems

WireText is purpose-built for LLM generation. Instead of asking an AI to
produce raw HTML (which is verbose, brittle to edit, and hard for the
model to modify without regenerating entire pages), WireText gives the
model a **stable, declarative structure** it can generate and surgically
edit.

**Why this works better than HTML generation:**

- **Deterministic vocabulary.** 53 named components. No ambiguity about
  what to emit. The model doesn't invent class names, div hierarchies,
  or CSS -- it picks from a closed list.
- **Surgically editable.** "Move the stats above the table" is a
  two-line cut-and-paste in WireText. In raw HTML, it means
  restructuring nested divs, re-threading styles, and hoping nothing
  breaks.
- **Compact.** A full SaaS dashboard with nav, sidebar, data table, and
  overlays fits in ~30 lines. The same screen in HTML would be hundreds
  of lines, burning context window and increasing hallucination risk.

**How Claude generates and renders WireText:**

- In Claude Code Desktop, use the `/wiretext` skill or reference
  [PROJECT.md](./PROJECT.md) directly.
- The skill at `skill/SKILL.md` contains the full component vocabulary,
  syntax rules, and generation guidelines.
- Claude produces fenced `` ```wiretext `` blocks, then runs the
  WireText library via bash (`node dist/...`) to produce a standalone
  HTML file with navigation, overlays, and theming. The HTML appears as
  a preview artifact in the conversation.

**For AI systems building WireText generators or renderers:**
[PROJECT.md](./PROJECT.md) is the authoritative technical specification.
It defines the block format, all 53 components, layout zones, macro
composition, theme resolution, overlay system, and generation guidelines.

---

## Contributing

WireText is open source. Contributions welcome -- see
[CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

```bash
git clone https://github.com/wiretext/wiretext
cd wiretext
npm install
npm test
```

---

## License

MIT (c) WireText Contributors
