# Personal Notes Q&A

A full-stack personal notes application with grounded question answering over your notes.

- **Frontend:** React 19, TypeScript, React Router, Vite
- **Backend:** Node.js, TypeScript, Express 5
- **Storage:** PostgreSQL when `DATABASE_URL` is set; in-memory fallback for local development and tests
- **Ask AI:** local retrieval and extractive answers with note sources

The UI uses a dark black/gray theme and is fully connected to the backend: notes can be created, edited, deleted, searched, imported from PDF/DOCX files, and used as sources for Q&A.

## Current capabilities

- Notes CRUD through the UI and REST API
- PostgreSQL persistence when `DATABASE_URL` is configured
- Import PDF (`.pdf`) and Word (`.docx`) documents as notes
- Dashboard with live note counts and the most recently updated notes
- Notes list, create route (`/notes/new`), and note detail/edit route (`/notes/:id`)
- Delete confirmation and inline validation
- Global search with `Ctrl+K` / `Cmd+K`
- Ask AI from the dashboard or the Q&A page
- Ask AI directly from an open note with the editor's **Ask AI** button
- Answers are generated from your own notes and include source cards that link back to the note
- JSON error responses without stack traces
- CORS enabled for separate frontend and API origins

> **Ask AI is local retrieval, not an external generative AI service.** Answers are assembled from the most relevant passages in your notes. No API keys, external LLM, embeddings, or vector database are required at this stage.

> **Storage:** when `DATABASE_URL` is set, notes are stored in PostgreSQL and survive backend restarts and redeploys. Without `DATABASE_URL`, local development and tests use in-memory storage, where data is lost on restart.

## Project structure

```text
render.yaml                   Render Blueprint for the single web service and database
client/
  src/
    api.ts                    Typed Notes and Ask API client
    context/
      NotesContext.ts         Shared notes context and useNotes hook
      NotesProvider.tsx       Notes loading and CRUD state
    components/
      dashboard/              Dashboard and recent notes
      layout/                 App shell, search dialog, sidebar
      notes/                  Notes list, page, editor, and document import
      qa/                     Ask AI conversation UI
    App.tsx                   Routes and providers
    index.css                 Application styling
  vite.config.ts              API development proxy
server/
  app.ts                      Express app, CORS, JSON errors
  server.ts                   HTTP server startup
  tsconfig.build.json         Production TypeScript build to dist/
  notes/
    noteStore.ts              Note types, PostgreSQL storage, and in-memory fallback
    notesRouter.ts            Notes routes, validation, and file upload
    importService.ts          PDF/DOCX text extraction
    notes.test.ts             Notes API integration tests
    import.test.ts            PDF/DOCX import tests
  qa/
    askService.ts             Retrieval, scoring, answers, and sources
    qaRouter.ts               POST /api/ask validation
    qa.test.ts                Ask API integration tests
  rag/
    chunker.ts                Text chunking used by retrieval
```

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- PostgreSQL 13+ (optional locally; required for durable storage)

## Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

## Running locally

The frontend and backend run in separate terminals.

### 1. Start the backend

```bash
cd server
npm run dev
```

The backend listens on `http://localhost:5000` by default. Use `PORT` if that port is unavailable:

```bash
PORT=5055 npm run dev
```

Windows PowerShell:

```powershell
$env:PORT = "5055"; npm run dev
```

### 2. Start the frontend

```bash
cd client
npm run dev
```

Vite serves the frontend on `http://localhost:5173` by default and proxies `/api` requests to `http://localhost:5000`.

If the backend uses another port, point the proxy at it before starting Vite.

Windows PowerShell:

```powershell
$env:VITE_API_PROXY_TARGET = "http://localhost:5055"; npm run dev
```

Or create `client/.env.local`:

```dotenv
VITE_API_PROXY_TARGET=http://localhost:5055
```

For a production build where the API is on a different origin, set `VITE_API_URL` at build time:

