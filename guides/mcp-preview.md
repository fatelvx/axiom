# MCP Preview

Axiom's MCP surface should be a thin read-only wrapper over the same CLI JSON evidence that local developers, CI, and agents already use.

This preview ships a minimal stdio server without adding an MCP SDK dependency during the current supply-chain risk window. The server is deliberately small: lifecycle, ping, `tools/list`, and `tools/call` only.

For copyable client registration commands, reload expectations, and allowed-root guidance, see [MCP Client Setup](mcp-client-setup.md).

## Protocol Shape

The official MCP tools specification describes tools as named operations with an `inputSchema`, optional `outputSchema`, and optional annotations. It also says structured tool results live in `structuredContent` and should be mirrored as serialized JSON text for compatibility. The schema reference defines `readOnlyHint`, `destructiveHint`, and `openWorldHint` as annotations, while warning that annotations are hints and not a security boundary.

Axiom follows that shape in `src/mcp/tools.ts`:

- every tool has an object `inputSchema`,
- every tool has an object `outputSchema`,
- every tool sets `annotations.readOnlyHint: true`,
- every tool sets `annotations.destructiveHint: false`,
- every tool sets `annotations.openWorldHint: false`,
- tool results put the parsed Axiom JSON payload under `structuredContent.payload`,
- the same structured result is also serialized into a text content block.

References:

- [MCP Tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [MCP Schema Reference](https://modelcontextprotocol.io/specification/2025-11-25/schema)

## Tool Set

The preview defines five tools:

| MCP tool | Wrapped CLI command | Role |
| --- | --- | --- |
| `axiom_check` | `axi check --json` | Hard gate for reviewed `.axi` contracts. |
| `axiom_observe` | `axi observe --json` | Review story, warnings, visible debt, and optional baseline drift. |
| `axiom_graph` | `axi graph --json` | Declared and observed graph evidence, optionally focused. |
| `axiom_diff` | `axi diff --json` | Advisory observed-edge drift against an existing graph baseline. |
| `axiom_infer_contract` | `axi infer --json` | Current-graph starter contract evidence for authoring. |

The important product rule is that MCP does not create new semantics. If the CLI would not fail, the MCP wrapper does not invent a failure. If the CLI says drift is advisory, the MCP wrapper returns advisory drift.

## Adapter Contract

`buildAxiomMcpCliInvocation()` maps tool input into a `node dist/cli.js ... --json` invocation. It never builds a shell string; it returns an executable plus an argument array.

`createAxiomMcpToolResult()` maps CLI execution output into MCP-shaped result content:

- `axiom_check` accepts exit code `0` and `1`. Exit code `1` can be a valid hard-violation payload, not a tool crash.
- the graph, observe, diff, and infer tools expect exit code `0`.
- unexpected CLI exits become tool execution errors with `isError: true`.
- wrong or missing Axiom `schemaVersion` also becomes `isError: true`.
- successful and failed tool results include `structuredContent.summary`, a small agent-readable index over the payload.

This keeps the hard gate where it belongs:

```text
axi check --json = gate evidence
MCP result = transport wrapper over that evidence
```

## Result Consumption

Every `tools/call` result preserves the full CLI JSON under `structuredContent.payload`. Agents should read that payload for exact `violations[]`, `warnings[]`, `intentionalDebt[]`, `drift`, import locations, and inferred contract evidence.

For fast routing, the wrapper also includes `structuredContent.summary`:

| Field | Meaning |
| --- | --- |
| `kind` | `check`, `review`, `inference`, or `tool_error`. |
| `gate` | Whether this command is the hard gate. `axiom_check` is the gate; graph, observe, and diff are review context. |
| `ok` | The `axi check` pass/fail boolean when available. |
| `counts` | Common counts copied from CLI summaries, plus drift counts when present. |
| `reviewStory` | A compact copy of the review story summary, next step, caveat, and first pressure when present. |
| `drift` | Advisory new/removed observed-edge counts from diff-capable payloads. |
| `agentHint` | A short instruction for how an agent should treat the result. |

The summary is not a second validation model and not a health score. It is an index card over the same evidence so agents can decide where to look first without parsing Markdown or scanning the full payload on every turn.

## Guardrails

MCP v0 must stay read-only:

- no auto-editing `.axi` files,
- no adding `accepts ... until ... because ...`,
- no updating baselines,
- no rewriting source imports,
- no Markdown parsing when JSON is available,
- no MCP-only validation rules,
- no model-hosted private architecture state.

Future write-capable tools, if they ever exist, need a separate design review and human approval path.

## Running The Stdio Server

After building Axiom, run:

```bash
node dist/mcp/server.js --allow-root . --timeout-ms 60000
```

For a repeatable local smoke before registering an MCP client:

```bash
npm run mcp:smoke
```

Installed package aliases:

```bash
axi-mcp --allow-root .
axiom-mcp --allow-root .
```

Server options:

| Option | Meaning |
| --- | --- |
| `--allow-root <path>` | Allow scans only inside this root. Repeat for multiple roots. Defaults to the current working directory. |
| `--timeout-ms <ms>` | Kill a wrapped Axiom CLI command after this timeout. Defaults to `60000`. |
| `--cli <path>` | Use a specific built `dist/cli.js`. Mostly useful for local testing. |

The server speaks newline-delimited JSON-RPC over stdio. It writes only protocol messages to stdout. Logs and `--help` output go to stderr.

Minimum supported methods:

- `initialize`
- `ping`
- `tools/list`
- `tools/call`
- `notifications/initialized` as a no-op notification

## Server Implementation Notes

`src/mcp/server.ts` imports the preview adapter, executes the returned command with `spawn`, then passes `{ exitCode, stdout, stderr }` to `createAxiomMcpToolResult()`.

Minimum server responsibilities:

- validate the requested project root against allowed workspace roots,
- use timeouts for CLI execution,
- validate `configPath`, `baselinePath`, and `specPaths` against allowed roots before execution,
- return raw arrays such as `violations[]`, `warnings[]`, `intentionalDebt[]`, and `drift`,
- avoid creating baselines during PR review,
- log tool calls without leaking private code or contracts to remote services.

Do not make the MCP server a second architecture engine. It is only an agent-native access layer over Axiom's existing evidence artifact.
