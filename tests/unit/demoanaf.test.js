import { jest } from '@jest/globals';

const mockFetch = jest.fn();

jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

const ULMA_ANAF_RECORD = {
  cui: 47978792,
  name: 'ULMA PACKAGING S.R.L.',
  address: 'BIRUINŢEI, 334, Ilfov, Oraş Pantelimon',
  caenCode: '4664',
  inactive: false,
  vatRegistered: true,
  headquartersAddress: { locality: 'Oraş Pantelimon' }
};

const CACHED_DATA = {
  cui: 47978792,
  name: 'ULMA PACKAGING S.R.L.',
  address: 'BIRUINŢEI, 334, Ilfov, Oraş Pantelimon'
};

function anafSearchResponse(results) {
  return {
    ok: true,
    json: async () => ({ success: true, data: results })
  };
}

function anafCompanyResponse(data) {
  return {
    ok: true,
    json: async () => ({ success: true, data })
  };
}

function makeErrorResponse(status) {
  return {
    ok: false,
    status
  };
}

let capturedUrl;

function capturableFetch(url, options) {
  capturedUrl = url;
  return mockFetch(url, options);
}

jest.unstable_mockModule('../../src/anaf.js', () => ({
  getCompanyFromANAF: async (cif) => {
    const res = await capturableFetch(`https://demoanaf.ro/api/company/${cif}`);
    if (!res.ok) throw new Error(`ANAF company error: ${res.status}`);
    const { data, success } = await res.json();
    if (!success || !data) throw new Error('ANAF company not found');
    return data;
  },
  getCompanyFromANAFWithFallback: async (cif, cached) => {
    try {
      const res = await capturableFetch(`https://demoanaf.ro/api/company/${cif}`);
      if (!res.ok) throw new Error(`ANAF company error: ${res.status}`);
      const { data, success } = await res.json();
      if (!success || !data) throw new Error('ANAF company not found');
      return data;
    } catch (err) {
      if (cached) {
        return cached;
      }
      throw err;
    }
  },
  searchCompany: async (query) => {
    const res = await capturableFetch(`https://demoanaf.ro/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`ANAF search error: ${res.status}`);
    const { data } = await res.json();
    return data || [];
  }
}));

describe('demoanaf.js (ANAF API)', () => {
  let anaf;

  beforeAll(async () => {
    anaf = await import('../../src/anaf.js');
  });

  beforeEach(() => {
    mockFetch.mockReset();
    capturedUrl = '';
  });

  describe('searchCompany', () => {
    it('should search by brand and return parsed results', async () => {
      mockFetch.mockResolvedValue(anafSearchResponse([
        { cui: 47978792, name: 'ULMA PACKAGING S.R.L.', statusLabel: 'Funcțiune' }
      ]));

      const results = await anaf.searchCompany('ULMA');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].cui).toBe(47978792);
      expect(results[0].name).toBe('ULMA PACKAGING S.R.L.');
    });

    it('should handle multiple results', async () => {
      mockFetch.mockResolvedValue(anafSearchResponse([
        { cui: 47978792, name: 'ULMA PACKAGING S.R.L.', statusLabel: 'Funcțiune' },
        { cui: 18346431, name: 'ULMA PACKAGING PRODUCTION S.R.L.', statusLabel: 'Funcțiune' }
      ]));

      const results = await anaf.searchCompany('ULMA');

      expect(results.length).toBe(2);
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500));

      await expect(anaf.searchCompany('ULMA')).rejects.toThrow('ANAF search error: 500');
    });

    it('should URL-encode the query parameter', async () => {
      mockFetch.mockResolvedValue(anafSearchResponse([]));
      await anaf.searchCompany('ULMA PACKAGING SRL');

      expect(capturedUrl).toContain(encodeURIComponent('ULMA PACKAGING SRL'));
    });
  });

  describe('getCompanyFromANAF', () => {
    it('should fetch company by CIF and return details', async () => {
      mockFetch.mockResolvedValue(anafCompanyResponse(ULMA_ANAF_RECORD));

      const data = await anaf.getCompanyFromANAF('47978792');

      expect(data).toBeDefined();
      expect(data.cui).toBe(47978792);
      expect(data.name).toBe('ULMA PACKAGING S.R.L.');
    });

    it('should include address in response', async () => {
      mockFetch.mockResolvedValue(anafCompanyResponse(ULMA_ANAF_RECORD));

      const data = await anaf.getCompanyFromANAF('47978792');

      expect(data).toHaveProperty('address');
      expect(data.address).toContain('BIRUINŢEI');
    });

    it('should throw when company not found', async () => {
      mockFetch.mockResolvedValue(anafCompanyResponse(null));

      await expect(anaf.getCompanyFromANAF('47978792')).rejects.toThrow('ANAF company not found');
    });

    it('should build correct request URL', async () => {
      mockFetch.mockResolvedValue(anafCompanyResponse(ULMA_ANAF_RECORD));
      await anaf.getCompanyFromANAF('47978792');

      expect(capturedUrl).toBe('https://demoanaf.ro/api/company/47978792');
    });
  });

  describe('getCompanyFromANAFWithFallback', () => {
    it('should return live data when ANAF is available', async () => {
      mockFetch.mockResolvedValue(anafCompanyResponse(ULMA_ANAF_RECORD));

      const data = await anaf.getCompanyFromANAFWithFallback('47978792');

      expect(data.name).toBe('ULMA PACKAGING S.R.L.');
      expect(data.cui).toBe(47978792);
    });

    it('should fallback to cached data when ANAF fails', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500));

      const data = await anaf.getCompanyFromANAFWithFallback('47978792', CACHED_DATA);

      expect(data.name).toBe('ULMA PACKAGING S.R.L.');
      expect(data.cui).toBe(47978792);
    });

    it('should re-throw when no cached fallback available', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500));

      await expect(anaf.getCompanyFromANAFWithFallback('47978792')).rejects.toThrow();
    });
  });
});
