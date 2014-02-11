var http = require('http'),
    logging = require('minilog')('common'),
    eio = require('engine.io'),
    Persistence = require('../core/lib/persistence'),
    RadarServer = new require('../server/server.js'),
    configuration = require('./configuration.js'),
    Client = require('radar_client').constructor,
    radar;

if (process.env.verbose) {
  var Minilog = require('minilog');
  Minilog.pipe(Minilog.backends.nodeConsole)
    .format(Minilog.backends.nodeConsole.formatWithStack);
}

require('long-stack-traces');


http.globalAgent.maxSockets = 10000;

module.exports = {
  // starts a Radar server at the given port
  startRadar: function(context, done) {
    Persistence.setConfig(configuration);
    context.server = http.createServer(function(req, res) { res.end('Running.'); });
    context.serverStarted = true;
    radar = new RadarServer();
    radar.once('ready', function() {
      context.server.listen(configuration.port, function() {
        done();
      });
    });
    radar.attach(context.server, configuration);
  },

  radar: function() {
    return radar;
  },

  // ends the Radar server
  endRadar: function(context, done) {
    logging.info("in endRadar");
    context.server.on('close', function() {
      logging.info("server closed");
      context.serverStarted = false;
      done();
    });
    Persistence.delWildCard('*', function() {
      radar.terminate(function() {
        logging.info("radar terminated");
        if(!context.serverStarted) {
          logging.info("server terminated");
          done();
        }
        else {
          logging.info("closing server");
          var val = context.server.close();
          if(!val) {
            context.serverStarted = false;
            done();
          }
        }
      });
    });
  },

  getClient: function(account, userId, userType, userData, done) {
      var client = new Client().configure({
        userId: userId,
        userType: userType,
        accountName: account,
        port: configuration.port,
        upgrade: false,
        userData: userData,
      }).once('ready', done).alloc('test');
      return client;
  },
  configuration: configuration
};
