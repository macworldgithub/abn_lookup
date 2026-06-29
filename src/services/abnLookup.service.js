const axios = require('axios');
const xml2js = require('xml2js');
const config = require('../../config');

const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });

/**
 * Parse XML response from ABN Lookup SOAP service
 */
async function parseXml(xml) {
  return new Promise((resolve, reject) => {
    parser.parseString(xml, (err, result) => {
      if (err) reject(new Error(`XML parse error: ${err.message}`));
      else resolve(result);
    });
  });
}

/**
 * Build SOAP envelope for ABN Lookup requests
 */
function buildSoapEnvelope(method, params) {
  const paramXml = Object.entries(params)
    .map(([key, val]) => `<${key}>${val}</${key}>`)
    .join('\n        ');

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${method} xmlns="http://abr.business.gov.au/ABRXMLSearch/">
        ${paramXml}
    </${method}>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Execute a SOAP call to ABN Lookup
 */
async function soapCall(method, params) {
  const envelope = buildSoapEnvelope(method, {
    ...params,
    authenticationGuid: config.abn.guid,
  });

  const response = await axios.post(config.abn.baseUrl, envelope, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: `http://abr.business.gov.au/ABRXMLSearch/${method}`,
    },
    timeout: 15000,
  });

  const parsed = await parseXml(response.data);
  const body = parsed['soap:Envelope']?.['soap:Body'];
  if (!body) throw new Error('Invalid SOAP response structure');

  const responseKey = `${method}Response`;
  const resultKey = `${method}Result`;
  const result = body[responseKey]?.[resultKey];
  if (!result) throw new Error('No result in SOAP response');

  // Check for ABR-level errors
  if (result.exception) {
    throw new Error(result.exception.exceptionDescription || 'ABR service error');
  }

  return result;
}

/**
 * Search by ABN using latest v202001 method
 */
async function searchByABN(abn, includeHistoricalDetails = 'N') {
  const cleanAbn = abn.replace(/\s/g, '');
  const result = await soapCall(config.abn.methods.searchByABN, {
    searchString: cleanAbn,
    includeHistoricalDetails,
  });
  return transformABNResult(result);
}

/**
 * Search by ACN using latest v201408 method
 */
async function searchByACN(acn) {
  const cleanAcn = acn.replace(/\s/g, '');
  const result = await soapCall(config.abn.methods.searchByACN, {
    searchString: cleanAcn,
    includeHistoricalDetails: 'N',
  });
  return transformABNResult(result);
}

/**
 * Search by business name (advanced simple protocol)
 */
async function searchByName(name, filters = {}) {
  const params = {
    name,
    legalName: filters.legalName || '',
    tradingName: filters.tradingName || '',
    NSW: filters.NSW || 'Y',
    SA:  filters.SA  || 'Y',
    ACT: filters.ACT || 'Y',
    VIC: filters.VIC || 'Y',
    WA:  filters.WA  || 'Y',
    NT:  filters.NT  || 'Y',
    QLD: filters.QLD || 'Y',
    TAS: filters.TAS || 'Y',
    postcode: filters.postcode || '',
    searchWidth: filters.searchWidth || 'typical',
    minimumScore: filters.minimumScore || 0,
    maxSearchResults: filters.maxResults || 20,
  };

  const result = await soapCall(config.abn.methods.searchByName, params);
  return transformNameSearchResult(result);
}

/**
 * JSON endpoint: Search by ABN (lightweight)
 */
async function searchByABNJson(abn) {
  const cleanAbn = abn.replace(/\s/g, '');
  const url = `${config.abn.jsonBaseUrl}/AbnDetails.aspx`;
  const response = await axios.get(url, {
    params: { abn: cleanAbn, guid: config.abn.guid },
    timeout: 10000,
  });

  // ABR JSON responses are wrapped in a callback — strip it if present
  let data = response.data;
  if (typeof data === 'string') {
    const match = data.match(/^[^(]*\((.*)\)\s*;?\s*$/s);
    if (match) data = JSON.parse(match[1]);
  }
  return data;
}

// ─── Transformers ─────────────────────────────────────────────────────────────

function transformABNResult(raw) {
  const entity = raw.businessEntity202001 || raw.businessEntity;
  if (!entity) return { found: false };

  const names = normaliseArray(entity.mainName);
  const tradingNames = normaliseArray(entity.mainTradingName);
  const businessNames = normaliseArray(entity.businessName);
  const acns = normaliseArray(entity.ASICNumber);

  return {
    found: true,
    abn: entity.ABN?.identifierValue,
    abnStatus: entity.ABN?.identifierStatus,
    abnStatusEffectiveFrom: entity.ABN?.replacedFrom,
    entityType: {
      code: entity.entityType?.entityTypeCode,
      description: entity.entityType?.entityDescription,
    },
    mainName: names[0]?.organisationName || names[0]?.['@_'] || null,
    tradingNames: tradingNames.map(n => n.organisationName || n).filter(Boolean),
    businessNames: businessNames.map(n => n.organisationName || n).filter(Boolean),
    acn: acns[0]?.identifierValue || null,
    gst: {
      registered: entity.goodsAndServicesTax?.effectiveFrom ? true : false,
      effectiveFrom: entity.goodsAndServicesTax?.effectiveFrom || null,
    },
    mainBusinessLocation: entity.mainBusinessPhysicalAddress
      ? {
          state: entity.mainBusinessPhysicalAddress.stateCode,
          postcode: entity.mainBusinessPhysicalAddress.postcode,
        }
      : null,
    entityStatus: {
      status: entity.entityStatus?.entityStatusCode,
      effectiveFrom: entity.entityStatus?.effectiveFrom,
    },
  };
}

function transformNameSearchResult(raw) {
  const names = normaliseArray(raw.searchResultsList?.searchResultsRecord);
  return {
    found: names.length > 0,
    count: names.length,
    results: names.map(r => ({
      abn: r.ABN?.identifierValue,
      abnStatus: r.ABN?.identifierStatus,
      isCurrent: r.ABN?.identifierStatus === 'Active',
      name: r.mainName?.organisationName || r.mainName || null,
      nameType: r.mainName?.nameType || null,
      state: r.mainBusinessPhysicalAddress?.stateCode || null,
      postcode: r.mainBusinessPhysicalAddress?.postcode || null,
    })),
  };
}

function normaliseArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

module.exports = { searchByABN, searchByACN, searchByName, searchByABNJson };
