/**
 * @fileoverview Entry point for the application.
 */

"use strict";

var async = require("async"),
    corsTest = {},
    express = require("express"),
    httpProxy = require("http-proxy"),
    path = require("path"),
    restApp,
    webApp;


/** Creates an Express app for the REST server.
 */
function createRestApp() {
  var app;

  app = express();

  app.enable("case sensitive routing");
  app.enable("strict routing");

  app.use(express.compress());
  app.use(express.favicon());
  app.use(express.logger());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);

  app.options("/divide", function(req, res) {
    // Need Content-Type to support application/json
    // Need Origin for WebKit-based browsers
    // Need X-Requested-With for various XMLHttpRequest clients
    var allowedHeaders = ["Content-Type", "Origin", "X-Requested-With"],
        allowedHeadersLower,
        notAllowedHeaders,
        requestHeaders,
        requestMethod;

    requestHeaders = (req.headers["access-control-request-headers"] || "")
        .split(/\s*,\s*/g)
        .filter(function(header) { return header.length > 0; })
        .map(function(header) { return header.toLowerCase(); });
    requestMethod = req.headers["access-control-request-method"];

    allowedHeadersLower =
        allowedHeaders.map(function(header) { return header.toLowerCase(); });
    notAllowedHeaders = requestHeaders.filter(function(header) {
      return allowedHeadersLower.indexOf(header) < 0;
    });

    if (!req.headers.origin) {
      console.log("Not a valid CORS request (no Origin).");
    } else if (!/^POST$/.test(requestMethod)) {
      console.log("Not a valid CORS request (not POST).");
    } else if (notAllowedHeaders.length > 0) {
      console.log("Not a valid CORS request (requested headers: " +
          notAllowedHeaders.join(", ") + ").");
    } else {
      console.log("Adding CORS headers.");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", allowedHeaders.join(", "));
    }

    res.setHeader("Allow", "GET,HEAD,OPTIONS");
    res.setHeader("Content-Length", "0");
    res.end();
  });
  // Note:  This should really be GET, but use POST for testing JSON body
  app.post("/divide", function(req, res) {
    var dividend = Number(req.body.dividend),
        divisor = Number(req.body.divisor);

    if (req.headers.origin) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    if (isNaN(dividend)) {
      res.statusCode = 422;
      res.send({error: "dividend is not a number."});
    } else if (isNaN(divisor)) {
      res.statusCode = 422;
      res.send({error: "divisor is not a number."});
    } else {
      res.send({quotient: dividend / divisor});
    }
  });

  return app;
}


/** Creates an Express app for the Web server.
 */
function createWebApp() {
  var app;

  app = express();

  app.enable("case sensitive routing");
  app.enable("strict routing");

  app.use(express.compress());
  app.use(express.favicon());
  app.use(express.logger());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);

  app.use(express["static"](path.join(__dirname, "public")));

  return app;
}


/** Start the servers.
 *
 * @param {function(?Error)} callback Callback function.
 */
corsTest.start = function start(callback) {
  var proxyServer;

  restApp = createRestApp();
  webApp = createWebApp();

  proxyServer = httpProxy.createServer(9000, "localhost");

  async.series(
      [
        proxyServer.listen.bind(proxyServer, 3000),
        restApp.listen.bind(restApp, 9000),
        webApp.listen.bind(webApp, 8000)
      ],
      callback
  );
};


module.exports = corsTest;

if (require.main === module) {
  corsTest.start(function(err) {
    if (err) {
      console.error("Error starting corsTest: " + err);
      process.exit(1);
    } else {
      console.log("Server started.");
    }
  });
}
