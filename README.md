# WireText

**You describe the UI. Claude builds the mock. You see it rendered.**

WireText is a lightweight markup language for UI mockups, designed for
Claude Code Desktop. Ask Claude for a dashboard, a signup flow, or a
five-screen onboarding journey and get a clickable prototype in seconds
— right in your conversation. No design tool. No drag-and-drop. Just
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

- **Figma** — powerful, but slow to set up, requires a designer, and
  your AI can't generate Figma files
- **ASCII art / markdown tables** — fast, but unreadable past two boxes
- **Just start coding** — expensive way to find out everyone imagined
  something different
- **Ask AI to generate HTML** — looks great once, but when you need
  changes the AI regenerates the whole page, loses what worked, or
  drifts from your intent. There's no stable structure to iterate on.

WireText fixes the iteration problem. It's a lightweight markup that AI
generates reliably and modifies predictably — change a line, not a page.
Because the structure is simple and declarative, Claude can swap a
component, add a screen, or rearrange a layout without losing context or
starting over. Mermaid did this for diagrams. WireText does it for
interfaces.

---

## Install

Two paths depending on your workflow. Both copy a self-contained renderer
and the `/wiretext` slash command to `~/.claude/skills/wiretext/` — no
global CLI required.

### npm (recommended)

Requires Node.js 20+.

```bash
npm install -g wiretext
wiretext --install-skill
```

Restart Claude Code Desktop. Done.

### Git clone

For contributors or users who prefer pulling updates via git:

```bash
# Already cloned the repo? Run from inside it:
bash install.sh

# Haven't cloned yet:
curl -fsSL https://raw.githubusercontent.com/wiretext/wiretext/master/install.sh | bash
```

If you already have the repo, the script uses it in place. Otherwise it
clones to `~/.local/share/wiretext`. Either way: builds and copies the
skill files. Re-run to update.

---

## Quick start

In Claude Code Desktop, type `/wiretext` and describe what you need:

> `/wiretext a SaaS dashboard with sidebar nav, stat cards, and a data table`

> `/wiretext a three-step onboarding journey — welcome, profile setup, plan selection`

> `/wiretext a login screen with Google SSO and email/password fallback`

