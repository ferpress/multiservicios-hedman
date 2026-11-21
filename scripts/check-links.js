import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith(".html"));
const errors = [];

for (const file of htmlFiles) {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  const references = content.matchAll(/(?:href|src)="([^"]+)"/g);

  for (const match of references) {
    const reference = match[1];
    if (
      reference.startsWith("http") ||
      reference.startsWith("mailto:") ||
      reference.startsWith("tel:") ||
      reference.startsWith("#")
    )
      continue;

    const localReference = decodeURIComponent(reference.split(/[?#]/)[0]);
    if (!localReference) continue;

    const target = path.resolve(root, localReference);
    if (!fs.existsSync(target)) {
      errors.push(`${file}: missing ${reference}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated links in ${htmlFiles.length} HTML pages.`);
}
