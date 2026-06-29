const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/abn.controller');
const { validateABN, validateACN, validateNameSearch } = require('../middleware/validation');

/**
 * @route   GET /api/abn/:abn
 * @desc    Look up a business by ABN (11 digits)
 * @query   history=true  Include historical records
 * @example GET /api/abn/51824753556
 */
router.get('/abn/:abn', validateABN, ctrl.getByABN);

/**
 * @route   GET /api/abn/:abn/json
 * @desc    Lightweight JSON lookup for an ABN
 * @example GET /api/abn/51824753556/json
 */
router.get('/abn/:abn/json', validateABN, ctrl.getByABNJson);

/**
 * @route   GET /api/acn/:acn
 * @desc    Look up a business by ACN / ASIC number (9 digits)
 * @example GET /api/acn/008657555
 */
router.get('/acn/:acn', validateACN, ctrl.getByACN);

/**
 * @route   GET /api/search
 * @desc    Search businesses by name
 * @query   name (required)
 * @query   postcode, maxResults, NSW, VIC, QLD, SA, WA, TAS, NT, ACT (optional Y/N)
 * @example GET /api/search?name=Last+Lap+Media&NSW=Y
 */
router.get('/search', validateNameSearch, ctrl.searchByName);

/**
 * @route   GET /api/health
 * @desc    Health check
 */
router.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
