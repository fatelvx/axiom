# MCP Client Setup

Axiom's MCP server is a local, read-only stdio wrapper over the existing CLI JSON evidence.

Use it when an agent should query allowed roots, `axi check`, `axi observe`, `axi graph`, `axi diff`, or `axi infer` through MCP instead of remembering CLI flags or parsing Markdown.

The server does not edit contracts, update baselines, accept debt, or create new validation rules.

## Build First

From the Axiom repository:

```bash
npm run build
npm run mcp:smoke
npm run mcp:conformance:smoke
```

During npm supply-chain risk periods, prefer the existing dependency tree. Do not run dependency installs or package-manager updates just to register MCP.

The smoke starts the local stdio server, lists the read-only tool set, calls `axiom_roots`, runs `axiom_check` against the current repository, confirms hard contract failures return as structured evidence, and verifies `--allow-root` rejection. Passing this smoke means the server binary works before any MCP client reload behavior enters the picture.

The conformance smoke goes one step higher: it verifies roots-first behavior, gate versus advisory semantics, inference-as-authoring-evidence, and baseline non-mutation in a temporary spec-first project. Use [MCP Conformance](mcp-conformance.md) before asking a blank agent to test the integration.

## Register With Codex

From the Axiom repository on Windows PowerShell:

```powershell
$root = (Get-Location).Path
codex mcp add axiom -- node "$root\dist\mcp\server.js" --allow-root "$root" --timeout-ms 60000
```

Verify the registration:

```powershell
codex mcp list
codex mcp get axiom
```

You should see a stdio server named `axiom` with:

```text
command: node
args: <repo>\dist\mcp\server.js --allow-root <repo> --timeout-ms 60000
```

If you installed Axiom as a package and have the bin on your `PATH`, this form is also valid:

```powershell
codex mcp add axiom -- axiom-mcp --allow-root "C:\path\to\project" --timeout-ms 60000
```

## Reload The Client

Most MCP clients load server registrations when a session starts.

After adding or changing the server, start a new Codex session or restart the Codex app before expecting the `axiom_*` tools to appear as directly callable tools.

If a running session cannot see the tools yet, that does not mean the server is broken. Confirm with:

```powershell
codex mcp get axiom
npm run mcp:smoke
```

Then reload the client. A shell-level JSON-RPC smoke can still call the server while the current session waits for a reload, but native tool access usually requires a fresh session.

## Allowed Roots

Use the narrowest `--allow-root` that matches the repository being reviewed.

Good:

```powershell
codex mcp add axiom -- node "$root\dist\mcp\server.js" --allow-root "$root" --timeout-ms 60000
```

For two explicit repositories:

```powershell
codex mcp remove axiom
codex mcp add axiom -- node "C:\path\to\axiom\dist\mcp\server.js" --allow-root "C:\path\to\repo-a" --allow-root "C:\path\to\repo-b" --timeout-ms 60000
```

For example, if an agent also needs to scan a sibling application such as Lumina, re-register with the Axiom repo root plus that application root:

```powershell
codex mcp remove axiom
codex mcp add axiom -- node "C:\path\to\axiom\dist\mcp\server.js" --allow-root "C:\path\to\axiom" --allow-root "C:\path\to\Lumina\lumina-app" --timeout-ms 60000
```

After re-registering, start a new client session and call `axiom_roots` first. If the target root is not listed, other Axiom MCP tools should reject the scan instead of guessing.

Avoid:

```powershell
--allow-root C:\
--allow-root $HOME
```

The server validates requested `root`, `configPath`, `baselinePath`, and `specPaths` against allowed roots before running the CLI. That is a safety boundary for local tool execution, not a promise that an MCP client or hosted model will keep private architecture evidence out of its own logs or context. Keep roots scoped to the project you intend the agent to inspect.

## First Native Smoke

In a fresh MCP-aware session, ask the agent to do only this first:

```text
Check whether the Axiom MCP tools are available.
Do not edit files, commit, or push.
If available, call tools/list if the client exposes it, call axiom_roots, then run axiom_check on the current repository and summarize the structured result.
```

Expected behavior for a clean reviewed contract:

- `axiom_roots` returns the configured allowed roots.
- `axiom_check` returns structured evidence.
- `structuredContent.payload.ok` is `true`.
- `structuredContent.payload.summary.violations` is `0`.

Expected behavior for a failing contract:

- `axiom_check` may wrap CLI exit code `1`.
- The MCP result should still be normal evidence, not a tool crash.
- `isError` should stay false when the payload is valid Axiom JSON.

## Handoff Prompt

When testing a new MCP registration with an agent, be explicit about whether it may continue work.

For verification only:

```text
First confirm whether Axiom MCP tools are directly callable.
Do not modify files, do not commit, and do not push.
Report the result and wait for my approval before implementation.
```

For active implementation:

```text
Use Axiom MCP as read-only architecture evidence.
Repair hard validator violations only when they are in scope.
Treat warnings, reviewStory, and drift as advisory.
Do not add accepted debt or update baselines unless I explicitly approve it.
```

## Remove Or Re-register

Remove a broken or outdated registration:

```powershell
codex mcp remove axiom
```

Then add it again with the desired server path and allowed roots.

## Other MCP Clients

Clients that use a JSON-style MCP configuration usually need the same command and arguments:

```json
{
  "mcpServers": {
    "axiom": {
      "command": "node",
      "args": [
        "C:\\path\\to\\axiom\\dist\\mcp\\server.js",
        "--allow-root",
        "C:\\path\\to\\project",
        "--timeout-ms",
        "60000"
      ]
    }
  }
}
```

Use the client's own documentation for the exact config file location and reload behavior.
