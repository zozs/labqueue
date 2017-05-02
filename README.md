# labqueue
Maintains a list of students that needs help in lab or exercise sessions.

## License
Labqueue is made available under the ISC license. See the file LICENSE, or the license text below.

```
Copyright (c) 2015, 2016, 2017 Linus Karlsson

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

The haxxor theme is inspired by the [BOOTSTRA.386 theme](https://github.com/kristopolous/BOOTSTRA.386/).

## Installation and running
The client side is based on ReactJS, and will need to be run through Babel and Webpack to fix things up. In addition to this,
npm needs to be used to download a bunch of packages as well.

```
$ npm install
$ npm run build-production
$ node labqueue.js
```

You may then connect to `http://localhost:3000` to see it in action.

## Configuration
The configuration files are formatted in JSON. A good starting point is the file `config/default.json`. Labqueue uses `node-config` to manage its configuration files, so be sure to utilise its features when deploying the application. Of particular interest may be the possibility for different configuration files per host and per environment. See https://github.com/lorenwest/node-config/wiki/Configuration-Files for examples.

#### Configuration directives
The following configuration directives exist:

###### databaseFile
A string with the filename of the SQLite database in which the queue is stored. Example: `"queue.sqlite"`

###### port
An integer telling the server which port to listen to. Example: `80`

###### listenAddress
The address the server should be listening to. Example: `"0.0.0.0"`, which will listen to all IPv4 addresses on the server.

###### admins
A list of IP-addresses allowed to remove and undo removal of students from the queue. However, a student can always delete his or her own help request. Example: `["192.0.2.1", "192.0.2.2"]`

###### ip_subject
An object containing mappings between IP-address and human readable names. If a mapping does not exist, the IP-address will be shown instead. Example: `{"192.0.2.1": "PTR-1", "192.0.2.2": "PTR-2", "192.0.2.3": "PTR-3"}`

###### synchronousDb
Whether SQLite should wait for writes to sync to disk or not. When set to `false`, the command `PRAGMA synchronous = OFF;` will be sent to SQLite, thus disabling synchronous writes. Setting this to `false` may lead to a corrupt database in case of power-loss during a transaction, but may be required to achieve acceptable performance when the disk is slow (e.g. an SD-card). Example: `true`

###### whitelist
A whitelist of IP-addresses allowed to send help requests to this host. If the list is empty (the default setting), requests are allowed from any host. Everyone can always view the queue. Note that if this object is non-empty, an administrator listed in `admins` must also be listed here to get any access. Example: `["192.0.2.1", "192.0.2.2", "192.0.2.3"]`

