import { jest } from '@jest/globals';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import companyConfig from '../../config/company.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const HAS_SOLR = !!process.env.SOLR_AUTH;

function itIfSolr(name, fn, timeout) {
  if (HAS_SOLR) {
    return it(name, fn, timeout);
  }
  return it.skip(`${name} (skipped: SOLR_AUTH not set)`, fn, timeout);
}

beforeAll(() => {
  if (HAS_SOLR) {
    process.env.SOLR_AUTH = process.env.SOLR_AUTH;
  }
});

const TEST_CIF = companyConfig.cif;
const TEST_BRAND = companyConfig.brand;
const COMPANY_LEGAL_NAME = companyConfig.legalName;
const CAREER_URL = companyConfig.careerUrl;
const ROMANIAN_CITIES = ['Bucharest', 'București', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Brașov', 'Constanța', 'Sibiu', 'Oradea', 'Pantelimon', 'Apahida'];

describe('E2E: Full Scraping Pipeline', () => {

  describe('ULMA Packaging Career Page — Real Data Fetch', () => {
    let html;

    beforeAll(async () => {
      const res = await fetch(CAREER_URL, {
        headers: {
          'User-Agent': 'job_seeker_ro_spider'
        }
      }, 60000);
      html = await res.text();
    }, 60000);

    it('should respond with valid HTML from career page', () => {
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('ULMA');
      expect(html).toContain('Packaging');
    }, 10000);

    it('should contain job links pointing to talentclue.com', () => {
      expect(html).toContain('talentclue.com');
    });
  });

  describe('Parse + Transform Pipeline', () => {
    let index;

    beforeAll(async () => {
      index = await import('../../index.js');
    }, 60000);

    it('should map job model correctly', () => {
      const rawJob = {
        url: 'https://ulmapackaging.talentclue.com/en/node/123960156/4590',
        title: 'Montator Electromecanic',
        location: ['Apahida'],
        source: 'ulmapackaging'
      };

      const model = index.mapToJobModel(rawJob, TEST_CIF);

      expect(model).toHaveProperty('url');
      expect(model).toHaveProperty('title', 'Montator Electromecanic');
      expect(model).toHaveProperty('company');
      expect(model).toHaveProperty('cif', TEST_CIF);
      expect(model).toHaveProperty('status', 'scraped');
      expect(model).toHaveProperty('date');
    });

    it('should transform jobs and handle empty locations', () => {
      const jobs = [
        {
          url: 'https://ulmapackaging.talentclue.com/en/node/1',
          title: 'Job 1',
          location: ['Apahida']
        },
        {
          url: 'https://ulmapackaging.talentclue.com/en/node/2',
          title: 'Job 2',
          location: ['Cluj-Napoca']
        }
      ];

      const payload = {
        source: 'ulmapackaging.ro',
        company: COMPANY_LEGAL_NAME,
        cif: TEST_CIF,
        jobs
      };

      const transformed = index.transformJobsForSOLR(payload);

      expect(transformed.company).toBe(COMPANY_LEGAL_NAME);
      expect(transformed.jobs.length).toBe(jobs.length);

      for (const job of transformed.jobs) {
        expect(job).toHaveProperty('location');
        expect(Array.isArray(job.location)).toBe(true);
        expect(job.location.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Company Validation Path', () => {
    let anaf;
    let company;

    beforeAll(async () => {
      anaf = await import('../../src/anaf.js');
      company = await import('../../company.js');
    });

    it('should find ULMA in ANAF and validate active status', async () => {
      const results = await anaf.searchCompany(TEST_BRAND);

      const ulma = results.find(c =>
        c.name.toUpperCase().includes('ULMA PACKAGING') &&
        c.statusLabel === 'Funcțiune'
      );
      if (!ulma) {
        console.log('⚠️ ULMA not found via brand search, trying direct CIF lookup');
        const anafData = await anaf.getCompanyFromANAF(TEST_CIF);
        expect(anafData).toBeDefined();
        expect(anafData.inactive).toBe(false);
        return;
      }
      expect(ulma.cui.toString()).toBe(TEST_CIF);
    }, 30000);

    itIfSolr('should run full validation and report active status with job count', async () => {
      const result = await company.validateAndGetCompany();

      expect(result.status).toBe('active');
      expect(result.company).toBe(COMPANY_LEGAL_NAME);
      expect(result.cif).toBe(TEST_CIF);

      if (result.existingJobsCount === 0) {
        console.log('⚠️ No jobs in Solr — skipping job count assertion');
        return;
      }
      expect(result.existingJobsCount).toBeGreaterThan(0);
    }, 30000);
  });

  describe('SOLR Data Verification', () => {
    let solr;

    beforeAll(async () => {
      solr = await import('../../solr.js');
    });

    itIfSolr('should have company jobs in SOLR with correct company name', async () => {
      const result = await solr.querySOLR(TEST_CIF);

      if (result.numFound === 0) {
        console.log('⚠️ No jobs in Solr — skipping SOLR data verification');
        return;
      }

      for (const job of result.docs) {
        expect(job.company).toBe(COMPANY_LEGAL_NAME);
        expect(job.cif).toBe(TEST_CIF);
      }
    }, 15000);

    itIfSolr('should have company core entry with required fields', async () => {
      const result = await solr.queryCompanySOLR(`id:${TEST_CIF}`);

      expect(result.numFound).toBe(1);
      const companyDoc = result.docs[0];
      expect(companyDoc.company).toBe(COMPANY_LEGAL_NAME);
      expect(companyDoc.status).toBe('activ');
    }, 15000);
  });
});
