import { generateJobsMarkdown } from '../../src/markdown-generator.js';

const companyData = {
  id: "47978792",
  company: "ULMA PACKAGING S.R.L.",
  brand: "ulmapackaging",
  status: "activ",
  location: ["Pantelimon"],
  website: ["https://www.ulmapackaging.ro"],
  career: ["https://www.ulmapackaging.ro/lucreaza-cu-noi/"],
  lastScraped: "2026-06-21"
};

const baseJob = {
  url: "https://ulmapackaging.talentclue.com/en/node/123960156/4590",
  title: "Montator Electromecanic",
  location: ["Apahida"],
  company: "ULMA PACKAGING S.R.L.",
  cif: "47978792",
  status: "scraped",
  date: "2026-06-21T10:00:00.000Z"
};

describe('markdown-generator.js', () => {
  describe('generateJobsMarkdown', () => {
    it('should include company name in heading', () => {
      const md = generateJobsMarkdown(companyData, [baseJob]);
      expect(md).toContain("# ULMA PACKAGING S.R.L.");
    });

    it('should include CIF', () => {
      const md = generateJobsMarkdown(companyData, [baseJob]);
      expect(md).toContain("47978792");
    });

    it('should include brand', () => {
      const md = generateJobsMarkdown(companyData, [baseJob]);
      expect(md).toContain("ulmapackaging");
    });

    it('should include job titles and locations', () => {
      const md = generateJobsMarkdown(companyData, [baseJob]);
      expect(md).toContain("Montator Electromecanic");
      expect(md).toContain("Apahida");
    });

    it('should handle zero jobs', () => {
      const md = generateJobsMarkdown(companyData, []);
      expect(md).toContain("ULMA PACKAGING S.R.L.");
    });

    it('should include company website and career URLs', () => {
      const md = generateJobsMarkdown(companyData, [baseJob]);
      expect(md).toContain("[https://www.ulmapackaging.ro](https://www.ulmapackaging.ro)");
      expect(md).toContain("[https://www.ulmapackaging.ro/lucreaza-cu-noi/](https://www.ulmapackaging.ro/lucreaza-cu-noi/)");
    });

    it('should handle minimal company data', () => {
      const minimal = { id: "47978792", company: "ULMA PACKAGING S.R.L." };
      const md = generateJobsMarkdown(minimal, [baseJob]);
      expect(md).toContain("# ULMA PACKAGING S.R.L.");
    });

    it('should handle jobs with optional fields', () => {
      const minimalJob = { url: "https://test.com/1", title: "Job 1" };
      const md = generateJobsMarkdown(companyData, [minimalJob]);
      expect(md).toContain("Job 1");
    });

    it('should handle multiple jobs', () => {
      const job2 = { ...baseJob, title: "Operator CNC", url: "https://ulmapackaging.talentclue.com/en/node/123026306/4590" };
      const md = generateJobsMarkdown(companyData, [baseJob, job2]);
      expect(md).toContain("Montator Electromecanic");
      expect(md).toContain("Operator CNC");
    });

    it('should handle job with no location', () => {
      const minimal = { url: "https://ulmapackaging.talentclue.com/en/node/999", title: "QA Engineer" };
      const md = generateJobsMarkdown(companyData, [minimal]);
      expect(md).toContain("QA Engineer");
    });

    it('should have current job listings section', () => {
      const md = generateJobsMarkdown(companyData, [baseJob]);
      expect(md).toContain("Current Job Listings");
    });

    it('should link job URLs', () => {
      const md = generateJobsMarkdown(companyData, [baseJob]);
      expect(md).toContain("https://ulmapackaging.talentclue.com/en/node/123960156/4590");
    });
  });
});
