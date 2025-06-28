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
    type: DataTypes.TEXT
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8)
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8)
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

User.hasMany(Signal);
Signal.belongsTo(User);

module.exports = Signal;
