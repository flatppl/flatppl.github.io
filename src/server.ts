import { resolve, sep } from "node:path";

export function serveDirectory(root: string, port: number): ReturnType<typeof Bun.serve> {
  const base = resolve(root);
  const options = (candidate: number) => ({
    hostname: "127.0.0.1",
    port: candidate,
    async fetch(request: Request) {
      let pathname = decodeURIComponent(new URL(request.url).pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const target = resolve(base, `.${pathname}`);
      if (target !== base && !target.startsWith(base + sep)) return new Response("Forbidden", { status: 403 });
      const file = Bun.file(target);
      if (await file.exists()) return new Response(file);
      return new Response("Not found", { status: 404 });
    },
  });

  if (port !== 0) return Bun.serve(options(port));
  for (let candidate = 4173; candidate <= 4193; candidate++) {
    try {
      return Bun.serve(options(candidate));
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "EADDRINUSE") throw error;
    }
  }
  throw new Error("no free local port between 4173 and 4193");
}
