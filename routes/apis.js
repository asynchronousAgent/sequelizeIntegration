const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const sgmail = require("@sendgrid/mail");
const multer = require("multer");
const imgur = require("imgur");
require("dotenv").config();
const User = require("../models/user");
const validationCheck = require("../middleware/validationCheck");
const AddressBook = require("../models/address");
const ResetPassword = require("../models/resetPassword");
const router = express.Router();

sgmail.setApiKey(process.env.sendgrid_api);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "_" + file.originalname
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(new Error("Invalid mimetype"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 3,
  },
  fileFilter: fileFilter,
});

router.post("/registration", async (req, res) => {
  const {
    username,
    firstname,
    lastname,
    email_id,
    password,
    confirm_password,
  } = req.body;

  const msg = {
    to: email_id,
    from: process.env.host_email,
    subject: "Registration Successful",
    html: "<strong>you have successfully registered here</strong>",
  };
  try {
    const user = await User.findOne({
      where: { [Op.or]: [{ username, email_id }] },
    });
    if (user)
      return res
        .status(400)
        .json({ success: 0, message: "User already exists", data: user });
    if (password !== confirm_password)
      return res.status(400).json({
        success: 0,
        message: "password did not match, please re-enter password",
      });
    const salt = await bcrypt.genSalt(10);
    const hashedpassword = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      username,
      firstname,
      lastname,
      email_id,
      password: hashedpassword,
      salt,
    });
    await sgmail.send(msg);
    res.status(201).json({
      success: 1,
      message: `${newUser.username} is created successfully`,
      data: newUser,
    });
  } catch (err) {
    res.status(500).json({ success: 0, messsage: "Internal Server Error" });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ where: { username } });
    if (user) {
      const verifiedUser = await bcrypt.compare(password, user.password);
      if (verifiedUser) {
        const payload = {
          user: user.id,
        };
        const token = jwt.sign(payload, process.env.mySecretKey, {
          expiresIn: 3600,
        });
        return res.status(200).json({
          success: 1,
          message: "Logged in successfully",
          data: { token: "Bearer " + token },
        });
      }
      res.status(400).json({
        success: 0,
        message: "Login credentials didn't match,Please try again",
      });
    } else {
      res.status(404).json({
        success: 0,
        message: "No user found with the provided username",
      });
    }
  } catch (err) {
    res
      .status(500)
      .json({ success: 0, messsage: "Internal Server Error,can't logging in" });
  }
});

router.get("/get", validationCheck, async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { id: req.user_id },
      attributes: { exclude: ["password", "salt"] },
    });
    if (user)
      res.status(200).json({
        success: 1,
        messsage: `${user.username}'s details are successfully returned`,
        data: { user },
      });
  } catch (err) {
    next(err);
  }
});

router.put("/delete", validationCheck, async (req, res, next) => {
  try {
    await AddressBook.destroy({ where: { user_id: req.user_id } });
    await User.destroy({ where: { id: req.user_id } });
    res.status(200).json({
      success: 1,
      message: "Your details has been deleted successfully",
    });
  } catch (err) {
    next(err);
  }
});

router.get("/list/:page", async (req, res, next) => {
  try {
    const page = req.params.page;
    const skip = (page - 1) * 10;
    const users = await User.findAll({
      order: ["username"],
      limit: 10,
      offset: skip,
      attributes: { exclude: ["password", "salt"] },
    });
    if (page > users.length)
      return res.status(400).json({
        success: 0,
        message: `Your entered page is greater than the page available in the server`,
      });
    res.status(200).json({
      success: 1,
      message: `Total no of users in this page ${users.length}`,
      data: users,
    });
  } catch (err) {
    next(new Error("Please put a positive value of page"));
  }
});

router.post("/address", validationCheck, async (req, res, next) => {
  const { address, city, state, pincode, phoneNumber } = req.body;
  try {
    const existing_address = await AddressBook.findAll({
      where: { [Op.and]: [{ user_id: req.user_id }, { address }] },
      attributes: ["address", "city"],
    });
    if (existing_address.length > 0)
      return res.status(400).json({
        success: 0,
        message:
          "You have already added this address, please provide a new one",
      });
    const newAddress = await AddressBook.create({
      user_id: req.user_id,
      address,
      city,
      state,
      pincode,
      phoneNumber,
    });
    res.status(201).json({
      success: 1,
      message: "Address field has been created successfully",
      data: newAddress,
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/address", validationCheck, async (req, res) => {
  let { address_id } = req.body;
  address_id = address_id.split(",");
  try {
    const address = await AddressBook.destroy({
      where: { id: { [Op.in]: address_id }, user_id: req.user_id },
    });
    if (!address)
      return res.status(404).json({
        success: 0,
        message:
          "provided address_id is not valid, please provide a valid address_id",
      });
    res.status(200).json({
      success: 1,
      message: "requested address has been deleted successfully",
    });
  } catch (err) {
    console.log(err);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  const { username } = req.body;
  try {
    const user = await User.findOne({ where: { username } });
    if (!user)
      return res.status(400).json({
        success: 0,
        message: "Please give proper username",
      });
    const payload = {
      user: username,
      email: user.email_id,
    };
    const token = jwt.sign(payload, process.env.mySecretKey, {
      expiresIn: 600,
    });
    await ResetPassword.create({
      token,
    });
    const msg = {
      to: user.email_id,
      from: process.env.host_email,
      subject: "Reset password",
      html: `<strong>Hi ${username}, your request to reset password has been processed. Please open the following link to reset your password, please noted this link is valid only for 10 minutes. Link-> ${process.env.reset_link}/${token}</strong>`,
    };
    await sgmail.send(msg);
    res.status(200).json({
      success: 1,
      message: "Token for reset password has been generated successfully",
      data: token,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/verify-reset-password/:password_reset_token",
  async (req, res) => {
    const token = req.params.password_reset_token;
    let { password, confirm_password } = req.body;
    try {
      const verify_token = await ResetPassword.findOne({ where: { token } });
      if (!verify_token)
        return res.status(400).json({
          success: 0,
          message:
            "This token is already used,please request another valid token",
        });
      const decoded = jwt.verify(token, process.env.mySecretKey);
      if (password !== confirm_password)
        return res.status(400).json({
          success: 0,
          message: "password did not match, please re-enter correctly",
        });
      const salt = await bcrypt.genSalt(10);
      password = await bcrypt.hash(password, salt);
      const reset_successful = await User.update(
        { password, salt },
        { where: { username: decoded.user } }
      );
      await ResetPassword.destroy({ where: { token } });
      const msg = {
        from: process.env.host_email,
        to: decoded.email,
        subject: "Password Changed",
        html: `Hi ${decoded.user}, your Password has been Changed successfully`,
      };
      await sgmail.send(msg);
      res.status(200).json({
        success: 1,
        message: "Password changed successfully",
        data: reset_successful,
      });
    } catch (err) {
      res.status(400).json({ success: 0, message: "Token expired" });
    }
  }
);

router.post(
  "/profile-image",
  validationCheck,
  upload.single("profile_img"),
  async (req, res) => {
    const profile_img = req.file.path;
    try {
      const url = await imgur.uploadFile(`./${profile_img}`);
      await User.update(
        { profile_img, profile_img_online_storage: url.link },
        { where: { id: req.user_id } }
      );
      res.status(200).json({
        success: 1,
        message: "Profile photo updated successfully",
      });
    } catch (err) {
      res
        .status(400)
        .json({ success: 0, message: "Error in uploading profile picture" });
    }
  }
);

module.exports = router;
