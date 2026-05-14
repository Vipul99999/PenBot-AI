# Troubleshooting

## Frontend Does Not Start
1. Open a terminal in `client/`.
2. Ensure Node 20+ with `node -v`.
3. Install dependencies with `npm install`.
4. Start the app with `npm run dev`.
5. Ensure `client/.env` exists. For local development, use `VITE_API_URL=http://localhost:4000` or leave it empty if using the Vite `/api` proxy.

## Common Errors

- `Cannot resolve @/...`:
  - Restart the TypeScript server in VS Code: `Cmd/Ctrl+Shift+P` -> `TypeScript: Restart TS Server`.
  - Make sure `vite.config.ts` alias and `tsconfig.json` paths are unchanged.

- Login/API fails:
  - Confirm the backend is running on `http://localhost:4000`.
  - Logout, refresh, and login again if the auth cookie expired.
  - In production, make sure the frontend origin is listed in `CLIENT_URLS` on the server.

- Upload fails:
  - Only `.jpg`, `.jpeg`, `.png`, and `.pdf` are accepted.
  - Check `MAX_UPLOAD_MB` and `MAX_USER_STORAGE_MB`.

- High accuracy OCR is slow:
  - TrOCR/ViT is CPU-heavy. Keep `ENABLE_TROCR=false` in low-cost production unless you have enough compute.
  - Use Fast or Balanced mode for normal users, and reserve High accuracy for limited retries or admin demos.

## Full Stack Run Order
1. Recommended: `docker compose up --build`
2. Manual: start MongoDB, then `server`, then `ai-service`, then `client` in separate terminals.
