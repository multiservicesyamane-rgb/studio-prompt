// Director Engine V4 : les prompts réellement affichés (tous styles, Veo / Runway / Wan) n'injectent ni lampes, ni LED, ni figurants,
// ni micro-mouvement à l'épaule ; un seul mouvement de caméra par plan ; l'état de fin du clip est transmis. Aucun appel à l'IA.
const p = require("puppeteer-core");
const {EDGE, BASE} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const STYLES = ["vrai", "serie", "hybride3d", "fruits", "realiste", "anim3d", "anim2d", "motion"], OUTILS = ["veo", "runway", "wan"];
// Champs volontairement « mauvais », comme un modèle pourrait encore les écrire : l'application doit les nettoyer.
const plan = (n, camera, fin) => ({n, debut: `0:0${(n - 1) * 4}`, fin: `0:0${n * 4}`, intention: `Plan ${n}`, voix_off: "", personnages: ["a"], cadrage_en: n === 1 ? "Wide establishing shot" : "Close-up",
  action_en: "The man kneels and pours the last water of his bottle at the foot of a dry shrub", decor_en: "an open desert of pale sand under the midday sun",
  camera_en: camera, lumiere_en: "hard midday sun, bounce light from the sand", ambiance_en: "silent, tense", son_en: "wind, water dripping on sand", fin_en: fin, note: 9});
const PROJ = (style, outil) => ({kind: "project", titre: "Test V4", idee: "Un homme arrose un arbuste dans le désert.", params: {style, format: "9:16", duree: "30", langue: "fr", outil, audio: "voice"},
  result: {titre: "Test V4", logline: "", personnages: [{id: "a", nom: "Moussa", fiche_en: "Moussa, a 40-year-old man with a short beard, beige tunic", rappel_en: "Moussa in a beige tunic"}],
    plans: [plan(1, "static shot, subtle handheld camera micro-movement", "he stays kneeling, the sand around the shrub is dark and wet"),
            plan(2, "slow dolly in, then pan left while tracking, 50mm lens", "his hand stops above the shrub, the bottle is empty"),
            plan(3, "", "")],
    audio: {voix: "", mixage: ""}, montage: [], youtube: {titres: []}}, createdAt: Date.now(), updatedAt: Date.now()});
const MOVE = /\b(dolly|push[- ]?in|pull[- ]?(back|out)|pan(s|ning)?|tilt(s|ing)?|track(ing)?|truck(ing)?|arc(s|ing)?|orbit(ing)?|zoom(s|ing)?|crane|handheld|hand-held|steadicam|whip)\b/gi;
(async () => {
  const b = await p.launch({executablePath: EDGE, headless: true}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.setViewport({width: 1366, height: 900});
  const bad = {lumiere: [], figurants: [], micro: [], multi: [], fin: [], brut: []}; let n = 0;
  for(const style of STYLES) for(const outil of OUTILS){
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(pr => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); localStorage.setItem("sp-local-db", JSON.stringify({"data/users/local": {projv4: pr}})); }, PROJ(style, outil));
    await pg.reload({waitUntil: "networkidle0"});
    await pg.evaluate(() => { location.hash = "projets"; }); await new Promise(r => setTimeout(r, 300));
    await pg.click('#list-projects [data-open="projv4"]'); await pg.waitForSelector("#result .ptabs", {timeout: 15000});
    const pres = await pg.$$eval("pre[id^='pre-']", l => l.map(x => ({id: x.id.slice(4), t: x.textContent})));
    const vid = pres.filter(x => /^(i2v|t2v|start|ingr)-\d/.test(x.id));
    n += vid.length; const tag = `${style}/${outil}`;
    vid.forEach(({id, t}) => {
      if(/\bLED\b|practical lamp|warm lamps?|neon|rim light|studio key light/i.test(t)) bad.lumiere.push(`${tag} ${id}`);
      if(/background extras|extras moving|passers-by/i.test(t)) bad.figurants.push(`${tag} ${id}`);
      if(/micro-?movement|camera shake/i.test(t)) bad.micro.push(`${tag} ${id}`);
      const cam = (t.match(/Camera:\s*([^.\n]*)/) || [])[1];
      if(cam && (cam.match(MOVE) || []).length > 1) bad.multi.push(`${tag} ${id} « ${cam} »`);
      if(/\$\{|undefined|\[object Object\]/.test(t)) bad.brut.push(`${tag} ${id}`);
    });
    { const i2v = vid.find(x => x.id === "i2v-0"); if(!i2v || !/End state/.test(i2v.t)) bad.fin.push(tag); }
  }
  check(`prompts vidéo et image lus (${STYLES.length} styles × ${OUTILS.length} outils)`, n >= STYLES.length * OUTILS.length * 3, `${n} prompts`);
  check("aucune lampe, LED, néon ou lumière de studio injectée (scène extérieure de jour)", !bad.lumiere.length, bad.lumiere.slice(0, 5).join(" | "));
  check("aucun figurant ajouté par défaut", !bad.figurants.length, bad.figurants.slice(0, 5).join(" | "));
  check("aucun micro-mouvement à l'épaule ni tremblement ajouté", !bad.micro.length, bad.micro.slice(0, 5).join(" | "));
  check("un seul mouvement de caméra par plan", !bad.multi.length, bad.multi.slice(0, 3).join(" | "));
  check("état de fin du clip transmis au prompt image → vidéo (Veo, Runway, Wan)", !bad.fin.length, bad.fin.join(" | "));
  check("aucun code brut dans les prompts", !bad.brut.length, bad.brut.slice(0, 5).join(" | "));
  check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  await b.close(); console.log(out.join("\n"));
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.message); });
