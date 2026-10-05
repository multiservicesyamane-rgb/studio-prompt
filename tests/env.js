// Réglages communs des tests. Variables facultatives : EDGE_PATH (navigateur), SP_URL (serveur lancé avec npm start).
const path = require("path"), fs = require("fs");
const OUT = path.join(__dirname, "out");   // captures et fichiers produits par les tests (ignorés par git)
fs.mkdirSync(OUT, {recursive: true});
module.exports = {
  EDGE: process.env.EDGE_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  BASE: (process.env.SP_URL || "http://localhost:3000").replace(/\/$/, ""),
  HTML: path.join(__dirname, "..", "public", "index.html"),
  FIX: path.join(__dirname, "fixtures"),
  OUT,
};
