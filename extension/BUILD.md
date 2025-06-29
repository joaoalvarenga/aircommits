# Building AirCommits Extension

## Environment Variables

The extension uses environment variables that are injected during the build process.

### SUPABASE_URL

Set the `SUPABASE_URL` environment variable to your Supabase project URL before building:

```bash
export SUPABASE_URL=https://your-project.supabase.co
npm run compile
```

For local development, you can use:
```bash
export SUPABASE_URL=http://localhost:54321
npm run compile
```

## Build Process

The build process automatically:
1. Reads the `SUPABASE_URL` environment variable
2. Replaces the placeholder in `src/config.ts` with the actual URL
3. Compiles the TypeScript code

## Development

For development with watch mode:
```bash
export SUPABASE_URL=http://localhost:54321
npm run watch
``` 