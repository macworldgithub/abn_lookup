require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  abn: {
    guid: process.env.ABN_LOOKUP_GUID || '87529f5f-bca8-4541-8e1a-8a5f32bfb6e4',
    // Document-style SOAP endpoint (recommended)
    baseUrl: 'https://abr.business.gov.au/abrxmlsearch/ABRXMLSearch.asmx',
    // JSON endpoint
    jsonBaseUrl: 'https://abr.business.gov.au/json',
    // Latest recommended web method versions
    methods: {
      searchByABN: 'SearchByABNv202001',
      searchByACN: 'SearchByASICv201408',
      searchByName: 'SearchByNameAdvancedSimpleProtocol2017',
    },
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },
};
