var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

var indexRouter = require('./routes/index');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.use('/', indexRouter);

// 捕獲 404 錯誤並轉發到錯誤處理器
app.use(function(req, res, next) {
  next(createError(404));
});

// 錯誤處理器
app.use(function(err, req, res, next) {
  // 設定本地變數，僅在開發環境提供錯誤資訊
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // 發送 JSON 錯誤回應
  res.status(err.status || 500);
  res.json({ error: res.locals.message });
});

module.exports = app;
