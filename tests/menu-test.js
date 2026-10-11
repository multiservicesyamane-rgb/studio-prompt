const p = require("puppeteer-core");
const out = [];
const check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
(async () => {
  const b = await p.launch({executablePath: require("./env").EDGE, headless: true});
  const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = [];
  pg.on("pageerror", e => errs.push(e.message));
  pg.on("console", m => { if(m.type() === "error") errs.push(m.text()); });
  const go = async (w, h, mobile) => { await pg.setViewport({width: w, height: h, isMobile: !!mobile, hasTouch: !!mobile, deviceScaleFactor: mobile ? 2 : 1}); await pg.goto(require("./env").BASE + "/#studio", {waitUntil: "networkidle0", timeout: 60000}); await new Promise(r => setTimeout(r, 400)); };
  const info = () => pg.evaluate(() => {
    const side = document.querySelector(".side"), nav = document.querySelector(".side-nav"), H = innerHeight;
    const vis = e => { const r = e.getBoundingClientRect(); return r.bottom <= H + 1 && r.top >= -1 && r.width > 0; };
    return {
      width: Math.round(side.getBoundingClientRect().width), rail: document.querySelector(".app").classList.contains("rail"),
      cachés: [...side.querySelectorAll(".side-link, .side-foot")].filter(e => !vis(e)).map(e => e.textContent.trim() || e.className),
      navDefile: nav.scrollHeight > nav.clientHeight + 1, overflow: document.documentElement.scrollWidth - innerWidth,
      moteur: document.getElementById("engine-txt").textContent, actif: (document.querySelector('.side-link[aria-current="page"]') || {}).textContent,
    };
  });

  // Ton écran : 1366 × 650
  await pg.evaluateOnNewDocument(() => {}); await go(1366, 650);
  await pg.evaluate(() => localStorage.clear()); await go(1366, 650);
  let i = await info();
  check("1366×650 : menu complet", !i.rail && i.width === 264, `${i.width}px`);
  check("1366×650 : tous les menus visibles, sans défiler", i.cachés.length === 0 && !i.navDefile, i.cachés.join(", "));
  check("état du moteur affiché", /Gemini prêt/.test(i.moteur), i.moteur);
  check("page active surlignée (Depuis une idée → « Créer »)", i.actif === "Créer", i.actif);
  check("pas de débordement", i.overflow <= 0, i.overflow + "px");
  await pg.screenshot({path: "m1-1366-complet.png"});
  // Réduire / agrandir
  await pg.click("#side-collapse"); await new Promise(r => setTimeout(r, 200)); i = await info();
  check("bouton Réduire → barre d'icônes", i.rail && i.width === 76, `${i.width}px`);
  const tip = await pg.$eval('.side-link[data-go="strategie"]', e => e.title);
  check("bulle d'aide sur les icônes", tip === "Ma chaîne", tip);
  await pg.screenshot({path: "m2-1366-icones.png"});
  await go(1366, 650); i = await info(); check("choix Réduit mémorisé après rechargement", i.rail);
  await pg.click("#side-collapse"); await new Promise(r => setTimeout(r, 200)); i = await info(); check("bouton Agrandir → menu complet", !i.rail && i.width === 264);
  // Thème
  await pg.click('[data-theme-set="dark"]'); let th = await pg.evaluate(() => document.documentElement.dataset.theme);
  check("thème Sombre", th === "dark", th);
  await go(1366, 650); th = await pg.evaluate(() => document.documentElement.dataset.theme);
  check("thème Sombre mémorisé", th === "dark", th);
  await pg.screenshot({path: "m3-1366-sombre.png"});
  await pg.click('[data-theme-set="light"]'); th = await pg.evaluate(() => document.documentElement.dataset.theme); check("thème Clair", th === "light", th);
  await pg.click('[data-theme-set="auto"]'); th = await pg.evaluate(() => document.documentElement.dataset.theme || "auto"); check("thème Automatique", th === "auto", th);
  // Menu simplifié : 5 entrées + Réglages ; les pages proches sont des onglets en haut de la page
  const links = await pg.$$eval(".side-link", l => l.map(x => x.dataset.go).join());
  check("menu simplifié : Accueil, Créer, Idées, Mes projets, Ma chaîne + Réglages (connexions)", links === "accueil,creer,trouver,contenus,strategie,connexions", links);
  const gc = await pg.$$eval(".grp-tabs [data-go-tab]", t => t.map(x => x.textContent).join(" | "));
  check("« Créer » : l'assistant en 3 questions puis les 4 façons de créer, en onglets en haut de la page", gc === "✨ En 3 questions | Depuis une idée | Depuis un audio | Depuis une vidéo | Motion design", gc);
  await pg.click('.grp-tabs [data-go-tab="audio"]'); await new Promise(r => setTimeout(r, 300)); i = await info();
  check("onglet « Depuis un audio » : la page s'ouvre et « Créer » reste surligné", !(await pg.$eval("#view-audio", e => e.hidden)) && i.actif === "Créer", i.actif);
  await pg.click('.side-link[data-go="contenus"]'); i = await info();
  check("« Mes projets » ouvre Projets, avec Personnages, Images et Mes clients en onglets", i.actif.startsWith("Mes projets") && !(await pg.$eval("#view-projets", e => e.hidden)) && (await pg.$$eval(".grp-tabs [data-go-tab]", t => t.map(x => x.dataset.goTab).join())) === "projets,persos,images,agence", i.actif);
  await pg.click('.side-link[data-go="strategie"]'); await new Promise(r => setTimeout(r, 300));
  check("« Ma chaîne » ouvre Niches", !(await pg.$eval("#view-niches", e => e.hidden)));
  await pg.click('.grp-tabs [data-go-tab="pays"]'); await new Promise(r => setTimeout(r, 300)); i = await info();
  check("onglet Pays + « Ma chaîne » reste surligné", !(await pg.$eval("#view-pays", e => e.hidden)) && i.actif.startsWith("Ma chaîne"), i.actif);
  await pg.click('.side-link[data-go="accueil"]'); await pg.click('.side-link[data-go="strategie"]'); await new Promise(r => setTimeout(r, 300));
  check("« Ma chaîne » rouvre le dernier onglet (Pays)", !(await pg.$eval("#view-pays", e => e.hidden)));
  await pg.click('.side-link[data-go="creer"]'); await new Promise(r => setTimeout(r, 300));
  check("« Créer » rouvre le dernier onglet (Depuis un audio)", !(await pg.$eval("#view-audio", e => e.hidden)));
  await pg.click('.side-link[data-go="trouver"]'); await new Promise(r => setTimeout(r, 300));
  const gi = await pg.$$eval(".grp-tabs [data-go-tab]", t => t.map(x => x.textContent).join(" | "));
  check("« Idées » : idées originales, tendances du jour et vidéos à succès au même endroit", gi === "Idées originales | Tendances du jour | Vidéos à succès" && !(await pg.$eval("#view-idees", e => e.hidden)), gi);
  await pg.click('.grp-tabs [data-go-tab="presse:succes"]'); await new Promise(r => setTimeout(r, 600)); i = await info();
  check("« Vidéos à succès » ouvre Succès YouTube, et « Idées » reste surligné", !(await pg.$eval("#mt-succes", e => e.hidden)) && i.actif.startsWith("Idées"), i.actif);
  await pg.click('.side-link[data-go="creer"]'); await new Promise(r => setTimeout(r, 300)); await pg.click('.grp-tabs [data-go-tab="presse:motion"]'); await new Promise(r => setTimeout(r, 600)); i = await info();
  check("« Motion design » depuis Créer : un type de vidéo à créer (pas Succès YouTube), « Créer » surligné", (await pg.$eval("#mt-succes", e => e.hidden)) && i.actif === "Créer", i.actif);
  const old = [];
  for(const h of ["studio", "reel", "persos", "memoire", "connexions", "agence", "tendances"]){ await pg.evaluate(h => { location.hash = h; }, h); await new Promise(r => setTimeout(r, 250)); if(await pg.$eval("#view-" + h, e => e.hidden)) old.push(h); }
  check("anciennes adresses toujours valables : aucune page supprimée", !old.length, old.join(", "));
  await pg.evaluate(() => { location.hash = "experts"; }); await new Promise(r => setTimeout(r, 300));
  check("ancienne page Experts → accueil", !(await pg.$eval("#view-accueil", e => e.hidden)) && !(await pg.$("#view-experts")));
  const drops = await pg.$$eval(".fdrop", z => z.length);
  check("champs fichier transformés en zones de dépôt", drops >= 8, drops + " zones");

  // Écran moyen : 1100 × 650 → barre d'icônes automatique
  await pg.evaluate(() => localStorage.clear()); await go(1100, 650); i = await info();
  check("1100×650 : barre d'icônes automatique", i.rail && i.width === 76 && i.cachés.length === 0, `${i.width}px ${i.cachés.join(",")}`);
  check("1100×650 : pas de débordement", i.overflow <= 0, i.overflow + "px");
  await pg.screenshot({path: "m4-1100-icones.png"});
  // Grand écran
  await go(1920, 1000); i = await info();
  check("1920×1000 : menu complet", !i.rail && i.cachés.length === 0, `${i.width}px`);
  // Écran très bas : le menu défile, rien n'est perdu
  await go(1366, 520); i = await info();
  const reach = await pg.evaluate(() => { const n = document.querySelector(".side-nav"); n.scrollTop = 1e5; const r = document.querySelector('.side-link[data-go="connexions"]').getBoundingClientRect(); return r.bottom <= innerHeight; });
  check("1366×520 : tout le menu reste atteignable", reach, i.navDefile ? "le milieu du menu défile" : "");

  // Téléphone
  await go(390, 844, true); i = await info();
  const closed = await pg.evaluate(() => { const r = document.querySelector(".side").getBoundingClientRect(); return r.right <= 0 && getComputedStyle(document.querySelector(".side")).visibility === "hidden"; });
  check("téléphone : menu caché au départ", closed);
  check("téléphone : pas de débordement", i.overflow <= 0, i.overflow + "px");
  await pg.screenshot({path: "m5-tel-ferme.png"});
  await pg.click("#menu-btn"); await new Promise(r => setTimeout(r, 400));
  const opened = await pg.evaluate(() => ({r: Math.round(document.querySelector(".side").getBoundingClientRect().left), exp: document.getElementById("menu-btn").getAttribute("aria-expanded"), focus: document.activeElement.id}));
  check("☰ ouvre le tiroir", opened.r === 0 && opened.exp === "true", JSON.stringify(opened));
  await pg.screenshot({path: "m6-tel-ouvert.png"});
  await pg.click('.side-link[data-go="contenus"]'); await new Promise(r => setTimeout(r, 400));
  const after = await pg.evaluate(() => ({open: document.body.classList.contains("menu-open"), page: !document.getElementById("view-projets").hidden, chip: document.getElementById("top-hint").textContent}));
  check("choisir une entrée ferme le tiroir et ouvre la page", !after.open && after.page, after.chip);
  await pg.click('.grp-tabs [data-go-tab="persos"]'); await new Promise(r => setTimeout(r, 400));
  const tabs = await pg.evaluate(() => { const t = [...document.querySelectorAll(".tabbar .tab")], g = document.querySelector(".grp-tabs"); return {n: t.length, oneRow: new Set(t.map(x => Math.round(x.getBoundingClientRect().top))).size === 1, cur: (document.querySelector('.tabbar .tab[aria-current="page"]') || {}).textContent, persos: !document.getElementById("view-persos").hidden, over: document.documentElement.scrollWidth - innerWidth, inside: g ? g.getBoundingClientRect().right <= innerWidth + 1 : false}; });
  check("téléphone : les 5 entrées en bas sur une ligne, « Projets » surligné sur Personnages, onglets sans débordement", tabs.n === 5 && tabs.oneRow && /Projets/.test(tabs.cur) && tabs.persos && tabs.over <= 0 && tabs.inside, JSON.stringify(tabs));
  await pg.click("#menu-btn"); await new Promise(r => setTimeout(r, 300)); await pg.keyboard.press("Escape"); await new Promise(r => setTimeout(r, 300));
  check("Échap ferme le tiroir", !(await pg.evaluate(() => document.body.classList.contains("menu-open"))));
  await pg.click("#menu-btn"); await new Promise(r => setTimeout(r, 300)); await pg.mouse.click(370, 400); await new Promise(r => setTimeout(r, 300));
  check("toucher à côté ferme le tiroir", !(await pg.evaluate(() => document.body.classList.contains("menu-open"))));
  // Petit téléphone
  await go(340, 700, true); i = await info(); check("340 px : pas de débordement", i.overflow <= 0, i.overflow + "px");
  // Tablette
  await go(800, 1100, true); i = await info(); check("tablette 800 px : barre du haut + tiroir, pas de débordement", i.overflow <= 0 && await pg.$eval("#menu-btn", e => e.offsetParent !== null));

  check("aucune erreur dans la console", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(out.join("\n"));
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.message); });
