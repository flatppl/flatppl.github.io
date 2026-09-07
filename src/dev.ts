import { build } from "./build.ts";
import { serveDirectory } from "./server.ts";

await build();
const requested = Number.parseInt(process.env.PORT ?? "3000", 10);
if (!Number.isInteger(requested) || requested < 0 || requested > 65535) throw new Error("PORT must be 0 through 65535");
const server = serveDirectory("build", requested);
console.log(`http://127.0.0.1:${server.port}/`);
