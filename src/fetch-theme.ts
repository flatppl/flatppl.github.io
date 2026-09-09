import { cp, mkdir, mkdtemp, rename, rm, stat } from "node:fs/promises";
import { dirname, join, parse, resolve } from "node:path";
import { readManifest, verifyTheme } from "./verify-theme.ts";

const REPOSITORY = "https://github.com/flatppl/flatppl-theme";

/** The theme release this site is built against; FLATPPL_THEME_REF overrides it to try a candidate. */
export const THEME_REF = "v0.1.8";

const ROOT = resolve(import.meta.dir, "..");
const DROP = join(ROOT, "vendor", "flatppl-theme");
const SIBLING = resolve(ROOT, "..", "flatppl-theme");
const DOWNLOAD_ATTEMPTS = 3;

/** Source files a theme checkout provides, mirroring REQUIRED_FILES in the theme's scripts/bundle.ts. */
export const THEME_FILES = [
  "assets/android-chrome-192x192.png",
  "assets/android-chrome-512x512.png",
  "assets/apple-touch-icon.png",
  "assets/favicon-16x16.png",
  "assets/favicon-32x32.png",
  "assets/favicon.ico",
  "assets/logo-original.png",
  "assets/logo.svg",
  "assets/site.webmanifest",
  "assets/wordmark.svg",
  "components.css",
  "footer.html",
  "header.html",
  "LICENSE.md",
  "LICENSES/CC-BY-4.0.txt",
  "LICENSES/MIT.txt",
  "shell.css",
  "shell.js",
  "syntax-map.json",
  "tokens.css",
] as const;

export type ThemeSource = { kind: "sibling"; path: string } | { kind: "release"; ref: string };

export interface FetchOptions {
  /** Where the theme is dropped for the build; defaults to vendor/flatppl-theme. */
  dropDir?: string;
  /** Release tag to download; defaults to FLATPPL_THEME_REF, then THEME_REF. */
  ref?: string;
  /** Theme checkout to copy from; defaults to FLATPPL_THEME_DIR. */
  themeDir?: string;
  /** Ignore every checkout and take the release; defaults to FLATPPL_THEME_NO_SIBLING. */
  noSibling?: boolean;
}

/** The release asset the theme's release workflow publishes for a tag. */
export function releaseTarballUrl(ref: string): string {
  return `${REPOSITORY}/releases/download/${ref}/flatppl-theme-${ref}.tar.gz`;
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Where the theme comes from: an explicitly named checkout, else a sibling
 * checkout next to this repository, else the pinned release.
 */
export async function resolveThemeSource(options: FetchOptions = {}): Promise<ThemeSource> {
  const ref = options.ref || process.env.FLATPPL_THEME_REF || THEME_REF;
  if (options.noSibling ?? Boolean(process.env.FLATPPL_THEME_NO_SIBLING)) return { kind: "release", ref };

  const named = options.themeDir ?? process.env.FLATPPL_THEME_DIR;
  if (named) {
    const path = resolve(named);
    if (!(await isDirectory(path))) throw new Error(`no theme checkout at ${path} (FLATPPL_THEME_DIR)`);
    return { kind: "sibling", path };
  }
  if (await isDirectory(SIBLING)) return { kind: "sibling", path: SIBLING };
  return { kind: "release", ref };
}

/** The drop directory is deleted and replaced wholesale, so refuse the obviously wrong ones. */
function assertReplaceable(drop: string): void {
  if (drop === parse(drop).root || drop === ROOT) throw new Error(`refusing to replace ${drop}`);
}

/**
 * Fill a scratch directory next to the drop directory, then swap it in. Next to
 * it rather than in the system temporary directory, so the swap is a rename on
 * one filesystem and a half-written theme is never visible to the build.
 */
async function replaceDrop(drop: string, fill: (staging: string, scratch: string) => Promise<void>): Promise<void> {
  assertReplaceable(drop);
  await mkdir(dirname(drop), { recursive: true });
  const scratch = await mkdtemp(`${drop}.staging-`);
  const staging = join(scratch, "theme");
  try {
    await mkdir(staging, { recursive: true });
    await fill(staging, scratch);
    await rm(drop, { recursive: true, force: true });
    await rename(staging, drop);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

/**
 * Copy a checkout's source files. No manifest is written: the copy is whatever
 * the working tree holds, unverifiable on purpose, and a manifest left over from
 * an earlier release fetch would claim otherwise.
 */
async function copyCheckout(source: string, drop: string): Promise<void> {
  const missing: string[] = [];
  for (const file of THEME_FILES) if (!(await Bun.file(join(source, file)).exists())) missing.push(file);
  if (missing.length > 0) {
    throw new Error(`${source} is not a flatppl-theme checkout, it lacks: ${missing.join(", ")}`);
  }

  await replaceDrop(drop, async (staging) => {
    for (const file of THEME_FILES) {
      const target = join(staging, file);
      await mkdir(dirname(target), { recursive: true });
      await cp(join(source, file), target);
    }
  });
}

async function download(url: string, target: string): Promise<void> {
  let failure = "";
  for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      await Bun.write(target, response);
      return;
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
      if (attempt < DOWNLOAD_ATTEMPTS) await Bun.sleep(attempt * 500);
    }
  }
  throw new Error(
    `cannot download ${url}: ${failure}\n` +
      "Check network access, or point FLATPPL_THEME_DIR at a local flatppl-theme checkout.",
  );
}

async function extract(archive: string, into: string): Promise<void> {
  const tar = Bun.spawn(["tar", "-xzf", archive, "-C", into], { stdout: "pipe", stderr: "pipe" });
  const [code, stderr] = await Promise.all([tar.exited, new Response(tar.stderr).text()]);
  if (code !== 0) throw new Error(`cannot extract ${archive}: ${stderr.trim()}`);
}

/** A drop directory already holding this release, verified — the build cache. */
async function holdsRelease(drop: string, ref: string): Promise<boolean> {
  if (!(await isDirectory(drop))) return false;
  if ((await readManifest(drop)) === null) return false;
  return (await verifyTheme(drop, ref)).length === 0;
}

async function fetchRelease(ref: string, drop: string): Promise<void> {
  if (await holdsRelease(drop, ref)) {
    console.log(`theme: using cached flatppl-theme ${ref} (verified)`);
    return;
  }

  // The release tarball holds the bundle files at its top level, manifest included.
  const url = releaseTarballUrl(ref);
  await replaceDrop(drop, async (staging, scratch) => {
    const archive = join(scratch, "bundle.tar.gz");
    await download(url, archive);
    await extract(archive, staging);

    const errors = await verifyTheme(staging, ref);
    if ((await readManifest(staging)) === null) errors.unshift("manifest.json: missing from the release tarball");
    if (errors.length > 0) throw new Error(`flatppl-theme ${ref} failed its self-check:\n${errors.join("\n")}`);
  });
  console.log(`theme: fetched flatppl-theme ${ref} from GitHub (verified)`);
}

/**
 * Put the shared theme in the drop directory, from a checkout when there is one
 * (so theme edits show up in the next build) and from the pinned release
 * otherwise. Returns the source used.
 */
export async function fetchTheme(options: FetchOptions = {}): Promise<ThemeSource> {
  const drop = resolve(options.dropDir ?? DROP);
  const source = await resolveThemeSource(options);
  if (source.kind === "sibling") {
    await copyCheckout(source.path, drop);
    console.log(`theme: using UNVERIFIED sibling checkout at ${source.path}`);
  } else {
    await fetchRelease(source.ref, drop);
  }
  return source;
}

if (import.meta.main) await fetchTheme({ dropDir: Bun.argv[2] });
