# Project Rules

## TypeScript

- **No `any`**. Never. Use `unknown` + type guard, or a proper interface/type.
- **No inline type annotations in function parameters**. Every function/component prop type MUST be a named interface or type alias, defined separately.
- **No inline object types** like `{ field: string }` in function signatures or callbacks. Extract to `interface` or `type`.
- Use `interface` for object shapes (preferred), `type` for unions/utility types.
- Use the `@client/...` alias for all handwritten imports within `src/client`; never use relative `./...` or `../...` import paths. Generated files such as `routeTree.gen.ts` remain generator-owned.

## Forms

- Keep `useEffect` to absolute minimum — only for syncing external data into the form.
- Use TanStack Query for server data fetching. No raw `fetch`/`axios` calls outside query hooks.

## Components

- Try to keep files focused and small. Split into subdirectories if needed.
- Don't force modularity if it doesn't fit.

## Process

- Run `bun run everything` before considering done.
- Never use browser testing unless explicitly asked. Verify UI-related behavior through type checks and non-browser tests.
- Never start the API or frontend during verification. The developer runs application services.
- No CSS files. Inline styles only.
