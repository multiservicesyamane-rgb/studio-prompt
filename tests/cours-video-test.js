// Cours du jour de bout en bout : IA simulée (aucun quota), mise en scène « tableau » → habillage tableau à craie,
// aperçu de trois diapos, changement d'habillage à la main, puis vraie vidéo Full HD qui suit ce choix. Le serveur doit tourner (npm start).
const p = require("puppeteer-core");
const {BASE, EDGE} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const COURS = {titre: "Les fractions en 30 secondes", concept: "Lire et additionner des fractions.", promesse: "Partager juste, sans se tromper",
  pedagogie: {question_centrale: "Comment partager équitablement ?", objectifs: ["Lire une fraction", "Additionner deux fractions", "Éviter l'erreur fréquente"]},
  direction: {style: "classe", habillage: "labo", habillage_raison: "Un cours de calcul clair.", palette: []}, demonstration_3d: {active: false},
  scenes: [{n: 1, debut: 0, fin: 6, fonction: "hook", layout: "hero", texte_ecran: "Pourquoi partager en parts égales ?", message: "Une pizza, quatre amis.", voix_off: "Une pizza, quatre amis."},
    {n: 2, debut: 6, fin: 13, fonction: "explication", layout: "definition", texte_ecran: "Une fraction", message: "Une partie d'un tout coupé en parts égales.", items: [{titre: "EXEMPLE", texte: "3/4 : quatre parts, on en prend trois."}]},
    {n: 3, debut: 13, fin: 21, fonction: "exemple", layout: "formule", texte_ecran: "Additionner", message: "", items: [{texte: "1/4 + 2/4"}, {texte: "= 3/4", titre: "résultat"}]},
    {n: 4, debut: 21, fin: 30, fonction: "resume", layout: "network", texte_ecran: "Ce que tu sais faire", message: ""}], sources: []};
const avg = sel => `(() => { const c = ${sel}; const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let r = 0, g = 0, b = 0, n = 0; for(let i = 0; i < d.length; i += 64){ r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; } return [r / n, g / n, b / n].map(Math.round); })()`;
const green = ([r, g, b]) => g > r + 8 && g > b && r < 110, beige = ([r, g, b]) => r > 170 && g > 150 && b > 100 && r > b + 25;
(async () => {
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000});
  const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if(m.type() === "error") errs.push(m.text()); });
  let asked = "";
  await pg.setRequestInterception(true);
  pg.on("request", r => { if(r.url().includes("/api/sample") && r.method() === "POST"){ try{ asked = JSON.parse(r.postData()).prompt || ""; }catch(e){}
    r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({delta: JSON.stringify(COURS)}) + "\n" + JSON.stringify({model: "simulation"}) + "\n"}); } else r.continue(); });
  try{
    await pg.setViewport({width: 390, height: 844});
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({motion: "cours", veille: {auto: false}})); });
    await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "presse"; });
    await pg.waitForFunction(() => !document.getElementById("mt-cours").hidden, {timeout: 15000});
    await pg.evaluate(() => { const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event("change", {bubbles: true})); };
      document.getElementById("cr-sujet").value = "Les fractions : lire et additionner"; set("cr-domaine", "Mathématiques"); set("cr-niveau", "college"); set("cr-duree", "30"); set("cr-format", "9:16"); set("cr-mode", "tableau"); set("cr-quality", "rapide"); set("cr-images", "none"); set("cr-voix", "none"); set("cr-subs", "none");
      document.getElementById("cr-form").requestSubmit(); });
    await pg.waitForFunction(() => document.querySelectorAll("#cr-theme-prev canvas").length === 3, {timeout: 30000});
    check("la consigne envoyée à l'agent propose les habillages et impose le tableau pour cette mise en scène", /HABILLAGE PROPRE À CE COURS/.test(asked) && /tableau \(mathématiques/.test(asked) && /impose l'habillage tableau/.test(asked) && /layout=frise/.test(asked));
    const a1 = await pg.evaluate(() => ({sel: document.getElementById("cr-theme").value, nom: document.getElementById("cr-theme-nom").textContent, n: document.querySelectorAll("#cr-theme-prev canvas").length}));
    const c1 = await pg.evaluate(avg('document.querySelector("#cr-theme-prev canvas")'));
    check("mise en scène « tableau » : habillage tableau à craie, montré sur trois diapos (fond vert)", a1.sel === "tableau" && /Tableau à craie/.test(a1.nom) && a1.n === 3 && green(c1), `${a1.sel} · ${a1.nom} · ${c1}`);
    await pg.select("#cr-theme", "archive"); await new Promise(r => setTimeout(r, 300));
    const c2 = await pg.evaluate(avg('document.querySelector("#cr-theme-prev canvas")')), a2 = await pg.evaluate(() => document.getElementById("cr-theme-nom").textContent);
    check("changer l'habillage à la main redessine l'aperçu (archives : papier ancien)", /Archives/.test(a2) && beige(c2), `${a2} · ${c2}`);
    const over = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check("écran du cours sur téléphone : pas de défilement horizontal", over <= 1, `${over}px`);
    await pg.evaluate(() => document.getElementById("md-render").click());
    await pg.waitForFunction(() => /Master MP4 finalisé|Capture prête|impossible à|Utilise Chrome/.test((document.getElementById("md-render-msg") || {}).textContent || ""), {timeout: 240000});
    const v = await pg.evaluate(async () => { const v = document.querySelector("#md-video video"), msg = document.getElementById("md-render-msg").textContent; if(!v) return {msg};
      await new Promise(r => { if(v.readyState >= 1) r(); else v.onloadedmetadata = r; setTimeout(r, 8000); }); v.currentTime = 9; await new Promise(r => { v.onseeked = r; setTimeout(r, 3000); });
      const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext("2d").drawImage(v, 0, 0); window.__f = c; return {msg, w: v.videoWidth, h: v.videoHeight, dur: v.duration}; });
    const c3 = v.w ? await pg.evaluate(avg("window.__f")) : [0, 0, 0];
    check("vidéo du cours en Full HD 1080 × 1920, 30 s, finition FFmpeg", v.w === 1080 && v.h === 1920 && Math.abs(v.dur - 30) < 1 && /Master MP4 finalisé/.test(v.msg), `${v.w}×${v.h} · ${Math.round((v.dur || 0) * 10) / 10} s · ${v.msg}`);
    check("la vidéo suit l'habillage choisi (papier ancien des archives)", beige(c3), String(c3));
    check("aucune erreur dans la console", errs.length === 0, errs.slice(0, 3).join(" | "));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  await b.close(); console.log(out.join("\n"));
})();
