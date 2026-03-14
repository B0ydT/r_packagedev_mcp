# r-packagedev-mcp

A standalone [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that exposes advanced R package development capabilities to AI assistants through natural language.

## Overview

`r-packagedev-mcp` wraps the four most important R package development packages into a unified MCP tool surface:

| Package | Purpose | Tools provided |
|---------|---------|----------------|
| [**usethis**](https://usethis.r-lib.org/) | Automate package setup and configuration | `create_package`, `use_r`, `use_test`, `use_readme_md`, `use_vignette`, `use_mit_license`, `use_gpl3_license`, `use_package`, `use_testthat`, `use_git`, `use_github`, `use_data`, `use_pipe` |
| [**devtools**](https://devtools.r-lib.org/) | Full package development cycle | `load_all`, `document`, `test`, `check`, `install`, `build`, `build_readme`, `spell_check` |
| [**renv**](https://rstudio.github.io/renv/) | Reproducible environments | `renv_init`, `renv_snapshot`, `renv_restore`, `renv_status`, `renv_install`, `renv_update`, `renv_clean` |
| [**testthat**](https://testthat.r-lib.org/) | Unit testing | `test_file`, `test_dir` |

### Why a standalone server instead of an add-on?

Existing R MCP servers (e.g. [rmcp](https://github.com/finite-sample/rmcp)) focus on **statistical analysis** – running arbitrary R code, fitting models, generating plots. They are not designed for the **package development** workflow.

Building a standalone server allows:

- **Purpose-built tool interfaces** with clear parameter names and defaults that match package development conventions.
- **No dependency** on a third-party R MCP server that may have a different architecture, authentication model, or update cadence.
- **Portability** – the server is a single Node.js binary that proxies calls to `Rscript`; it works anywhere R is installed.
- **Safety** – tools are scoped to specific, well-defined package development operations rather than unrestricted R code execution.

## Requirements

- **Node.js** ≥ 18
- **R** ≥ 4.1 with the following packages installed:

  ```r
  install.packages(c("usethis", "devtools", "renv", "testthat"))
  ```

## Installation

### From source

```bash
git clone https://github.com/B0ydT/r_packagedev_mcp.git
cd r_packagedev_mcp
npm install
npm run build
```

### Running the server

```bash
node dist/index.js
```

The server communicates over **stdio** (standard input/output), which is the default transport used by Claude Desktop, VS Code Copilot, Cursor, and most MCP clients.

## Configuration

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "r-packagedev": {
      "command": "node",
      "args": ["/path/to/r_packagedev_mcp/dist/index.js"]
    }
  }
}
```

### VS Code / Cursor (`.mcp.json` or settings)

```json
{
  "servers": {
    "r-packagedev": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/r_packagedev_mcp/dist/index.js"]
    }
  }
}
```

## Tool reference

### usethis

| Tool | Description |
|------|-------------|
| `create_package` | Scaffold a new R package at a given path |
| `use_r` | Create `R/<name>.R` in an existing package |
| `use_test` | Create a matching test file under `tests/testthat/` |
| `use_readme_md` | Add `README.md` to the package root |
| `use_vignette` | Create a vignette stub under `vignettes/` |
| `use_mit_license` | Add MIT `LICENSE` and update `DESCRIPTION` |
| `use_gpl3_license` | Add GPL-3 `LICENSE` and update `DESCRIPTION` |
| `use_package` | Add a dependency to `DESCRIPTION` |
| `use_testthat` | Configure testthat testing infrastructure |
| `use_git` | Initialise a Git repo and make an initial commit |
| `use_github` | Create a GitHub remote and push |
| `use_data` | Export R objects as package data under `data/` |
| `use_pipe` | Add the `%>%` pipe operator to the package |

### devtools

| Tool | Description |
|------|-------------|
| `load_all` | Simulate `library(pkg)` for interactive testing |
| `document` | Run roxygen2 and update `NAMESPACE` |
| `test` | Run the test suite (optionally filtered) |
| `check` | Run `R CMD check` |
| `install` | Install the package into the local library |
| `build` | Build a source tarball |
| `build_readme` | Render `README.Rmd` → `README.md` |
| `spell_check` | Spell-check documentation and vignettes |

### renv

| Tool | Description |
|------|-------------|
| `renv_init` | Initialise an renv project library |
| `renv_snapshot` | Record current dependencies to `renv.lock` |
| `renv_restore` | Restore packages from `renv.lock` |
| `renv_status` | Check library vs lockfile sync status |
| `renv_install` | Install packages into the renv library |
| `renv_update` | Update packages in the renv library |
| `renv_clean` | Remove unused packages / temp files |

### testthat

| Tool | Description |
|------|-------------|
| `test_file` | Run a single test file |
| `test_dir` | Run all tests in a directory |

## Development

```bash
# Type-check without emitting
npm run lint

# Build
npm run build

# Run in dev mode (ts-node, no build step)
npm run dev
```

## Publishing

Two GitHub Actions workflows are provided for automated publishing:

| Workflow | File | Trigger |
|----------|------|---------|
| **CI** | `.github/workflows/ci.yml` | Every push / PR to `main` — lints and builds |
| **Publish** | `.github/workflows/publish.yml` | GitHub Release published **or** manual `workflow_dispatch` |

The publish workflow covers two destinations:

1. **NPM** (`publish-npm` job) — builds the package and runs `npm publish`.
2. **Official MCP Registry** (`publish-mcp-registry` job) — uses the [`mcp-publisher`](https://github.com/modelcontextprotocol/registry) CLI with GitHub OIDC to push `server.json` to `registry.mcp.tools`.

A [`smithery.yaml`](smithery.yaml) is also included for discovery on the [Smithery MCP marketplace](https://smithery.ai).

### External configuration required

#### 1 · NPM Token

Create an **automation token** at <https://www.npmjs.com/settings/\<your-username\>/tokens> (type: *Automation*), then add it to the repository:

> **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**  
> Name: `NPM_TOKEN`  
> Value: `npm_xxxxxxxxxxxxxxxx`

#### 2 · MCP Registry — GitHub OIDC

The MCP registry uses [GitHub OIDC](https://modelcontextprotocol.io/registry/github-actions) for passwordless authentication — **no extra secret is needed**.  
You only need to authorise the MCP Registry GitHub App for your repository once:

1. Visit <https://github.com/apps/mcp-registry> and install / authorise it for `B0ydT/r_packagedev_mcp`.
2. The `id-token: write` permission in the workflow is already set; no further action is required.

#### 3 · Smithery (optional)

Connect the repository to Smithery via their web UI at <https://smithery.ai>. Smithery reads `smithery.yaml` directly from the repo — no token or CI step is required.

#### 4 · Versioning

Before publishing a new release:

1. Update `"version"` in `package.json` **and** `server.json` to the new semver (e.g. `1.1.0`).
2. Commit and push.
3. Create a GitHub Release with a matching tag (`v1.1.0`).

The publish workflow will automatically sync the version from the git tag into both `package.json` and `server.json` at publish time, so manual edits are a safety net rather than a requirement.

## Architecture

```
src/
├── index.ts          # Entry point – starts stdio MCP server
├── server.ts         # Registers all tools with the MCP SDK
├── r-executor.ts     # Spawns Rscript subprocesses & formats results
└── tools/
    ├── usethis.ts    # usethis tool schemas + handlers
    ├── devtools.ts   # devtools tool schemas + handlers
    ├── renv.ts       # renv tool schemas + handlers
    └── testthat.ts   # testthat tool schemas + handlers
```

Each tool module exports:
- A **schema map** (`z.ZodObject` per tool) that defines input validation.
- A **handler map** that translates validated inputs into an `Rscript -e` call and returns the formatted output as MCP text content.

## License

MIT