```bash
VITE_API_URL=https://api.example.com npm run build
```

When the API is served from the same origin, leave `VITE_API_URL` unset. A bare hostname such as `api.example.com` is also accepted; the client adds `https://`.

### Durable local storage

Without `DATABASE_URL`, the backend uses in-memory storage and notes disappear when it restarts. To persist notes locally, start PostgreSQL and point the backend at it:

```bash
docker run --name personal-notes-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=personal_notes \
  -p 5432:5432 \
  -d postgres:16
```

macOS/Linux:

```bash
cd server
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/personal_notes npm run dev
```

Windows PowerShell:

```powershell
cd server
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/personal_notes"
npm run dev
```

The notes table and index are created automatically on startup. If `DATABASE_URL` is unset, local development and the test suite continue to use memory.

You can also create `server/.env` instead of setting the variable in your shell:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/personal_notes
```

## Deploy to Render

The repository includes a [`render.yaml`](render.yaml) Blueprint with one web service and a PostgreSQL database:

- **`personal-notes-q-a`** — Node service that serves the React app and the Express API from the same URL
- **`personal-notes-q-a-db`** — Render Postgres database connected through `DATABASE_URL`

### Deploy with the Blueprint

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. In the [Render Dashboard](https://dashboard.render.com/), choose **New → Blueprint**.
3. If a failed service named `personal-notes-q-a` already exists, delete that **web service** first. Do not delete an existing database.
4. Select the repository and apply the Blueprint.
5. Render creates the database and the web service, then deploys them.
6. Open `https://personal-notes-q-a.onrender.com`.

If the service name is already taken by another Render service in your workspace, rename it in `render.yaml`.

The React build is served by Express, so no `VITE_API_URL` is needed. The browser calls `/api` on the same origin.

### Manual setup instead of the Blueprint

Create **one** Render web service from the repository root, plus one PostgreSQL database.

| Setting | Value |
| --- | --- |
| Root directory | repository root (leave blank) |
| Build command | `cd server && npm ci --include=dev && npm run build && cd ../client && npm ci --include=dev && npm run build` |
| Start command | `node server/dist/server.js` |
| Health check path | `/api/health` |
| `NODE_VERSION` | `22.12.0` |
| `NODE_ENV` | `production` |
| `SERVE_CLIENT` | `true` |
| `CLIENT_DIST_PATH` | `./client/dist` |
| `DATABASE_URL` | Internal Database URL from your Render Postgres |

Do not set `PORT`; Render provides it automatically. Use the database's **Internal Database URL** from its **Connect** menu. It is private and faster than the external URL. If you use an external provider such as Neon, add its connection string instead (usually with `?sslmode=require`).

The server creates the `notes` table and index on startup. In production, it refuses to start without `DATABASE_URL` so notes are never silently stored in memory.

### Production build locally

From the repository root:

```bash
cd client && npm ci --include=dev && npm run build && cd ..
cd server && npm ci --include=dev && npm run build && cd ..
SERVE_CLIENT=true CLIENT_DIST_PATH=./client/dist DATABASE_URL=postgresql://... NODE_ENV=production node server/dist/server.js
```

On Windows PowerShell, set the variables with `$env:NAME = "value"` before the last command.

> **Render builds on Linux, where paths are case-sensitive.** Keep the backend directory committed as lowercase `server/`, not `Server/`.

> **Free-tier caveat:** free web services sleep after inactivity, so the first request after a quiet period can take a while. Notes are stored in PostgreSQL and survive web-service restarts and redeploys. However, **Free Render Postgres expires 30 days after creation**. Upgrade the database to a paid plan before then for permanent storage; after the 14-day grace period, Render deletes the database and its data. The API also has no authentication, so anyone with the URL can read and modify notes.

> **Permanent storage:** change the database plan in `render.yaml` from `free` to `0.1c-256mb` (paid), or set `DATABASE_URL` to an external persistent PostgreSQL service such as Neon or Supabase.

