const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Airport = sequelize.define('Airport', {
  code: {
    type: DataTypes.STRING(3),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false
  }
});

module.exports = Airport; 