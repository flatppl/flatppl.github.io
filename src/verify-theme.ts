import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const PIN = {
  name: "flatppl-theme",
  version: "0.1.7",
  release: "v0.1.7",
  commit: "a646899a9ea6b0bf671b330f820e94740d6a682e",
  manifestSha256: "8219bb442f693ad06a1a153977a9d86f188505e675ce0dcb39c7b94b53405d7e",
} as const;

interface Manifest {
  name: string;
  version: string;
  source: { commit: string; release?: string };
  files: Array<{ path: string; sha256: string; size: number }>;
}

async function digest(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function filesUnder(root: string): Promise<string[]> {
  const files: string[] = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push(relative(root, path).split(sep).join("/"));
    }
  }
  await visit(root);
  return files.sort();
}

export async function verifyTheme(bundle: string): Promise<string[]> {
  const root = resolve(bundle);
  const manifestPath = join(root, "manifest.json");
  const manifest = (await Bun.file(manifestPath).json()) as Manifest;
  const errors: string[] = [];

  if (await digest(manifestPath) !== PIN.manifestSha256) errors.push("manifest.json: SHA-256 mismatch");
  if (manifest.name !== PIN.name) errors.push(`manifest.json: expected ${PIN.name}`);
  if (manifest.version !== PIN.version) errors.push(`manifest.json: expected version ${PIN.version}`);
  if (manifest.source.release !== PIN.release) errors.push(`manifest.json: expected release ${PIN.release}`);
  if (manifest.source.commit !== PIN.commit) errors.push(`manifest.json: expected commit ${PIN.commit}`);

  const declared = new Map(manifest.files.map((file) => [file.path, file]));
  const actual = (await filesUnder(root)).filter((path) => path !== "manifest.json");
  for (const path of actual) if (!declared.has(path)) errors.push(`${path}: not declared in manifest`);
  for (const [path, expected] of declared) {
    if (!actual.includes(path)) {
      errors.push(`${path}: missing`);
      continue;
    }
    const file = join(root, path);
    if ((await stat(file)).size !== expected.size) errors.push(`${path}: size mismatch`);
    if (await digest(file) !== expected.sha256) errors.push(`${path}: SHA-256 mismatch`);
  }
  return errors;
}

if (import.meta.main) {
  const bundle = Bun.argv[2];
  if (!bundle) throw new Error("usage: bun run src/verify-theme.ts <bundle>");
  const errors = await verifyTheme(bundle);
  for (const error of errors) console.error(error);
  if (errors.length > 0) process.exit(1);
}
