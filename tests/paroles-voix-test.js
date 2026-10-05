const p = require("puppeteer-core");
const PROJ = {kind: "project", titre: "Voix", idee: "x", params: {style: "realiste", format: "16:9", duree: "16", langue: "fr", outil: "veo", audio: "voice"},
  result: {titre: "Voix", personnages: [{id: "awa", nom: "Awa", fiche_en: "Awa, a 10-year-old girl with two puffs", rappel_en: "Awa, the girl with two puffs"}, {id: "moussa", nom: "Moussa", fiche_en: "Moussa, a 70-year-old man with a white beard", rappel_en: "Moussa, the old man"}],
    plans: [1, 2].map(n => ({n, debut: `0:0${(n - 1) * 8}`, fin: n === 1 ? "0:08" : "0:16", intention: `Plan ${n}`, voix_off: "Il fait chaud.", personnages: ["awa", "moussa"], cadrage_en: "Medium shot", action_en: "Awa talks to Moussa", decor_en: "a village", camera_en: "static", note: 8})), audio: {}, montage: [], youtube: {titres: []}}, createdAt: Date.now(), updatedAt: Date.now()};
(async () => {
  const b = await p.launch({executablePath: require("./env").EDGE, headless: true}); const pg = await b.newPage(); await require("./noauto")(pg);
  await pg.setViewport({width: 1366, height: 900}); await pg.goto(require("./env").BASE + "/#accueil", {waitUntil: "networkidle0"});
  await pg.evaluate(pr => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); localStorage.setItem("sp-local-db", JSON.stringify({"data/users/local": {voix1: pr}})); }, PROJ);
  await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "projets"; }); await new Promise(r => setTimeout(r, 400));
  await pg.click('#list-projects [data-open="voix1"]'); await pg.waitForSelector('[data-ptab="paroles"]'); await pg.click('[data-ptab="paroles"]');
  await pg.click('#s-paroles [data-par="0"] [data-par-add]'); await pg.click('#s-paroles [data-par="0"] [data-par-add]');
  await pg.evaluate(() => { const rows = document.querySelectorAll('#s-paroles [data-par="0"] .par-rep'); rows[0].querySelector(".par-who").value = "awa"; rows[0].querySelector(".par-txt").value = "Grand-père, il n'y a plus d'eau."; rows[1].querySelector(".par-who").value = "moussa"; rows[1].querySelector(".par-txt").value = "Alors creusons."; });
  await pg.click("#par-save"); await new Promise(r => setTimeout(r, 600));
  await pg.click('[data-ptab="plans"]'); await new Promise(r => setTimeout(r, 300));
  const r = await pg.evaluate(() => ({vo: (document.querySelector("#plan-0 .vo") || {}).innerText || "", prompt: [...document.querySelectorAll("#plan-0 pre")].map(x => x.textContent).join(" || ")}));
  console.log((/Awa :/.test(r.vo) && /Moussa :/.test(r.vo) ? "OK   " : "ECHEC") + " carte du plan : répliques avec les noms — " + r.vo.replace(/\s+/g, " ").slice(0, 120));
  console.log((/Alors creusons/.test(r.prompt) && /Grand-père, il n'y a plus d'eau/.test(r.prompt) ? "OK   " : "ECHEC") + " prompt vidéo mis à jour avec le dialogue — " + (r.prompt.match(/[^.]{0,80}Alors creusons[^.]{0,40}/) || [""])[0]);
  await pg.evaluate(() => { location.hash = "projets"; }); await new Promise(r => setTimeout(r, 300)); await pg.click('#list-projects [data-open="voix1"]'); await pg.waitForSelector("#plan-0");
  const saved = await pg.evaluate(() => (document.querySelector("#plan-0 .vo") || {}).innerText || "");
  console.log((/Alors creusons/.test(saved) ? "OK   " : "ECHEC") + " modification enregistrée dans le projet (réouverture)");
  await b.close();
})().catch(e => console.log("ERREUR DU TEST :", e.message));
