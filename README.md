# mixin-roulette

The mixin-based american roulette wheel game service.

You can try this game bot on the Mixin Messenger. Mixin bot ID: 70000100168

![](https://raw.githubusercontent.com/virushuo/mixin-roulette/master/bot.png)


## Installation

### System Requirements

* MySQL server
* NodeJS > v9.3.0

### Mixin configuration

copy and rename config.js.sample to config.js,

You must setup the PIN/Secret/Session... for mixin first. See https://github.com/virushuo/mixin-node for details.

### Setup the MySQLdatabase

Open config.js file and replace the config.mysql with your MySQL configuration

Restore the MySQL database from gears/mysqldump.sql.

### Run the service

node messageserver.js 
