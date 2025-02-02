require('dotenv').config();

//MySQL
const config = {
  dialect: 'mysql',
  database: process.env.MYSQL_DATABASE,
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  username: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_ROOT_PASSWORD,
  define: {
    charset: process.env.MYSQL_CHARSET,
    collate: process.env.MYSQL_COLLATE,
    encoding: process.env.MYSQL_ENCODING,
  },
};

/*
// PostgresSQL
const config = {
  dialect: 'postgres',
  database: process.env.PGSQL_DATABASE,
  host: process.env.PGSQL_HOST,
  port: process.env.PGSQL_PORT,
  username: process.env.PGSQL_USERNAME,
  password: process.env.PGSQL_ROOT_PASSWORD,
};
*/

module.exports = config;
