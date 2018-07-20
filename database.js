const config = require("./config"); 

const mysql = require('mysql2').createConnection(config.mysql);
module.exports = mysql;
