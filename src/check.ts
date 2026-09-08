import { join } from "node:path";

export async function checkOutput(root = "build"): Promise<string[]> {
  const errors: string[] = [];
  const htmlFiles = [...new Bun.Glob("**/*.html").scanSync({ cwd: root })].sort();
  if (htmlFiles.length !== 2) errors.push(`expected 2 HTML pages, found ${htmlFiles.length}`);

  for (const file of htmlFiles) {
    const html = await Bun.file(join(root, file)).text();
    const check = (condition: boolean, message: string): void => {
      if (!condition) errors.push(`${file}: ${message}`);
    };
    check(html.startsWith("<!doctype html>"), "missing HTML doctype");
    check(/<html lang="en"[^>]*>/.test(html), "missing document language");
    check(/<title>[^<]+<\/title>/.test(html), "missing title");
    check(/<meta name="description" content="[^"]+">/.test(html), "missing description");
    check(/<main id="main-content"[^>]*>/.test(html), "missing main landmark");
    check((html.match(/<h1(?:\s|>)/g) ?? []).length === 1, "expected exactly one h1");
    check(!/Hugo|Hextra/.test(html), "contains removed generator name");

    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    check(new Set(ids).size === ids.length, "contains duplicate ids");
  }
  return errors;
}

if (import.meta.main) {
  const errors = await checkOutput();
  for (const error of errors) console.error(error);
  if (errors.length > 0) process.exit(1);
  console.log("HTML check passed");
}
