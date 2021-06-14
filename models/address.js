const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const AddressBook = sequelize.define("AddressBook", {
  userId: {
    type: DataTypes.INTEGER,
    // primaryKey: true,
    references: {
      model: "Users",
      key: "id",
    },
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  pincode: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  phoneNumber: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
});

AddressBook.sync();
module.exports = AddressBook;
