# AGENTS.md — Rules for AI agents

## Project
EPAM scraper for peviitor.ro (Node.js, ESM, Jest)

## 📐 This Repo Is a Template
This repo is the **reference implementation** for all Node.js scrapers in the peviitor.ro ecosystem. Other scrapers are derived from it. When making changes:
- **Keep patterns generic and portable** — only the API parsing logic in `index.js` should be EPAM-specific
- **Do not hardcode EPAM beyond what is already hardcoded** — new constants belong at the top of the file with a comment, so derived scrapers can override them in one place
- **If you add a new file, update [CONTRIBUTING.md](CONTRIBUTING.md)** — the derivation checklist must stay accurate

## Critical Rules

### 1. Temporary Files
All temporary/scratch files MUST go in `tmp/` inside the project root.
NEVER use paths outside the project (e.g. `C:\Users\...\AppData\Local\Temp\opencode`).

### 2. Issues & GitHub
- **Orice modificare de cod trebuie să aibă un issue în GitHub Issues** (vezi [ISSUES.md](ISSUES.md))
- Excepții: typo-uri, whitespace, documentație minoră
- Create a GitHub issue before implementing any change
- Commit messages must reference the issue they close
- Never commit credentials (`.env.local`, `*.pem`, etc.)
- Push after commit

### 3. Environment Variables
- `SOLR_AUTH` must be set in `.env.local` for SOLR tests (format: `user:password`)
- `.env.local` is loaded automatically at runtime via `dotenv` (see `package.json`) — never commit it
- Consistency tests also need `GITHUB_REPOSITORY` (format: `owner/repo`) and `GITHUB_TOKEN`

### 4. Testing
```bash
# All tests
npm test

# Unit tests (no env vars needed)
npm run test:unit

# Integration tests (ANAF public API, SOLR conditional)
npm run test:integration

# E2E tests (real EPAM API, SOLR conditional)
npm run test:e2e

# Consistency tests (GitHub repo config — needs GITHUB_REPOSITORY + GITHUB_TOKEN)
npm run test:consistency
```

### 5. ESM + Jest
- Use `jest.unstable_mockModule` (NOT `jest.mock`) for mocking ESM modules
- Run with `--experimental-vm-modules` flag
- SOLR tests use conditional `itIfSolr` helper — auto-skip when `SOLR_AUTH` not set

### 6. Verification
- După orice modificare, urmează [VERIFY.md](VERIFY.md) pas cu pas
- Ultimul pas = rulează scraperul prin GitHub Actions, verifică job-urile în SOLR, și verifică că `docs/jobs.md` a fost generat și este accesibil pe GitHub Pages
- Toate workflow-urile din `.github/workflows/` trebuie să treacă înainte de merge

### 7. Module Structure
- `src/anaf.js` — core ANAF library (imported by company.js); has retry logic: 3 retries, 2s exponential backoff
- `src/markdown-generator.js` — generates docs/jobs.md after each scrape; called from index.js
- `demoanaf.js` — CLI wrapper around src/anaf.js
- `company.js` — company validation (ANAF + Peviitor + SOLR)
- `solr.js` — SOLR operations
- `validate-jobs.js` — standalone job URL validator; checks active/expired, optionally deletes stale jobs
- `index.js` — main scraper orchestrator
