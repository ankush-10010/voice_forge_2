// Generates a static SPA index.html in dist/client after `vite build`.
// The Lovable TanStack template targets Cloudflare Workers; for Vercel we
// deploy the client bundle as a single-page app and let TanStack Router
// handle routing on the client.
import { readdirSync, writeFileSync, existsSync, statSync } from "node:fs";
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

// TanStack Start uses `hydrateRoot(document, ...)` to mount, so the HTML
// structure must be a valid full document that React can hydrate.
//
// The client entry does:
//   1) Read window.$_TSR for SSR hydration bootstrap data
//   2) Call hydrate(router) which reads $_TSR.router
//   3) Call window.$_TSR.h() after hydration completes
//   4) hydrateRoot(document, <StrictMode><StartClient /></StrictMode>)
//
// We provide minimal $_TSR data with only the __root__ match (ssr:false)
// so the client detects an SPA-mode mismatch and does a full client-side
// router.load() to render the actual route.
//
// IMPORTANT: The HTML must be a complete document (not <div id="root">)
// because hydrateRoot targets `document`, not a DOM element.

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>VoiceClone ML Dashboard</title>
    <meta name="description" content="Control a real-time voice cloning ML pipeline from model loading through waveform generation." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" />
    ${stylesCss ? `<link rel="stylesheet" href="/assets/${stylesCss}" />` : ""}
  </head>
  <body>
    <script>
      // TanStack Start SSR bootstrap data.
      // Provides the minimum structure so hydrate() can initialise the router
      // in SPA mode without hitting the "Invariant failed" fatal error.
      window.$_TSR = {
        router: {
          matches: [{ i: "__root__", b: {}, l: {}, s: "success", ssr: false, u: ${Date.now()} }],
          manifest: { routes: {} },
          dehydratedData: undefined,
          lastMatchId: "__root__"
        },
        buffer: [],
        initialized: false,
        // h() is called by the client entry after hydration; no-op for SPA mode.
        h: function() {}
      };
    </script>
    <script type="module" src="/assets/${mainJs}"></script>
  </body>
</html>
`;

writeFileSync(join(clientDir, "index.html"), html);
console.log(`[vercel-postbuild] Wrote dist/client/index.html (entry: ${mainJs})`);
