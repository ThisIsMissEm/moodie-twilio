var config;
try {
  config = require('./config.js');
} catch(e) {
  // Show misconfiguration error:
  if (e.code === 'MODULE_NOT_FOUND') {
    console.log("Configuration Needed, see config.js.example")
    return process.exit(1);
  }

  // otherwise continue upwards:
  throw e;
}

// Load the twilio module
var twilio = require('twilio');

// Create a new REST API client to make authenticated requests against the
// twilio back end
var client = twilio(config.twilio.sid, config.twilio.auth_token);

function sendMessage(){
  console.log("Sending…")
  client.sendMessage({
    applicationSid: config.twilio.app_sid,
    from: config.twilio.number,

    to: config.who.number,
    body: 'Hi ' + config.who.name + '! How was today?\nReply with a number 1 to 6: \n 1 - Awful mood\n 2 - Terrible mood\n 3 - Bad mood\n 4 - Okay mood\n 5 - Good mood\n 6 - Great Mood'
  }, function(err, responseData) { //this function is executed when a response is received from Twilio
      if (err) {
        console.log(err);
      }else{
        console.log("Sent!");
      }
  });
}

// Create the scheduler
// var cronJob = require('cron').CronJob;
// var job = new cronJob({
//   timeZone: config.when.timezone,
//   cronTime: '00 ' + config.when.minutes + ' ' + config.when.hours + ' * * *',
//   onTick: sendMessage,
//   start: true
// });


var express = require("express");
// Create an express app which will parse form-encoded request bodies
var app = express();

app.use(express.logger());
app.use(express.urlencoded());
app.use(app.router);


function webhook(request, response, next){
  var url = request.protocol + '://' + config.host + request.originalUrl;
  var valid = twilio.validateRequest(client.authToken, request.header('X-Twilio-Signature'), url, request.body||{});

  if(valid){
    next();
  }else{
    response.type('text/plain');
    return response.send(403, 'Twilio Request Validation Failed.');
  }
}


app.post('/status', webhook, function(request, response) {
  response.send(200);
});

app.post('/sms', webhook, function(request, response) {
   console.log(request)

    var twiml = new twilio.TwimlResponse();
    twiml.message('This HTTP request came from Twilio!');
    
    response.type('text/xml');
    response.send(twiml.toString());
});

// This webhook performs no validation - this might be used for a fallback URL
// for your Twilio number, to ensure a response is always sent back to the user.
app.post('/fallback', function(request, response) {
    var twiml = new twilio.TwimlResponse();
    twiml.message('Sorry - there was an error processing your message.');

    response.type('text/xml');
    response.send(twiml.toString());
});

app.get("/send", function(request, response){
  sendMessage();
  response.end("ok");
})

// Start an HTTP server with this Express app
app.listen(3000);
