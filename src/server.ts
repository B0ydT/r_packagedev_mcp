import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { usethisToolSchemas, usethisHandlers } from "./tools/usethis.js";
import { devtoolsToolSchemas, devtoolsHandlers } from "./tools/devtools.js";
import { renvToolSchemas, renvHandlers } from "./tools/renv.js";
import { testthatToolSchemas, testthatHandlers } from "./tools/testthat.js";
import { ensurePackagesInstalled } from "./r-dependencies.js";

// ---------------------------------------------------------------------------
// Tool descriptions
// ---------------------------------------------------------------------------

const TOOL_DESCRIPTIONS: Record<string, string> = {
  // usethis
  create_package:
    "Create a new R package skeleton at the specified path using usethis::create_package(). " +
    "Sets up DESCRIPTION, NAMESPACE, and the R/ directory.",
  use_r:
    "Add a new R source file under R/ in an existing package using usethis::use_r(). " +
    "Creates 'R/<name>.R' with minimal boilerplate.",
  use_test:
    "Create a matching test file under tests/testthat/ for a given function or module " +
    "using usethis::use_test(). Automatically sets up testthat if not already configured.",
  use_readme_md:
    "Add a README.md to the package root using usethis::use_readme_md().",
  use_vignette:
    "Create a new vignette stub (Rmd file) under vignettes/ using usethis::use_vignette().",
  use_mit_license:
    "Add an MIT LICENSE file and update DESCRIPTION License field using usethis::use_mit_license().",
  use_gpl3_license:
    "Add a GPL-3 LICENSE file and update DESCRIPTION License field using usethis::use_gpl3_license().",
  use_package:
    "Add a package dependency to DESCRIPTION using usethis::use_package(). " +
    "Supports Imports, Suggests, Depends, LinkingTo, and Enhances.",
  use_testthat:
    "Configure the testthat testing infrastructure for a package using usethis::use_testthat(). " +
    "Creates tests/testthat/ and adds testthat to Suggests.",
  use_git:
    "Initialise a Git repository in the package and make an initial commit " +
    "using usethis::use_git().",
  use_github:
    "Create a GitHub remote for the package and push using usethis::use_github(). " +
    "Requires a GitHub PAT configured via GITHUB_PAT or gh_token().",
  use_data:
    "Export one or more R objects as package data files under data/ using usethis::use_data(). " +
    "The objects must already be loaded in the R environment.",
  use_pipe:
    "Add the magrittr pipe (%>%) to the package via usethis::use_pipe(). " +
    "Creates utils-pipe.R and updates NAMESPACE.",

  // devtools
  load_all:
    "Simulate installing and attaching the package using devtools::load_all(). " +
    "Makes all functions available in the current R session for interactive testing.",
  document:
    "Generate roxygen2 documentation and update NAMESPACE using devtools::document(). " +
    "Reads @-tags from R source and creates man/*.Rd files.",
  test:
    "Run the package's test suite (or a filtered subset) using devtools::test(). " +
    "Reports test results in the chosen format.",
  check:
    "Run R CMD check on the package using devtools::check(). " +
    "Identifies errors, warnings, and notes that would prevent CRAN submission.",
  install:
    "Install the package into the local R library using devtools::install().",
  build:
    "Build a source (or binary) package tarball using devtools::build().",
  build_readme:
    "Render README.Rmd to README.md and update GitHub preview using devtools::build_readme().",
  spell_check:
    "Spell-check the package documentation and vignettes using devtools::spell_check().",

  // renv
  renv_init:
    "Initialise an renv project-local library for the project using renv::init(). " +
    "Creates renv/ and renv.lock, and updates .Rprofile.",
  renv_snapshot:
    "Record the current package dependencies into renv.lock using renv::snapshot().",
  renv_restore:
    "Restore packages from renv.lock to recreate the recorded environment using renv::restore().",
  renv_status:
    "Report whether the project library is synchronised with renv.lock using renv::status().",
  renv_install:
    "Install packages into the renv project library using renv::install(). " +
    "Supports CRAN packages, GitHub (user/repo), or version-pinned installs.",
  renv_update:
    "Update packages in the renv project library using renv::update(). " +
    "If no package names are given, all outdated packages are updated.",
  renv_clean:
    "Remove unused packages or temporary files from the renv library using renv::clean().",

  // testthat
  test_file:
    "Run a single testthat test file using testthat::test_file(). " +
    "Useful for rapid iteration on a specific file.",
  test_dir:
    "Run all test files in a directory (optionally filtered) using testthat::test_dir(). " +
    "Returns a summary of pass/fail/skip counts.",
};

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

export function createServer(): McpServer {
  const server = new McpServer({
    name: "r-packagedev-mcp",
    version: "1.0.0",
  });

  // Register usethis tools
  for (const [name, schema] of Object.entries(usethisToolSchemas)) {
    server.tool(
      name,
      TOOL_DESCRIPTIONS[name] ?? `usethis::${name}()`,
      schema.shape as z.ZodRawShape,
      async (args) => {
        const installNote = await ensurePackagesInstalled(["usethis"]);
        const result = await usethisHandlers[name as keyof typeof usethisHandlers](args as Record<string, unknown>);
        if (installNote) result.content.unshift({ type: "text", text: installNote });
        return result;
      }
    );
  }

  // Register devtools tools
  for (const [name, schema] of Object.entries(devtoolsToolSchemas)) {
    server.tool(
      name,
      TOOL_DESCRIPTIONS[name] ?? `devtools::${name}()`,
      schema.shape as z.ZodRawShape,
      async (args) => {
        const installNote = await ensurePackagesInstalled(["devtools"]);
        const result = await devtoolsHandlers[name as keyof typeof devtoolsHandlers](args as Record<string, unknown>);
        if (installNote) result.content.unshift({ type: "text", text: installNote });
        return result;
      }
    );
  }

  // Register renv tools (prefixed with renv_ to avoid collisions)
  for (const [name, schema] of Object.entries(renvToolSchemas)) {
    server.tool(
      name,
      TOOL_DESCRIPTIONS[name] ?? `renv::${name.replace("renv_", "")}()`,
      schema.shape as z.ZodRawShape,
      async (args) => {
        const installNote = await ensurePackagesInstalled(["renv"]);
        const result = await renvHandlers[name as keyof typeof renvHandlers](args as Record<string, unknown>);
        if (installNote) result.content.unshift({ type: "text", text: installNote });
        return result;
      }
    );
  }

  // Register testthat tools
  for (const [name, schema] of Object.entries(testthatToolSchemas)) {
    server.tool(
      name,
      TOOL_DESCRIPTIONS[name] ?? `testthat::${name}()`,
      schema.shape as z.ZodRawShape,
      async (args) => {
        const installNote = await ensurePackagesInstalled(["testthat"]);
        const result = await testthatHandlers[name as keyof typeof testthatHandlers](args as Record<string, unknown>);
        if (installNote) result.content.unshift({ type: "text", text: installNote });
        return result;
      }
    );
  }

  return server;
}
