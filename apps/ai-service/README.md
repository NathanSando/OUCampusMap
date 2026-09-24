# AI service — Python + FastAPI

Called only by the Node API (shared-secret header `X-Service-Secret`), never by the app. Reads
campus data from Supabase; never writes.

| Endpoint                | Purpose                                                                          |
| ----------------------- | -------------------------------------------------------------------------------- |
| `POST /chat`            | RAG campus assistant: retrieve → assemble context → `gpt-4o-mini` → place chips. |
| `POST /classify-report` | Spam / category check for new reports.                                           |
| `GET /health`           | Liveness (no secret).                                                            |

```bash
cd apps/ai-service
py -3.11 -m venv .venv            # macOS/Linux: python3 -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env              # OPENAI_API_KEY, SUPABASE_*, AI_SERVICE_SHARED_SECRET
uvicorn app.main:app --reload --port 8000
pytest -q && ruff check . && black --check .
```

## How answers stay grounded

- `retrieval.py` picks records by building name / abbreviation / alias / name stem ("Gaylord" →
  Gaylord Hall), by category keywords (printer, food, ramp…), by distance from the named building
  or the user, and always includes active reports. Capped at 40 records.
- Context lines say explicitly when hours are unknown, when accessibility data is unverified, and
  when nothing is recorded for a building, so the model can say "I don't know".
- `referencedPlaces` come from matching exact record names in the reply, not from asking the model
  for JSON.
- Cost controls: 400 max tokens for chat, 100 for classification, last 6 history messages, token
  usage logged per request.
