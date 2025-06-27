
const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const User = require('./User');
const Signal = require('./Signal');

const Like = sequelize.define('Like', {});

User.hasMany(Like);
Like.belongsTo(User);

Signal.hasMany(Like);
Like.belongsTo(Signal);

module.exports = Like;
