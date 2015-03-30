var poll_interval = 3000; /* Yep. It's global. I know. */

$(document).ready(function() {
  /* Starts a periodic AJAX query to get the queue. */
  get_queue();

  /* Hide error messages by default. */
  $('#button-error-box').hide();
  $('#queue-error-box').hide();

  /* Adapt the interface for regular view, or admin view depending on hash. */
  if (window.location.hash == '#admin') {
    interface_admin();
  } else {
    interface_regular();
  }
  $('#admin-link').click(interface_admin);
  $('#noadmin-link').click(interface_regular);

  /* Config help button. */
  $('#help-button').click(help_click);

  /* Config don't help button. */
  $('#nevermind-button').hide();
  $('#nevermind-button').click(nevermind_click);

  /* Config remove and undelete button. */
  $('#remove-button').click(remove_click);
  $('#undelete-button').click(undelete_click);

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
    timeout: 3000,
    cache: false
  });
}

function get_queue(launch_periodic) {
  if (launch_periodic === undefined) launch_periodic = true;

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

function interface_admin(evt) {
  $('#regular-buttons').hide();
  $('#admin-buttons').show();
  $('#huge-labels').show();
  $('#noadmin-part').show();
  $('#admin-part').hide();
  poll_interval = 1000; /* Speed up admin interface's polling. */

  /* Set url. */
  window.location.hash = "admin";

  /* In admin mode, we listen for Page Down keypress, and use this to pop the
   * top of the queue. Page down corresponds to the "Next" button on my (and
   * virtually all other) powerpoint remotes. The same is applied to page up
   * which is used to undo a removal of a student. */
  $(document).keydown(function(e) {
    if (e.which == 34) { /* 34 == page down */
      remove_click();
      e.preventDefault();
    } else if (e.which == 33) { /* 33 == page up */
      undelete_click();
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
  poll_interval = 3000;

  /* Set url. */
  window.location.hash = "";

  /* Remove Page down/page up listener. */
  $(document).off("keydown");

  if (evt !== undefined) {
    evt.preventDefault();
  }
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
  /* Empty causes problems with haxxor css that i don't care to solve. */
  $('#huge-label-current > span').html('&nbsp;');
  $('#huge-label-next > span').html('&nbsp;');

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

    /* Also update current and next huge labels, used in admin view. */
    if (i == 0) {
      $('#huge-label-current > span').text(queue[i].subject);
    } else if (i == 1) {
      $('#huge-label-next > span').text(queue[i].subject);
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

function undelete_click() {
  ajax_request('PUT').done(function() {
    get_queue(false); /* Don't launch this periodically once more! */
    show_error_box($('#button-error-box'));
  }).fail(function(jqxhr, textStatus, errorThrown) {
    /* Show some error. */
    if (jqxhr.status == 403) {
      show_error_box($('#button-error-box'), 'You are not an administrator!');
    } else if (jqxhr.status == 400) {
      show_error_box($('#button-error-box'), jqxhr.responseText);
    } else {
      show_error_box($('#button-error-box'), 'Failed to undo removal from queue!');
    }
  });
}