The skill generates WireText DSL, renders it to a standalone HTML
preview, and opens it in your browser — all within the conversation.
Iterate in plain language until it looks right, then hand off to
[/frontend-design](https://github.com/anthropics/claude-skills) to
convert the approved wireframe into production code.

---

## How it works

**1. Ask Claude** — describe what you need in plain language

> "Show me a settings page with profile, security, and billing tabs"

**2. Get WireText** — the `/wiretext` skill generates structured DSL
blocks with layout, components, and screen-to-screen navigation

**3. See it rendered** — the `wiretext` CLI produces a standalone HTML
file with WebAwesome components, Phosphor icons, theme CSS, and
clickable navigation; Claude opens it directly in your browser

**4. Iterate** — tell Claude what to change. It edits the markup
surgically instead of regenerating everything

```
Describe → Generate → Render → "Move the stats above the table" → Edit → Render → ...
```

Because WireText is compact and structured, iteration works the way you
expect. "Add a sidebar" is one edit, not a full rewrite. "Make this a
three-step journey" restructures the flow without touching the
components inside each screen.

---

## What Claude can build

67 components across 5 levels — Claude handles the syntax, you just
describe what you want.

### Page components (full-page compositions)

| Component              | What it renders                                       |
|------------------------|-------------------------------------------------------|
| `hero`                 | Marketing hero with eyebrow, heading, CTA, visual     |
| `login-form`           | Login page with SSO providers and email/password      |
| `signup-form`          | Registration page with providers and fields           |
| `pricing-table`        | Plan comparison cards with highlighted tier           |
| `empty-state`          | Zero-state placeholder with icon, heading, action     |
| `feature-grid`         | Icon + title + description feature cards              |
| `logo-cloud`           | Logo strip with label                                 |
| `onboarding-checklist` | Vertical checklist with completed/pending states      |
| `command-palette`      | Search dialog with keyboard-navigable results         |

### Section components (containers and compound panels)

| Component              | What it renders                                       |
|------------------------|-------------------------------------------------------|
| `card`                 | Content card with optional title and icon              |
| `modal`                | Blocking dialog for confirmations                      |
| `drawer`               | Side panel — left for navigation, right for details    |
| `data-table`           | Sortable table with row actions, bulk ops, empty state |
| `settings-form`        | Grouped form sections with a save action               |
| `testimonial`          | Quote grid with author attribution                     |
| `file-upload`          | Drag-and-drop upload zone                              |
| `user-menu`            | Avatar dropdown with menu items                        |

Plus `details`, `action-sheet`, and 22 functional components
(navigation, data display, feedback), 15 elements (text, buttons,
icons), and 11 form controls. See `skill/SKILL.md` for the full list.

### Screens

A screen is one page of your app:

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

Shared layout defined once, reused across screens:

```wiretext
macro: app-shell
use: [topbar, sidebar-nav]
---
@footer
  left
    text © 2026 Acme Inc.
  right
    nav Privacy | Terms
```

### Journeys

Multi-screen flows in a single block:

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

---

## Syntax at a glance

You don't need to memorize this — Claude handles the syntax. But it's
readable enough to scan and suggest edits in plain language.

| Symbol  | Meaning                                            |
|---------|----------------------------------------------------|
| `*`     | active/selected state, or password field type      |
| `+`     | primary button variant; `+N` = badge count         |
| `~name` | Phosphor icon (e.g. `~house`, `~gear`, `~trash`)   |
| `\|`    | separates fields or inline items                   |
| `->`    | navigate to a screen or open an overlay            |
| `-> https://...` | external link, opens in new tab           |
| `#id`   | defines a hidden overlay (modal, drawer)           |
| `.slot` | named slot inside a compound component             |
| `@zone` | layout zone (`@header`, `@sidebar`, `@main`, `@aside`, `@footer`) |

See [skill/SKILL.md](./skill/SKILL.md) for the complete language specification.

---

## For AI systems

WireText is purpose-built for LLM generation. Instead of asking an AI to
produce raw HTML (verbose, brittle to edit, hard to modify without
regenerating entire pages), WireText gives the model a **stable,
declarative structure** it can generate and surgically edit.

**Why this works better than HTML generation:**

- **Deterministic vocabulary.** 67 named components. No ambiguity about
  what to emit. The model doesn't invent class names, div hierarchies,
  or CSS — it picks from a closed list.
- **Surgically editable.** "Move the stats above the table" is a
  two-line change in WireText. In raw HTML it means restructuring nested
  divs, re-threading styles, and hoping nothing breaks.
- **Compact.** A full SaaS dashboard with nav, sidebar, data table, and
  overlays fits in ~30 lines. The same screen in HTML would be hundreds
  of lines, burning context window and increasing hallucination risk.

**How Claude generates and renders WireText:**

The `/wiretext` skill at `skill/SKILL.md` contains the full component
vocabulary, syntax rules, and generation guidelines. Claude produces
fenced `` ```wiretext `` blocks, then invokes:

```bash
wiretext /tmp/wiretext-preview.md /tmp/wiretext-preview.html
```

The CLI renders the DSL to a standalone HTML document with
navigation JS, overlay system, WebAwesome components, Phosphor icons,
and theme CSS — no server required, no external assets at build time.

**For AI systems building WireText generators or renderers:**
[skill/SKILL.md](./skill/SKILL.md) is the authoritative technical specification.
It defines the block format, all 67 components, layout zones, macro
composition, theme resolution, overlay system, and generation guidelines.

---

## Contributing

WireText is open source. Contributions welcome — see
[CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

```bash
git clone https://github.com/wiretext/wiretext
cd wiretext
npm install
npm test
```

---

## License

MIT © WireText Contributors
