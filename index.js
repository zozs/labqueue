$(document).ready(function() {
  /* Starts a periodic AJAX query to get the queue. */
  get_queue();

  /* Hide error messages by default. */
  $('#button-error-box').hide();
  $('#queue-error-box').hide();

  /* Config help button. */
  $('#help-button').click(help_click);

  /* Config remove button. */
  $('#remove-button').hide();
  $('#remove-button').click(remove_click);

  /* Show the delete button if this is the administrative interface. */
  $('#admin-link').click(function() {
    $('#remove-button').show();
  });
});

function get_queue(launch_periodic) {
  if (launch_periodic === undefined) launch_periodic = true;

  var poll_interval = 5000;

  $.ajax({
    url: 'api.php',
    type: 'GET',
    dataType: 'json',
    timeout: 3000
  }).done(function(data) {
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
  $.ajax({
    url: 'api.php',
    type: 'POST',
    timeout: 3000
  }).done(function() {
    get_queue(false); /* Don't launch this periodically once more! */
    show_error_box($('#button-error-box'));
  }).fail(function() {
    /* Show some error. */
    show_error_box($('#button-error-box'), 'Failed to ask for help...');
  });
}

function remove_click() {
  $.ajax({
    url: 'api.php',
    type: 'DELETE',
    timeout: 3000
  }).done(function() {
    get_queue(false); /* Don't launch this periodically once more! */
    show_error_box($('#button-error-box'));
  }).fail(function() {
    /* Show some error. */
    show_error_box($('#button-error-box'), 'Failed to pop queue!');
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
  for (var i = 0; i < queue.length; i++) {
    var row = $('<tr>');
    row.append($('<td>').text(i + 1));
    row.append($('<td>').text(queue[i].subject));
    if (queue[i].self === "1") {
      row.addClass('highlight');
    }

    $('#queue tbody').append(row);
  }
}
