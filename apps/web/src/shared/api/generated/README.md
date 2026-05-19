# Generated API Types

`schema.ts` is generated from `packages/schemas/openapi.yaml`.

Do not edit `schema.ts` manually. Regenerate it from `apps/web`:

```bash
npm run api:types
```

To verify that the committed generated file still matches the OpenAPI contract:

```bash
npm run api:types:check
```

The generated types describe the API gateway contract only. Frontend dev/test runtime validation is implemented separately in the shared HTTP client. Go server code generation and Go runtime validation from JSON Schema are not implemented.
