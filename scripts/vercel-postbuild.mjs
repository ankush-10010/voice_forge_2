// Generates a static SPA index.html in dist/client after `vite build`.
// The Lovable TanStack template targets Cloudflare Workers; for Vercel we
// deploy the client bundle as a single-page app and let TanStack Router
// handle routing on the client.
import { readdirSync, writeFileSync, existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const clientDir = resolve("dist/client");
const assetsDir = join(clientDir, "assets");

if (!existsSync(assetsDir)) {
  console.error("[vercel-postbuild] dist/client/assets not found. Did `vite build` run?");
  process.exit(1);
}

const files = readdirSync(assetsDir);
// The entry point is the largest index-*.js file since it bundles the framework (React, Router, etc)
const indexJsFiles = files.filter((f) => /^index-.*\.js$/.test(f));
const mainJs = indexJsFiles.sort((a, b) => statSync(join(assetsDir, b)).size - statSync(join(assetsDir, a)).size)[0];
const stylesCss = files.find((f) => /^styles-.*\.css$/.test(f));

if (!mainJs) {
  console.error("[vercel-postbuild] Could not find index-*.js entry in dist/client/assets");
  process.exit(1);
}

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>VoiceClone ML Dashboard</title>
    <meta name="description" content="Control a real-time voice cloning ML pipeline from model loading through waveform generation." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" />
    ${stylesCss ? `<link rel="stylesheet" href="/assets/${stylesCss}" />` : ""}
    <script type="module" src="/assets/${mainJs}"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

writeFileSync(join(clientDir, "index.html"), html);
console.log(`[vercel-postbuild] Wrote dist/client/index.html (entry: ${mainJs})`);
