const express = require("express");
const apis = require("./routes/apis");
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use("/user", apis);

app.use((req, res, next) => {
  const err = new Error("Not found");
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  res.status(err.status || 400).json({ success: 0, message: err.message });
});

module.exports = app;
