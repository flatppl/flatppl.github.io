import { expect, test } from "bun:test";
import { cp, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

async function verify(path: string): Promise<number> {
  const child = Bun.spawn(["bun", "run", "src/verify-theme.ts", path], {
    stdout: "pipe",
    stderr: "pipe",
  });
  return child.exited;
}

test("theme bundle guard accepts the pinned bundle and rejects tampering", async () => {
  expect(await verify("vendor/flatppl-theme")).toBe(0);

  const root = await mkdtemp(join(tmpdir(), "flatppl-theme-test-"));
  const bundle = join(root, "flatppl-theme");
  await cp("vendor/flatppl-theme", bundle, { recursive: true });
  await Bun.write(join(bundle, "tokens.css"), "tampered\n");

  expect(await verify(bundle)).toBe(1);
});
