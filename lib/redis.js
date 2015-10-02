var r = require('redis'),
    url = require('url'),
    redisURL = url.parse(process.env.REDISCLOUD_URL || process.env.REDIS_URL || 'redis://localhost:6379'),
    connection = r.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true})
    _ = require('lodash');

if(redisURL.auth) {
  connection.auth(redisURL.auth.split(":")[1]);
}

var objectify = function(subject) {
  if(! subject) {
    subject = {};
  }
  else if(typeof subject == 'string') {
    try {
      subject = JSON.parse(subject);
    }
    catch (e) {
      // no-op ??
    }
  }

  return subject;
};

var stringify = function(subject) {
  if(! subject) {
    subject = '';
  }
  else if(typeof subject != 'string') {
    try {
      subject = JSON.stringify(subject);
    }
    catch (e) {
      // no-op ??
    }
  }

  return subject;
};

var RedisPrototype = {
  init: function(key) {
    this.key = key;
  },

  merge: function(incoming) {
    var _this = this;

    incoming = objectify(incoming);

    this.get(function(err, reply) {
      reply = objectify(reply);

      _this.set(_.merge(reply, incoming));
    });
  },

  get: function(callback) {
    connection.get(this.key, callback);
  },

  set: function(value) {
    connection.set(this.key, stringify(value));
  }
};

exports.redis = function(key) {
  function F() {};
  F.prototype = RedisPrototype;

  var f = new F();

  f.init(key);
  return f;
}

