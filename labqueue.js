/*
 * Labqueue. Copyright (c) 2015, Linus Karlsson
 * See LICENSE file at https://github.com/zozs/labqueue
 */
/* jshint indent: 2, strict: true */
/*jslint indent: 2 */
"use strict";

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var config = require('config');

// For automated testing purposes, we may start the server with a special flag.
// Do NOT use this flag during normal operation!
var testMode = false;

if (process.env.NODE_ENV === 'test') {
  testMode = true;
  console.log('WARNING! Test mode activated. Do NOT use in production!');
}

var sqlite3 = require('sqlite3');
var db = new sqlite3.Database(config.get('databaseFile'));

if (!config.synchronousDb) {
  /* Disable synchronous database writes, e.g. when running on SD-card. */
  db.run('PRAGMA synchronous = OFF;');
}

db.run('CREATE TABLE IF NOT EXISTS queue (' +
       'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
       'subject TEXT NOT NULL,' +
       'added TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
       'done TIMESTAMP NOT NULL DEFAULT 0,' +
       'removedSelf BOOLEAN NULL DEFAULT NULL,' +
       'UNIQUE (subject, done));');

// Serve static files.
app.use(express.static(__dirname + '/public'));

// Testing stuff, allows the client to manually select IP during testing.
if (testMode) {
  io.use(function (socket, next) {
    if (socket.request._query.hasOwnProperty('mockIp')) {
      var mockIp = socket.request._query.mockIp;
      socket.labqueue = { mockIp: mockIp };
      console.log("Mocking IP to: ", socket.labqueue.mockIp);
    }
    next();
  });
}

// Listen for socket.io stuff.
io.on('connection', function (socket) {
  var remote_ip = socket.request.connection.remoteAddress;
  if (testMode && socket.hasOwnProperty('labqueue') && socket.labqueue.hasOwnProperty('mockIp')) {
    remote_ip = socket.labqueue.mockIp;
  }

  var subject = ip_to_subject(remote_ip);
  var is_admin = (config.get('admins').indexOf(remote_ip) > -1);
  var whitelist = config.get('whitelist');
  var is_whitelisted = (whitelist.length === 0 || whitelist.indexOf(remote_ip) > -1);

  // First send the client name to the client.
  socket.emit('clientname', subject);

  // Immediately send the current queue to the new client.
  var send_queue = function (receiver) {
    var sql = 'SELECT subject FROM queue WHERE done=0 ORDER BY added, id;';
    db.all(sql, function (err, rows) {
      check_error(err, socket, function () {
        receiver.emit('queue', { queue: rows });
      });
    });
  };
  send_queue(socket);

  if (is_whitelisted) {
    socket.on('helpme', function () {
      db.run('INSERT INTO queue (subject) VALUES (?);', subject, function (err) {
        if (err) {
          if (err.errno === 19) { /* SQLITE_CONSTRAINT */
            socket.emit('queueFail', 'You already have a help request!');
          } else {
            console.log('Unhandled help me error: ', JSON.stringify(err));
            socket.emit('queueFail', 'Failed to ask for help...');
          }
        } else {
          // Send queue to everyone.
          send_queue(io);
        }
      });
    });

    socket.on('nevermind', function () {
      var sql = 'UPDATE queue SET done=CURRENT_TIMESTAMP,removedSelf=1 WHERE ' +
                'subject=? AND done=0;';
      db.run(sql, subject, function (err) {
        var changes = this.changes;
        if (err && err.errno === 19) {
          /* Can occur if the students spam the help me/never mind button so that
           * they trigger the UNIQUE-constraint of (subject, done). Tell them to
           * calm the fuck down, delete the duplicate row, or just ignore it. */
          //socket.emit('queueFail', "Srsly, stop spamming the buttons :'(");
        } else {
          check_error(err, socket, function () {
            if (changes === 0) {
              socket.emit('queueFail', 'You have no help request to delete!');
            } else {
              send_queue(io);
            }
          });
        }
      });
    });

    if (is_admin) {
      socket.on('undelete', function () {
        var sql = 'UPDATE queue SET done=0,removedSelf=NULL WHERE id IN ' +
                  '(SELECT id FROM queue WHERE done!=0 AND removedSelf=0 ' +
                  ' ORDER BY done DESC, id DESC LIMIT 1);';
        db.run(sql, function (err) {
          if (err && err.errno === 19) {
            socket.emit('queueFail', 'Undo would result in duplicate help requests for user.');
          } else {
            check_error(err, socket, function () {
              send_queue(io);
            });
          }
        });
      });

      socket.on('delete', function () {
        var sql = 'UPDATE queue SET done=CURRENT_TIMESTAMP,removedSelf=0 WHERE id IN ' +
                  '(SELECT id FROM queue WHERE done=0 ORDER BY added, id LIMIT 1);';
        db.run(sql, function (err) {
          if (err && err.errno === 19) {
            /* Can occur if the same subjects gets delete twice during the same
             * second by the teacher. Just ignore if this happened. */
          } else {
            check_error(err, socket, function () {
              send_queue(io);
            });
          }
        });
      });
    } else {
      /* If not admin */
      var err_func = function () {
        socket.emit('queueFail', 'You are not an administrator!');
      };
      socket.on('undelete', err_func);
      socket.on('delete', err_func);
    }
  } else {
    /* If not whitelisted. */
    var not_whitelisted_func = function () {
      socket.emit('queueFail', 'You are not allowed in this queue!');
    };
    socket.on('undelete', not_whitelisted_func);
    socket.on('delete', not_whitelisted_func);
    socket.on('nevermind', not_whitelisted_func);
    socket.on('helpme', not_whitelisted_func);
  }

  if (testMode) {
    socket.on('reset', function () {
      db.run('DELETE FROM queue;', function (err) {
        check_error(err, socket, function () {
          socket.emit('resetted');
        });
      });
    });
  }
});

http.listen(config.get('port'), config.get('listenAddress'));

function check_error(err, socket, success_handler) {
  if (err) {
    socket.emit('queueFail', 'Database error!');
    console.log('Unhandled database error: ', err);
  } else {
    success_handler();
  }
}

function ip_to_subject(ip) {
  if (ip in config.get('ip_subject')) {
    return config.get('ip_subject')[ip];
  } else {
    return ip;
  }
}
