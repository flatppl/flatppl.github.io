import { describe, expect, test } from "bun:test";
import { checkOutput } from "./check.ts";

async function built(path: string): Promise<string> {
  const file = Bun.file(`build/${path}`);
  return (await file.exists()) ? file.text() : "";
}

describe("published site", () => {
  test("build preserves the published page URLs", async () => {
    const home = await built("index.html");
    const legal = await built("legal-notice/index.html");

    expect(home).toContain("Flat Portable Probabilistic Language");
    expect(legal).toContain("Legal Notice");
  });

  test("pages use the shared FlatPPL shell", async () => {
    const pages = await Promise.all([
      built("index.html"),
      built("legal-notice/index.html"),
    ]);

    for (const html of pages) {
      expect(html).toContain('data-fp-active="site"');
      expect(html).toContain('data-fp-nav="site" aria-current="page"');
      expect(html).toContain('data-fp-nav="docs" hidden');
      expect(html).toContain('href="/theme/tokens.css"');
      expect(html).toContain('src="/theme/shell.js"');
      expect(html).toContain('<main id="main-content"');
      expect(html).toContain('<footer class="fp-shell-footer">');
    }
  });

  test("link checker accepts the complete generated site", async () => {
    const child = Bun.spawn(["bun", "run", "src/linkcheck.ts"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await child.exited).toBe(0);
  });

  test("HTML checker validates every published document", async () => {
    expect(await checkOutput()).toEqual([]);
  });

  test("build publishes theme runtime files without source fragments", async () => {
    expect(await Bun.file("build/theme/tokens.css").exists()).toBe(true);
    expect(await Bun.file("build/theme/assets/logo.svg").exists()).toBe(true);
    expect(await Bun.file("build/theme/header.html").exists()).toBe(false);
    expect(await Bun.file("build/theme/manifest.json").exists()).toBe(false);
  });
});
