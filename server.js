const http = require("http");
const sequelize = require("./db");
const app = require("./app");

const server = http.createServer(app);

sequelize
  .authenticate()
  .then(() => console.log("connected to mysql"))
  .catch((err) => console.log("Not connected to db", err));

const port = process.env.PORT || 8000;
server.listen(port, () => console.log(`Server listening on port ${port}`));
