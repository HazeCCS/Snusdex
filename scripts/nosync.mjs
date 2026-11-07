import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.env.CI || process.env.VERCEL || !root.includes("Mobile Documents")) {
  process.exit(0);
}

for (const name of ["node_modules", ".next", "out"]) {
  const target = path.join(root, name);
  const store = `${target}.nosync`;
  let isLink = false;
  try {
    isLink = fs.lstatSync(target).isSymbolicLink();
  } catch {
    isLink = false;
  }
  if (isLink) continue;
  if (fs.existsSync(target)) {
    fs.rmSync(store, { recursive: true, force: true });
    fs.renameSync(target, store);
  } else {
    fs.mkdirSync(store, { recursive: true });
  }
  fs.symlinkSync(path.basename(store), target);
}
