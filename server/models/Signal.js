
const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const User = require('./User');

const Signal = sequelize.define('Signal', {
  airport: {
    type: DataTypes.STRING
  },
  flight: {
    type: DataTypes.STRING
  },
  message: {
    type: DataTypes.STRING
  }
});

User.hasMany(Signal);
Signal.belongsTo(User);

module.exports = Signal;
