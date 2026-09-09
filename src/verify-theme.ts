import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const NAME = "flatppl-theme";

export interface ThemeManifest {
  name: string;
  version: string;
  source: { repository?: string; commit: string; release?: string };
  files: Array<{ path: string; sha256: string; size: number }>;
}

async function digest(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
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

/** The bundle's own manifest, or null for a sibling checkout copy, which ships none. */
export async function readManifest(bundle: string): Promise<ThemeManifest | null> {
  const file = Bun.file(join(resolve(bundle), "manifest.json"));
  if (!(await file.exists())) return null;
  return (await file.json()) as ThemeManifest;
}

/**
 * Self-check: a release bundle must match the manifest it ships with. Nothing is
 * pinned here — the release tag that `fetch-theme.ts` downloads is the only pin,
 * so a new theme release needs no digest edits in this repository. Pass `release`
 * to also tie the bundle to a tag.
 *
 * A drop directory without a manifest is a sibling-checkout copy: unverifiable by
 * construction, so it yields no errors and callers report it as unverified.
 */
export async function verifyTheme(bundle: string, release?: string): Promise<string[]> {
  const root = resolve(bundle);
  if (!(await isDirectory(root))) throw new Error(`no theme at ${bundle} — run: bun run fetch-theme`);

  const manifest = await readManifest(root);
  if (!manifest) return [];

  const errors: string[] = [];
  if (manifest.name !== NAME) errors.push(`manifest.json: expected name ${NAME}, found ${manifest.name}`);
  if (release !== undefined && manifest.source.release !== release) {
    errors.push(`manifest.json: expected release ${release}, found ${manifest.source.release ?? "none"}`);
  }

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
  const bundle = Bun.argv[2] ?? "vendor/flatppl-theme";
  const errors = await verifyTheme(bundle);
  for (const error of errors) console.error(error);
  if (errors.length > 0) process.exit(1);

  const manifest = await readManifest(bundle);
  if (manifest) {
    console.log(`theme: verified flatppl-theme ${manifest.version} (${manifest.source.release ?? manifest.source.commit})`);
  } else {
    console.warn(`theme: UNVERIFIED sibling checkout copy at ${bundle} (no manifest.json)`);
  }
}
