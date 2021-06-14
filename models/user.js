const { DataTypes } = require("sequelize");
const sequelize = require("../db");
const AddressBook = require("./address");

const User = sequelize.define("User", {
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      len: [6, 15],
    },
  },
  firstname: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastname: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  salt: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  profile_img: {
    type: DataTypes.STRING,
  },
  profile_img_online_storage: {
    type: DataTypes.STRING,
  },
  //   address_id: {
  //     type: DataTypes.ARRAY,
  //   },
});

User.hasMany(AddressBook, {
  onDelete: "CASCADE",
  as: "addresses",
});
AddressBook.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.sync();
module.exports = User;
