import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([".git", "dist", "node_modules", ".railway", ".nixpacks"]);
const checkedExtensions = new Set([
  ".cjs", ".css", ".html", ".js", ".jsx", ".json", ".md", ".mjs", ".toml", ".ts", ".tsx", ".yml", ".yaml",
]);
const conflictMarker = /^(<<<<<<<|=======|>>>>>>>)($|\s)/m;
const conflicts = [];
const duplicateDeclarations = [];
const topLevelDeclaration = /^(?:export\s+)?(?:const|let|var|class|function)\s+([A-Za-z_$][\w$]*)/gm;

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await scan(fullPath);
      continue;
    }

    if (!checkedExtensions.has(path.extname(entry.name))) continue;
    const contents = await readFile(fullPath, "utf8");
    const relativePath = path.relative(root, fullPath);
    if (conflictMarker.test(contents)) conflicts.push(relativePath);

    const declarations = new Map();
    for (const match of contents.matchAll(topLevelDeclaration)) {
      const line = contents.slice(0, match.index).split("\n").length;
      const previousLine = declarations.get(match[1]);
      if (previousLine) duplicateDeclarations.push({ file: relativePath, name: match[1], lines: [previousLine, line] });
      else declarations.set(match[1], line);
    }
  }
}

await scan(root);

if (conflicts.length || duplicateDeclarations.length) {
  if (conflicts.length) {
    console.error("Unresolved merge-conflict markers found:");
    for (const file of conflicts) console.error(`- ${file}`);
  }
  if (duplicateDeclarations.length) {
    console.error("Duplicate top-level declarations found:");
    for (const item of duplicateDeclarations) console.error(`- ${item.file}: ${item.name} on lines ${item.lines.join(" and ")}`);
  }
  process.exit(1);
}

console.log("No unresolved merge-conflict markers or duplicate top-level declarations found.");
