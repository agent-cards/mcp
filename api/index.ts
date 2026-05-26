// Vercel serverless entry. Imports compiled JS from dist/ so Vercel doesn't
// re-transpile our TS with its own settings (the @vercel/node compiler is
// stricter than our tsconfig and rejects existing valid code).

// @ts-expect-error - dist/ is produced by the buildCommand
import app from '../dist/http.js';
export default app;
