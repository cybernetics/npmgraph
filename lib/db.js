
'use strict';

/**
 * Dependencies
 */

var RegClient = require('npm-registry-client');
var request   = require('request');
var _         = require('underscore');

var Client;
module.exports = Client = function(cachey, ttl) {
  this.cachey = cachey;
  this.ttl = ttl || 20 * 1000;
  return this;
};

Client.prototype.getPackage = function(packageName, cb) {
  this.cachey.cache('package:' + packageName, this.ttl, function(cb) {
    request({
      uri: 'https://isaacs.iriscouch.com/downloads/_design/app/_view/pkg?group_level=2&start_key=%5B%22' + package + '%22%5D&end_key=%5B%22' + package + '%22,%7B%7D%5D',
      json: true,
    }, function(err, res, body) {
      if(err) {
        return cb(err);
      }
      var data = {};
      if(body.error) {
        return cb(new Error(body.error));
      }
      for(var i in body.rows) {
        data[body.rows[i].key[1]] = body.rows[i].value;
      }
      return cb(err, JSON.stringify(data));
    });
  }, function(err, body) {
    if(err) {
      return cb(err);
    }
    body = JSON.parse(body);
    cb(null, body);
  });
};

Client.prototype.get30Days = function(packageName, cb) {
  this.getPackage(packageName, function(err, data) {
    if(err){
      return cb(err);
    }
    var days = [];
    var equipDate = Date.parse('-1months');
    for(var i = 30; i > 0; i--) {
      var dateStr = equipDate.toString('yyyy-MM-dd');
      days.push({date:dateStr, downloads:data[dateStr] || 0});
      equipDate = equipDate.add(1).days();
    }
    cb(null, days);
  });
};

Client.prototype.get7Days = function(packageName, cb) {
  this.getPackage(packageName, function(err, data) {
    if(err) {
      return cb(err);
    }
    var days = [];
    var equipDate = Date.parse('-7days');
    for(var i = 7; i > 0; i--) {
      var dateStr = equipDate.toString('yyyy-MM-dd');
      days.push({date:dateStr, downloads:data[dateStr] || 0});
      equipDate = equipDate.add(1).days();
    }
    cb(null, days);
  });
};

Client.prototype.getPackagesByUser = function(name, cb) {
  var regClient = new RegClient({registry:'http://registry.npmjs.org/', cache:'./'});
  regClient.get('/-/_view/browseAuthors?group_level=3&startkey=%5B%22' + name + '%22%5D&endkey=%5B%22' + name +'%22%2C%7B%7D%5D&skip=0&limit=1000', 0, function(err, body) {
    if(err) {
      return cb(err);
    }
    cb(null, _.map(body.rows, function(item) {
      return {
        name: item.key[1],
        description: item.key[2]
      };
    }));
  });
};

Client.prototype.getPackages = function(cb) {
  this.cachey.cache('packages', 60 * 60, function(cb) {
    console.log('requesting new packages');
    request({
      uri: 'http://registry.npmjs.org/-/short/',
      json: true
    }, function(err, res, body) {
      console.log('returnomg mewly quited');
      cb(err, body);
    });
  }, function(err, body) {
    cb(err, body);
  });
};