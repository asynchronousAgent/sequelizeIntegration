const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const ResetPassword = sequelize.define("ResetPassword", {
  token: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});
ResetPassword.sync();

module.exports = ResetPassword;
