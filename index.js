$(document).ready(function() {
  /* Starts a periodic AJAX query to get the queue. */
  get_queue();

  /* Hide error messages by default. */
  $('#button-error-box').hide();
  $('#queue-error-box').hide();

  /* Config help button. */
  $('#help-button').click(help_click);

  /* Config don't help button. */
  $('#nevermind-button').hide();
  $('#nevermind-button').click(nevermind_click);

  /* Config remove button. */
  $('#remove-button').hide();
  $('#remove-button').click(remove_click);

  /* Show the delete button if this is the administrative interface. */
  $('#admin-link').click(function() {
    $('#remove-button').show();
  });

  /* Offer restyling :) */
  $('#haxxor-theme').click(function() {
    $('#css-theme').attr('href', 'haxxor.css');
  });

  $('#standard-theme').click(function() {
    $('#css-theme').attr('href', 'index.css');
  });
});

function ajax_request(method, path_info) {
  if (path_info === undefined) path_info = '';

  return $.ajax({
    url: 'api.php' + path_info,
    type: method,
    dataType: 'json',
    timeout: 3000
  });
}

function get_queue(launch_periodic) {
  if (launch_periodic === undefined) launch_periodic = true;

  var poll_interval = 5000;
  ajax_request('GET').done(function(data) {
    /* Update table. */
    show_queue(data.queue);
    show_error_box($('#queue-error-box'));
  }).fail(function() {
    /* Show some nice error message somewhere. */
    show_error_box($('#queue-error-box'), 'Failed to fetch queue!');
  }).always(function() {
    /* Launch a new request. */
    if (launch_periodic) {
      setTimeout(get_queue, poll_interval);
    }
  });
}

function help_click() {
  ajax_request('POST').done(function() {
    get_queue(false); /* Don't launch this periodically once more! */
    show_error_box($('#button-error-box'));
  }).fail(function(jqxhr, textStatus, errorThrown) {
    /* Show some error. */
    if (jqxhr.status == 400) {
      show_error_box($('#button-error-box'), 'You already have a help request.');
    } else {
      show_error_box($('#button-error-box'), 'Failed to ask for help...');
    }
  });
}

function nevermind_click() {
  ajax_request('DELETE').done(function() {
    get_queue(false);
    show_error_box($('#button-error-box'));
  }).fail(function(jqxhr, textStatus, errorThrown) {
    if (jqxhr.status == 404) {
      show_error_box($('#button-error-box'), 'You have no help request to delete.');
    } else {
      show_error_box($('#button-error-box'), 'Failed to remove self from queue!');
    }
  });
}

function remove_click() {
  ajax_request('DELETE', '/top').done(function() {
    get_queue(false); /* Don't launch this periodically once more! */
    show_error_box($('#button-error-box'));
  }).fail(function(jqxhr, textStatus, errorThrown) {
    /* Show some error. */
    if (jqxhr.status == 403) {
      show_error_box($('#button-error-box'), 'You are not an administrator!');
    } else {
      show_error_box($('#button-error-box'), 'Failed to pop queue!');
    }
  });
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

function show_queue(queue) {
  $('#queue tbody').empty();

  var found_self = false;
  for (var i = 0; i < queue.length; i++) {
    var row = $('<tr>');
    row.append($('<td>').text(i + 1));
    row.append($('<td>').text(queue[i].subject));
    if (queue[i].self === "1") {
      row.addClass('highlight');
      found_self = true;
    }

    $('#queue tbody').append(row);
  }

  if (found_self) {
    $('#help-button').hide();
    $('#nevermind-button').show();
  } else {
    $('#help-button').show();
    $('#nevermind-button').hide();
  }
}
