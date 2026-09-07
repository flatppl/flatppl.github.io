import type { Frontmatter } from "./types.ts";

export function parseFrontmatter(text: string, sourcePath: string): { data: Frontmatter; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error(`${sourcePath}: missing frontmatter`);

  const raw = Bun.YAML.parse(match[1] ?? "");
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`${sourcePath}: frontmatter must be a mapping`);
  }

  const values = raw as Record<string, unknown>;
  const unknown = Object.keys(values).filter((key) => key !== "title" && key !== "description");
  if (unknown.length > 0) throw new Error(`${sourcePath}: unknown frontmatter key ${unknown[0]}`);
  if (typeof values.title !== "string" || values.title.trim() === "") {
    throw new Error(`${sourcePath}: title must be a non-empty string`);
  }
  if (typeof values.description !== "string" || values.description.trim() === "") {
    throw new Error(`${sourcePath}: description must be a non-empty string`);
  }

  return {
    data: { title: values.title, description: values.description },
    body: match[2] ?? "",
  };
}
