// Simple Stellar federation server.

// Configure federation
var DOMAIN_NAME = 'eridi.us';
var STELLAR_ADDRESSES = {
  eridius: 'gBhy8LXYBWeqZwgXGvrTbfh8GSCNTmmGZu'
};

// Include dependencies
var express = require('express');

// Create the server
var app = express();
app.enable('trust proxy');

// Define error handling
function sendError(res, req, error) {
  var ERROR_MESSAGES = {
    noSuchDomain: 'Invalid Domain',
    noSuchUser: 'No user found'
  };
  res.send(400, {
    result:        'error',
    error:         error,
    error_message: ERROR_MESSAGES[error] || 'Invalid Request',
    request:       req.query
  });
}

// Accept federation requests
app.get('/federation', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  // ignore the type=federation key, as apparently the stellar.org federation server does
  if (req.query.domain !== DOMAIN_NAME) {
    sendError(res, req, 'noSuchDomain');
  } else if (!STELLAR_ADDRESSES[req.query.destination]) {
    sendError(res, req, 'noSuchUser');
  } else {
    res.send({
      federation_json: {
        type:                'federation_record',
        destination:         req.query.destination,
        domain:              DOMAIN_NAME,
        destination_address: STELLAR_ADDRESSES[req.query.destination]
      }
    });
  }
});

// Needs to be served behind reverse proxy
app.listen(5000, 'localhost')
.on('listening', function() {
  console.log('Starting server on port %d at %s', this.address().port, this.address().address);
});