## Frontend routes and controls

| Route | Purpose |
| --- | --- |
| `/` | Dashboard, recent notes, stats, and Ask AI entry point |
| `/notes` | All notes and selected-note editor |
| `/notes/new` | Create a new note |
| `/notes/:id` | View and edit a note |
| `/qa` | Q&A conversation |
| `/qa?q=...` | Open Q&A and automatically ask the supplied question |

- `Ctrl+K` / `Cmd+K` opens global search.
- `Escape` closes the search dialog.
- Search matches note titles and content.
- Ask AI source cards open the corresponding note.
- The **Ask AI** button in an open note starts a question about that note's title.
- **Import PDF/DOCX** on the Notes page (and the dashboard empty state) opens the device file picker.
- An imported file becomes a regular note whose title comes from the filename and whose content is the extracted text.
- Unknown frontend routes redirect to the dashboard.

## Ask AI API

`POST /api/ask` accepts a JSON body with a `question` string:

```bash
curl -X POST http://localhost:5000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"What did I write about Docker networking?"}'
```

`200 OK`:

```json
{
  "answer": "Here is what I found in your notes:\n\nDocker Networking: Docker networking allows containers to communicate...",
  "sources": [
    {
      "noteId": "2f1c9d3e-7a4b-4c8e-9f01-5d6a7b8c9d0e",
      "title": "Docker Networking",
      "excerpt": "Docker networking allows containers to communicate with each other and with external networks. The host network removes network isolation between the container and the Docker host.",
      "relevance": 12
    }
  ]
}
```

### How the answer is built

1. Note content is split into overlapping chunks with the existing `chunkText` utility.
2. Query words are normalized, common stop words are removed, and simple word forms are matched (for example, `network` and `networks`).
3. Chunks are scored using term overlap, repeated terms, title matches, and exact phrase matches.
4. The top three distinct notes become sources, each with a short relevant excerpt and a relevance score.
5. The answer is an extractive summary built from those source excerpts.

Empty-note questions return a helpful message with no sources. When no keywords match, Ask AI does not stop at a dead end: it returns the most recent notes as fallback source cards so you can continue investigating. Summary/overview questions return the note titles currently available.

### Validation

- `question` is required and must be a non-empty string.
- The trimmed question must be 1000 characters or fewer.
- Invalid input returns `400` with a JSON error:

```json
{
  "error": "Question is required and must be a non-empty string."
}
```

## Notes API

Each note has the following shape:

```json
{
  "id": "2f1c9d3e-7a4b-4c8e-9f01-5d6a7b8c9d0e",
  "title": "Docker Networking",
  "content": "Bridge networks allow containers to communicate.",
  "createdAt": "2026-10-22T10:15:00.000Z",
  "updatedAt": "2026-10-22T10:15:00.000Z"
}
```

`id`, `createdAt`, and `updatedAt` are assigned by the server. Timestamps are ISO 8601 strings.

### Endpoints

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/api/notes` | List all notes | `200` |
| `POST` | `/api/notes` | Create a note | `201` |
| `POST` | `/api/notes/import` | Import a PDF or DOCX as a note | `201` |
| `GET` | `/api/notes/:id` | Get one note | `200` |
| `PUT` | `/api/notes/:id` | Replace a note's title and content | `200` |
| `DELETE` | `/api/notes/:id` | Delete a note | `204` |
| `POST` | `/api/ask` | Ask a question about the notes | `200` |

`GET /` and `GET /api/health` remain available for basic server checks. The health response reports the active store:

```json
{"status":"ok","storage":"postgres"}
```

`storage` is `"postgres"` when `DATABASE_URL` is configured and `"memory"` otherwise.

### Importing PDF and DOCX documents

`POST /api/notes/import` accepts `multipart/form-data` with one file in the `file` field:

```bash
curl -X POST http://localhost:5000/api/notes/import \
  -F "file=@Project Atlas.pdf"
