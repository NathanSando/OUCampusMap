# Node API — Express + TypeScript

Thin server for the things the app can't safely do directly against Supabase (design doc §7):

| Method   | Path                    | Auth     | What it does                                                                   |
| -------- | ----------------------- | -------- | ------------------------------------------------------------------------------ |
| `POST`   | `/api/reports`          | Required | Validate, AI spam/category check, compute `expires_at`, insert (service role). |
| `POST`   | `/api/reports/:id/vote` | Required | `{ "vote": 1 \| -1 }` — upsert, recount, auto-hide at net ≤ −5.                |
| `DELETE` | `/api/reports/:id`      | Required | Author-only soft delete.                                                       |
| `POST`   | `/api/assistant/chat`   | Optional | Proxy to the AI service.                                                       |
| `GET`    | `/api/health`           | None     | `{ status, uptime, aiService }` — also keeps the free tier warm.               |

There are deliberately **no read endpoints** — the app reads from Supabase directly.

```bash
cp .env.example .env    # fill in from `npx supabase start` output
npm run api             # from the repo root (tsx watch)
npm test -w apps/api    # Vitest + Supertest against in-memory fakes
```

- `src/app.ts` builds the Express app from injected dependencies (`src/services/types.ts`), so
  tests run without Supabase or the AI service.
- If the AI service is down or takes longer than 2 s, reports are **accepted anyway** with the
  user's category.
- Rate limits (in-memory): 5 reports/user/h, 60 votes/user/h, 20 chats/user/h + 60 chats/IP/h.
- Errors are always `{ "error": { "code", "message" } }`.
