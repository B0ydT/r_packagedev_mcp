import { z } from "zod";
import { executeR, formatResult, rStr } from "../r-executor.js";

// ---------------------------------------------------------------------------
// Schema definitions
// ---------------------------------------------------------------------------

export const usethisToolSchemas = {
  create_package: z.object({
    path: z
      .string()
      .describe(
        "Absolute path where the new package directory should be created (e.g. '/home/user/mypackage')."
      ),
    fields: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        "Named list of extra DESCRIPTION fields, e.g. {Author: 'Jane Doe', Version: '0.1.0'}."
      ),
    open: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to open the new package in RStudio (default false)."),
  }),

  use_r: z.object({
    name: z.string().describe("Name of the R script (without .R extension)."),
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
  }),

  use_test: z.object({
    name: z
      .string()
      .describe("Name of the function or module to create a test file for."),
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
  }),

  use_readme_md: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
  }),

  use_vignette: z.object({
    name: z.string().describe("Short name/identifier for the vignette."),
    title: z.string().optional().describe("Human-readable title of the vignette."),
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
  }),

  use_mit_license: z.object({
    copyright_holder: z
      .string()
      .optional()
      .describe("Name to include in the copyright notice (defaults to package author)."),
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
  }),

  use_gpl3_license: z.object({
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
  }),

  use_package: z.object({
    package: z
      .string()
      .describe("Name of the R package to add as a dependency."),
    type: z
      .enum(["Imports", "Suggests", "Depends", "LinkingTo", "Enhances"])
      .optional()
      .default("Imports")
      .describe("Dependency type in DESCRIPTION (default 'Imports')."),
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
  }),

  use_testthat: z.object({
    edition: z
      .number()
      .int()
      .optional()
      .describe("testthat edition to use (e.g. 3). Defaults to latest stable edition."),
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
  }),

  use_git: z.object({
    message: z
      .string()
      .optional()
      .describe("Message for the initial commit (default: 'Initial commit')."),
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
  }),

  use_github: z.object({
    organisation: z
      .string()
      .optional()
      .describe("GitHub organisation to create the repo under (optional, defaults to personal account)."),
    private: z
      .boolean()
      .optional()
      .default(false)
      .describe("Create as a private repository (default false)."),
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
  }),

  use_data: z.object({
    object_names: z
      .array(z.string())
      .describe("Character vector of R object names already loaded in the workspace to export as package data."),
    overwrite: z
      .boolean()
      .optional()
      .default(false)
      .describe("Overwrite existing data files (default false)."),
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
  }),

  use_pipe: z.object({
    export: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to export the pipe operator (default true)."),
    project_path: z
      .string()
      .describe("Absolute path to the root of the R package."),
  }),
};

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

type HandlerResult = { content: Array<{ type: "text"; text: string }> };

function ok(text: string): HandlerResult {
  return { content: [{ type: "text", text }] };
}

export const usethisHandlers: Record<
  keyof typeof usethisToolSchemas,
  (args: Record<string, unknown>) => Promise<HandlerResult>