```

The response is a normal note object with `201 Created`. The note title is derived from the filename (`Project_Atlas.pdf` becomes `Project Atlas`), and the extracted document text becomes the note content.

- Supported formats: `.pdf` and `.docx`
- Legacy `.doc` files are rejected; save them as `.docx` first
- Maximum upload size: 15 MB
- Maximum extracted text: 1,000,000 characters
- Scanned/image-only PDFs need OCR before import
- Only the extracted text is stored; the original file is not retained
- Unsupported, corrupt, password-protected, or empty documents return `400` with a JSON error

Imported notes are regular notes, so they can be searched, edited, deleted, and used as Ask AI sources immediately.

### Validation rules

- `title` is required and must be a non-empty string. Surrounding whitespace is removed.
- `content` is required and must be a string. An empty string is allowed.
- `PUT` replaces both `title` and `content`, so both fields are required.
- Imports require exactly one supported file in the `file` field.
- Invalid bodies and invalid files return `400` with a JSON error; oversized uploads return `413`.
- Unknown note IDs and unknown routes return `404` with a JSON error.
- Errors use a consistent JSON shape:

```json
{
  "error": "Title is required and must be a non-empty string."
}
```

Internal stack traces are never included in API responses.

## Example requests

### Create a note

```bash
curl -X POST http://localhost:5000/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Docker Networking","content":"Bridge networks allow containers to communicate."}'
```

`201 Created`:

```json
{
  "id": "2f1c9d3e-7a4b-4c8e-9f01-5d6a7b8c9d0e",
  "title": "Docker Networking",
  "content": "Bridge networks allow containers to communicate.",
  "createdAt": "2026-10-22T10:15:00.000Z",
  "updatedAt": "2026-10-22T10:15:00.000Z"
}
```

### List notes

```bash
curl http://localhost:5000/api/notes
```

`200 OK`: an array of note objects.

### Get one note

```bash
curl http://localhost:5000/api/notes/2f1c9d3e-7a4b-4c8e-9f01-5d6a7b8c9d0e
```

`200 OK`: the matching note. Unknown IDs return `404`.

### Update a note

```bash
curl -X PUT http://localhost:5000/api/notes/2f1c9d3e-7a4b-4c8e-9f01-5d6a7b8c9d0e \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title","content":"Updated content."}'
```

`200 OK`: the updated note, with a new `updatedAt` and the original `createdAt`.

### Delete a note

```bash
curl -X DELETE http://localhost:5000/api/notes/2f1c9d3e-7a4b-4c8e-9f01-5d6a7b8c9d0e
```

`204 No Content`: empty response body.

### Invalid request example

```bash
curl -X POST http://localhost:5000/api/notes \
  -H "Content-Type: application/json" \
  -d '{"content":"Missing title"}'
```

`400 Bad Request`:

```json
{
  "error": "Title is required and must be a non-empty string."
}
```

## Checks

Backend:

```bash
cd server
npm run typecheck
npm test
```

Frontend:

```bash
cd client
npm run build
npm run lint
```

The backend test suite covers the Notes API, PDF/DOCX import, and Ask AI API, including validation, invalid files, grounded answers, word-form matching, and the no-match fallback.

## Current limitations and next steps

- Without `DATABASE_URL`, notes use in-memory storage and are lost on restart.
- Free Render Postgres databases expire 30 days after creation; use a paid database plan for permanent storage.
- Imported documents are converted to text; scanned/image-only PDFs require OCR first.
- Legacy `.doc` files are not supported; use `.docx` or PDF.
- Ask AI uses lexical retrieval, not embeddings or a generative LLM, so synonyms and paraphrases may be missed.
- Q&A conversations are not stored.
- There is no authentication or multi-user separation yet.
- Planned next steps include authentication, embeddings/vector search, and optionally an LLM for generated answers while preserving grounded source citations.
