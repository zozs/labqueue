$(document).ready(function() {
  /* Connect to the queue server. The server will send the current queue. */
  var socket = io();
  var client_name;

  socket.on('clientname', function(msg) {
    client_name = msg; // Stores client name so we know who we are.
  });

  socket.on('queue', function(msg) {
    show_error_box($('#button-error-box'));
    show_queue(msg.queue, client_name);
  });

  socket.on('queueFail', function(msg) {
    // Show the error received from server.
    console.log('Got error: ' + msg);
    show_error_box($('#button-error-box'), msg);
  });

  // Handle dropped connection.
  socket.on('reconnect', function(nbr) {
    show_error_box($('#button-error-box')); // Clear error.
  });

  socket.on('reconnecting', function(nbr) {
    show_error_box($('#button-error-box'), 'Connection to queue lost. Reconnecting...');
  });

  /* Hide error messages by default. */
  $('#button-error-box').hide();

  /* Adapt the interface for regular view, or admin view depending on hash. */
  if (window.location.hash == '#admin') {
    interface_admin(undefined, socket);
  } else {
    interface_regular();
  }
  $('#admin-link').click(function(evt) { interface_admin(evt, socket); });
  $('#noadmin-link').click(interface_regular);

  /* Config help button. */
  $('#help-button').click(function() { socket.emit('helpme'); });

  /* Config don't help button. */
  $('#nevermind-button').hide();
  $('#nevermind-button').click(function() { socket.emit('nevermind'); });

  /* Config remove and undelete button. */
  $('#remove-button').click(function() { socket.emit('delete'); });
  $('#undelete-button').click(function() { socket.emit('undelete'); });

  /* Offer restyling :) */
  $('#haxxor-theme').click(function() {
    $('#css-theme').attr('href', 'haxxor.css');
  });

  $('#standard-theme').click(function() {
    $('#css-theme').attr('href', 'index.css');
  });
});

function interface_admin(evt, socket) {
  $('#regular-buttons').hide();
  $('#admin-buttons').show();
  $('#huge-labels').show();
  $('#noadmin-part').show();
  $('#admin-part').hide();

  /* Set url. */
  window.location.hash = "admin";

  /* In admin mode, we listen for Page Down keypress, and use this to pop the
   * top of the queue. Page down corresponds to the "Next" button on my (and
   * virtually all other) powerpoint remotes. The same is applied to page up
   * which is used to undo a removal of a student. */
  $(document).keydown(function(e) {
    if (e.which == 34) { /* 34 == page down */
      socket.emit('delete');
      e.preventDefault();
    } else if (e.which == 33) { /* 33 == page up */
      socket.emit('undelete');
      e.preventDefault();
    }
  });

  if (evt !== undefined) {
    evt.preventDefault();
  }
}

function interface_regular(evt) {
  $('#regular-buttons').show();
  $('#admin-buttons').hide();
  $('#huge-labels').hide();
  $('#noadmin-part').hide();
  $('#admin-part').show();

  /* Set url. */
  window.location.hash = "";

  /* Remove Page down/page up listener. */
  $(document).off("keydown");

  if (evt !== undefined) {
    evt.preventDefault();
  }
}

function set_huge_label_text(hugelabel, text) {
  hugelabel.text(text);
  /* Check if text is a valid IPv4 address, if so, reduce text-size. */
   if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(text)) {
    hugelabel.addClass('ipaddr');
  } else {
    hugelabel.removeClass('ipaddr');
  }
}

function show_error_box(box, message) {
  if (message === undefined) {
    /* Hide error box. */
    $(box).hide();
  } else {
    $(box).children('.error-box-text').text(message);
    $(box).show();
  }
}

function show_queue(queue, client_name) {
  $('#queue tbody').empty();
  /* Empty causes problems with haxxor css that i don't care to solve. */
  $('#huge-label-current > span').html('&nbsp;');
  $('#huge-label-next > span').html('&nbsp;');

  var found_self = false;
  for (var i = 0; i < queue.length; i++) {
    var row = $('<tr>');
    row.append($('<td>').text(i + 1));
    row.append($('<td>').text(queue[i].subject));
    if (queue[i].subject == client_name) {
      row.addClass('highlight');
      found_self = true;
    }

    $('#queue tbody').append(row);

    /* Also update current and next huge labels, used in admin view. */
    if (i == 0) {
      set_huge_label_text($('#huge-label-current > span'), queue[i].subject);
    } else if (i == 1) {
      set_huge_label_text($('#huge-label-next > span'), queue[i].subject);
    }
  }

  if (found_self) {
    $('#help-button').hide();
    $('#nevermind-button').show();
  } else {
    $('#help-button').show();
    $('#nevermind-button').hide();
  }
}

