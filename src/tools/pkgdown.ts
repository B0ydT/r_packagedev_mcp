import { z } from "zod";
import { executeR, formatResult, rStr } from "../r-executor.js";

// ---------------------------------------------------------------------------
// Schema definitions
// ---------------------------------------------------------------------------

export const pkgdownToolSchemas = {
  pkgdown_build_site: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
    examples: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to run examples in the reference documentation (default true)."),
    run_dont_run: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to run \\dontrun{} examples (default false)."),
    lazy: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Whether to only rebuild pages that have changed since the last build (default false)."
      ),
    override: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        "Named list of fields to override from _pkgdown.yml, e.g. {destination: 'docs'}."
      ),
    preview: z
      .boolean()
      .optional()
      .describe(
        "Whether to open the site in a browser after building. Defaults to NA (auto-detect)."
      ),
  }),

  pkgdown_init_site: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
    override: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        "Named list of fields to override from _pkgdown.yml, e.g. {destination: 'docs'}."
      ),
  }),

  pkgdown_build_home: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
    quiet: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to suppress output during the build (default true)."),
    override: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        "Named list of fields to override from _pkgdown.yml, e.g. {destination: 'docs'}."
      ),
  }),

  pkgdown_build_reference: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
    lazy: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Whether to only rebuild pages that have changed since the last build (default false)."
      ),
    examples: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to run examples (default true)."),
    run_dont_run: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to run \\dontrun{} examples (default false)."),
    topics: z
      .array(z.string())
      .optional()
      .describe(
        "Character vector of topic names to limit which reference pages are built."
      ),
    override: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        "Named list of fields to override from _pkgdown.yml, e.g. {destination: 'docs'}."
      ),
  }),

  pkgdown_build_articles: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
    lazy: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Whether to only rebuild articles that have changed since the last build (default false)."
      ),
    filter: z
      .string()
      .optional()
      .describe(
        "Regex pattern to restrict which article files are built (matched against article name)."
      ),
    override: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        "Named list of fields to override from _pkgdown.yml, e.g. {destination: 'docs'}."
      ),
  }),

  pkgdown_build_news: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
    override: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        "Named list of fields to override from _pkgdown.yml, e.g. {destination: 'docs'}."
      ),
  }),
};

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

type HandlerResult = { content: Array<{ type: "text"; text: string }> };

function ok(text: string): HandlerResult {
  return { content: [{ type: "text", text }] };
}

/**
 * Serialise a JS plain-object to an R list() expression for use as the
 * `override` argument. Only string, number, and boolean leaf values are
 * supported; anything else is ignored.
 */
function buildOverrideArg(override: Record<string, unknown> | undefined): string {
  if (!override || Object.keys(override).length === 0) return "";
  const pairs = Object.entries(override)
    .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    .map(([k, v]) => {
      const rVal =
        typeof v === "string"
          ? rStr(v)
          : typeof v === "boolean"
          ? v ? "TRUE" : "FALSE"
          : String(v);
      return `${rStr(k)} = ${rVal}`;
    });
  if (pairs.length === 0) return "";
  return `, override = list(${pairs.join(", ")})`;
}

export const pkgdownHandlers: Record<
  keyof typeof pkgdownToolSchemas,
  (args: Record<string, unknown>) => Promise<HandlerResult>
> = {
  pkgdown_build_site: async (args) => {
    const { project_path, examples, run_dont_run, lazy, override, preview } =
      args as z.infer<typeof pkgdownToolSchemas.pkgdown_build_site>;
    const examplesStr = examples !== false ? "TRUE" : "FALSE";
    const runDontRunStr = run_dont_run ? "TRUE" : "FALSE";
    const lazyStr = lazy ? "TRUE" : "FALSE";
    const previewArg =
      preview == null ? "" : `, preview = ${preview ? "TRUE" : "FALSE"}`;
    const overrideArg = buildOverrideArg(override);
    const code =
      `pkgdown::build_site(${rStr(project_path)}, examples = ${examplesStr}, ` +
      `run_dont_run = ${runDontRunStr}, lazy = ${lazyStr}${overrideArg}${previewArg}, new_process = FALSE)`;
    const result = await executeR(code, project_path, 600_000);
    return ok(formatResult(result));
  },

  pkgdown_init_site: async (args) => {
    const { project_path, override } = args as z.infer<
      typeof pkgdownToolSchemas.pkgdown_init_site
    >;
    const overrideArg = buildOverrideArg(override);
    const code = `pkgdown::init_site(${rStr(project_path)}${overrideArg})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  pkgdown_build_home: async (args) => {
    const { project_path, quiet, override } = args as z.infer<
      typeof pkgdownToolSchemas.pkgdown_build_home
    >;
    const quietStr = quiet !== false ? "TRUE" : "FALSE";
    const overrideArg = buildOverrideArg(override);
    const code = `pkgdown::build_home(${rStr(project_path)}, quiet = ${quietStr}${overrideArg})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  pkgdown_build_reference: async (args) => {
    const { project_path, lazy, examples, run_dont_run, topics, override } =
      args as z.infer<typeof pkgdownToolSchemas.pkgdown_build_reference>;
    const lazyStr = lazy ? "TRUE" : "FALSE";
    const examplesStr = examples !== false ? "TRUE" : "FALSE";
    const runDontRunStr = run_dont_run ? "TRUE" : "FALSE";
    const topicsArg =
      topics && topics.length > 0
        ? `, topics = c(${topics.map((t) => rStr(t)).join(", ")})`
        : "";
    const overrideArg = buildOverrideArg(override);
    const code =
      `pkgdown::build_reference(${rStr(project_path)}, lazy = ${lazyStr}, ` +
      `examples = ${examplesStr}, run_dont_run = ${runDontRunStr}${topicsArg}${overrideArg})`;
    const result = await executeR(code, project_path, 300_000);
    return ok(formatResult(result));
  },

  pkgdown_build_articles: async (args) => {
    const { project_path, lazy, filter, override } = args as z.infer<
      typeof pkgdownToolSchemas.pkgdown_build_articles
    >;
    const lazyStr = lazy ? "TRUE" : "FALSE";
    const filterArg = filter ? `, filter = ${rStr(filter)}` : "";
    const overrideArg = buildOverrideArg(override);
    const code =
      `pkgdown::build_articles(${rStr(project_path)}, lazy = ${lazyStr}${filterArg}${overrideArg})`;
    const result = await executeR(code, project_path, 300_000);
    return ok(formatResult(result));
  },

  pkgdown_build_news: async (args) => {
    const { project_path, override } = args as z.infer<
      typeof pkgdownToolSchemas.pkgdown_build_news
    >;
    const overrideArg = buildOverrideArg(override);
    const code = `pkgdown::build_news(${rStr(project_path)}${overrideArg})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },
};
