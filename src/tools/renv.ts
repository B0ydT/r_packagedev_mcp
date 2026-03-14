import { z } from "zod";
import { executeR, formatResult, rStr } from "../r-executor.js";

// ---------------------------------------------------------------------------
// Schema definitions
// ---------------------------------------------------------------------------

export const renvToolSchemas = {
  renv_init: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the project root where renv should be initialised."),
    bare: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "If TRUE, initialise without installing any packages into the new library (default false)."
      ),
    restart: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to restart the R session after initialising (default false)."),
  }),

  renv_snapshot: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the renv-managed project root."),
    type: z
      .enum(["implicit", "explicit", "all", "custom"])
      .optional()
      .default("implicit")
      .describe(
        "Snapshot type: 'implicit' (DESCRIPTION), 'explicit' (renv.lock packages), 'all' (everything installed), or 'custom' (default 'implicit')."
      ),
  }),

  renv_restore: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the renv-managed project root."),
    rebuild: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to rebuild packages from source (default false)."),
  }),

  renv_status: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the renv-managed project root."),
  }),

  renv_install: z.object({
    packages: z
      .array(z.string())
      .describe(
        "Package names (and optional version specifiers) to install, e.g. ['ggplot2', 'dplyr@1.0.0']."
      ),
    project_path: z
      .string()
      .describe("Absolute path to the renv-managed project root."),
    rebuild: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to rebuild packages from source (default false)."),
  }),

  renv_update: z.object({
    packages: z
      .array(z.string())
      .optional()
      .describe(
        "Package names to update. If omitted, all packages are updated."
      ),
    project_path: z
      .string()
      .describe("Absolute path to the renv-managed project root."),
  }),

  renv_clean: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the renv-managed project root."),
    actions: z
      .array(
        z.enum([
          "package.locks",
          "library.tempdirs",
          "system.library",
          "unused.packages",
        ])
      )
      .optional()
      .describe(
        "Specific cleaning actions to perform (default: all applicable actions)."
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

export const renvHandlers: Record<
  keyof typeof renvToolSchemas,
  (args: Record<string, unknown>) => Promise<HandlerResult>
> = {
  renv_init: async (args) => {
    const { project_path, bare, restart } = args as z.infer<
      typeof renvToolSchemas.renv_init
    >;
    const bareStr = bare ? "TRUE" : "FALSE";
    const restartStr = restart ? "TRUE" : "FALSE";
    const code = `renv::init(${rStr(project_path)}, bare = ${bareStr}, restart = ${restartStr})`;
    const result = await executeR(code, project_path, 300_000);
    return ok(formatResult(result));
  },

  renv_snapshot: async (args) => {
    const { project_path, type } = args as z.infer<
      typeof renvToolSchemas.renv_snapshot
    >;
    const typeStr = type ?? "implicit";
    const code = `renv::snapshot(${rStr(project_path)}, type = ${rStr(typeStr)})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  renv_restore: async (args) => {
    const { project_path, rebuild } = args as z.infer<
      typeof renvToolSchemas.renv_restore
    >;
    const rebuildStr = rebuild ? "TRUE" : "FALSE";
    const code = `renv::restore(${rStr(project_path)}, rebuild = ${rebuildStr})`;
    const result = await executeR(code, project_path, 600_000);
    return ok(formatResult(result));
  },

  renv_status: async (args) => {
    const { project_path } = args as z.infer<typeof renvToolSchemas.renv_status>;
    const code = `renv::status(${rStr(project_path)})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  renv_install: async (args) => {
    const { packages, project_path, rebuild } = args as z.infer<
      typeof renvToolSchemas.renv_install
    >;
    const pkgList = packages.map((p) => rStr(p)).join(", ");
    const rebuildStr = rebuild ? "TRUE" : "FALSE";
    const code = `renv::install(c(${pkgList}), project = ${rStr(project_path)}, rebuild = ${rebuildStr})`;
    const result = await executeR(code, project_path, 600_000);
    return ok(formatResult(result));
  },

  renv_update: async (args) => {
    const { packages, project_path } = args as z.infer<
      typeof renvToolSchemas.renv_update
    >;
    const pkgsArg =
      packages && packages.length > 0
        ? `c(${packages.map((p) => rStr(p)).join(", ")})`
        : "NULL";
    const code = `renv::update(${pkgsArg}, project = ${rStr(project_path)})`;
    const result = await executeR(code, project_path, 600_000);
    return ok(formatResult(result));
  },

  renv_clean: async (args) => {
    const { project_path, actions } = args as z.infer<
      typeof renvToolSchemas.renv_clean
    >;
    const actionsArg =
      actions && actions.length > 0
        ? `, actions = c(${actions.map((a) => rStr(a)).join(", ")})`
        : "";
    const code = `renv::clean(${rStr(project_path)}${actionsArg})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },
};
