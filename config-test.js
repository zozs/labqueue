var config = {};

/* Define this IP-address to have the right to remove the topmost student.
 * Set this to NULL string to allow anyone to delete. Set it to an empty
 * array to have no administrators. */
config.admins = [
  "192.0.2.1"
];

/* Defines ip -> subject mappings to make everything look nicer. */
config.ip_subject = {
  "192.0.2.1": "C1",
  "192.0.2.2": "C2",
  "192.0.2.3": "C3",
};

// node.js stuff.
module.exports = config;
