import { jest } from '@jest/globals';

describe('index.js Component Tests', () => {
  let index;

  beforeAll(async () => {
    index = await import('../../scraper/index.js');
  });

  describe('transformJobsForSOLR', () => {
    it('should filter locations to only Romanian cities', () => {
      const payload = {
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', location: ['România'] },
          { url: 'https://test.com/2', title: 'Job 2', location: ['Pantelimon'] },
          { url: 'https://test.com/3', title: 'Job 3', location: ['Bulgaria'] },
          { url: 'https://test.com/4', title: 'Job 4', location: ['Pantelimon'] },
          { url: 'https://test.com/5', title: 'Job 5', location: [] }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.jobs[0].location).toEqual(['România']);
      expect(result.jobs[1].location).toEqual(['Pantelimon']);
      expect(result.jobs[2].location).toEqual(['România']);
      expect(result.jobs[3].location).toEqual(['Pantelimon']);
      expect(result.jobs[4].location).toEqual(['România']);
    });

    it('should keep company uppercase', () => {
      const payload = {
        source: 'ulmapackaging.ro',
        company: 'ulma packaging romania srl',
        cif: '47978792',
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', company: 'ulma packaging', cif: '47978792' }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.company).toBe('ULMA PACKAGING ROMANIA SRL');
    });

    it('should normalize workmode values', () => {
      const payload = {
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', workmode: 'Remote' },
          { url: 'https://test.com/2', title: 'Job 2', workmode: 'ON-SITE' },
          { url: 'https://test.com/3', title: 'Job 3', workmode: 'Hybrid' },
          { url: 'https://test.com/4', title: 'Job 4', workmode: 'hybrid' }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.jobs[0].workmode).toBe('remote');
      expect(result.jobs[1].workmode).toBe('on-site');
      expect(result.jobs[2].workmode).toBe('hybrid');
      expect(result.jobs[3].workmode).toBe('hybrid');
    });

    it('should handle empty jobs array', () => {
      const result = index.transformJobsForSOLR({ jobs: [] });
      expect(result.jobs).toEqual([]);
    });
  });

  describe('mapToJobModel', () => {
    it('should map raw job to job model format', () => {
      const rawJob = {
        url: 'https://www.ulmapackaging.ro/en/node/123960156/4590',
        title: 'Montator Electromecanic',
        location: ['Pantelimon'],
        tags: ['Java', 'Spring'],
        workmode: 'hybrid'
      };

      const COMPANY_NAME = 'ULMA PACKAGING S.R.L.';
      const COMPANY_CIF = '47978792';

      const result = index.mapToJobModel(rawJob, COMPANY_CIF, COMPANY_NAME);

      expect(result.url).toBe(rawJob.url);
      expect(result.title).toBe(rawJob.title);
      expect(result.company).toBe(COMPANY_NAME);
      expect(result.cif).toBe(COMPANY_CIF);
      expect(result.location).toEqual(rawJob.location);
      expect(result.tags).toEqual(rawJob.tags);
      expect(result.workmode).toBe(rawJob.workmode);
      expect(result.status).toBe('scraped');
      expect(result.date).toBeDefined();
    });

    it('should remove undefined fields', () => {
      const rawJob = {
        url: 'https://test.com/1',
        title: 'Job 1'
      };

      const result = index.mapToJobModel(rawJob, '47978792');

      expect(result.location).toBeUndefined();
      expect(result.tags).toBeUndefined();
      expect(result.workmode).toBeUndefined();
    });

    it('should handle missing title', () => {
      const rawJob = { url: 'https://test.com/1' };

      const result = index.mapToJobModel(rawJob, '47978792');

      expect(result.title).toBeUndefined();
      expect(result.url).toBe('https://test.com/1');
    });
  });

  describe('parseApiJobs', () => {
    it('should parse ULMA PACKAGING job data JSON', () => {
      const data = {
        jobs: [
          {
            url: 'https://ulmapackaging.talentclue.com/en/node/127126089/4590',
            title: 'Programator CNC',
            city: 'Apahida',
            work_modality: 'Hybrid',
            discipline_label: 'Production',
            shift_label: 'Full time',
            is_archived: '0'
          }
        ]
      };

      const result = index.parseApiJobs(data);

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].title).toBe('Programator CNC');
      expect(result.jobs[0].location).toEqual(['Apahida']);
      expect(result.jobs[0].workmode).toBe('hybrid');
    });

    it('should handle empty listing', () => {
      const result = index.parseApiJobs({ jobs: [] });

      expect(result.jobs).toEqual([]);
    });

    it('should handle missing data gracefully', () => {
      const result = index.parseApiJobs({});

      expect(result.jobs).toEqual([]);
    });

    it('should skip archived jobs', () => {
      const data = {
        jobs: [
          { url: 'https://test.com/1', title: 'Active', is_archived: '0' },
          { url: 'https://test.com/2', title: 'Archived', is_archived: '1' }
        ]
      };

      const result = index.parseApiJobs(data);

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].title).toBe('Active');
    });
  });
});
