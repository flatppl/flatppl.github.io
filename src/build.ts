import { cp, mkdir, rename, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { readContent } from "./content.ts";
import { createRenderer } from "./render.ts";
import { syntaxCss } from "./syntax.ts";
import { renderShell } from "./templates.ts";
import { verifyTheme } from "./verify-theme.ts";

const OUT = "build";
const TMP = "build.tmp";
const THEME = "vendor/flatppl-theme";

function outputPath(url: string): string {
  return url === "/" ? join(TMP, "index.html") : join(TMP, url.slice(1), "index.html");
}

export async function build(): Promise<void> {
  const themeErrors = await verifyTheme(THEME);
  if (themeErrors.length > 0) throw new Error(`theme bundle verification failed:\n${themeErrors.join("\n")}`);

  const pages = await readContent();
  const render = createRenderer();
  const [header, footer] = await Promise.all([
    Bun.file(join(THEME, "header.html")).text(),
    Bun.file(join(THEME, "footer.html")).text(),
  ]);
  for (const page of pages) page.html = render(page.markdown);

  await rm(TMP, { recursive: true, force: true });
  await mkdir(TMP, { recursive: true });
  await mkdir(join(TMP, "theme"), { recursive: true });
  await Promise.all(
    ["tokens.css", "components.css", "shell.css", "shell.js"].map((file) =>
      cp(join(THEME, file), join(TMP, "theme", file)),
    ),
  );
  await cp(join(THEME, "assets"), join(TMP, "theme", "assets"), { recursive: true });
  await cp(join(THEME, "assets"), TMP, { recursive: true });
  await cp("static", TMP, { recursive: true });
  await cp("src/style.css", join(TMP, "style.css"));
  await Bun.write(join(TMP, "syntax.css"), await syntaxCss(join(THEME, "syntax-map.json")));

  for (const page of pages) {
    const path = outputPath(page.url);
    await mkdir(dirname(path), { recursive: true });
    await Bun.write(path, renderShell(page, header, footer));
  }

  const sitemap = pages.map((page) => `  <url><loc>https://flatppl.org${page.url}</loc></url>`).join("\n");
  await Bun.write(join(TMP, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap}\n</urlset>\n`);

  await rm(OUT, { recursive: true, force: true });
  await rename(TMP, OUT);
}

if (import.meta.main) await build();