> = {
  create_package: async (args) => {
    const { path, fields, open } = args as z.infer<
      typeof usethisToolSchemas.create_package
    >;
    const fieldsStr = fields
      ? `, fields = list(${Object.entries(fields)
          .map(([k, v]) => `${rStr(k)} = ${rStr(v)}`)
          .join(", ")})`
      : "";
    const openStr = open ? "TRUE" : "FALSE";
    const code = `usethis::create_package(path = ${rStr(path)}${fieldsStr}, open = ${openStr}, rstudio = FALSE)`;
    const result = await executeR(code);
    return ok(formatResult(result));
  },

  use_r: async (args) => {
    const { name, project_path } = args as z.infer<typeof usethisToolSchemas.use_r>;
    const code = `setwd(${rStr(project_path)}); usethis::use_r(${rStr(name)}, open = FALSE)`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  use_test: async (args) => {
    const { name, project_path } = args as z.infer<typeof usethisToolSchemas.use_test>;
    const code = `setwd(${rStr(project_path)}); usethis::use_test(${rStr(name)}, open = FALSE)`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  use_readme_md: async (args) => {
    const { project_path } = args as z.infer<typeof usethisToolSchemas.use_readme_md>;
    const code = `setwd(${rStr(project_path)}); usethis::use_readme_md(open = FALSE)`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  use_vignette: async (args) => {
    const { name, title, project_path } = args as z.infer<
      typeof usethisToolSchemas.use_vignette
    >;
    const titleArg = title ? `, title = ${rStr(title)}` : "";
    const code = `setwd(${rStr(project_path)}); usethis::use_vignette(${rStr(name)}${titleArg})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  use_mit_license: async (args) => {
    const { copyright_holder, project_path } = args as z.infer<
      typeof usethisToolSchemas.use_mit_license
    >;
    const holderArg = copyright_holder
      ? `copyright_holder = ${rStr(copyright_holder)}`
      : "";
    const code = `setwd(${rStr(project_path)}); usethis::use_mit_license(${holderArg})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  use_gpl3_license: async (args) => {
    const { project_path } = args as z.infer<typeof usethisToolSchemas.use_gpl3_license>;
    const code = `setwd(${rStr(project_path)}); usethis::use_gpl3_license()`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  use_package: async (args) => {
    const { package: pkg, type, project_path } = args as z.infer<
      typeof usethisToolSchemas.use_package
    >;
    const typeStr = type ?? "Imports";
    const code = `setwd(${rStr(project_path)}); usethis::use_package(${rStr(pkg)}, type = ${rStr(typeStr)})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  use_testthat: async (args) => {
    const { edition, project_path } = args as z.infer<
      typeof usethisToolSchemas.use_testthat
    >;
    const editionArg = edition != null ? `, edition = ${edition}` : "";
    const code = `setwd(${rStr(project_path)}); usethis::use_testthat(${editionArg})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  use_git: async (args) => {
    const { message, project_path } = args as z.infer<typeof usethisToolSchemas.use_git>;
    const msgArg = message ? `, message = ${rStr(message)}` : "";
    const code = `setwd(${rStr(project_path)}); usethis::use_git(${msgArg})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  use_github: async (args) => {
    const { organisation, private: isPrivate, project_path } = args as z.infer<
      typeof usethisToolSchemas.use_github
    >;
    const orgArg = organisation ? `, organisation = ${rStr(organisation)}` : "";
    const privArg = `, private = ${isPrivate ? "TRUE" : "FALSE"}`;
    const code = `setwd(${rStr(project_path)}); usethis::use_github(${orgArg}${privArg})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  use_data: async (args) => {
    const { object_names, overwrite, project_path } = args as z.infer<
      typeof usethisToolSchemas.use_data
    >;
    // object_names are R identifiers (variable names), not arbitrary strings –
    // validate that they contain only valid R identifier characters before splicing.
    const validIdPattern = /^[A-Za-z_.][A-Za-z0-9_.]*$/;
    for (const name of object_names) {
      if (!validIdPattern.test(name)) {
        throw new Error(
          `Invalid R identifier: "${name}". Object names must match /^[A-Za-z_.][A-Za-z0-9_.]*$/`
        );
      }
    }
    const objList = object_names.join(", ");
    const overwriteStr = overwrite ? "TRUE" : "FALSE";
    const code = `setwd(${rStr(project_path)}); usethis::use_data(${objList}, overwrite = ${overwriteStr})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  use_pipe: async (args) => {
    const { export: exportPipe, project_path } = args as z.infer<
      typeof usethisToolSchemas.use_pipe
    >;
    const exportStr = exportPipe ? "TRUE" : "FALSE";
    const code = `setwd(${rStr(project_path)}); usethis::use_pipe(export = ${exportStr})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },
};
