#!/usr/bin/env node
/**
 * r-packagedev-mcp – MCP server for R package development
 *
 * Exposes tools wrapping usethis, devtools, renv, and testthat via the
 * Model Context Protocol so that AI assistants can assist with R package
 * development tasks using natural language.
 *
 * Transport: stdio (default for MCP integrations such as Claude Desktop,
 * VS Code Copilot, and Cursor).
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it does not interfere with the stdio MCP stream
  process.stderr.write("r-packagedev-mcp server running (stdio transport)\n");
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal error: ${String(err)}\n`);
  process.exit(1);
});
