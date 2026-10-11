// Cours Ultra sans impasse : le documentaliste ne répond pas → « Passer cette étape » ; la commission tourne en rond → le modèle rapide
// reprend l'étape ; le cours est livré avec un avertissement clair. IA simulée (aucun quota). Le serveur doit tourner (npm start).
const p = require("puppeteer-core");
const {BASE, EDGE} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const COURS = {titre: "Les volcans", concept: "Comprendre une éruption.", promesse: "Voir sous la terre", pedagogie: {objectifs: ["Expliquer", "Nommer"]}, direction: {habillage: "labo", palette: []}, demonstration_3d: {active: false},
  scenes: [{n: 1, debut: 0, fin: 15, fonction: "hook", layout: "hero", texte_ecran: "D'où vient la lave ?", message: "Sous nos pieds, la roche fond."}, {n: 2, debut: 15, fin: 30, fonction: "explication", layout: "schema", texte_ecran: "Un volcan", message: "", items: [{titre: "Volcan"}, {titre: "Cratère", texte: "L'ouverture du sommet."}, {titre: "Cheminée", texte: "Le passage du magma."}]}], sources: []};
(async () => {
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000});
  const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if(m.type() === "error") errs.push(m.text()); });
  const calls = [];
  await pg.setRequestInterception(true);
  pg.on("request", r => { if(!(r.url().includes("/api/sample") && r.method() === "POST")) return r.continue();
    let o = {}; try{ o = JSON.parse(r.postData()); }catch(e){} const pr = o.prompt || "", kind = /documentaliste pédagogique/.test(pr) ? "doc" : /commission finale/.test(pr) ? "commission" : "prof";
    calls.push({kind, tier: o.tier, engine: o.engine});
    if(kind === "doc") return;   /* le documentaliste ne répond jamais */
    if(kind === "commission" && calls.filter(c => c.kind === "commission").length === 1)
      return r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({error: true, code: "loop", message: "Le modèle s'est mis à répéter la même chose."}) + "\n"});
    r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({delta: JSON.stringify(COURS)}) + "\n" + JSON.stringify({model: "simulation"}) + "\n"}); });
  try{
    await pg.setViewport({width: 1280, height: 900});
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({motion: "cours", veille: {auto: false}})); });
    await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "presse"; });
    await pg.waitForFunction(() => !document.getElementById("mt-cours").hidden, {timeout: 15000});
    await pg.evaluate(() => { const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event("change", {bubbles: true})); };
      document.getElementById("cr-sujet").value = "Les volcans : comment naît une éruption"; set("cr-quality", "ultra"); set("cr-duree", "30"); set("cr-format", "16:9"); set("cr-images", "none"); set("cr-voix", "none"); set("cr-subs", "none");
      document.getElementById("cr-form").requestSubmit(); });
    await pg.waitForSelector("#cr-skip", {visible: true, timeout: 10000});
    await new Promise(r => setTimeout(r, 2200));
    const st = await pg.evaluate(() => document.getElementById("cr-status-text").textContent);
    check("étape en cours : le temps écoulé s'affiche, avec un bouton « Passer cette étape »", /1\/4 · Le documentaliste/.test(st) && /\d+ s/.test(st), st);
    await pg.click("#cr-skip");
    await pg.waitForFunction(() => !!document.getElementById("cr-theme"), {timeout: 30000});
    const res = await pg.evaluate(() => ({alert: (document.querySelector("#cr-res .alert[role='status']") || {}).textContent || "", skip: document.getElementById("cr-skip").hidden, theme: document.getElementById("cr-theme-nom").textContent}));
    const com = calls.filter(c => c.kind === "commission");
    check("documentaliste passé : le cours continue sans lui et le dit clairement", /Documentaliste : étape passée/.test(res.alert) && res.skip, res.alert.slice(0, 140));
    check("commission qui tourne en rond : relancée une fois avec le modèle rapide, sans avertissement d'échec", com.length === 2 && com[0].tier === "complex" && com[1].tier === "default" && com[1].engine === "default" && !/Commission finale/.test(res.alert), JSON.stringify(com));
    check("le cours est livré (habillage et aperçu)", /Laboratoire/.test(res.theme) && await pg.evaluate(() => document.querySelectorAll("#cr-theme-prev canvas").length > 0), res.theme);
    check("aucune erreur dans la console", errs.length === 0, errs.slice(0, 3).join(" | "));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  await b.close(); console.log(out.join("\n"));
})();
