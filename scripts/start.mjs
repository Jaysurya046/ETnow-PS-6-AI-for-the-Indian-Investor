import { cp, access } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const standalone = new URL(".next/standalone/", root);
try {
  await access(new URL("server.js", standalone));
} catch {
  throw new Error("Standalone build missing. Run npm run build before npm start.");
}

// Next's traced server omits assets; Docker copies these at image build time.
await cp(new URL("public/", root), new URL("public/", standalone), { recursive: true });
await cp(new URL(".next/static/", root), new URL(".next/static/", standalone), { recursive: true });
process.env.HOSTNAME ||= "0.0.0.0";
await import(new URL("server.js", standalone).href);
