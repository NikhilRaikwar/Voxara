---
name: api-server dev lifecycle
description: How the api-server artifact runs in dev and two gotchas that cost time (no hot reload; esbuild build fails on undeclared deps).
---

The `@workspace/api-server` `dev` script runs `build && start` (esbuild bundle, then `node dist/index.mjs`). It is **not** a watch/hot-reload server.

**Why it matters:**
- Code changes (e.g. a newly registered route) do **not** take effect until the workflow is restarted. A freshly added route returns 404 against the still-running old process until then. Always `restart_workflow "artifacts/api-server: API Server"` after editing server code.
- The build is esbuild bundling, which **fails the whole build** on an unresolved import — not just a type error. If a route imports a package (e.g. `zod`) that is not declared in `artifacts/api-server/package.json`, the build errors with "Could not resolve", the server never starts, and the proxy returns 502. Fix by `pnpm add <pkg>` inside the artifact (uses `catalog:` automatically).
- esbuild does **not** type-check. To validate types run `pnpm --filter @workspace/api-server exec tsc -p tsconfig.json --noEmit` separately; a green build does not imply green types.

**How to apply:** after any server edit, restart the api-server workflow and (for new deps) confirm the dep is in the artifact's own package.json before assuming an import resolves.
