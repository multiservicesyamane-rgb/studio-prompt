// Adapter pour un autre pays : IA simulée (aucun quota). Exemple « Le puits d'Awa » → États-Unis.
const p = require("puppeteer-core");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
let adaptCalls = 0, lastPrompt = "";
function reply(prompt){
  if(/adaptateur international/.test(prompt)){ adaptCalls++; lastPrompt = prompt;
    const plans = [...prompt.matchAll(/"n":(\d+),"duree"/g)].map(m => Number(m[1]));
    const first = /PROJET : /.test(prompt);
    const ps = plans.map(n => ({n, intention: `Plan ${n} adapté`, voix_off: n % 3 ? `Line ${n} in English.` : "", voix_off_fr: n % 3 ? `Réplique ${n} en français.` : "", repliques: n % 3 ? [] : [{locuteur: "awa", texte: `Grandpa, look!`, ton_en: "excited"}, {locuteur: "moussa", texte: "I see it.", ton_en: "calm"}], decor_en: "a small farm town in Texas", action_en: "", texte_ecran: ""}));
    return first ? {titre: "Ava's Well", logline: "In a Texas drought, Ava digs a well.", personnages: [{id: "awa", nom: "Ava"}, {id: "moussa", nom: "Grandpa Moses"}], lieux: [], plans: ps, youtube: {titres: ["She Dug for 40 Days", "Ava's Well", "The Girl Who Found Water"], description: "A story about perseverance."}, publication: {heure: "18:00 ET", plateformes: ["YouTube"], conseil: "Publie le samedi."}, changements: ["Village sahélien → petite ville du Texas", "Awa → Ava, Moussa → Grandpa Moses"]} : {plans: ps}; }
  return {};
}
(async () => {
  const b = await p.launch({executablePath: require("./env").EDGE, headless: true, protocolTimeout: 300000});
  const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.setRequestInterception(true);
  pg.on("request", r => { if(r.url().includes("/api/sample") && r.method() === "POST"){ let prompt = ""; try{ prompt = JSON.parse(r.postData()).prompt || ""; }catch(e){}
    r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({delta: JSON.stringify(reply(prompt))}) + "\n" + JSON.stringify({model: "simulation"}) + "\n"}); } else r.continue(); });
  await pg.setViewport({width: 1366, height: 900});
  await pg.goto(require("./env").BASE + "/#studio", {waitUntil: "networkidle0"});
  await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); });
  await pg.reload({waitUntil: "networkidle0"});
  await pg.evaluate(() => { const bt = [...document.querySelectorAll("button")].find(x => /exemple/i.test(x.textContent)); if(bt) bt.click(); });
  await pg.waitForSelector("#adapt-go", {timeout: 15000});
  const pays = await pg.$$eval("#adapt-pays option", o => o.map(x => x.value));
  check("liste des pays visés (sans le pays d'origine)", pays.includes("us") && pays.includes("gb") && !pays.includes("monde"), `${pays.length} pays`);
  await pg.evaluate(() => { document.querySelector("#adapt-go").closest("details").open = true; });
  await pg.select("#adapt-pays", "us"); await pg.click("#adapt-go");
  await pg.waitForFunction(() => /Version adaptée pour/.test((document.querySelector("#s-plans .note-box") || {}).textContent || ""), {timeout: 30000}).catch(() => {});
  const r = await pg.evaluate(() => ({title: (document.querySelector("#result h2") || {}).textContent, note: (document.querySelector("#s-plans .note-box") || {}).innerText || "", vo: [...document.querySelectorAll("#s-plans .vo")].slice(0, 3).map(x => x.innerText.replace(/\s+/g, " ")), chips: [...document.querySelectorAll("#s-plans .shot .chips .chip")].slice(0, 3).map(x => x.textContent), scenes: document.querySelectorAll("#s-plans .scene-h").length}));
  check("nouveau projet adapté ouvert, titre adapté", /Ava's Well/.test(r.title || ""), r.title);
  check("résumé de l'adaptation (pays, langue, changements, publication)", /États-Unis/.test(r.note) && /Anglais/i.test(r.note) && /Texas/.test(r.note) && /18:00 ET/.test(r.note), r.note.replace(/\s+/g, " ").slice(0, 200));
  check("répliques en anglais + traduction française", r.vo.some(x => /Line 1 in English/.test(x)) && r.vo.some(x => /Réplique 1 en français/.test(x)), r.vo.join(" | ").slice(0, 200));
  check("prénoms adaptés", r.chips.includes("Ava"), r.chips.join(", "));
  check("scènes conservées", r.scenes === 6, r.scenes + " scènes");
  check("consigne : longueur max par plan et apparence gardée", /max_mots/.test(lastPrompt) && /garde exactement leur apparence/.test(lastPrompt));
  await pg.evaluate(() => { location.hash = "projets"; }); await new Promise(r => setTimeout(r, 400));
  const list = await pg.$$eval("#list-projects .row .t", x => x.map(e => e.textContent));
  check("version adaptée enregistrée dans Projets", list.some(t => /Ava's Well/.test(t)), list.join(" | "));
  check("aucune erreur JavaScript", errs.length === 0, errs.join(" | "));
  console.log("Appels d'adaptation :", adaptCalls);
  await b.close(); console.log(out.join("\n"));
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.message); });
