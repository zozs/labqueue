var should = require('should');
var io = require('socket.io-client');
const app = require('../app')

var socketURL = 'http://127.0.0.1:3000';

var client1details = { ip: '192.0.2.1', name: 'C1' };
var options1 = {
  'forceNew': true,
  query: 'mockIp=' + client1details.ip // TEST-NET
};

var client2details = { ip: '192.0.2.2', name: 'C2' };
var options2 = {
  'forceNew': true,
  query: 'mockIp=' + client2details.ip // TEST-NET
};

var client3details = { ip: '192.0.2.3', name: 'C3' };
var options3 = {
  'forceNew': true,
  query: 'mockIp=' + client3details.ip // TEST-NET
};

var clients = [client1details, client2details, client3details];

describe("Labqueue", function() {
  var client1, client2;

  before((done) => app.start(done))

  after((done) => app.stop(done))

  beforeEach(function(done) {
    client1 = io.connect(socketURL, options1);

    client1.once('connect', function() {
      client1.emit('reset');
      client1.once('resetted', function() {
        client2 = io.connect(socketURL, options2);
        client2.once('connect', function() {
          client2.emit('reset');
          client2.once('resetted', function() {
            done();
          });
        });
      });
    });
  });

  afterEach(function(done) {
    client2.disconnect();
    client1.emit('reset');
    client1.once('resetted', function() {
      client1.disconnect();
      done();
    });
  });

  it('should connect', function(done) {
    var client3 = io.connect(socketURL, options3);
    client3.once('connect', function (msg) {
      client3.disconnect();
      done();
    });
  });

  it('should receive client name on start', function(done) {
    var client3 = io.connect(socketURL, options3);
    client3.once('clientname', function (msg) {
      client3.disconnect();
      msg.should.equal(client3details.name);
      done();
    });
  });

  it('should receive empty queue on start', function(done) {
    var client3 = io.connect(socketURL, options3);
    client3.once('queue', function (msg) {
      client3.disconnect();
      done();
    });
  });

  it('should be able to see yourself', function(done) {
    client1.emit('helpme');
    client1.once('queue', function() {
      checkQueue([1], done);
    });
  });

  it('should be able to see a bunch of people', function(done) {
    client1.emit('helpme');
    client1.once('queue', function() {
      client2.emit('helpme');
      client2.once('queue', function() {
        checkQueue([1, 2], done);
      });
    });
  });

  it('should be able to delete myself', function(done) {
    client1.emit('helpme');
    client1.once('queue', function() {
      client1.emit('nevermind');
      client1.once('queue', function() {
        checkQueue([], done);
      });
    });
  });

  it('should not be able to add myself twice', function(done) {
    client1.emit('helpme');
    client1.once('queue', function() {
      client1.emit('helpme');
      client1.once('queueFail', function() {
        done();
      });
    });
  });
  
  it('admin should be able to delete top', function(done) {
    client2.emit('helpme');
    client2.once('queue', function() {
      client1.emit('delete');
      client1.once('queue', function() {
        checkQueue([], done);
      });
    });
  });
  
  it('should not be able to delete me if not in queue', function(done) {
    client2.emit('helpme');
    client2.once('queue', function() {
      client1.emit('nevermind');
      client1.once('queueFail', function() {
        checkQueue([2], done);
      });
    });
  });

  it('should not be able to delete top if not admin', function(done) {
    client1.emit('helpme');
    client1.once('queue', function() {
      client2.emit('delete');
      client2.once('queueFail', function() {
        checkQueue([1], done);
      });
    });
  });

  it('should be able to undelete some', function(done) {
    client1.emit('helpme');
    client1.once('queue', function() {
      client2.emit('helpme');
      client2.once('queue', function() {
        client1.emit('delete');
        client1.once('queue', function() {
          client1.emit('delete');
          client1.once('queue', function() {
            client1.emit('undelete');
            client1.once('queue', function() {
              checkQueue([2], function() {
                client1.emit('undelete');
                client1.once('queue', function() {
                  checkQueue([1, 2], done);
                });
              });
            });
          });
        });
      });
    });
  });
  
  it('should not be able to undelete if not admin', function(done) {
    client1.emit('helpme');
    client1.once('queue', function() {
      client1.emit('delete');
      client1.once('queue', function() {
        client2.emit('undelete');
        client2.once('queueFail', function() {
          checkQueue([], done);
        });
      });
    });
  });


  it('should not be able to undelete and give duplicates', function(done) {
    /* Ugly test since we somehow need to get different timestamps on the 
     * deleted entries to avoid the uniqueness-constraint to be violated. */
    client2.emit('helpme');
    client2.once('queue', function(q) {
      client1.emit('delete');
      client1.once('queue', function(q) {
        setTimeout(function() { // <- delay start.
          client2.emit('helpme');
          client2.once('queue', function(q) {
            client1.emit('delete');
            client1.once('queue', function(q) {
              checkQueue([], function() {
                client1.emit('undelete');
                client1.once('queue', function() {
                  checkQueue([2], function() {
                    client1.emit('undelete');
                    client1.once('queueFail', function() {
                      checkQueue([2], done);
                    });
                  });
                });
              });
            });
          });
        }, 1000); // <- delay end.
      });
    });
  });

  it('should not restore student-removed items when undeleting', function (done) {
    // yeah we really need async.waterfall
    client1.emit('helpme');
    client1.once('queue', function (q) {
      client2.emit('helpme');
      client2.once('queue', function (q) {
        client2.emit('nevermind');
        client2.once('queue', function (q) {
          client1.emit('delete');
          client1.once('queue', function (q) {
            // we now have an empty queue. when undeleting we should get client1
            // back, since that was the last one the admin deleted.
            checkQueue([], function () {
              client1.emit('undelete');
              client1.once('queue', function (q) {
                checkQueue([1], done);
              });
            });
          });
        });
      });
    });
  });
});

/* Call like this: checkQueue([1, 3, 2], done). Opens a new connection to get
 * the current queue. */
function checkQueue(expected, done) {
  var checkClient = io.connect(socketURL, options3);
  checkClient.once('queue', function(q) {
    q.queue.length.should.equal(expected.length);
    for (var i = 0; i < expected.length; i++) {
      q.queue[i].subject.should.equal(clients[expected[i] - 1].name);
    }
    checkClient.disconnect();
    done();
  });
}
