// « Créer en 3 questions » : type de vidéo → point de départ → format et durée, puis l'outil existant s'ouvre, rempli, et se lance.
// IA simulée (aucun quota). Le serveur doit tourner (npm start).
const p = require("puppeteer-core");
const {BASE, EDGE} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const COURS = {titre: "Les fractions", concept: "Lire une fraction.", promesse: "Partager juste", pedagogie: {objectifs: ["Lire", "Additionner"]}, direction: {habillage: "tableau", palette: []}, demonstration_3d: {active: false},
  scenes: [{n: 1, debut: 0, fin: 15, fonction: "hook", layout: "hero", texte_ecran: "Pourquoi partager ?", message: "Une pizza, quatre amis."}, {n: 2, debut: 15, fin: 30, fonction: "explication", layout: "definition", texte_ecran: "Une fraction", message: "Une partie d'un tout."}], sources: []};
(async () => {
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000});
  const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if(m.type() === "error") errs.push(m.text()); });
  const asked = [];
  await pg.setRequestInterception(true);
  pg.on("request", r => { if(r.url().includes("/api/sample") && r.method() === "POST"){ try{ asked.push(JSON.parse(r.postData()).prompt || ""); }catch(e){}
    r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({delta: JSON.stringify(COURS)}) + "\n" + JSON.stringify({model: "simulation"}) + "\n"}); } else r.continue(); });
  const pick = (name, v) => pg.evaluate((name, v) => { const i = document.getElementById(`${name}-${v}`); i.checked = true; i.dispatchEvent(new Event("change", {bubbles: true})); }, name, v);
  const type = (id, v) => pg.evaluate((id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("input", {bubbles: true})); }, id, v);
  try{
    await pg.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); });
    await pg.reload({waitUntil: "networkidle0"});
    const home = await pg.evaluate(() => (document.querySelector('.welcome-action[data-go-inline="assistant"]') || {}).textContent || "");
    check("accueil : le premier raccourci est « Créer en 3 questions »", /Créer en 3 questions/.test(home), home.slice(0, 60));
    await pg.evaluate(() => document.querySelector(".tabbar .tab[data-go='creer']").click()); await new Promise(r => setTimeout(r, 400));
    const a0 = await pg.evaluate(() => ({vis: !document.getElementById("view-assistant").hidden, tab: (document.querySelector(".grp-tabs [aria-current='page']") || {}).textContent, types: document.querySelectorAll("#as-type input").length, q2: document.getElementById("as-q2").hidden, over: document.documentElement.scrollWidth - innerWidth}));
    check("« Créer » ouvre l'assistant en premier : 6 types de vidéo, la suite apparaît après le choix", a0.vis && a0.tab === "✨ En 3 questions" && a0.types === 6 && a0.q2, JSON.stringify(a0));
    check("téléphone (390 px) : pas de défilement horizontal", a0.over <= 0, `${a0.over}px`);
    // 1. quiz au hasard, sans IA : les deux formats, durée moyenne → 4 niveaux
    await pick("as-type", "quiz");
    const a1 = await pg.evaluate(() => ({dep: [...document.querySelectorAll("#as-depart input")].map(i => i.value).join(), fmt: [...document.querySelectorAll("#as-fmt input")].map(i => i.value).join(), q3: !document.getElementById("as-q3").hidden}));
    check("quiz : partir d'un thème ou au hasard sans IA ; téléphone, PC ou les deux", a1.dep === "theme,hasard" && a1.fmt === "9:16,16:9,both" && a1.q3, JSON.stringify(a1));
    await pick("as-depart", "hasard"); await pick("as-fmt", "both"); await pick("as-duree", "moyenne");
    const n0 = asked.length; await pg.click("#as-go");
    await pg.waitForFunction(() => !document.getElementById("view-presse").hidden && !document.getElementById("mt-quiz").hidden && document.querySelectorAll("#jx-res .jx-lv").length > 0, {timeout: 15000});
    const q = await pg.evaluate(() => ({lv: document.querySelectorAll("#jx-res .jx-lv").length, fmt: JSON.parse(localStorage.getItem("sp-prefs")).jeuxFormat, cur: (document.querySelector(".side-link[aria-current='page'], .tab[aria-current='page']") || {}).textContent}));
    check("quiz au hasard : l'onglet Quiz s'ouvre avec 4 niveaux calculés, sans appel à l'IA, format « les deux » retenu", q.lv === 4 && q.fmt === "both" && asked.length === n0 && /Créer/.test(q.cur), JSON.stringify(q));
    // 2. « Créer » revient à l'assistant ; un cours se prépare et se lance
    await pg.evaluate(() => document.querySelector(".tabbar .tab[data-go='creer']").click()); await new Promise(r => setTimeout(r, 400));
    check("« Créer » revient ensuite à l'assistant", await pg.evaluate(() => !document.getElementById("view-assistant").hidden));
    await pick("as-type", "cours"); await pick("as-depart", "sujet"); await type("as-texte", "");
    await pg.click("#as-go"); await new Promise(r => setTimeout(r, 300));
    const v0 = await pg.evaluate(() => ({msg: document.getElementById("as-msg").textContent, vis: !document.getElementById("view-assistant").hidden}));
    check("sans réponse à la question 2 : message clair, on reste sur l'assistant", /Écris d’abord quelques mots/.test(v0.msg) && v0.vis, v0.msg);
    await type("as-texte", "Les fractions : lire et additionner"); await pick("as-fmt", "9:16"); await pick("as-duree", "courte");
    await pg.click("#as-go");
    await pg.waitForFunction(() => !!document.getElementById("cr-theme"), {timeout: 30000});
    const c = await pg.evaluate(() => ({sujet: document.getElementById("cr-sujet").value, fmt: document.getElementById("cr-format").value, dur: document.getElementById("cr-duree").value, cours: !document.getElementById("mt-cours").hidden}));
    check("cours : l'onglet Cours s'ouvre rempli (sujet, téléphone, 30 s) et l'agent écrit le cours", c.cours && c.sujet === "Les fractions : lire et additionner" && c.fmt === "9:16" && c.dur === "30" && asked.some(x => /Les fractions : lire et additionner/.test(x)), JSON.stringify(c));
    // 3. film à partir d'un lien YouTube : la page « Depuis une vidéo » s'ouvre avec le lien
    await pg.evaluate(() => { location.hash = "assistant"; }); await new Promise(r => setTimeout(r, 300));
    await pick("as-type", "film"); await pick("as-depart", "video"); await type("as-lien", "https://www.youtube.com/watch?v=abc123"); await pick("as-fmt", "16:9");
    await pg.click("#as-go"); await new Promise(r => setTimeout(r, 500));
    const f = await pg.evaluate(() => ({reel: !document.getElementById("view-reel").hidden, lien: document.getElementById("rm-yt").value, fmt: document.getElementById("rm-format").value, dur: document.getElementById("as-duree").hidden}));
    check("film depuis une vidéo : « Depuis une vidéo » s'ouvre avec le lien et le format PC", f.reel && f.lien === "https://www.youtube.com/watch?v=abc123" && f.fmt === "16:9", JSON.stringify(f));
    check("réponses gardées : l'assistant se souvient des derniers choix après rechargement", await pg.evaluate(() => { const a = JSON.parse(localStorage.getItem("sp-prefs")).assistant || {}; return a.type === "film" && a.depart === "video"; }));
    check("aucune erreur dans la console", errs.length === 0, errs.slice(0, 3).join(" | "));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  await b.close(); console.log(out.join("\n"));
})();
