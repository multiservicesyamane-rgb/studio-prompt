// Les tests « Garder la voix » repartent d'un dossier vide : on y recopie le Coran déjà gardé sur l'ordinateur
// (public/generated/_textes/coran), pour ne pas dépendre d'Internet à chaque essai. Sans copie locale, le serveur le télécharge.
const fs = require("fs"), path = require("path");
module.exports = GEN => { const src = path.join(__dirname, "..", "public", "generated", "_textes", "coran");
  try{ if(fs.existsSync(path.join(src, "quran-simple-clean.json"))) fs.cpSync(src, path.join(GEN, "_textes", "coran"), {recursive: true}); }catch(e){} };
