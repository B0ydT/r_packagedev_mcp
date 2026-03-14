import { z } from "zod";
import { executeR, formatResult, rStr } from "../r-executor.js";

// ---------------------------------------------------------------------------
// Schema definitions
// ---------------------------------------------------------------------------

export const devtoolsToolSchemas = {
  load_all: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
    reset: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to reset the namespace before loading (default false)."),
    recompile: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to recompile C/C++/Fortran code (default false)."),
  }),

  document: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
    roclets: z
      .array(z.string())
      .optional()
      .describe(
        "Character vector of roclet names to use (e.g. ['rd', 'namespace']). Defaults to all."
      ),
  }),

  test: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
    filter: z
      .string()
      .optional()
      .describe(
        "Regex pattern to restrict which test files are run (e.g. 'my_func')."
      ),
    reporter: z
      .string()
      .optional()
      .describe("testthat reporter to use (e.g. 'progress', 'summary'). Defaults to 'progress'."),
  }),

  check: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
    document: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to run devtools::document() before checking (default true)."),
    cran: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to use CRAN-specific settings (default false)."),
    error_on: z
      .enum(["never", "note", "warning", "error"])
      .optional()
      .default("warning")
      .describe(
        "Minimum check severity that causes an error: 'never', 'note', 'warning', or 'error' (default 'warning')."
      ),
  }),

  install: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
    dependencies: z
      .boolean()
      .optional()
      .describe(
        "Whether to install package dependencies (default TRUE for Imports/Depends/Suggests)."
      ),
    upgrade: z
      .enum(["default", "ask", "always", "never"])
      .optional()
      .default("default")
      .describe("Whether to upgrade dependencies (default 'default')."),
  }),

  build: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
    path: z
      .string()
      .optional()
      .describe(
        "Destination directory for the built tarball/zip (defaults to the parent of the package directory)."
      ),
    binary: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to build a binary package instead of source (default false)."),
    vignettes: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to build vignettes (default true)."),
  }),

  build_readme: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
  }),

  spell_check: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
    vignettes: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to spell-check vignettes (default true)."),
  }),
};

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

type HandlerResult = { content: Array<{ type: "text"; text: string }> };

function ok(text: string): HandlerResult {
  return { content: [{ type: "text", text }] };
}

export const devtoolsHandlers: Record<
  keyof typeof devtoolsToolSchemas,
  (args: Record<string, unknown>) => Promise<HandlerResult>
> = {
  load_all: async (args) => {
    const { project_path, reset, recompile } = args as z.infer<
      typeof devtoolsToolSchemas.load_all
    >;
    const resetStr = reset ? "TRUE" : "FALSE";
    const recompileStr = recompile ? "TRUE" : "FALSE";
    const code = `devtools::load_all(${rStr(project_path)}, reset = ${resetStr}, recompile = ${recompileStr})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  document: async (args) => {
    const { project_path, roclets } = args as z.infer<
      typeof devtoolsToolSchemas.document
    >;
    const rocletsArg =
      roclets && roclets.length > 0
        ? `, roclets = c(${roclets.map((r) => rStr(r)).join(", ")})`
        : "";
    const code = `devtools::document(${rStr(project_path)}${rocletsArg})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  test: async (args) => {
    const { project_path, filter, reporter } = args as z.infer<
      typeof devtoolsToolSchemas.test
    >;
    const filterArg = filter ? `, filter = ${rStr(filter)}` : "";
    const reporterArg = reporter ? `, reporter = ${rStr(reporter)}` : "";
    const code = `devtools::test(${rStr(project_path)}${filterArg}${reporterArg})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  check: async (args) => {
    const { project_path, document: doc, cran, error_on } = args as z.infer<
      typeof devtoolsToolSchemas.check
    >;
    const docStr = doc !== false ? "TRUE" : "FALSE";
    const cranStr = cran ? "TRUE" : "FALSE";
    const errorOnStr = error_on ?? "warning";
    const code = `devtools::check(${rStr(project_path)}, document = ${docStr}, cran = ${cranStr}, error_on = ${rStr(errorOnStr)})`;
    const result = await executeR(code, project_path, 600_000);
    return ok(formatResult(result));
  },

  install: async (args) => {
    const { project_path, dependencies, upgrade } = args as z.infer<
      typeof devtoolsToolSchemas.install
    >;
    const depsArg =
      dependencies != null ? `, dependencies = ${dependencies ? "TRUE" : "FALSE"}` : "";
    const upgradeStr = upgrade ?? "default";
    const code = `devtools::install(${rStr(project_path)}${depsArg}, upgrade = ${rStr(upgradeStr)})`;
    const result = await executeR(code, project_path, 300_000);
    return ok(formatResult(result));
  },

  build: async (args) => {
    const { project_path, path: destPath, binary, vignettes } = args as z.infer<
      typeof devtoolsToolSchemas.build
    >;
    const pathArg = destPath ? `, path = ${rStr(destPath)}` : "";
    const binaryStr = binary ? "TRUE" : "FALSE";
    const vignettesStr = vignettes !== false ? "TRUE" : "FALSE";
    const code = `devtools::build(${rStr(project_path)}${pathArg}, binary = ${binaryStr}, vignettes = ${vignettesStr})`;
    const result = await executeR(code, project_path, 300_000);
    return ok(formatResult(result));
  },

  build_readme: async (args) => {
    const { project_path } = args as z.infer<typeof devtoolsToolSchemas.build_readme>;
    const code = `devtools::build_readme(${rStr(project_path)})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  spell_check: async (args) => {
    const { project_path, vignettes } = args as z.infer<
      typeof devtoolsToolSchemas.spell_check
    >;
    const vigStr = vignettes !== false ? "TRUE" : "FALSE";
    const code = `devtools::spell_check(${rStr(project_path)}, vignettes = ${vigStr})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },
};
