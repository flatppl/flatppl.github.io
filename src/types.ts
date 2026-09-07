export interface Page {
  sourcePath: string;
  url: string;
  title: string;
  description: string;
  markdown: string;
  html: string;
}

export interface Frontmatter {
  title: string;
  description: string;
}
