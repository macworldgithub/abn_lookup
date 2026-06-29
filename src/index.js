require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('../config');
const abnRoutes = require('./routes/abn.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use(
  '/api/',
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please slow down.' },
  })
);

// ─── Request Parsing ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (config.server.env !== 'test') {
  app.use(morgan(config.server.env === 'development' ? 'dev' : 'combined'));
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', abnRoutes);

// ─── Root Info ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'ABN Lookup API',
    version: '1.0.0',
    owner: 'Last Lap Media Pty Ltd',
    endpoints: {
      'GET /api/health':            'Health check',
      'GET /api/abn/:abn':          'Look up by ABN (11 digits)',
      'GET /api/abn/:abn/json':     'Lightweight ABN JSON lookup',
      'GET /api/acn/:acn':          'Look up by ACN (9 digits)',
      'GET /api/search?name=...':   'Search by business name',
    },
  });
});

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`\n🚀 ABN Lookup API running on port ${PORT}`);
  console.log(`   Environment : ${config.server.env}`);
  console.log(`   GUID loaded : ${config.abn.guid ? '✓' : '✗ MISSING'}`);
  console.log(`   Docs        : http://localhost:${PORT}/\n`);
});

module.exports = app;
