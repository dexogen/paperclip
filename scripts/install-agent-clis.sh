#!/usr/bin/env bash
# Install the local harnesses registered in server/src/adapters/registry.ts.
# Run as the same OS user as Paperclip, inside its execution host/container.
set -euo pipefail

TOOLS="claude,codex,cursor,gemini,opencode,pi,kimi,grok,hermes"
MODE=install
PREFIX="${HOME:?HOME must identify the Paperclip service user}/.local"
REGISTRY=https://registry.npmjs.org
TEMP_DIR=""

usage() {
  cat <<'EOF'
Install or update Paperclip's local agent CLIs to the latest published release.

Usage: bash scripts/install-agent-clis.sh [options]
  --tools <names>    Comma-separated subset (default: all):
                    claude,codex,cursor,gemini,opencode,pi,kimi,grok,hermes
  --prefix <path>    Absolute npm installation prefix (default: ~/.local).
                    Native installers still use the current user's home.
  --dry-run         Print the plan; no downloads, installation, or file changes.
  --check           Check installed binaries and versions; do not install.
                    This does not check auth, model access, or latest releases.
  -h, --help        Show help.

Requires Node >=24.11, npm, curl, git, tar and unzip on Linux/macOS/WSL2.
Run as the Paperclip service user. No account creation or provider login is performed.
Latest is resolved on every install. Existing installations are updated.
EOF
}

fail() { printf '[agent-clis] %s\n' "$*" >&2; exit 1; }
log() { printf '[agent-clis] %s\n' "$*"; }

while [ "$#" -gt 0 ]; do
  case "$1" in
    --tools|--prefix)
      [ "$#" -ge 2 ] && [ -n "$2" ] && [[ "$2" != --* ]] || fail "$1 requires a value"
      if [ "$1" = --tools ]; then TOOLS="$2"; else PREFIX="$2"; fi
      shift 2 ;;
    --dry-run|--check)
      [ "$MODE" = install ] || fail "Choose only one of --dry-run and --check"
      MODE="${1#--}"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown option: $1" ;;
  esac
done

