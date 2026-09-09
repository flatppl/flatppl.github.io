import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { readManifest, verifyTheme } from "./verify-theme.ts";

const RELEASE = "v9.9.9";

async function temporaryDirectory(): Promise<string> {
  return mkdtemp(join(tmpdir(), "flatppl-theme-test-"));
}

async function write(root: string, path: string, content: string): Promise<void> {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), content);
}

/** A miniature release bundle: a few files plus the manifest that describes them. */
async function releaseBundle(release = RELEASE): Promise<string> {
  const root = await temporaryDirectory();
  const contents: Record<string, string> = {
    "tokens.css": ":root { --fp-test: 1; }\n",
    "assets/logo.svg": "<svg xmlns='http://www.w3.org/2000/svg'></svg>\n",
  };
  const files = [];
  for (const [path, content] of Object.entries(contents)) {
    await write(root, path, content);
    files.push({
      path,
      sha256: createHash("sha256").update(content).digest("hex"),
      size: Buffer.byteLength(content),
    });
  }
  const manifest = {
    schema: 1,
    name: "flatppl-theme",
    version: release.slice(1),
    source: { repository: "https://github.com/flatppl/flatppl-theme", commit: "0".repeat(40), release },
    files,
  };
  await write(root, "manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  return root;
}

test("self-check accepts a bundle that matches its own manifest", async () => {
  const bundle = await releaseBundle();
  expect(await verifyTheme(bundle)).toEqual([]);
  expect(await verifyTheme(bundle, RELEASE)).toEqual([]);
});

test("self-check rejects a tampered file", async () => {
  const bundle = await releaseBundle();
  await write(bundle, "tokens.css", "tampered\n");
  expect(await verifyTheme(bundle)).toEqual(["tokens.css: size mismatch", "tokens.css: SHA-256 mismatch"]);
});

test("self-check rejects missing and undeclared files", async () => {
  const bundle = await releaseBundle();
  await write(bundle, "extra.css", "/* smuggled in */\n");
  await rm(join(bundle, "assets/logo.svg"));
  expect(await verifyTheme(bundle)).toEqual([
    "extra.css: not declared in manifest",
    "assets/logo.svg: missing",
  ]);
});

test("self-check rejects a symlink standing in for a bundle file", async () => {
  const bundle = await releaseBundle();
  const outside = join(await temporaryDirectory(), "outside.css");
  await writeFile(outside, "a file from the build machine\n");
  await rm(join(bundle, "tokens.css"));
  await symlink(outside, join(bundle, "tokens.css"));

  const errors = await verifyTheme(bundle);
  expect(errors).toContain("tokens.css: not a regular file");
  expect(errors).toContain("tokens.css: missing");
});

test("self-check rejects a symlinked directory smuggled into a bundle", async () => {
  const bundle = await releaseBundle();
  await symlink(await temporaryDirectory(), join(bundle, "assets/elsewhere"));
  expect(await verifyTheme(bundle)).toEqual(["assets/elsewhere: not a regular file"]);
});

test("self-check ties the bundle to the requested release tag", async () => {
  const bundle = await releaseBundle();
  expect(await verifyTheme(bundle, "v0.0.1")).toEqual([`manifest.json: expected release v0.0.1, found ${RELEASE}`]);
});

test("a sibling checkout copy has no manifest and is unverified rather than broken", async () => {
  const copy = await temporaryDirectory();
  await write(copy, "tokens.css", ":root { --fp-test: 2; }\n");
  expect(await readManifest(copy)).toBeNull();
  expect(await verifyTheme(copy)).toEqual([]);
});

test("a missing drop directory fails with the command that fills it", async () => {
  const root = await temporaryDirectory();
  await expect(verifyTheme(join(root, "absent"))).rejects.toThrow(/fetch-theme/);
});
