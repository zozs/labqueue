var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var config = require('./config');

// For automated testing purposes, we may start the server with a special flag.
// Do NOT use this flag during normal operation!
var testMode = false;

if (process.argv.length == 3 && process.argv[2] == '--testing') {
  testMode = true;
  // Load special config for testing.
  config = require('./config-test');
  console.log('WARNING! Test mode activated. Do NOT use in production!');
}

// Prepare database.
var databaseFile = 'queue.sqlite';
if (testMode) {
  databaseFile = ':memory:';
}

var sqlite3 = require('sqlite3');
var db = new sqlite3.Database(databaseFile);

db.run('CREATE TABLE IF NOT EXISTS queue (' +
       'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
       'subject TEXT NOT NULL,' +
       'added TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
       'done TIMESTAMP NOT NULL DEFAULT 0,' +
       'UNIQUE (subject, done));');

// Serve static files.
app.use(express.static(__dirname + '/public'));

// Testing stuff, allows the client to manually select IP during testing.
if (testMode) {
  io.use(function(socket, next) {
    var mockIp = socket.request._query['mockIp'];
    if (mockIp) {
      socket.labqueue = { mockIp: mockIp };
      console.log("Mocking IP to: ", socket.labqueue.mockIp);
    }
    next();
  });
}

// Listen for socket.io stuff.
io.on('connection', function(socket) {
  var remote_ip = socket.request.connection.remoteAddress;
  if (testMode && 'labqueue' in socket && 'mockIp' in socket.labqueue) {
    remote_ip = socket.labqueue.mockIp;
  }

  var subject = ip_to_subject(remote_ip);
  var is_admin = (config.admins.indexOf(remote_ip) > -1);
  //console.log(subject + ' connected. Administrator?: ' + is_admin);

  // First send the client name to the client.
  socket.emit('clientname', subject);
  
  // Immediately send the current queue to the new client.
  var send_queue = function(receiver) {
    var sql = 'SELECT subject FROM queue WHERE done=0 ORDER BY added, id;';
    db.all(sql, function(err, rows) {
      check_error(err, socket, function() {
        receiver.emit('queue', { queue: rows });
      });
    });
  };
  send_queue(socket);

  socket.on('helpme', function(msg) {
    db.run('INSERT INTO queue (subject) VALUES (?);', subject, function(err) {
      if (err) {
        if (err.errno == 19) { /* SQLITE_CONSTRAINT */
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

  socket.on('nevermind', function(msg) {
    // If a student changes his or her mind and don't want help, we usually want
    // to just delete the entry and pretend it never existed. However, if the
    // student was first in queue, we retain the entry just like if the teacher
    // would have removed it.
    var sql = 'SELECT id, subject FROM queue WHERE done=0 ORDER BY added, id LIMIT 1;';
    db.get(sql, function(err, row) {
      if (row && row.subject == subject) {
        // We are first in queue. Pretend it is a teacher delete.
        delete_top(socket, function() {
          send_queue(io);
        });
      } else {
        // Delete our help request like it never existed.
        var sql2 = 'DELETE FROM queue WHERE subject=? AND done=0;';
        db.run(sql2, subject, function(err) {
          var changes = this.changes;
          check_error(err, socket, function() {
            if (changes == 0) {
              socket.emit('queueFail', "You have no help request to delete!");
            } else {
              send_queue(io);
            }
          });
        });
      }
    });
  });

  if (is_admin) {
    socket.on('undelete', function(msg) {
      var sql = 'UPDATE queue SET done=0 WHERE id IN ' +
                '(SELECT id FROM queue WHERE done!=0 ORDER BY added DESC, id DESC LIMIT 1);';
      db.run(sql, function(err) {
        if (err && err.errno == 19) {
          socket.emit('queueFail', 'Undo would result in duplicate help requests for user.');
        } else {
          check_error(err, socket, function() {
            send_queue(io);
          });
        }
      });
    });

    socket.on('delete', function(msg) {
      delete_top(socket, function() {
        send_queue(io);
      });
    });
  } else {
    var err_func = function(err) {
      socket.emit('queueFail', 'You are not an administrator!');
    }
    socket.on('undelete', err_func);
    socket.on('delete', err_func);
  }

  if (testMode) {
    socket.on('reset', function() {
      db.run('DELETE FROM queue;', function(err) {
        check_error(err, socket, function() {
          socket.emit('resetted');
        });
      });
    });
  }
});

http.listen(3000, '0.0.0.0');
exports.http = http

function check_error(err, socket, success_handler) {
  if (err) {
    socket.emit('queueFail', 'Database error!');
    console.log('Unhandled database error: ', err);
  } else {
    success_handler();
  }
}

function delete_top(socket, send_queue_func) {
  var sql = 'UPDATE queue SET done=CURRENT_TIMESTAMP WHERE id IN ' +
            '(SELECT id FROM queue WHERE done=0 ORDER BY added, id LIMIT 1);';
  db.run(sql, function(err) {
    if (err && err.errno == 19) {
      /* Can occur if the students spam the help me/never mind button so that
       * they trigger the UNIQUE-constraint of (subject, done). Tell them to
       * calm the fuck down, or just ignore it. */
      //socket.emit('queueFail', "Srsly, stop spamming the buttons :'(");
    } else {
      check_error(err, socket, function() {
        send_queue_func();
      });
    }
  });
}

function ip_to_subject(ip) {
  if (ip in config.ip_subject) {
    return config.ip_subject[ip];
  } else {
    return ip;
  }
}