case "$PREFIX" in /*) ;; *) fail "--prefix must be an absolute path" ;; esac
case "$PREFIX$HOME" in *$'\n'*|*$'\r'*|*:* ) fail "HOME and prefix must not contain newlines or colons" ;; esac
case "$TOOLS" in ,*|*,|*,,*) fail "Empty tool name in --tools" ;; esac
IFS=, read -r -a selected <<< "$TOOLS"
[ "${#selected[@]}" -gt 0 ] || fail "Select at least one tool"
seen=,
for tool in "${selected[@]}"; do
  case "$tool" in claude|codex|cursor|gemini|opencode|pi|kimi|grok|hermes) ;; *) fail "Unknown tool: $tool" ;; esac
  case "$seen" in *",$tool,"*) fail "Duplicate tool: $tool" ;; esac
  seen="$seen$tool,"
done

package_for() {
  case "$1" in
    claude) printf %s @anthropic-ai/claude-code ;;
    codex) printf %s @openai/codex ;;
    gemini) printf %s @google/gemini-cli ;;
    opencode) printf %s @opencode/cli ;;
    pi) printf %s @earendil-works/pi-coding-agent ;;
    kimi) printf %s @moonshot-ai/kimi-code ;;
  esac
}

binary_for() {
  case "$1" in
    cursor) printf '%s/.local/bin/cursor-agent' "$HOME" ;;
    grok) printf '%s/.grok/bin/grok' "$HOME" ;;
    hermes) printf '%s/.local/bin/hermes' "$HOME" ;;
    *) printf '%s/bin/%s' "$PREFIX" "$1" ;;
  esac
}

installer_for() {
  case "$1" in
    cursor) printf %s https://cursor.com/install ;;
    grok) printf %s https://x.ai/cli/install.sh ;;
    hermes) printf %s https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh ;;
  esac
}

install_scripts_for() {
  case "$1" in
    claude) printf %s @anthropic-ai/claude-code ;;
    gemini) printf %s @google/gemini-cli,@github/keytar,node-pty ;;
    opencode) printf %s @opencode/cli ;;
    pi) printf %s @earendil-works/pi-coding-agent,@google/genai,protobufjs ;;
    kimi) printf %s @moonshot-ai/kimi-code,node-pty ;;
    *) package_for "$1" ;;
  esac
}

CLI_PATH="$PREFIX/bin:$HOME/.local/bin:$HOME/.grok/bin"
[ "$PREFIX" != "$HOME/.local" ] || CLI_PATH="$HOME/.local/bin:$HOME/.grok/bin"
log "User: $(id -un); home: $HOME; npm prefix: $PREFIX"
log "Service PATH must start with: $CLI_PATH"
if [ "$MODE" = dry-run ]; then
  for tool in "${selected[@]}"; do
    package="$(package_for "$tool")"
    if [ -n "$package" ]; then
      log "$tool: resolve $package@latest from $REGISTRY, install that version under $PREFIX"
    else
      log "$tool: download and execute $(installer_for "$tool") (latest stable; Hermes non-interactive, no desktop/browser)"
    fi
    log "Verify: $(binary_for "$tool") --version"
  done
  exit 0
fi

case "$(uname -s)" in Linux|Darwin) ;; *) fail "Use Linux, macOS or WSL2 (not native Windows)" ;; esac
command -v node >/dev/null 2>&1 || fail "Install Node >=24.11 first (see doc/AGENT-CLI-SETUP.md)"
node -e 'const [a,b] = process.versions.node.split(".").map(Number); process.exit(a > 24 || (a === 24 && b >= 11) ? 0 : 1)' || fail "Node >=24.11 is required"
export PATH="$CLI_PATH:$PATH"

probe() {
  local executable
  executable="$(binary_for "$1")"
  [ -x "$executable" ] || { log "MISSING $1: $executable"; return 1; }
  # A broken CLI must not hold an unattended installer forever.
  node - "$1" "$executable" <<'NODE'
const { spawnSync } = require('node:child_process');
const [tool, executable] = process.argv.slice(2);
const result = spawnSync(executable, ['--version'], {
  encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024,
  env: { ...process.env, CI: '1', NO_COLOR: '1', KIMI_CODE_NO_AUTO_UPDATE: '1' },
});
if (result.error || result.status !== 0) {
  console.error(`[agent-clis] FAILED ${tool}: ${result.error?.message ?? `exit ${result.status}`}`);
  process.exit(1);
}
const version = (result.stdout || result.stderr).trim();
if (!version) { console.error(`[agent-clis] FAILED ${tool}: empty version response`); process.exit(1); }
console.log(`[agent-clis] OK ${tool}: ${version.replace(/\s+/g, ' ')} (${executable})`);
NODE
}

if [ "$MODE" = check ]; then
  failures=0
  for tool in "${selected[@]}"; do probe "$tool" || failures=$((failures + 1)); done
  [ "$failures" -eq 0 ] || fail "$failures CLI checks failed"
  log "CLI checks passed. Authentication and a real Paperclip run still need verification."
  exit 0
fi

for dependency in npm curl git tar unzip; do
  command -v "$dependency" >/dev/null 2>&1 || fail "Missing prerequisite: $dependency (see doc/AGENT-CLI-SETUP.md)"
done
mkdir -p "$PREFIX"
[ -w "$PREFIX" ] || fail "Prefix is not writable by $(id -un): $PREFIX"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/paperclip-agent-clis.XXXXXXXX")"
trap 'rm -rf -- "$TEMP_DIR"' EXIT
# npm versions with lifecycle approvals otherwise skip required native builds
# while reporting a successful install. Older npm has no such config key.
SCRIPT_POLICY="$(npm config get strict-allow-scripts)" || fail "Cannot read npm script policy"
case "$SCRIPT_POLICY" in true|false|undefined) ;; *) fail "Unexpected npm script-policy response: $SCRIPT_POLICY" ;; esac

install_one() {
  local tool="$1" package version installer needs_rebuild=0
  local script_flags=(--ignore-scripts=false)
  local rebuild_flags=(--ignore-scripts=false)
  local build_packages=()
  package="$(package_for "$tool")"
  if [ -n "$package" ]; then
    version="$(npm view "$package@latest" version --registry "$REGISTRY")" || return 1
    [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { log "Invalid/non-stable latest for $package: $version"; return 1; }
    [ ! -f "$PREFIX/lib/node_modules/$package/package.json" ] || needs_rebuild=1
    if [ "$tool" = opencode ] && [ -f "$PREFIX/lib/node_modules/opencode-ai/package.json" ]; then
      log "Replacing the npm-managed OpenCode V1 package with current OpenCode V2"
      npm uninstall --global --prefix "$PREFIX" --ignore-scripts --no-audit --no-fund opencode-ai || return 1
    fi
    log "Installing $package@$version"
    if [ "$SCRIPT_POLICY" != undefined ]; then
      script_flags+=("--allow-scripts=$(install_scripts_for "$tool")" --strict-allow-scripts --dangerously-allow-all-scripts=false)
      # rebuild's strict preflight scans every global package, including unrelated
      # tools. Select only reviewed names; unselected packages are never rebuilt.
      rebuild_flags+=("--allow-scripts=$(install_scripts_for "$tool")" --strict-allow-scripts=false --dangerously-allow-all-scripts=false)
    fi
    npm install --global --prefix "$PREFIX" --registry "$REGISTRY" --omit=dev --no-audit --no-fund "${script_flags[@]}" "$package@$version" || return 1
    if [ "$needs_rebuild" -eq 1 ]; then
      # Reinstalling an unchanged version need not rerun previously skipped
      # lifecycle scripts. Repair those explicitly before claiming readiness.
      IFS=, read -r -a build_packages <<< "$(install_scripts_for "$tool")"
      npm rebuild --global --prefix "$PREFIX" --loglevel=error "${rebuild_flags[@]}" "${build_packages[@]}" || return 1
    fi
  else
    installer="$TEMP_DIR/$tool.sh"
    curl --proto '=https' --tlsv1.2 --fail --show-error --silent --location --retry 2 --connect-timeout 20 --max-time 180 "$(installer_for "$tool")" -o "$installer" || return 1
    case "$tool" in
      cursor) bash "$installer" </dev/null || return 1 ;;
      grok) GROK_CHANNEL=stable GROK_BIN_DIR="$HOME/.grok/bin" bash "$installer" </dev/null || return 1 ;;
      hermes) HERMES_REPO_URL=https://github.com/NousResearch/hermes-agent.git bash "$installer" --channel stable --non-interactive --skip-browser --skip-computer-use --hermes-home "$HOME/.hermes" --dir "$HOME/.hermes/hermes-agent" </dev/null || return 1 ;;
    esac
  fi
  probe "$tool"
}

failures=0
for tool in "${selected[@]}"; do
  if ! install_one "$tool"; then
    log "FAILED to install/verify $tool. Other selected tools will still be attempted."
    failures=$((failures + 1))
  fi
done
[ "$failures" -eq 0 ] || fail "$failures tools failed; fix the reported cause and rerun --tools <names>"
log "All selected CLI tools installed and verified."
log "Set the service PATH, restart Paperclip, then configure provider authentication and test Bootstrap."
