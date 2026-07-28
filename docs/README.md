# job_seeker_ro_spider

**job_seeker_ro_spider** — scraper pentru job-urile ULMA PACKAGING S.R.L. din România.

Extrage anunțurile de pe [ulmapackaging.ro](https://www.ulmapackaging.ro/lucreaza-cu-noi/) și le publică în [peviitor.ro](https://peviitor.ro) prin API-ul SOLR.

## Identificare

Toate request-urile HTTP folosesc User-Agent-ul:

```
job_seeker_ro_spider
```

## Ce face

1. **Validează compania** — interoghează API-urile publice ANAF/CUIScan/CUIFirma ([demoanaf.ro](https://demoanaf.ro), [cuiscan.ro](https://cuiscan.ro), [cuifirma.ro](https://cuifirma.ro)) după CIF-ul ULMA PACKAGING (47978792) și verifică:
   - Denumirea oficială: ULMA PACKAGING S.R.L.
   - Status: activ/inactiv/radiat
   - Adresa completă din registrul comerțului
2. **Scrape-uiește job-urile** — extrage lista completă de job-uri de pe pagina de cariere ULMA Packaging Romania (TalentClue HTML/cheerio)
3. **Caută și pe ANOFM** — interoghează API-ul public ANOFM pentru job-uri asociate acestui CIF
4. **Transformă datele** — normalizează locațiile (doar orașe românești), workmode-ul (remote/on-site/hybrid)
5. **Stochează în SOLR** — upsert în `job` core (job-urile) și `company` core (datele companiei cu adresa completă)
6. **Generează docs/jobs.md** — fișier markdown cu informații companie + toate job-urile curente, publicat pe [GitHub Pages](https://sebiboga.github.io/ulma-packaging-srl-nodejs-scraper/jobs.md)

## Structură proiect

```
├── scraper/
│   ├── config/
│   │   ├── company.json     # Sursa unică de adevăr (CIF, brand, URL-uri)
│   │   └── company.js       # Loader ESM pentru config/company.json
│   ├── index.js             # Orchestrator principal
│   ├── company.js           # Validare companie (ANAF + Peviitor + SOLR) cu cache 7 zile
│   ├── api.js               # Operații Peviitor API (query, upsert, delete, company)
│   ├── company-data.js      # Modul multi-sursă: ANAF + CUIScan + CUIFirma (search + company details)
│   ├── company-data-cli.js  # CLI entry point pentru company-data.js
│   ├── markdown-generator.js# Generează docs/jobs.md după scrape
│   ├── job-validator.js     # Primitivă comună: validateByHead, validateByContent
│   └── validate-jobs.js     # Validator deep (manual use)
├── tests/
│   ├── unit/          # Teste unitare
│   ├── integration/   # Teste de integrare (ANAF + SOLR live)
│   └── e2e/           # Teste end-to-end
└── .github/workflows/
    ├── job-seeker-ro-spider.yml     # Rulează zilnic la 6 AM UTC
    └── automation-testing.yml       # Teste automate la fiecare push/PR
```

## API-uri folosite

| API | URL | Autentificare |
|---|---|---|
| ULMA Packaging | `https://www.ulmapackaging.ro/lucreaza-cu-noi/` | Public |
| ANAF (demoanaf) | `https://demoanaf.ro/api/...` | Public |
| CUIScan | `https://cuiscan.ro/api.php` | Public |
| CUIFirma | `https://cuifirma.ro/api/search` | Public |
| ANOFM | `https://mediere.anofm.ro/api/entity/vw_public_job_posting` | Public |
| SOLR (job core) | `https://solr.peviitor.ro/solr/job` | `SOLR_AUTH` |
| SOLR (company core) | `https://solr.peviitor.ro/solr/company` | `SOLR_AUTH` |

## Testare

```bash
# Toate testele
npm test

# Doar unitare
npm run test:unit

# Doar integrare (necesită ANAF live, SOLR conditional)
npm run test:integration

# Doar E2E
npm run test:e2e
```

Testele SOLR folosesc `itIfSolr` — se auto-skip dacă variabila `SOLR_AUTH` nu e setată.
