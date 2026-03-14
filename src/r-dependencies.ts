import { executeR } from "./r-executor.js";

/**
 * In-memory cache of packages confirmed to be installed during this process lifetime.
 * Once a package is confirmed installed we skip the R round-trip on subsequent calls.
 */
const confirmedInstalled = new Set<string>();

/**
 * Ensure that all specified R packages are installed, installing any that are missing.
 *
 * - Packages already confirmed in this session are skipped immediately.
 * - Missing packages are installed via install.packages() from the CRAN cloud mirror.
 *
 * @param packages - CRAN package names to check and, if necessary, install.
 * @returns A human-readable message if packages were installed (or if installation
 *          failed), or `null` when all packages were already present.
 */
export async function ensurePackagesInstalled(
  packages: string[]
): Promise<string | null> {
  const toCheck = packages.filter((p) => !confirmedInstalled.has(p));
  if (toCheck.length === 0) return null;

  // Build R code that prints a comma-separated list of missing package names.
  const pkgVec = `c(${toCheck.map((p) => `"${p}"`).join(", ")})`;
  const checkCode =
    `pkgs <- ${pkgVec}; ` +
    `missing <- pkgs[!vapply(pkgs, requireNamespace, logical(1L), quietly = TRUE)]; ` +
    `if (length(missing)) cat(paste(missing, collapse = ","))`;

  const checkResult = await executeR(checkCode);
  if (!checkResult.success) {
    // Cannot determine status; let the tool attempt to run and surface any R error.
    return null;
  }

  const missingStr = checkResult.stdout.trim();
  const missing = missingStr
    ? missingStr.split(",").map((p) => p.trim()).filter(Boolean)
    : [];

  // Mark all present packages as confirmed.
  const present = toCheck.filter((p) => !missing.includes(p));
  for (const p of present) confirmedInstalled.add(p);

  if (missing.length === 0) return null;

  // Install missing packages from CRAN.
  const installVec = `c(${missing.map((p) => `"${p}"`).join(", ")})`;
  const installCode = `install.packages(${installVec}, repos = "https://cloud.r-project.org/")`;
  const installResult = await executeR(installCode, undefined, 300_000);

  if (installResult.success) {
    for (const p of missing) confirmedInstalled.add(p);
    return `Automatically installed missing R package(s): ${missing.join(", ")}.`;
  }

  return (
    `Warning: could not install R package(s): ${missing.join(", ")}. ` +
    `Tool execution may fail.\n${installResult.stderr.trim()}`
  );
}
