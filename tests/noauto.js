// Les tests ne doivent jamais lancer la veille automatique (elle consomme le quota de l'API).
module.exports = page => page.evaluateOnNewDocument(() => { try{ const p = JSON.parse(localStorage.getItem("sp-prefs") || "{}"); if(!p.veille){ p.veille = {auto:false}; localStorage.setItem("sp-prefs", JSON.stringify(p)); } }catch(e){} });
