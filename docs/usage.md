# CodeGraph Usage Guide

This guide explains the day-to-day workflow after CodeGraph has been installed into an AI coding agent such as Claude Code, Cursor, Codex CLI, opencode, Gemini CLI, Kiro, or Jcode.

## Short answer: do I need to index every project?

Yes. CodeGraph is a per-project semantic index.

Installing the MCP server into an agent is a one-time or infrequent setup step, but each repository or workspace that should use CodeGraph needs its own local `.codegraph/` directory and index.

Typical flow:

```bash
# One-time agent setup, or whenever you add a new agent target
codegraph install --target=auto --location=global

# Per project / repository
cd /path/to/your-project
codegraph init -i
```

`codegraph init -i` creates `.codegraph/` and immediately builds the initial graph. Without `-i`, `codegraph init` only creates the directory and you must run `codegraph index` afterwards.

## Why indexing is per project

CodeGraph stores local code intelligence in the project itself:

- `.codegraph/codegraph.db` contains symbols, edges, file metadata, and full-text search data.
- The MCP server resolves the active project from the agent's workspace/root URI or current working directory.
- A global MCP install only tells the agent how to launch `codegraph serve --mcp`; it does not create indexes for all repositories.

This keeps the index local, private, and specific to the codebase the agent is working on.

## Recommended setup by scenario

### New machine or new agent

```bash
codegraph install --target=auto --location=global
```

Then restart the agent so it reloads MCP server configuration.

For Jcode specifically:

```bash
codegraph install --target=jcode --location=global --yes
```

This writes `~/.jcode/mcp.json` with a `servers.codegraph` entry.

### New project

```bash
cd /path/to/project
codegraph init -i
codegraph status
```

Use `codegraph status` to confirm the project has an index and to see file/symbol counts.

### Existing project after code changes

Usually no manual action is needed while the MCP server is running. It watches source files and incrementally syncs changes.

If you want to force a refresh:

```bash
codegraph sync
```

If the index looks stale or incomplete:

```bash
codegraph index --force
```

### Project-local agent configuration

If you do not want a global MCP configuration, install only for the current project:

```bash
cd /path/to/project
codegraph install --target=auto --location=local
codegraph init -i
```

This writes agent config under the project when the target supports local configuration. For Jcode, local config is `.jcode/mcp.json`.

## Common commands

| Command | Scope | Purpose |
| --- | --- | --- |
| `codegraph install --target=auto --location=global` | user/global | Configure detected agents to launch CodeGraph MCP |
| `codegraph install --target=jcode --location=global --yes` | user/global | Configure Jcode via `~/.jcode/mcp.json` |
| `codegraph init -i` | project | Create `.codegraph/` and build the first index |
| `codegraph status` | project | Show index health and stats |
| `codegraph sync` | project | Incrementally update changed files |
| `codegraph index --force` | project | Rebuild the index from scratch |
| `codegraph uninit` | project | Remove the project's `.codegraph/` index directory |
| `codegraph uninstall --target=jcode --location=global --yes` | user/global | Remove CodeGraph from Jcode MCP config |

## How agents use it

Once the agent has MCP config and the project has an index, the agent can call CodeGraph tools such as:

- `codegraph_search` to find symbols
- `codegraph_context` to gather task-focused context
- `codegraph_callers` and `codegraph_callees` to inspect call flow
- `codegraph_impact` to estimate affected code before editing
- `codegraph_files` and `codegraph_status` to inspect project structure and index health

The usage guidance is delivered by the MCP server during initialization, so CodeGraph no longer needs to add instructions to `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, or similar files.

## Troubleshooting

### The agent does not see CodeGraph tools

1. Restart the agent after running `codegraph install`.
2. Check that the relevant MCP config exists:
   - Jcode global: `~/.jcode/mcp.json`
   - Jcode local: `.jcode/mcp.json`
   - Claude global: `~/.claude.json`
   - Cursor global/local: `.cursor` MCP config files
3. Run:

```bash
codegraph serve --mcp
```

If it starts without an immediate error, the command is available to the agent.

### The agent sees tools but CodeGraph says the project is not initialized

Run this inside the repository:

```bash
codegraph init -i
```

If you already initialized another repository, that does not initialize this one. Each project needs its own `.codegraph/` directory.

### The index seems stale

Wait a couple of seconds after saving files. The MCP server debounces file watcher events before syncing.

If needed, run:

```bash
codegraph sync
```

For a full rebuild:

```bash
codegraph index --force
```
