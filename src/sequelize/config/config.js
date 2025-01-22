require('dotenv').config();

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

module.exports = config;
