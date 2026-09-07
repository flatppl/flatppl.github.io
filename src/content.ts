import { basename, join, relative } from "node:path";
import { parseFrontmatter } from "./frontmatter.ts";
import type { Page } from "./types.ts";

export async function readContent(root = "content"): Promise<Page[]> {
  const pages: Page[] = [];
  for (const file of new Bun.Glob("*.md").scanSync({ cwd: root })) {
    const sourcePath = join(root, file);
    const source = await Bun.file(sourcePath).text();
    const { data, body } = parseFrontmatter(source, relative(process.cwd(), sourcePath));
    const slug = basename(file, ".md");
    pages.push({
      sourcePath,
      url: slug === "index" ? "/" : `/${slug}/`,
      title: data.title,
      description: data.description,
      markdown: body,
      html: "",
    });
  }
  return pages.sort((left, right) => left.url.localeCompare(right.url));
}
