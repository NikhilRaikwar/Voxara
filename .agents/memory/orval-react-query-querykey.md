---
name: Orval + TanStack Query v5 queryKey
description: Why generated react-query hooks reject `{ query: { enabled } }` and how to satisfy the type.
---

With Orval 8.x generating against TanStack Query v5, the generated query hooks type their
options as `UseQueryOptions<...>` where `queryKey` is **required**. Passing only
`{ query: { enabled: ... } }` fails typecheck with "Property 'queryKey' is missing".

**Rule:** at each call site, also pass the generated key helper:
`{ query: { enabled, queryKey: getXQueryKey(params) } }`.

**Why:** Orval's generated wrapper computes its own default queryKey at runtime, so the
required-queryKey is a type-only over-constraint. The runtime ignores/overrides what you pass.

**How to apply:** Never hand-edit files under `lib/api-client-react/src/generated/` (regen
overwrites them). Import `getXQueryKey` next to the `useX` hook and supply it. This survives
`pnpm --filter @workspace/api-spec run codegen`.
