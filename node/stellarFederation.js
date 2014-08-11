// Simple Stellar federation server.

// Configure federation
var DOMAIN_NAME = 'eridi.us';
var STELLAR_ADDRESSES = {
  'eridi.us': {
    'gBhy8LXYBWeqZwgXGvrTbfh8GSCNTmmGZu': ['me', 'kballard', 'eridius', 'kevin'],
    'gh4nZy5ynCyTpoRy37aNctVYubHZFgeT3j': 'jane'
  }
};
var STELLAR_USERS = (function() {
  var result = {};
  for (var domain in STELLAR_ADDRESSES) {
    var domainDict = STELLAR_ADDRESSES[domain];
    var dict = result[domain] = {};
    for (var address in domainDict) {
      var users = domainDict[address];
      if (typeof users === 'string') {
        dict[users] = address;
      } else {
        Array.prototype.forEach.call(users, function(user) {
          dict[user] = address;
        });
      }
    }
  }
  return result;
})();

// Include dependencies
var express = require('express');
var morgan = require('morgan');

// Define morgan logging tokens
morgan.token('federation-type', function(req, res) {
  return res.locals.federationType;
});
morgan.token('federation-destination', function(req, res) {
  var dest = res.locals.federationDestination || "";
  var domain = res.locals.federationDomain || "";
  if (dest || domain) {
    return '"' + dest + '@' + domain + '"';
  }
});
morgan.token('federation-result', function(req, res) {
  return res.locals.federationResult;
});

// Create the server
var app = express();
app.enable('trust proxy');
app.use(morgan(':remote-addr [:date] ":method :url HTTP/:http-version" :federation-type :federation-destination :status :federation-result', {
  stream: process.stdout
}));

// Define error handling
function sendError(res, req, error) {
  var ERROR_MESSAGES = {
    noSuchDomain: 'Invalid Domain',
    noSuchUser: 'No user found'
  };
  res.locals.federationResult = error;
  res.send(400, {
    result:        'error',
    error:         error,
    error_message: ERROR_MESSAGES[error] || 'Invalid Request',
    request:       req.query
  });
}

// Utility functions
function getQueryString(req, name) {
  var val = req.query[name];
  return typeof val === 'string' ? val : null;
}

// Accept federation requests
app.get('/federation', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  // ignore the type=federation key, as apparently the stellar.org federation server does
  res.locals.federationType = 'federation';
  res.locals.federationDestination = getQueryString(req, 'destination');
  res.locals.federationDomain = getQueryString(req, 'domain');

  var users = STELLAR_USERS[res.locals.federationDomain];
  var address = users && users[res.locals.federationDestination];
  if (!users) {
    sendError(res, req, 'noSuchDomain');
  } else if (!address) {
    sendError(res, req, 'noSuchUser');
  } else {
    res.locals.federationResult = address;
    res.send({
      federation_json: {
        type:                'federation_record',
        destination:         res.locals.federationDestination,
        domain:              res.locals.federationDomain,
        destination_address: res.locals.federationResult
      }
    });
  }
});

// Needs to be served behind reverse proxy
app.listen(5000, 'localhost')
.on('listening', function() {
  console.log('Starting server on port %d at %s', this.address().port, this.address().address);
});
