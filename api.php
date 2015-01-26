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
  /* Delete the top-most subject from the queue. */
  global $ADMIN_IP;

  if ($ADMIN_IP === "" || $_SERVER['REMOTE_ADDR'] === $ADMIN_IP) {
    $sql = 'UPDATE queue SET done=CURRENT_TIMESTAMP WHERE id IN
            (SELECT id FROM queue WHERE done=0 ORDER BY added, id LIMIT 1);';
    $db->exec($sql);

    /* Success! */
    http_response_code(204);
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

?>
