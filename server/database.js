
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './aircommits.sqlite'
});

module.exports = sequelize;
