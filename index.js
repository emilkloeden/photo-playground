const path = require("path");
const express = require("express");
const app = express();

app.use(express.static(path.join(__dirname, "public")));

const port = process.env.PORT || 3000;

app.get("/", (_, res) => {
  res.sendFile("index.html", { root: path.join(__dirname, "public") });
});

app.listen(port, () => console.log(`Photo Playground running on port ${port}`));
