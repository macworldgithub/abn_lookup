const { validationResult } = require('express-validator');
const abnService = require('../services/abnLookup.service');

/**
 * GET /api/abn/:abn
 * Look up a business by ABN
 */
async function getByABN(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { abn } = req.params;
    const { history } = req.query;

    const data = await abnService.searchByABN(abn, history === 'true' ? 'Y' : 'N');

    if (!data.found) {
      return res.status(404).json({
        success: false,
        message: `No business found for ABN ${abn}`,
      });
    }

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/acn/:acn
 * Look up a business by ACN (ASIC number)
 */
async function getByACN(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { acn } = req.params;
    const data = await abnService.searchByACN(acn);

    if (!data.found) {
      return res.status(404).json({
        success: false,
        message: `No business found for ACN ${acn}`,
      });
    }

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/search?name=...&state=NSW&postcode=2000&maxResults=20
 * Search businesses by name with optional filters
 */
async function searchByName(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      name,
      postcode,
      maxResults,
      // Individual state filters (default all Y)
      NSW, VIC, QLD, SA, WA, TAS, NT, ACT,
    } = req.query;

    const filters = {
      postcode: postcode || '',
      maxResults: parseInt(maxResults) || 20,
      NSW: NSW || 'Y', VIC: VIC || 'Y', QLD: QLD || 'Y',
      SA: SA   || 'Y', WA: WA   || 'Y', TAS: TAS || 'Y',
      NT: NT   || 'Y', ACT: ACT || 'Y',
    };

    const data = await abnService.searchByName(name, filters);
    return res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/abn/:abn/json
 * Lightweight JSON lookup for a single ABN
 */
async function getByABNJson(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { abn } = req.params;
    const data = await abnService.searchByABNJson(abn);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getByABN, getByACN, searchByName, getByABNJson };
