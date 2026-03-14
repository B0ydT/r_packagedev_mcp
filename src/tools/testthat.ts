import { z } from "zod";
import { executeR, formatResult, rStr } from "../r-executor.js";

// ---------------------------------------------------------------------------
// Schema definitions
// ---------------------------------------------------------------------------

export const testthatToolSchemas = {
  test_file: z.object({
    file: z
      .string()
      .describe("Absolute path to the test file to run (e.g. '/path/to/tests/testthat/test-utils.R')."),
    reporter: z
      .string()
      .optional()
      .describe("testthat reporter to use (e.g. 'progress', 'summary', 'tap'). Defaults to 'progress'."),
    stop_on_failure: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to stop immediately on the first test failure (default false)."),
    project_path: z
      .string()
      .optional()
      .describe("Optional absolute path to the package root (used to set the working directory)."),
  }),

  test_dir: z.object({
    path: z
      .string()
      .describe("Absolute path to the directory containing test files."),
    filter: z
      .string()
      .optional()
      .describe("Regex pattern to restrict which test files are run (e.g. 'my_func')."),
    reporter: z
      .string()
      .optional()
      .describe("testthat reporter to use (e.g. 'progress', 'summary', 'tap'). Defaults to 'progress'."),
    stop_on_failure: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to stop immediately on the first test failure (default false)."),
  }),
};

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

type HandlerResult = { content: Array<{ type: "text"; text: string }> };

function ok(text: string): HandlerResult {
  return { content: [{ type: "text", text }] };
}

export const testthatHandlers: Record<
  keyof typeof testthatToolSchemas,
  (args: Record<string, unknown>) => Promise<HandlerResult>
> = {
  test_file: async (args) => {
    const { file, reporter, stop_on_failure, project_path } = args as z.infer<
      typeof testthatToolSchemas.test_file
    >;
    const reporterArg = reporter ? `, reporter = ${rStr(reporter)}` : "";
    const stopArg = `, stop_on_failure = ${stop_on_failure ? "TRUE" : "FALSE"}`;
    const code = `testthat::test_file(${rStr(file)}${reporterArg}${stopArg})`;
    const result = await executeR(code, project_path);
    return ok(formatResult(result));
  },

  test_dir: async (args) => {
    const { path, filter, reporter, stop_on_failure } = args as z.infer<
      typeof testthatToolSchemas.test_dir
    >;
    const filterArg = filter ? `, filter = ${rStr(filter)}` : "";
    const reporterArg = reporter ? `, reporter = ${rStr(reporter)}` : "";
    const stopArg = `, stop_on_failure = ${stop_on_failure ? "TRUE" : "FALSE"}`;
    const code = `testthat::test_dir(${rStr(path)}${filterArg}${reporterArg}${stopArg})`;
    const result = await executeR(code, path);
    return ok(formatResult(result));
  },
};
