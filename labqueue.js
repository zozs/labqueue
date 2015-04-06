var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var config = require('./config');

// Prepare database.
var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('queue.sqlite');

db.run('CREATE TABLE IF NOT EXISTS queue (' +
       'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
       'subject TEXT NOT NULL,' +
       'added TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
       'done TIMESTAMP NOT NULL DEFAULT 0,' +
       'UNIQUE (subject, done));');

// Serve static files.
app.use(express.static(__dirname + '/public'));

// Listen for socket.io stuff.
io.on('connection', function(socket){
  var remote_ip = socket.request.connection.remoteAddress;
  var subject = ip_to_subject(remote_ip);
  var is_admin = (config.admins.indexOf(remote_ip) > -1);
  console.log(subject + ' connected. Administrator?: ' + is_admin);
  
  // Immediately send the current queue to the new client.
  var send_queue = function(receiver) {
    var sql = 'SELECT subject, (subject=?) AS self FROM queue ' +
              'WHERE done=0 ORDER BY added, id;'
    db.all(sql, subject, function(err, rows) {
      check_error(err, socket, function() {
        receiver.emit('queue', { queue: rows });
      });
    });
  };
  send_queue(socket);

  socket.on('helpme', function(msg) {
    console.log(subject + ' asked for help.');
    db.run('INSERT INTO queue (subject) VALUES (?);', subject, function(err) {
      if (err) {
        console.log(JSON.stringify(err));
        if (err.errno == 19) { /* SQLITE_CONSTRAINT */
          socket.emit('queueFail', 'You already have a help request!');
        } else {
          socket.emit('queueFail', 'Failed to ask for help...');
        }
      } else {
        // Send queue to everyone.
        send_queue(io);
      }
    });
  });

  socket.on('nevermind', function(msg) {
    console.log(subject + ' figured it out on their own.');
    
    db.run('DELETE FROM queue WHERE subject=? AND done=0;', subject, function(err) {
      var changes = this.changes;
      check_error(err, socket, function() {
        if (changes == 0) {
          socket.emit('queueFail', "You have no help request to delete!");
        } else {
          send_queue(io);
        }
      });
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
      var sql = 'UPDATE queue SET done=CURRENT_TIMESTAMP WHERE id IN ' +
                '(SELECT id FROM queue WHERE done=0 ORDER BY added, id LIMIT 1);';
      db.run(sql, function(err) {
        check_error(err, socket, function() {
          send_queue(io);
        });
      });
    });
  } else {
    var err_func = function(err) {
      socket.emit('queueFail', 'You are not an administrator!');
    }
    socket.on('undelete', err_func);
    socket.on('delete', err_func);
  }
});

http.listen(3000);

function check_error(err, socket, success_handler) {
  if (err) {
    socket.emit('queueFail', 'Database error!');
    console.log(err);
  } else {
    success_handler();
  }
}

function ip_to_subject(ip) {
  if (ip in config.ip_subject) {
    return config.ip_subject[ip];
  } else {
    return ip;
  }
}
