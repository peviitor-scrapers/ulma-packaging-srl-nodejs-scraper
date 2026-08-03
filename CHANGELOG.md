# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-07-28

### Fixed
- Hardcoded job data URL moved to `scraper/config/scraper.json`
- ANAF company cache moved from committed `scraper/anaf-cache.json` to runtime-only `tmp/company.json`
- `lastScraped` is no longer written back into `scraper/config/company.json`
- Root `CONTRIBUTING.md` moved from `ai/` to repo root

### Added
- `ai/AI-DERIVATION-GUIDE.md`, `ai/MAINTENANCE.md`
- `tests/package.json`, `tests/company.json`, consistency tests (root-files, version)
- `automation-template-sync-check.yml`, `job-deep-validate.yml` workflows
- `--content` mode to `tests/validate-ulma-jobs.js` (catches soft-404s)
- `validateByBrowser` to `scraper/job-validator.js`

## [1.0.0] - 2026-06-21

### Added
- Initial release of ULMA PACKAGING S.R.L. scraper
- Derived from sebiboga/epam-systems-international-srl-nodejs-scraper
- Job scraping from ulmapackaging.ro career page (TalentClue HTML/cheerio)
- ANOFM API integration for additional job discovery
- Company validation via ANAF
- Solr integration for job storage
- GitHub Actions workflows for daily scraping and testing
- Comprehensive test suite (unit, integration, E2E)

## License

Copyright (c) 2024-2026 BOGA SEBASTIAN-NICOLAE
Licensed under MIT License
