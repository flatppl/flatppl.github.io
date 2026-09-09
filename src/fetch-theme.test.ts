import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  THEME_FILES,
  THEME_REF,
  fetchTheme,
  holdsRelease,
  releaseTarballUrl,
  resolveThemeSource,
} from "./fetch-theme.ts";
import { readManifest, verifyTheme } from "./verify-theme.ts";

// These tests never reach the network: they exercise the checkout path and the
// pure parts of the release path.

const environment = ["FLATPPL_THEME_DIR", "FLATPPL_THEME_NO_SIBLING", "FLATPPL_THEME_REF"] as const;

afterEach(() => {
  for (const name of environment) delete process.env[name];
});

async function temporaryDirectory(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), `flatppl-${prefix}-`));
}

async function write(root: string, path: string, content: string): Promise<void> {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), content);
}

/** A stand-in theme checkout: every source file the theme's bundle requires, plus its own additions. */
async function checkout(files: readonly string[] = THEME_FILES): Promise<string> {
  const root = await temporaryDirectory("theme-checkout");
  for (const file of files) await write(root, file, `${file} contents\n`);
  await write(root, "assets/added-upstream.svg", "an asset this file list predates\n");
  await write(root, "README.md", "not part of the bundle\n");
  return root;
}

/** A stand-in release bundle: the bundle files plus the manifest that describes them. */
async function releaseBundle(release: string, files: readonly string[] = THEME_FILES): Promise<string> {
  const root = join(await temporaryDirectory("theme-release"), "flatppl-theme");
  const declared = [];
  for (const path of files) {
    const content = `${path} for ${release}\n`;
    await write(root, path, content);
    declared.push({ path, sha256: createHash("sha256").update(content).digest("hex"), size: Buffer.byteLength(content) });
  }
  const manifest = {
    schema: 1,
    name: "flatppl-theme",
    version: release.slice(1),
    source: { repository: "https://github.com/flatppl/flatppl-theme", commit: "0".repeat(40), release },
    files: declared,
  };
  await write(root, "manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  return root;
}

async function dropDirectory(): Promise<string> {
  return join(await temporaryDirectory("theme-drop"), "vendor", "flatppl-theme");
}

test("the release tarball URL follows the theme's release naming", () => {
  expect(releaseTarballUrl("v0.1.8")).toBe(
    "https://github.com/flatppl/flatppl-theme/releases/download/v0.1.8/flatppl-theme-v0.1.8.tar.gz",
  );
  expect(releaseTarballUrl("v1.2.3-rc1")).toBe(
    "https://github.com/flatppl/flatppl-theme/releases/download/v1.2.3-rc1/flatppl-theme-v1.2.3-rc1.tar.gz",
  );
});

test("FLATPPL_THEME_DIR copies the checkout's source files, unverified", async () => {
  const source = await checkout();
  const drop = await dropDirectory();
  process.env.FLATPPL_THEME_DIR = source;

  expect(await fetchTheme({ dropDir: drop })).toEqual({ kind: "sibling", path: source });
  for (const file of THEME_FILES) expect(await Bun.file(join(drop, file)).text()).toBe(`${file} contents\n`);
  expect(await Bun.file(join(drop, "README.md")).exists()).toBe(false);
  expect(await readManifest(drop)).toBeNull();
  expect(await verifyTheme(drop)).toEqual([]);
});

test("a copied checkout brings assets the file list predates", async () => {
  const drop = await dropDirectory();
  await fetchTheme({ dropDir: drop, themeDir: await checkout() });
  expect(await Bun.file(join(drop, "assets/added-upstream.svg")).exists()).toBe(true);
});

test("a cached bundle counts as the cache only for the tag it was fetched for", async () => {
  const drop = await releaseBundle("v0.1.8");
  expect(await holdsRelease(drop, "v0.1.8")).toBe(true);
  expect(await holdsRelease(drop, "v0.2.0")).toBe(false);
});

test("a release without a file this site reads by name is not usable", async () => {
  const short = await releaseBundle("v0.1.8", THEME_FILES.filter((file) => file !== "syntax-map.json"));
  expect(await holdsRelease(short, "v0.1.8")).toBe(false);
});

test("a tampered, manifest-less or absent drop directory is not a cache hit", async () => {
  const tampered = await releaseBundle("v0.1.8");
  await write(tampered, "tokens.css", "tampered\n");
  expect(await holdsRelease(tampered, "v0.1.8")).toBe(false);

  const copy = await temporaryDirectory("theme-copy");
  await write(copy, "tokens.css", ":root { --fp-test: 1; }\n");
  expect(await holdsRelease(copy, "v0.1.8")).toBe(false);

  expect(await holdsRelease(join(copy, "absent"), "v0.1.8")).toBe(false);
});

test("a copied checkout replaces whatever the drop directory held", async () => {
  const drop = await dropDirectory();
  await write(drop, "manifest.json", '{"name":"flatppl-theme"}\n');
  await write(drop, "stale.css", "/* from an earlier release */\n");

  await fetchTheme({ dropDir: drop, themeDir: await checkout() });
  expect(await Bun.file(join(drop, "manifest.json")).exists()).toBe(false);
  expect(await Bun.file(join(drop, "stale.css")).exists()).toBe(false);
  expect(await Bun.file(join(drop, "tokens.css")).exists()).toBe(true);
});

test("an incomplete checkout is named as such instead of half-copied", async () => {
  const incomplete = await checkout(THEME_FILES.filter((file) => file !== "tokens.css"));
  const drop = await dropDirectory();

  await expect(fetchTheme({ dropDir: drop, themeDir: incomplete })).rejects.toThrow(/tokens\.css/);
  expect(await Bun.file(join(drop, "shell.css")).exists()).toBe(false);
});

test("FLATPPL_THEME_NO_SIBLING takes the pinned release even with a checkout at hand", async () => {
  process.env.FLATPPL_THEME_DIR = await checkout();
  process.env.FLATPPL_THEME_NO_SIBLING = "1";
  expect(await resolveThemeSource()).toEqual({ kind: "release", ref: THEME_REF });

  process.env.FLATPPL_THEME_REF = "v9.9.9";
  expect(await resolveThemeSource()).toEqual({ kind: "release", ref: "v9.9.9" });
});

test("a named checkout that is not there fails before anything is copied", async () => {
  const absent = join(await temporaryDirectory("theme-absent"), "flatppl-theme");
  process.env.FLATPPL_THEME_DIR = absent;
  await expect(resolveThemeSource()).rejects.toThrow(/FLATPPL_THEME_DIR/);
});
