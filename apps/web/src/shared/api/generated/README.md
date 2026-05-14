# Generated API Types

`schema.ts` is generated from `packages/schemas/openapi.yaml`.

Do not edit `schema.ts` manually. Regenerate it from `apps/web`:

```bash
npm run api:types
```

The generated types describe the API gateway contract only. Runtime validation and Go server code generation are not implemented in the current milestone.
