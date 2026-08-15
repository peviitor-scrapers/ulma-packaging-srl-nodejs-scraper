import { jest } from '@jest/globals';

const mockFetch = jest.fn();

jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

function anafSearchResponse(results) {
  return {
    ok: true,
    json: async () => ({ data: results, success: true })
  };
}

function anafCompanyResponse(data) {
  return {
    ok: true,
    json: async () => ({ data, success: true })
  };
}

function errorResponse(status) {
  return {
    ok: false,
    status,
    text: async () => 'Error'
  };
}

function cuiscanCompanyResponse(data) {
  return {
    ok: true,
    json: async () => data
  };
}

const ULMA_ANAF_RECORD = {
  cui: 47978792,
  name: 'ULMA PACKAGING S.R.L.',
  address: 'BIRUINŢEI, 334, 164, Bucureşti Oraş Pantelimon',
  caenCode: '4664',
  inactive: false,
  registrationNumber: 'J12/3456/2005',
  vatRegistered: true,
  onrcStatusLabel: 'Funcțiune',
  legalForm: 'SRL'
};

const CUISCAN_RECORD = {
  cui: 47978792,
  denumire: 'ULMA PACKAGING S.R.L.',
  adresa: 'BIRUINŢEI, 334, 164, Bucureşti Oraş Pantelimon',
  codCaen: '4664',
  activ: true,
  nrRegCom: 'J12/3456/2005',
  platitorTVA: true,
  stareInregistrare: 'INREGISTRAT din data 13.06.2008',
  adresaSediu: { strada: 'BIRUINŢEI, 334', numar: '164', localitate: 'Sector 2 Mun. Bucureşti', judet: 'MUNICIPIUL BUCUREŞTI', codPostal: '020272' }
};

const CACHED_DATA = {
  cui: 47978792,
  name: 'ULMA PACKAGING S.R.L.',
  address: 'BIRUINŢEI, 334, NR.164, Oraş Pantelimon',
  registrationNumber: 'J12/3456/2005',
  caenCode: '4664',
  inactive: false,
  onrcStatusLabel: 'Funcțiune'
};

describe('scraper/company-data.js', () => {
  let anaf;

  beforeAll(async () => {
    anaf = await import('../../scraper/company-data.js');
  });

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('searchCompany', () => {
    it('should return array of companies for valid brand', async () => {
      mockFetch.mockResolvedValue(anafSearchResponse([
        { cui: 47978792, name: 'ULMA PACKAGING S.R.L.', statusLabel: 'Funcțiune' }
      ]));

      const results = await anaf.searchCompany('ULMA PACKAGING');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('cui');
      expect(results[0]).toHaveProperty('name');
    });

    it('should return empty array for non-existent brand', async () => {
      mockFetch.mockResolvedValue(anafSearchResponse([]));

      const results = await anaf.searchCompany('NonExistentBrandXYZ123');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should include statusLabel in results', async () => {
      mockFetch.mockResolvedValue(anafSearchResponse([
        { cui: 47978792, name: 'ULMA PACKAGING S.R.L.', statusLabel: 'Funcțiune' }
      ]));

      const results = await anaf.searchCompany('ULMA PACKAGING');

      expect(results[0]).toHaveProperty('statusLabel', 'Funcțiune');
    });

    it('should fallback to CUIScan when ANAF search fails', async () => {
      mockFetch
        .mockResolvedValueOnce(errorResponse(500))
        .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [{ cui: 47978792, denumire: 'ULMA PACKAGING S.R.L.', activ: true }] }) });

      const results = await anaf.searchCompany('ULMA PACKAGING');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].cui).toBe('47978792');
    });

    it('should encode brand name in URL', async () => {
      let capturedUrl;
      mockFetch.mockImplementation((url) => {
        capturedUrl = url;
        return Promise.resolve(anafSearchResponse([]));
      });

      await anaf.searchCompany('ULMA PACKAGING SRL');
      expect(capturedUrl).toContain(encodeURIComponent('ULMA PACKAGING SRL'));
    });
  });

  describe('getCompanyFromANAF', () => {
    it('should return company data for valid CIF', async () => {
      mockFetch.mockResolvedValue(anafCompanyResponse(ULMA_ANAF_RECORD));

      const data = await anaf.getCompanyFromANAF('47978792');

      expect(data).toBeDefined();
      expect(data.cui).toBe(47978792);
      expect(data.name).toBe('ULMA PACKAGING S.R.L.');
      expect(data).toHaveProperty('address');
      expect(data).toHaveProperty('registrationNumber');
    });

    it('should fallback to CUIScan when ANAF fails', async () => {
      mockFetch
        .mockResolvedValueOnce(errorResponse(500))
        .mockResolvedValueOnce(cuiscanCompanyResponse(CUISCAN_RECORD));

      const data = await anaf.getCompanyFromANAF('47978792');

      expect(data).toBeDefined();
      expect(data.cui).toBe(47978792);
      expect(data.name).toBe('ULMA PACKAGING S.R.L.');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw when both ANAF and CUIScan fail', async () => {
      mockFetch.mockResolvedValue(errorResponse(500));

      await expect(anaf.getCompanyFromANAF('47978792')).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle API-level error response', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: false, error: { message: 'Company not found' } })
        })
        .mockResolvedValueOnce(errorResponse(500));

      await expect(anaf.getCompanyFromANAF('00000000')).rejects.toThrow();
    });

    it('should fallback to CUIScan when ANAF returns no company data', async () => {
      mockFetch
        .mockResolvedValueOnce(anafCompanyResponse(null))
        .mockResolvedValueOnce(cuiscanCompanyResponse(CUISCAN_RECORD));

      const data = await anaf.getCompanyFromANAF('47978792');

      expect(data).toBeDefined();
      expect(data.cui).toBe(CUISCAN_RECORD.cui);
      expect(data.name).toBe(CUISCAN_RECORD.denumire);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCompanyFromANAFWithFallback', () => {
    it('should return fresh data when API works', async () => {
      mockFetch.mockResolvedValue(anafCompanyResponse(ULMA_ANAF_RECORD));

      const data = await anaf.getCompanyFromANAFWithFallback('47978792');

      expect(data.name).toBe('ULMA PACKAGING S.R.L.');
    });

    it('should use cached data when API fails', async () => {
      mockFetch.mockResolvedValue(errorResponse(500));

      const data = await anaf.getCompanyFromANAFWithFallback('47978792', CACHED_DATA);

      expect(data).toEqual(CACHED_DATA);
    });

    it('should throw when API fails and no cache available', async () => {
      mockFetch.mockResolvedValue(errorResponse(500));

      await expect(anaf.getCompanyFromANAFWithFallback('47978792')).rejects.toThrow();
    });
  });
});
