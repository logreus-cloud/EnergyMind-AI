# EnergyMind Backend

Node.js API for the EnergyMind AI hackathon MVP.

## Run

```bash
npm install
npm run dev
```

All requests, except `GET /health`, must have an `X-Tenant-Id` header. This is
the MVP's data-isolation boundary: datasets, premises, analyses, and tasks are
kept in separate tenant stores.

## CSV format

Upload a UTF-8 CSV to `POST /api/datasets` as `multipart/form-data` using the
`file` field. Required columns are:

```csv
timestamp,room_id,consumption_kwh
2026-09-01T22:00:00Z,A-203,4.2
```

The parser also accepts Russian column names: `время`, `помещение`,
`потребление_квтч`.

## Main flow

1. `POST /api/premises` creates or updates room metadata.
2. `POST /api/datasets` uploads consumption measurements.
3. `POST /api/analyses` analyzes the latest dataset and returns anomalies,
   seven-day forecast, and recommendations.
4. `POST /api/tasks` confirms a recommendation and creates a staff task.

The complete OpenAPI contract is in `../docs/api.yaml`.
