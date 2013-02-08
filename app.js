var express =require('express');
var app = express();
var request = require('request');
var redis = require('redis-url').connect(process.env.REDISTOGO_URL);
var cachey = require('cachey')({redisClient:redis});
var RegClient = require('npm-registry-client');
require('datejs');

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

var db = {};
db.getPackage = function(package, cb) {
  cachey.cache('package:' + package, 60 * 60, function(cb) {
    request({
      uri: 'https://isaacs.iriscouch.com/downloads/_design/app/_view/pkg?group_level=2&start_key=%5B%22' + package + '%22%5D&end_key=%5B%22' + package + '%22,%7B%7D%5D',
      json: true
    }, function(err, res, body) {

      var data = {};

      for(var i in body.rows) {
        data[body.rows[i].key[1]] = body.rows[i].value;
      }
      return cb(err, JSON.stringify(data));
    });
  }, function(err, body) {
    if(err) return cb(err);
    body = JSON.parse(body);
    cb(null, body);
  });
};

db.get30Days = function(package, cb) {
  db.getPackage(package, function(err, data) {
    if(err) return cb(err);
    var days = [];
    var equipDate = Date.parse('-1months');
    for(i=30;i>0;i--) {
      var dateStr = equipDate.toString("yyyy-MM-dd");
      days.push({date:dateStr, downloads:data[dateStr] || 0});
      equipDate = equipDate.add(1).days();
    }
    cb(null, days);
  });
};

db.get7Days = function(package, cb) {
  db.getPackage(package, function(err, data) {
    if(err) return cb(err);
    var days = [];
    var equipDate = Date.parse('-7days');
    for(i=7;i>0;i--) {
      var dateStr = equipDate.toString("yyyy-MM-dd");
      days.push({date:dateStr, downloads:data[dateStr] || 0});
      equipDate = equipDate.add(1).days();
    }
    cb(null, days);
  });
};

db.getPackagesByUser = function(name, cb) {
  var regClient = new RegClient({registry:'http://registry.npmjs.org/', cache:'./'});
  regClient.get('/-/_view/browseAuthors' + name, 0, cb);
};

app.configure(function() {
  app.set('view engine', 'html');
  app.engine('html', require('hbs').__express);
  app.use(express['static']('./public'));
});

app.get('/', function(req, res) {
  res.redirect('/package/npm');
});

app.get('/package/:package', function(req, res, next) {
  res.locals['package'] = {name:req.params['package']};
  res.render('package');
});

app.get('/package/:package/30days.json', function(req, res, next) {
  db.get30Days(req.params['package'], function(err, data) {
    if(err) return next(err);
    res.jsonp(data);
  });
});

app.get('/package/:package/7days.json', function(req, res, next) {
  db.get7Days(req.params['package'], function(err, data) {
    if(err) return next(err);
    res.jsonp(data);
  });
});

app.get('/user/:username', function(req, res, next) {
  db.getPackagesByUser(req.params['username'], function(err, data) {
    if(err) return next(err);
    res.jsonp(data);
  });
});

app.get('/~:user', function(req, res, next) {
  res.render('user');
});

app.listen(process.env.PORT || 3000);