# Copilot Instructions for r-packagedev-mcp

## Project Overview

`r-packagedev-mcp` is a standalone **TypeScript/Node.js MCP (Model Context Protocol) server** that exposes R package development capabilities to AI assistants via stdio transport. It wraps four R packages — `usethis`, `devtools`, `renv`, and `testthat` — as structured MCP tools.

The server proxies tool calls into `Rscript -e` subprocesses. **R must be installed** on the host and the four R packages must be available.

---

## Architecture

```
src/
├── index.ts          # Entry point – creates and starts the stdio MCP server
├── server.ts         # Registers all tools (schemas + handlers) with the MCP SDK
├── r-executor.ts     # Spawns Rscript subprocesses, escapes inputs, formats results
└── tools/
    ├── usethis.ts    # usethis tool schemas (Zod) + handlers
    ├── devtools.ts   # devtools tool schemas (Zod) + handlers
    ├── renv.ts       # renv tool schemas (Zod) + handlers
    └── testthat.ts   # testthat tool schemas (Zod) + handlers
```

Each tool module follows the same pattern:
- **Schema map** – a `Record<string, z.ZodObject<...>>` named `<pkg>ToolSchemas` that defines and validates tool inputs using [Zod](https://zod.dev/).
- **Handler map** – a `Record<string, (args) => Promise<McpToolResult>>` named `<pkg>Handlers` that translates validated inputs into an `Rscript -e` call using helpers from `r-executor.ts` and returns MCP-formatted text content.

`server.ts` iterates over all schema/handler maps and registers each tool with the `McpServer` instance.

---

## Key Utilities (`src/r-executor.ts`)

| Export | Purpose |
|--------|---------|
| `rStr(value)` | Wraps a JS string in R double-quotes with backslashes and double-quotes escaped. **Always use this when embedding user-supplied strings in R code.** |
| `escapeRString(value)` | Lower-level escape (no surrounding quotes). Rejects null bytes. |
| `executeR(rCode, workdir?, timeoutMs?)` | Spawns `Rscript -e <rCode>`, captures stdout/stderr, returns `RExecutionResult`. Default timeout 120 s. |
| `formatResult(result)` | Formats an `RExecutionResult` into a human-readable MCP text response. |

---

## Development Commands

```bash
# Type-check (no emit) – the project's "lint" step
npm run lint

# Compile TypeScript → dist/
npm run build

# Run directly via ts-node (no build step required)
npm run dev

# Start compiled server
npm start
```

There is no automated test suite in this repository. Validate changes by running `npm run lint` (type-check) and `npm run build`.

---

## Coding Conventions

- **Language / runtime**: TypeScript (CommonJS output), Node.js ≥ 18.
- **Module resolution**: `"moduleResolution": "node"` (see `tsconfig.json`). Imports use `.js` extensions for built output (e.g., `import ... from "./tools/usethis.js"`).
- **R string safety**: All user-supplied strings passed to R **must** go through `rStr()` from `r-executor.ts` to prevent injection. Never concatenate raw user input into R code.
- **Tool structure**: Each tool module exports exactly two maps — `<pkg>ToolSchemas` and `<pkg>Handlers`. Keys must match exactly between the two maps and must match the tool name registered in `server.ts`.
- **Zod validation**: Use `z.string()`, `z.boolean()`, `z.enum()`, etc. from the `zod` package for all tool input schemas. Optional parameters use `.optional()`.
- **MCP response format**: Handlers return `{ content: [{ type: "text", text: string }] }`.
- **Error handling**: `executeR` never throws; on failure it returns `success: false` with an error in `stderr`. Use `formatResult` to surface both stdout and stderr in the MCP response.
- **No unrestricted R execution**: Tools must invoke specific R package functions, not arbitrary code supplied by the caller.

---

## Adding a New Tool

1. Choose (or create) the appropriate tool module under `src/tools/`.
2. Add a Zod schema to the `<pkg>ToolSchemas` map.
3. Add a matching handler to the `<pkg>Handlers` map. Use `rStr()` for all string arguments.
4. Add a description string in the `TOOL_DESCRIPTIONS` record in `server.ts`.
5. Run `npm run lint` to verify types, then `npm run build` to confirm compilation.

---

## Dependencies

| Package | Role |
|---------|------|
| `@modelcontextprotocol/sdk` | MCP server SDK (stdio transport, tool registration) |
| `zod` | Runtime schema validation for tool inputs |
| `typescript` (dev) | TypeScript compiler |
| `ts-node` (dev) | Direct TypeScript execution for development |
| `@types/node` (dev) | Node.js type definitions |
