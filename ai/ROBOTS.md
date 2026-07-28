# Robots.txt Analysis — ULMA Packaging

## Target Domain: `www.ulmapackaging.ro`

This scraper accesses the ULMA Packaging Romania career page at `https://www.ulmapackaging.ro/lucreaza-cu-noi/`.

### Scraping Policy

- **Career page**: fetched with rate limiting (1s delay between requests)
- **TalentClue pages**: individual job detail pages fetched with rate limiting
- **ANOFM API**: public API queried by CIF
- **User-Agent**: `job_seeker_ro_spider` — identifiable, single UA
- **Respectful behavior**: 1 second delay between requests, no concurrent requests

### Compliance

This scraper only accesses publicly available job listing information for legitimate job data aggregation.
