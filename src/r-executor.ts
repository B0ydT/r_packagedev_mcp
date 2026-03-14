import { spawn } from "child_process";

export interface RExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

/**
 * Escape a JavaScript string for safe use inside an R double-quoted string literal.
 * Escapes backslashes and double-quotes, and rejects null bytes.
 *
 * @param value - The raw string value to embed in R code.
 * @returns The escaped string (without surrounding quotes).
 * @throws If the value contains null bytes.
 */
export function escapeRString(value: string): string {
  if (value.includes("\0")) {
    throw new Error("Invalid input: null bytes are not permitted.");
  }
  // Escape backslashes first, then double-quotes.
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Wrap a JavaScript string in R double-quotes with all special characters escaped.
 */
export function rStr(value: string): string {
  return `"${escapeRString(value)}"`;
}

/**
 * Execute an R expression or script using Rscript.
 *
 * @param rCode   - R code to execute (passed to Rscript -e)
 * @param workdir - Optional working directory for the R process
 * @param timeoutMs - Timeout in milliseconds (default: 120 000)
 */
export function executeR(
  rCode: string,
  workdir?: string,
  timeoutMs = 120_000
): Promise<RExecutionResult> {
  return new Promise((resolve) => {
    const args = ["-e", rCode];
    const options: Parameters<typeof spawn>[2] = {
      cwd: workdir,
      env: { ...process.env },
    };

    const proc = spawn("Rscript", args, options);

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      resolve({
        stdout,
        stderr: stderr + "\n[Error: R process timed out]",
        exitCode: -1,
        success: false,
      });
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      const exitCode = code ?? -1;
      resolve({
        stdout,
        stderr,
        exitCode,
        success: exitCode === 0,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr:
          stderr +
          `\n[Error: Failed to start Rscript – ${err.message}. Ensure R is installed and 'Rscript' is on PATH.]`,
        exitCode: -1,
        success: false,
      });
    });
  });
}

/**
 * Format an RExecutionResult into a human-readable MCP text response.
 */
export function formatResult(result: RExecutionResult): string {
  const parts: string[] = [];

  if (result.stdout.trim()) {
    parts.push(`Output:\n${result.stdout.trim()}`);
  }

  if (result.stderr.trim()) {
    // R prints informational messages to stderr too; label them appropriately
    const label = result.success ? "Messages" : "Error";
    parts.push(`${label}:\n${result.stderr.trim()}`);
  }

  if (parts.length === 0) {
    parts.push(result.success ? "Done (no output)." : "Command failed with no output.");
  }

  return parts.join("\n\n");
}
