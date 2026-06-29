# ABN Lookup Backend API

Node.js/Express backend for the Australian Government **ABN Lookup Web Services**.

Registered to: **Shaun Sumaru — Last Lap Media Pty Ltd**
GUID: `87529f5f-bca8-4541-8e1a-8a5f32bfb6e4`

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env

# 3. Start (development)
npm run dev

# 4. Start (production)
npm start
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ABN_LOOKUP_GUID` | *(your GUID)* | GUID issued by ABN Lookup |
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | `development` or `production` |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |

---

## API Endpoints

### `GET /api/health`
Health check.

```json
{ "success": true, "status": "ok", "timestamp": "2026-06-03T..." }
```

---

### `GET /api/abn/:abn`
Look up a business by ABN (11 digits, spaces allowed).

**Query params:**
- `history=true` — include historical ABN details

**Example:**
```
GET /api/abn/51824753556
GET /api/abn/51824753556?history=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "found": true,
    "abn": "51824753556",
    "abnStatus": "Active",
    "entityType": { "code": "PRV", "description": "Australian Private Company" },
    "mainName": "Last Lap Media Pty Ltd",
    "tradingNames": [],
    "businessNames": [],
    "acn": "824753556",
    "gst": { "registered": true, "effectiveFrom": "2010-01-01" },
    "mainBusinessLocation": { "state": "NSW", "postcode": "2000" },
    "entityStatus": { "status": "Active", "effectiveFrom": "2010-01-01" }
  }
}
```

---

### `GET /api/abn/:abn/json`
Lightweight JSON lookup (uses ABR's JSON endpoint directly).

```
GET /api/abn/51824753556/json
```

---

### `GET /api/acn/:acn`
Look up a business by ACN / ASIC number (9 digits).

```
GET /api/acn/824753556
```

---

### `GET /api/search`
Search businesses by name.

**Query params:**

| Param | Required | Default | Description |
|---|---|---|---|
| `name` | ✓ | — | Business name to search |
| `postcode` | ✗ | — | Filter by 4-digit postcode |
| `maxResults` | ✗ | `20` | Max results (1–100) |
| `NSW`,`VIC`,`QLD`,`SA`,`WA`,`TAS`,`NT`,`ACT` | ✗ | `Y` | Include/exclude states |

**Example:**
```
GET /api/search?name=Last+Lap+Media&NSW=Y&maxResults=10
```

**Response:**
```json
{
  "success": true,
  "found": true,
  "count": 1,
  "results": [
    {
      "abn": "51824753556",
      "abnStatus": "Active",
      "isCurrent": true,
      "name": "Last Lap Media Pty Ltd",
      "state": "NSW",
      "postcode": "2000"
    }
  ]
}
```

---

## Error Responses

All errors return:
```json
{ "success": false, "message": "Description of the error" }
```

| Status | Meaning |
|---|---|
| `400` | Validation error (bad ABN/ACN format, missing params) |
| `401` | GUID authentication failed |
| `404` | No business found |
| `429` | Rate limit exceeded |
| `502` | ABR upstream error |
| `504` | ABR service timeout |

---

## Project Structure

```
abn-lookup/
├── config/
│   └── index.js               # Centralised config (env vars)
├── src/
│   ├── index.js               # Express app entry point
│   ├── routes/
│   │   └── abn.routes.js      # Route definitions
│   ├── controllers/
│   │   └── abn.controller.js  # Request handlers
│   ├── services/
│   │   └── abnLookup.service.js  # SOAP/XML/JSON calls to ABR
│   └── middleware/
│       ├── validation.js      # express-validator rules + ABN/ACN checksum
│       └── errorHandler.js    # 404 + central error handler
├── .env.example
├── package.json
└── README.md
```

---

## Notes

- Uses the **latest recommended web methods**: `SearchByABNv202001` and `SearchByASICv201408`
- Trading names collected before 28 May 2012 are historical only and have no legal status
- ABN and ACN checksums are validated locally before hitting the ABR service
- Rate limiting is applied per IP address
