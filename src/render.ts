import MarkdownIt from "markdown-it";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function createRenderer(): (markdown: string) => string {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
  const tableOpen = md.renderer.rules.table_open;
  md.renderer.rules.table_open = (tokens, index, options, env, self) => {
    tokens[index]?.attrJoin("class", "fp-table");
    return tableOpen?.(tokens, index, options, env, self) ?? self.renderToken(tokens, index, options);
  };
  md.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index];
    const language = token?.info.trim().split(/\s+/)[0] ?? "";
    const className = language ? ` class="language-${md.utils.escapeHtml(language)}"` : "";
    return `<div class="fp-code"><pre><code${className}>${md.utils.escapeHtml(token?.content ?? "")}</code></pre></div>\n`;
  };

  return (markdown: string): string => {
    const ids = new Map<string, number>();
    md.renderer.rules.heading_open = (tokens, index, options, _env, self) => {
      const base = slugify(tokens[index + 1]?.content ?? "") || "section";
      const seen = ids.get(base) ?? 0;
      ids.set(base, seen + 1);
      tokens[index]?.attrSet("id", seen === 0 ? base : `${base}-${seen + 1}`);
      return self.renderToken(tokens, index, options);
    };
    return md.render(markdown);
  };
}
