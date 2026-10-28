# Install agent CLIs beside Paperclip

Paperclip needs an executable harness and provider authentication before an agent
can run Bootstrap. Installing the control plane alone does not install every
local harness. The production Dockerfile includes some CLIs; other installation
paths and execution containers can have a different set.

Run the repository's installer **on the machine or inside the container where
agents execute, as the OS user running Paperclip**:

```sh
bash scripts/install-agent-clis.sh --dry-run
bash scripts/install-agent-clis.sh
bash scripts/install-agent-clis.sh --check
```

The default installs all nine local agent CLIs. Every install invocation resolves
the current public release again, including when the command is already present.
There are no dated version pins in this script. npm tools resolve the `latest`
tag and install that exact stable version; native installers follow their latest
stable channel. Preview/nightly versions are not selected. Upstream providers
control release availability and compatibility; latest does not prove that a
particular Paperclip adapter or selected model works.

## Prerequisites and installation scope

Use Linux, macOS, or WSL2 with Bash, Node.js **24.11 or newer**, npm, curl, git,
tar, unzip, and working HTTPS certificate verification. The Paperclip
[application installer](../scripts/install.sh) can provision Node when installing
the application. This helper deliberately does not replace the host's Node or
system Python. Native Windows users should run it in WSL2; a Windows installation
does not make an executable available inside a Linux container or WSL instance.

For a fresh Debian/Ubuntu host, install the OS prerequisites as an administrator:

```sh
sudo apt-get update
sudo apt-get install -y ca-certificates curl git tar unzip build-essential python3 pkg-config libsecret-1-dev
```

Install Node and Paperclip, then run the CLI installer as the service user. On
macOS, install the corresponding prerequisites with the host's package manager.
Hermes's official installer provisions its own Python environment and supporting
runtime; it can need additional platform packages and may use existing sudo
permission to install them. Its non-interactive mode
skips provider setup and gateway setup. This helper also disables Hermes desktop,
browser, and computer-use installation; those are separate optional features.

The helper uses the following upstream distributions:

