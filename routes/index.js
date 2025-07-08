var express = require('express');
var router = express.Router();
const Database = require('../database');

const db = new Database();

/* 取得首頁 */
router.get('/', function(req, res, next) {
  res.sendFile('index.html', { root: 'public' });
});

// CPI 資料 API
router.get('/api/cpi', function(req, res) {
  const baseYear = parseInt(req.query.baseYear) || 1951;
  const startYear = parseInt(req.query.startYear) || 1951;
  const endYear = parseInt(req.query.endYear) || 2024;

  db.getCPIData(baseYear, startYear, endYear, (err, data) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(data);
  });
});

// 統計摘要 API
router.get('/api/cpi/latest', function(req, res) {
  const baseYear = parseInt(req.query.baseYear) || 1951;
  const startYear = parseInt(req.query.startYear) || 1951;
  const endYear = parseInt(req.query.endYear) || 2024;

  db.getStatistics(baseYear, startYear, endYear, (err, stats) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(stats);
  });
});

// 售電資料 API
router.get('/api/sales', function(req, res) {
  db.getSalesData((err, data) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(data);
  });
});

module.exports = router;
