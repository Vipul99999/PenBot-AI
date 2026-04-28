# Troubleshooting (VS Code)

## Frontend does not start
1. Open terminal in `client/`.
2. Ensure Node 20+ (`node -v`).
3. Install dependencies: `npm install`.
4. Start app: `npm run dev`.
5. Ensure `client/.env` exists with:
   `VITE_API_URL=http://localhost:4000`

## Common errors
- `Cannot resolve @/...`:
  - restart TS server in VS Code (`Cmd/Ctrl+Shift+P` → `TypeScript: Restart TS Server`).
  - make sure `vite.config.ts` alias and `tsconfig.json` paths are unchanged.

- Login/API fails:
  - backend not running on `http://localhost:4000`.
  - token expired: clear localStorage and login again.

- Upload fails:
  - only `.jpg/.jpeg/.png/.pdf` accepted
  - file size limit is 20MB

## Full stack run order
1. `docker compose up --build` (recommended)
   OR
2. Start `server`, then `ai-service`, then `client` in separate terminals.