| Tool | Paperclip adapter | Source / update channel | Executable |
| --- | --- | --- | --- |
| Claude Code | `claude_local` | [`@anthropic-ai/claude-code@latest`](https://code.claude.com/docs/en/setup#install-with-npm) | `claude` |
| Codex | `codex_local` | [`@openai/codex@latest`](https://developers.openai.com/codex/cli/) | `codex` |
| Cursor | `cursor` | [Official native installer](https://cursor.com/docs/cli/installation) | `cursor-agent` / `agent` |
| Gemini CLI | `gemini_local` | [`@google/gemini-cli@latest`](https://geminicli.com/docs/get-started/installation/) | `gemini` |
| OpenCode | `opencode_local` (see compatibility note) | [`@opencode/cli@latest`](https://opencode.ai/v2/docs/) | `opencode` |
| Pi | `pi_local` | [`@earendil-works/pi-coding-agent@latest`](https://pi.dev/changelog/2026/5/7/pi-has-a-new-home) | `pi` |
| Kimi Code | `kimi_local` | [`@moonshot-ai/kimi-code@latest`](https://www.kimi.com/code/docs/en/kimi-code-cli/) | `kimi` |
| Grok Build | `grok_local` | [Official native installer, stable](https://github.com/xai-org/grok-build) | `grok` |
| Hermes Agent | `hermes_local` | [Official installer, stable release channel](https://github.com/NousResearch/hermes-agent) | `hermes` |

OpenCode V2 is the current release and uses `@opencode/cli`; `opencode-ai` still
publishes the older V1 line. The helper replaces an npm-managed V1 package in the
selected prefix before installing V2 because both own the `opencode` command.
Other OpenCode installations outside that prefix are left alone. The current
`opencode_local` adapter still uses V1 invocation flags (including `--dir`), so
installing the latest V2 does **not** qualify OpenCode agent execution until the
adapter is updated. Use a working harness such as Codex for Bootstrap in the
meantime; this helper does not silently substitute an older OpenCode version.
Remote gateways, Cursor Cloud, HTTP/process
adapters, and external plugins do not have an additional local CLI to install
here. Paperclip Runner's qualified embedded providers are managed by Paperclip;
this script does not replace their bundled dependency versions.

npm installs use the public npm registry and a user-owned prefix, defaulting to
`~/.local`. On npm versions with install-script approvals, the helper explicitly
allows the known CLI/dependency lifecycle scripts and fails if a new unreviewed
dependency needs an install script. This avoids claiming success while npm has
silently skipped native module builds. Existing npm installations also receive a
targeted rebuild of their known lifecycle dependencies, repairing scripts skipped
by an earlier install. The helper enables lifecycle execution for these commands;
it does not change npm's saved configuration. Native addon builds can require the
compiler/Python/libsecret packages listed above. Older npm versions retain their
normal lifecycle behavior. Cursor and Hermes publish commands in `~/.local/bin`; Grok uses
`~/.grok/bin`. Native installers also use their provider-specific directories
under the current user's home and may update shell startup files according to
their upstream behavior. No repository files, credentials, or login sessions are
copied. The installers download and execute code from the listed official
sources; they require network access and can take several minutes.

To install or update a subset:

```sh
bash scripts/install-agent-clis.sh --tools codex,claude
```

To use a different npm prefix (native tools still live under the service home):

```sh
bash scripts/install-agent-clis.sh --prefix /opt/paperclip-clis
```

The prefix must already be writable by the service user, or its parent must
allow that user to create it. The wrapper does not invoke sudo; native installers
retain their documented behavior described above. It attempts the
remaining tools when one fails, reports every failure, and exits nonzero if any
install or version probe fails. Re-run the failed subset after fixing the cause.
It never treats an older binary elsewhere on PATH as a successful installation.

## Make the commands visible to the service

An interactive shell's PATH is not evidence that a systemd service can find the
same command. Inspect the actual service user and home first. For example, if the
service account is `paperclip` with home `/var/lib/paperclip`:

```sh
sudo -u paperclip -H bash /opt/paperclip/scripts/install-agent-clis.sh
sudo -u paperclip -H bash /opt/paperclip/scripts/install-agent-clis.sh --check
```

Set the service environment explicitly, retaining any directory needed for its
Node executable. A systemd override for this example is:

```ini
[Service]
Environment="PATH=/var/lib/paperclip/.local/bin:/var/lib/paperclip/.grok/bin:/usr/local/bin:/usr/bin:/bin"
```

After changing the unit, reload systemd and restart the actual Paperclip service.
For a user service, use the equivalent `systemctl --user` commands. For Docker,
put the installation in your derived image's build steps and set `ENV PATH` for
the runtime user. Installing inside an ephemeral running container is lost on
replacement unless the relevant tool directories are persisted. Changing
host PATH does not change the container PATH. For remote execution, repeat
installation and verification inside that execution environment.

`--check` checks the installer-owned paths with bounded `--version` probes. It
does not query release feeds or assert provider authentication. A missing command,
nonzero exit, empty version response, or timed-out probe fails the check. Keep
the printed versions with deployment evidence; rerun installation to update.

## Authentication and Bootstrap acceptance

CLI installation is separate from authorization. Configure a dedicated provider
connection in Paperclip or authenticate the CLI under the intended service/agent
identity. Do not copy an operator's `~/.codex`, `~/.ssh`, browser profile, or other
personal session directories into the service account. Keep infrastructure SSH
keys and API tokens specific to this deployment and grant them per target.

For Codex, Paperclip can assign a separate `CODEX_HOME` to an agent; logging in
under the service user's default Codex home alone does not establish that the
agent's selected connection is ready. Use Paperclip's provider-connection login
and the agent's environment test. API-key authentication should use Paperclip
secret bindings or the provider connection, not a key embedded in this script,
the repository, or a command line.

Before calling setup complete:

1. Run `--check` as the execution user and confirm the service PATH.
2. In Paperclip, select the intended harness, provider connection, and model;
   run the agent environment test.
3. Run a small real Bootstrap/task, confirm it finishes and produces its expected
   output, then reload the task to confirm the result persists.

A passing version probe proves installation only. A provider login failure,
unavailable model, or adapter incompatibility remains a separate failed
acceptance step. The installer does not start agents, create tasks, or make paid
model requests.

## Updates and recovery

Re-run the same command during a maintenance window to refresh the selected CLI
tools. Existing provider configuration is left to each upstream installer; stop
active agent work before changing executable versions. There is no automatic
scheduled update or automatic rollback. Snapshot the execution container or
record previous package versions before updates when rollback is required.
For npm tools, reinstall the previously recorded exact package version under the
same prefix; use the provider's documented versioned installer for native tools.

Installer regression checks use fake package/download commands and temporary
homes, without installing software or contacting providers:

```sh
bash -n scripts/install-agent-clis.sh
node --test scripts/__tests__/install-agent-clis.test.mjs
```
