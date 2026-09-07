interface SyntaxMap {
  groups: Array<{ cssVariable: string; pandocClasses: string[]; webClasses: string[] }>;
  neutral: { cssVariable: string; pandocClasses: string[]; webClasses: string[] };
}

export async function syntaxCss(path: string): Promise<string> {
  const mapping = (await Bun.file(path).json()) as SyntaxMap;
  const groups = [...mapping.groups, mapping.neutral];
  return groups
    .flatMap((group) => {
      const selectors = [...group.pandocClasses, ...group.webClasses].map((name) => `.${name}`);
      return selectors.length === 0 ? [] : [`${selectors.join(", ")} { color: var(${group.cssVariable}); }`];
    })
    .join("\n") + "\n";
}
