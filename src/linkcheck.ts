import { join } from "node:path";

function targetPath(reference: string): string {
  const path = reference.split(/[?#]/)[0]?.replace(/^\//, "") ?? "";
  if (path === "") return "index.html";
  return path.endsWith("/") ? `${path}index.html` : path;
}

export async function checkLinks(root = "build"): Promise<string[]> {
  const errors: string[] = [];
  const files = new Set([...new Bun.Glob("**/*").scanSync({ cwd: root })]);
  for (const file of new Bun.Glob("**/*.html").scanSync({ cwd: root })) {
    const html = await Bun.file(join(root, file)).text();
    for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const reference = match[1] ?? "";
      if (/^(?:https?:|mailto:|tel:|data:|#)/.test(reference)) continue;
      const target = targetPath(reference);
      if (!files.has(target)) errors.push(`${file}: broken local reference ${reference}`);
    }
  }
  return errors;
}

if (import.meta.main) {
  const errors = await checkLinks();
  for (const error of errors) console.error(error);
  if (errors.length > 0) process.exit(1);
  console.log("Link check passed");
}
