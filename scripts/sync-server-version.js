#!/usr/bin/env node
/**
 * Syncs the version in server.json to the value supplied via the VERSION
 * environment variable (e.g. "1.2.3" – without a leading "v").
 *
 * Usage (from CI):
 *   VERSION=1.2.3 node scripts/sync-server-version.js
 */

"use strict";

const fs = require("fs");
const path = require("path");

const version = process.env.VERSION;
if (!version) {
  console.error("ERROR: VERSION environment variable is not set.");
  process.exit(1);
}

const filePath = path.resolve(__dirname, "../server.json");
const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));

manifest.version = version;
if (Array.isArray(manifest.packages)) {
  manifest.packages.forEach((pkg) => {
    pkg.version = version;
  });
}

fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`server.json updated to version ${version}`);
