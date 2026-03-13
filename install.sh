#!/usr/bin/env bash
# install.sh — WireText skill installer for Claude Code Desktop (Option A)
#
# Builds the project, links the `wiretext` CLI globally, and copies the skill
# to ~/.claude/skills/wiretext/ so Claude Code Desktop discovers /wiretext.
#
# Usage:
#   bash install.sh                          # from inside a cloned repo
#   curl -fsSL https://raw.githubusercontent.com/wiretext/wiretext/master/install.sh | bash
#   WIRETEXT_DIR=~/tools/wiretext bash install.sh  # custom clone location
#
# To update an existing install, just re-run the script.

set -euo pipefail

REPO="https://github.com/wiretext/wiretext.git"
SKILL_DEST="$HOME/.claude/skills/wiretext/SKILL.md"
SKILL_DIR="$(dirname "$SKILL_DEST")"

# ── helpers ─────────────────────────────────────────────────────────────────
ok()   { echo "  ✅  $*"; }
info() { echo "  →   $*"; }
warn() { echo "  ⚠️   $*"; }
err()  { echo "  ❌  $*" >&2; exit 1; }

echo ""
echo "  WireText — Claude Code Skill Installer"
echo "  ──────────────────────────────────────"
echo ""

# ── prerequisites ────────────────────────────────────────────────────────────
command -v node &>/dev/null || err "Node.js 20+ is required. Install from https://nodejs.org"
command -v npm  &>/dev/null || err "npm is required (ships with Node.js)."
command -v git  &>/dev/null || err "git is required."

node_major=$(node --version | sed 's/v\([0-9]*\).*/\1/')
[ "$node_major" -ge 20 ] || err "Node.js 20+ required (found $(node --version))."

ok "Node.js $(node --version), npm $(npm --version)"

# ── locate source: current dir, existing install, or fresh clone ─────────────
# Detect if this script is being run from inside the wiretext repo itself,
# so contributors and users who already cloned don't get a redundant clone.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-install.sh}")" 2>/dev/null && pwd || echo "")"
is_wiretext_repo() { [ -f "$1/package.json" ] && grep -q '"name": "wiretext"' "$1/package.json" 2>/dev/null; }

if is_wiretext_repo "$SCRIPT_DIR"; then
  DIR="$SCRIPT_DIR"
  ok "Using repo at $DIR"
elif [ -n "${WIRETEXT_DIR:-}" ]; then
  DIR="$WIRETEXT_DIR"
  if is_wiretext_repo "$DIR"; then
    info "Updating existing install in $DIR..."
    git -C "$DIR" pull --ff-only --quiet
    ok "Updated to $(git -C "$DIR" rev-parse --short HEAD)"
  else
    info "Cloning wiretext to $DIR..."
    git clone --quiet "$REPO" "$DIR"
    ok "Cloned $(git -C "$DIR" rev-parse --short HEAD)"
  fi
else
  DIR="$HOME/.local/share/wiretext"
  if [ -d "$DIR/.git" ]; then
    info "Updating existing install in $DIR..."
    git -C "$DIR" pull --ff-only --quiet
    ok "Updated to $(git -C "$DIR" rev-parse --short HEAD)"
  else
    info "Cloning wiretext to $DIR..."
    git clone --quiet "$REPO" "$DIR"
    ok "Cloned $(git -C "$DIR" rev-parse --short HEAD)"
  fi
fi

# ── build ────────────────────────────────────────────────────────────────────
info "Installing dependencies and building..."
cd "$DIR"
npm install --silent
npm run build --silent
ok "Build complete (dist/ ready)"

# ── link CLI ─────────────────────────────────────────────────────────────────
# npm link makes `wiretext` available as a global command.
# Falls back with instructions if the global prefix requires root.
info "Linking wiretext CLI to PATH..."
if npm link --silent 2>/dev/null; then
  ok "wiretext CLI available at $(command -v wiretext)"
else
  warn "Could not link wiretext globally (npm link failed — likely a permissions issue)."
  echo ""
  echo "     Fix with one of these options:"
  echo "       a) sudo npm link"
  echo "       b) Change npm prefix:  npm config set prefix ~/.npm-global"
  echo "          Then add to shell:  export PATH=\"\$HOME/.npm-global/bin:\$PATH\""
  echo ""
  echo "     Then re-run this installer."
  echo ""
fi

# ── install skill ────────────────────────────────────────────────────────────
info "Installing Claude Code skill to $SKILL_DIR..."
mkdir -p "$SKILL_DIR"
cp "$DIR/skill/SKILL.md" "$SKILL_DEST"
ok "Skill installed"

# ── done ─────────────────────────────────────────────────────────────────────
echo ""
echo "  ✨  Done! Restart Claude Code Desktop, then try:"
echo ""
echo "       /wiretext a SaaS dashboard with sidebar nav and stat cards"
echo ""
echo "  To update wiretext later, re-run this script."
echo ""
