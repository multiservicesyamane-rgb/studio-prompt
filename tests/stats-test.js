// Apprendre de tes statistiques : export YouTube Studio (.zip français, .csv anglais), IA simulée, règles retenues et injectées.
const p = require("puppeteer-core"), path = require("path");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
let statsPromptTxt = "", ideaPromptTxt = "";
(async () => {
  const b = await p.launch({executablePath: require("./env").EDGE, headless: true}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.setRequestInterception(true);
  pg.on("request", r => { if(r.url().includes("/api/sample") && r.method() === "POST"){ const pr = JSON.parse(r.postData()).prompt || ""; let x = {};
    if(/analyste de croissance/.test(pr)){ statsPromptTxt = pr; x = {resume: "Les histoires de secrets de famille font 3 fois plus de vues.", ce_qui_marche: ["Secrets de famille : 3× la médiane"], ce_qui_ne_marche_pas: ["Vidéos de plus de 8 min : rétention 30 %"], regles: [{regle: "Promets un secret de famille dès le titre, sans le révéler.", type: "faire", domaine: "titre"}, {regle: "Évite les vidéos de plus de 8 minutes tant que la chaîne est petite.", type: "eviter", domaine: "duree"}], idees: [{titre: "Le testament caché sous le lit", pourquoi: "Secret de famille, format qui marche le mieux."}]}; }
    if(/Agent mondial de recherche narrative/.test(pr)){ ideaPromptTxt = pr; x = {idees: []}; }
    r.respond({status: 200, contentType: "application/x-ndjson", body: JSON.stringify({delta: JSON.stringify(x)}) + "\n"}); } else r.continue(); });
  await pg.setViewport({width: 1366, height: 900});
  await pg.goto(require("./env").BASE + "/#memoire", {waitUntil: "networkidle0"});
  await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); });
  await pg.reload({waitUntil: "networkidle0"});
  // 1. export .zip en français
  await (await pg.$("#stats-file")).uploadFile(path.join(require("./env").FIX, "stats-export.zip"));
  await pg.click("#stats-go"); await pg.waitForSelector("#stats-res .stat-pick", {timeout: 20000}).catch(() => {});
  let r = await pg.evaluate(() => ({facts: document.querySelector("#stats-res .facts") && document.querySelector("#stats-res .facts").innerText.replace(/\s+/g, " "), top: [...document.querySelectorAll("#stats-res .stat-table tbody tr")].slice(0, 3).map(x => x.innerText.replace(/\s+/g, " ")), tables: document.querySelectorAll("#stats-res .stat-table").length, rules: document.querySelectorAll("#stats-res .stat-pick input").length, msg: document.getElementById("stats-msg").textContent}));
  check(".zip YouTube Studio (français) lu : 20 vidéos, ligne Total ignorée", /Vidéos 20/i.test(r.facts || ""), r.facts || r.msg);
  check("meilleures vidéos, durées, jours", r.tables >= 2 && r.top.length === 3, r.top[0]);
  check("analyse de l'IA : règles à cocher", r.rules === 2, r.msg);
  check("l'analyse reçoit les vraies données (meilleures + moins bonnes)", /MEILLEURES VIDÉOS/.test(statsPromptTxt) && /MOINS BONNES/.test(statsPromptTxt) && /secret/i.test(statsPromptTxt));
  await pg.click("#stats-keep"); await new Promise(r => setTimeout(r, 600));
  const kept = await pg.evaluate(() => ({msg: document.getElementById("stats-keep-msg").textContent, rows: [...document.querySelectorAll("#mem-list .lesson .m")].map(x => x.textContent)}));
  check("règles retenues dans la Mémoire (source : tes statistiques)", /2 règles retenues/.test(kept.msg) && kept.rows.filter(x => /tes statistiques/.test(x)).length === 2, kept.rows.join(" | ").slice(0, 160));
  // 2. les règles guident la création d'idées
  await pg.evaluate(() => { location.hash = "idees"; }); await new Promise(r => setTimeout(r, 300));
  await pg.click("#i-go"); await new Promise(r => setTimeout(r, 1500));
  check("règles injectées dans la recherche d'idées", /CE QUI MARCHE SUR LA CHAÎNE/.test(ideaPromptTxt) && /secret de famille dès le titre/.test(ideaPromptTxt), ideaPromptTxt ? "" : "aucune demande");
  // 3. idée → Studio
  await pg.evaluate(() => { location.hash = "memoire"; }); await new Promise(r => setTimeout(r, 300));
  await pg.click('[data-stat-idea="0"]'); await new Promise(r => setTimeout(r, 300));
  const idee = await pg.evaluate(() => ({view: !document.getElementById("view-studio").hidden, txt: document.getElementById("idee").value}));
  check("« Créer cette vidéo » remplit le Studio", idee.view && /testament caché/.test(idee.txt), idee.txt.slice(0, 80));
  // 4. export .csv anglais
  await pg.evaluate(() => { location.hash = "memoire"; }); await new Promise(r => setTimeout(r, 300));
  await (await pg.$("#stats-file")).uploadFile(path.join(require("./env").FIX, "stats-en.csv"));
  await pg.click("#stats-go"); await new Promise(r => setTimeout(r, 1500));
  r = await pg.evaluate(() => (document.querySelector("#stats-res .facts") || {}).innerText || document.getElementById("stats-msg").textContent);
  check(".csv YouTube Studio (anglais) lu aussi", /Vidéos\s*20/i.test(r), r.replace(/\s+/g, " "));
  check("aucune erreur JavaScript", errs.length === 0, errs.join(" | "));
  await b.close(); console.log(out.join("\n"));
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.message); });
