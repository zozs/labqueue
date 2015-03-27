<?php
require_once('config.php');

try {
  /* Irregardless of request type, we open up a database connection. */
  $db = connect_database();

  /* First determine what type of request we want. */
  switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
      get_queue($db);
      break;
    case 'POST':
      post_to_queue($db);
      break;
    case 'DELETE':
      delete_from_queue($db);
      break;
    case 'PUT': /* abusing HTTP a bit here... */
      undelete_top_queue($db);
      break;
    default:
      return_error(400, "Invalid request");
      break;
  }
} catch (PDOException $e) {
  return_error(500, "Database query failed with message: " . $e->getMessage());
}

function connect_database() {
  /* Returns a connection and ensures that it has a table. */
  $db = new PDO('sqlite:queue.sqlite');
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $sql = 'CREATE TABLE IF NOT EXISTS queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject TEXT NOT NULL,
            added TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            done TIMESTAMP NOT NULL DEFAULT 0,
            UNIQUE (subject, done)
          );';
  $db->exec($sql);
  return $db;
}

function delete_from_queue($db) {
  /* First we need to determine whether we want to remove the top of the queue
   * (admin-mode), or if we want to remove a user's pending help request.
   * Popping from the top is done by calling the api as DELETE api.php/top */
  if (isset($_SERVER['PATH_INFO']) && $_SERVER['PATH_INFO'] === '/top') {
    delete_top_queue($db);
  } else {
    delete_subject_from_queue($db);
  }
}

function delete_subject_from_queue($db) {
  /* Delete the calling subject from the queue. */
  $self_subject = map_ip_to_subject($_SERVER['REMOTE_ADDR']);

  $sql = 'DELETE FROM queue WHERE subject=? AND done=0;';
  $stmt = $db->prepare($sql);
  $stmt->execute(array($self_subject));

  if ($stmt->rowCount() != 0) {
    /* Success! */
    http_response_code(204);
  } else {
    return_error(404, "You don't have any help request to delete!");
  }
}

function delete_top_queue($db) {
  /* Delete the top-most subject from the queue. */
  ensure_admin();
  $sql = 'UPDATE queue SET done=CURRENT_TIMESTAMP WHERE id IN
          (SELECT id FROM queue WHERE done=0 ORDER BY added, id LIMIT 1);';
  $db->exec($sql);

  /* Success! */
  http_response_code(204);
}

function ensure_admin() {
  global $ADMIN_IP;

  if ($ADMIN_IP === NULL || in_array($_SERVER['REMOTE_ADDR'], $ADMIN_IP, TRUE)) {
    return TRUE;
  } else {
    return_error(403, "Unauthorized! You are not an administrator.");
  }
}

function get_queue($db) {
  /* Return JSON-encoded list of the queue. No options. */
  $self_subject = map_ip_to_subject($_SERVER['REMOTE_ADDR']);

  $sql = 'SELECT subject, (subject=?) AS self FROM queue
          WHERE done=0 ORDER BY added, id;';
  $stmt = $db->prepare($sql);
  $stmt->execute(array($self_subject));
  $queue = $stmt->fetchAll(PDO::FETCH_ASSOC);

  /* Return JSON of the queue. */
  header('Content-Type: application/json');
  echo json_encode(array('queue' => $queue));
}

function map_ip_to_subject($ip) {
  /* Returns a more descriptive name given an IP-address. If no mapping is found
   * it just returns the IP-address. */
  global $IP_SUBJECT_MAPPINGS; /* Uses global from config file. */

  if (array_key_exists($ip, $IP_SUBJECT_MAPPINGS)) {
    return $IP_SUBJECT_MAPPINGS[$ip];
  } else {
    return $ip;
  }
}

function post_to_queue($db) {
  /* Add a new help-seeking student to the queue. No options. */

  /* We use the client's IP-address as identifier. Since this is not very user-
   * friendly to show for the teacher/student, we first run it through a
   * mapping layer which converts it to readable string if a mapping exists.
   * Otherwise we just use the IP-address anyway. */
  $subject = map_ip_to_subject($_SERVER['REMOTE_ADDR']);
  $stmt = $db->prepare("INSERT INTO queue (subject) VALUES (?);");
  try {
    $stmt->execute(array($subject));
  } catch (PDOException $e) {
    /* If this was a duplicate insert, inform user about that. */
    if ($e->getCode() === "23000") { /* Integrity constraint violation */
      return_error(400, "Trying to add duplicate help request");
    } else {
      throw $e;
    }
  }

  /* Success! */
  http_response_code(204);
}

function return_error($status, $message) {
  /* Posts a nice error back to the client (not JSON-formatted). */
  http_response_code($status);
  die($message);
}

function undelete_top_queue($db) {
  /* Restores the help request that was just previously deleted. */
  ensure_admin();
  $sql = 'UPDATE queue SET done=0 WHERE id IN
          (SELECT id FROM queue WHERE done!=0 ORDER BY added DESC, id DESC LIMIT 1);';
  try {
    $db->exec($sql);
  } catch (PDOException $e) {
    /* If an undo would result in duplicate requests for a user, report so. */
    if ($e->getCode() === "23000") { /* Integrity constraint violation. */
      return_error(400, "Undo would result in duplicate requests for user");
    } else {
      throw $e;
    }
  }
  /* Success! */
  http_response_code(204);
}

?>
