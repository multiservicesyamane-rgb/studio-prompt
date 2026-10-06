// Voix gratuite sur l'ordinateur (relais quand Google refuse) : vrai server.js face à un FAUX Google dont le quota du jour des voix est épuisé.
// La voix de l'ordinateur est simulée (window.__localTtsMock) : aucun téléchargement de 60 Mo pendant les tests.
// Revue de presse : relais automatique, choix direct, essai, fusion, crédit de licence. Onglet Paroles : bouton « Refaire gratuitement »,
// une seule voix par personnage, crédit dans la description YouTube. Page Connexions.
const p = require("puppeteer-core"), http = require("http"), fs = require("fs"), path = require("path"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const tts = [];
const fake = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), c = []; req.on("data", x => c.push(x)); req.on("end", () => {
    const send = (code, o) => { res.writeHead(code, {"Content-Type": "application/json"}); res.end(JSON.stringify(o)); };
    if(u.pathname === "/v1beta/models") return send(200, {models: [{name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"]}]});
    if(u.pathname === "/v1beta/interactions"){ tts.push(1);
      return send(429, {error: {code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for metric: generativelanguage.googleapis.com/generate_requests_per_model_per_day, limit: 15", details: [{violations: [{quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]}}); }
    send(404, {error: {message: "inconnu " + u.pathname}});
  });
});
const REVUE = {nom_emission: "Le Point du Jour", titre: "Trois nouvelles du jour", accroche: "Bonjour, voici Le Point du Jour.", sommaire: "Au sommaire : la pluie, l'école et un chiffre.",
  segments: [{titre: "La pluie", texte: "Selon le journal A, de fortes pluies sont tombées cette nuit.", sources: ["Journal A"]}, {titre: "L'école", texte: "Le journal B rapporte que la rentrée est repoussée d'une semaine.", sources: ["Journal B"]}],
  chiffre_du_jour: {texte: "Quatre-vingts millimètres.", source: "Journal A"}, a_retenir: "Prudence sur les routes.", conclusion: "C'était Le Point du Jour.", appel: "Abonne-toi.", publication: {titres: ["Le point du jour"], description: "La revue du jour.", hashtags: ["#info"]}, a_verifier: []};
const plan = (n, extra) => Object.assign({n, debut: `0:${String((n - 1) * 6).padStart(2, "0")}`, fin: `0:${String(n * 6).padStart(2, "0")}`, intention: `Plan ${n}`, voix_off: "", personnages: ["awa"], cadrage_en: "Medium shot", action_en: "Awa looks at the letter", decor_en: "a small living room", camera_en: "static", lumiere_en: "window light", ambiance_en: "tense", son_en: "paper", risk_level: "LOW"}, extra);
const PROJ = {kind: "project", titre: "La lettre", idee: "x", params: {style: "realiste", format: "9:16", duree: "18", langue: "fr", outil: "veo", audio: "voice", vtype: "histoire"},
  result: {titre: "La lettre", logline: "", personnages: [{id: "awa", nom: "Awa", fiche_en: "Awa, a 40-year-old woman with long braids and a green dress", rappel_en: "Awa in her green dress"}, {id: "moussa", nom: "Moussa", fiche_en: "Moussa, a 45-year-old man with a short beard", rappel_en: "Moussa with a short beard"}],
    plans: [plan(1, {repliques: [{locuteur: "awa", texte: "Qui a laissé ça ici ?", ton_en: "worried"}, {locuteur: "moussa", texte: "Ce n'est pas moi.", ton_en: "calm"}], voix_off: "Qui a laissé ça ici ? Ce n'est pas moi.", personnages: ["awa", "moussa"]}),
      plan(2, {voix_off: "Ce soir-là, personne ne dormit.", voix_ton_en: "slow"}), plan(3, {})],
    audio: {voix: "", mixage: ""}, montage: [], youtube: {titres: ["La lettre"], description: "Une histoire courte."}}, createdAt: Date.now(), updatedAt: Date.now()};
const PORT = 3000 + 600 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`, GEN_DIR = path.join(OUT, "voix-gratuite-gen");
(async () => {
  fs.rmSync(GEN_DIR, {recursive: true, force: true});
  await new Promise(r => fake.listen(0, "127.0.0.1", r));
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "cle-test", GEMINI_BASE_URL: `http://127.0.0.1:${fake.address().port}/v1beta`, PROVIDER: "gemini", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", APP_PASSWORD: "", GEN_DIR, GEN_POLL_MS: "50", GEN_RETRY_MS: "50"});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]}); let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  for(let k = 0; k < 50 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  /* fausse voix de l'ordinateur : un vrai WAV 22 050 Hz (son puis silence), et le relevé des demandes */
  await pg.evaluateOnNewDocument(() => {
    window.__localCalls = [];
    const wav = secs => { const sr = 22050, n = Math.round(sr * secs), b = new ArrayBuffer(44 + n * 2), d = new DataView(b), w = (o, s) => [...s].forEach((ch, i) => d.setUint8(o + i, ch.charCodeAt(0)));
      w(0, "RIFF"); d.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, sr, true); d.setUint32(28, sr * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, "data"); d.setUint32(40, n * 2, true);
      for(let i = 0; i < n; i++) d.setInt16(44 + i * 2, i < n * 0.7 ? Math.round(8000 * Math.sin(i / 8)) : 0, true); return b; };
    window.__localTtsMock = {predict: async ({text, voiceId}, cb) => { window.__localCalls.push({text, voiceId}); if(cb){ cb({url: "x", loaded: 30, total: 100}); cb({url: "x", loaded: 100, total: 100}); } await new Promise(r => setTimeout(r, 30)); return new Blob([wav(1.2)], {type: "audio/x-wav"}); }};
  });
  try{
    await pg.setViewport({width: 1366, height: 900});
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(pr => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); localStorage.setItem("sp-local-db", JSON.stringify({"data/users/local": {vg1: pr}})); }, PROJ);
    await pg.reload({waitUntil: "networkidle0"});
    await pg.setRequestInterception(true);
    pg.on("request", r => { if(r.url().includes("/api/sample") && r.method() === "POST") return r.respond({status: 200, contentType: "application/x-ndjson", body: JSON.stringify({delta: JSON.stringify(REVUE)}) + "\n" + JSON.stringify({model: "simulation"}) + "\n"}); r.continue(); });

    // 1. Revue de presse : les voix gratuites sont proposées à côté des voix Gemini
    await pg.click('.side-link[data-go="presse"]'); await pg.waitForFunction(() => !document.getElementById("view-presse").hidden && document.getElementById("pr-voix").options.length > 5, {timeout: 15000});
    const opts = await pg.evaluate(() => ({groups: [...document.querySelectorAll("#pr-voix optgroup")].map(g => g.label), local: [...document.querySelectorAll("#pr-voix option")].filter(o => /^local:/.test(o.value)).map(o => o.value), value: document.getElementById("pr-voix").value}));
    check("revue : voix gratuites de l'ordinateur proposées (sans la voix « Tom » sous licence AGPL), Gemini par défaut", opts.groups.length === 2 && /sans quota/.test(opts.groups[1]) && opts.local.length === 4 && !opts.local.some(v => /tom/.test(v)) && opts.value === "Charon", JSON.stringify(opts));
    await pg.select("#pr-mode", "textes"); await pg.type("#pr-text", "Communiqué : de fortes pluies cette nuit, la rentrée est repoussée.");
    await pg.click("#pr-go"); await pg.waitForSelector("#pr-res .pr-seg", {timeout: 20000}); await pg.waitForFunction(() => !document.getElementById("pr-go").disabled, {timeout: 20000}); await new Promise(r => setTimeout(r, 800));
    const nParts = await pg.evaluate(() => document.querySelectorAll("#pr-res .pr-seg").length);   /* ouverture, sommaire, 2 sujets, chiffre, fin */

    // 2. Google refuse (quota du jour) : la voix gratuite prend le relais toute seule
    await pg.click("#pr-voice");
    await pg.waitForFunction(n => { const s = JSON.parse(localStorage.getItem("sp-presse") || "{}"); return (s.voices || []).length === n && s.voices.every(v => v.status === "done" && v.local) && document.querySelectorAll("#pr-voices audio").length === n; }, {timeout: 40000}, nParts).catch(() => {});
    const auto = await pg.evaluate(() => { const s = JSON.parse(localStorage.getItem("sp-presse") || "{}"); return {n: (s.voices || []).length, done: (s.voices || []).filter(v => v.status === "done" && v.local && /\/generated\/presse-.+-gratuite-.+\.wav$/.test(v.url)).length, audios: document.querySelectorAll("#pr-voices audio").length, calls: window.__localCalls.map(c => c.voiceId), credit: s.voiceCredit, txt: document.getElementById("pr-res").innerText}; });
    check("quota de Google épuisé : la voix gratuite de l'ordinateur prend le relais toute seule, chaque partie enregistrée sur le serveur", tts.length >= 1 && auto.n === nParts && auto.done === auto.n && auto.audios === auto.n, `${tts.length} demande(s) Google · ${auto.done}/${auto.n} parties · ${auto.audios} lecteurs`);
    check("relais : même genre que la voix choisie (Charon, homme → Gilles), crédit inutile pour cette voix", auto.calls.length === auto.n && auto.calls.every(v => v === "fr_FR-gilles-low") && !auto.credit && /Voix gratuite « Gilles »/.test(auto.txt), `${auto.calls.slice(0, 2).join(",")} · crédit « ${auto.credit} »`);
    const served = await pg.evaluate(async () => { const s = JSON.parse(localStorage.getItem("sp-presse")); const r = await fetch(s.voices[0].url); return {code: r.status, type: r.headers.get("content-type"), secs: s.voices[0].seconds}; });
    check("voix gratuite relisible depuis le projet (WAV), durée lue dans le fichier", served.code === 200 && /audio\/wav|audio\/x-wav/.test(served.type) && served.secs === 1.2, JSON.stringify(served));

    // 3. la fusion finale marche avec ces voix
    await pg.waitForFunction(() => !document.getElementById("pr-mix").disabled, {timeout: 10000});
    await pg.click("#pr-mix"); await pg.waitForSelector("#pr-mix-out audio", {timeout: 60000}).catch(() => {});
    const mix = await pg.evaluate(() => ({audio: !!document.querySelector("#pr-mix-out audio"), msg: (document.getElementById("pr-mix-msg") || {}).textContent || ""}));
    check("fusion finale (jingle, transitions, musique) faite avec les voix gratuites", mix.audio, mix.msg.slice(0, 120));

    // 4. choisir directement une voix gratuite : aucune demande à Google, crédit de licence affiché et ajouté à la publication
    const before = tts.length;
    await pg.select("#pr-voix", "local:fr_FR-siwis-medium");
    await pg.click("#pr-try"); await pg.waitForSelector("#pr-try-out audio", {timeout: 15000}).catch(() => {});
    check("essai d'une voix gratuite dans la revue : lecteur audio, sans Google", await pg.evaluate(() => !!document.querySelector("#pr-try-out audio")) && tts.length === before);
    await pg.click("#pr-voice");
    await pg.waitForFunction(() => { const s = JSON.parse(localStorage.getItem("sp-presse") || "{}"); return s.voiceName === "Siwis" && (s.voices || []).length >= 6 && s.voices.every(v => v.status === "done"); }, {timeout: 30000}).catch(() => {});
    const pick = await pg.evaluate(() => { const t = document.getElementById("pr-res").innerText; return {siwis: window.__localCalls.filter(c => c.voiceId === "fr_FR-siwis-medium").length, desc: /À mettre dans la description de la vidéo : Voix de synthèse « Siwis »/.test(t), pub: /La revue du jour\.\s*Voix de synthèse « Siwis ».*CC BY 4\.0/s.test(t), line: /Voix gratuite « Siwis », fabriquée sur ton ordinateur/.test(t)}; });
    check("voix gratuite choisie : aucune demande à Google, toutes les parties faites sur l'ordinateur", tts.length === before && pick.siwis === nParts + 1 && pick.line, `${tts.length - before} demande(s) Google · ${pick.siwis - 1} parties Siwis + l'essai`);
    check("licence respectée : crédit de la voix affiché et ajouté sous la description de publication", pick.desc && pick.pub, JSON.stringify(pick));
    await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "presse"; }); await pg.waitForSelector("#pr-res .pr-seg", {timeout: 15000});
    check("après rechargement : voix gratuites et crédit retrouvés", await pg.evaluate(() => document.querySelectorAll("#pr-voices audio").length >= 6 && /Voix de synthèse « Siwis »/.test(document.getElementById("pr-res").innerText)));
    await pg.setViewport({width: 390, height: 844}); await new Promise(r => setTimeout(r, 300));
    check("revue sur téléphone : pas de défilement horizontal", await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    await pg.setViewport({width: 1366, height: 900});

    // 5. Onglet Paroles : les voix Gemini sont refusées → bouton « Refaire gratuitement »
    await pg.evaluate(() => { location.hash = "projets"; }); await new Promise(r => setTimeout(r, 400));
    await pg.click('#list-projects [data-open="vg1"]'); await pg.waitForSelector("#result .ptabs", {timeout: 15000});
    await pg.click('[data-ptab="paroles"]'); await pg.waitForSelector(".gen-cast", {timeout: 10000});
    const castOpts = await pg.evaluate(() => [...document.querySelectorAll('[data-cast="awa"] option')].filter(o => /^local\|/.test(o.value)).length);
    check("Paroles : 4 voix gratuites de l'ordinateur proposées pour chaque personnage", castOpts === 4, String(castOpts));
    await pg.click("#genv-all"); await pg.waitForSelector("[data-genv-free]", {timeout: 30000}).catch(() => {});
    const ko = await pg.evaluate(() => ({btn: !!document.querySelector("[data-genv-free]"), msg: document.getElementById("genv-msg").textContent}));
    check("Paroles : quota de Google épuisé → bouton « Refaire ces voix gratuitement sur l'ordinateur »", ko.btn && /3 échecs/.test(ko.msg), ko.msg.slice(0, 140));
    const g0 = tts.length; await pg.click("[data-genv-free]");
    await pg.waitForFunction(() => /Voix refaites gratuitement/.test(document.body.innerText) || document.querySelectorAll("#s-paroles audio, [id^=genv-] audio").length >= 3, {timeout: 30000}).catch(() => {});
    await new Promise(r => setTimeout(r, 500));
    const par = await pg.evaluate(() => { const d = JSON.parse(localStorage.getItem("sp-local-db"))["data/users/local"].vg1.result, all = Object.values(d.generated_voices || {}).flat();
      return {cast: d.voix_casting, all: all.map(x => `${x.who}:${x.status}:${x.service || ""}`), u: all.map(x => x.url).join(" "), urls: all.every(x => /\/generated\/vg1\/P0\d-voix-\d-gratuite-/.test(x.url || "")), audios: document.querySelectorAll("[id^=genv-] audio").length, msg: document.getElementById("genv-msg").textContent, calls: window.__localCalls.slice(-3).map(c => c.voiceId + "|" + c.text)}; });
    check("Paroles : chaque personnage passe sur une voix gratuite du même genre (Awa → Siwis, Moussa et voix off → Gilles)", par.cast.awa.service === "local" && par.cast.awa.voice === "fr_FR-siwis-medium" && par.cast.moussa.voice === "fr_FR-gilles-low" && par.cast._narr.voice === "fr_FR-gilles-low", JSON.stringify(par.cast));
    check("Paroles : les 3 répliques refaites et enregistrées dans le projet, sans nouvelle demande à Google", par.all.length === 3 && par.all.every(x => /:done:local$/.test(x)) && par.urls && par.audios === 3 && /3 voix prêtes/.test(par.msg) && !/échec/.test(par.msg) && tts.length === g0, `${par.all.join(" ")} · ${par.audios} lecteurs · ${par.msg} · ${tts.length - g0} demande(s) Google · ${par.urls ? "" : par.u}`);
    check("Paroles : bonne phrase pour la bonne voix", par.calls.includes("fr_FR-siwis-medium|Qui a laissé ça ici ?") && par.calls.includes("fr_FR-gilles-low|Ce n'est pas moi.") && par.calls.includes("fr_FR-gilles-low|Ce soir-là, personne ne dormit."), par.calls.join(" / "));
    await pg.click('[data-cast-try="awa"]'); await pg.waitForSelector("#cast-try-awa audio", {timeout: 15000}).catch(() => {});
    check("Paroles : essai d'une voix gratuite", await pg.evaluate(() => !!document.querySelector("#cast-try-awa audio")));
    await pg.click('[data-ptab="yt"]'); await new Promise(r => setTimeout(r, 300));
    const yt = await pg.evaluate(() => (document.getElementById("s-yt") || {}).innerText || "");
    check("YouTube : le crédit de la voix Siwis est ajouté à la description à copier (Gilles n'en demande pas)", /Une histoire courte\.\s+Voix de synthèse « Siwis »/.test(yt) && !/Gilles/.test(yt), (yt.split("Une histoire courte.")[1] || "").trim().split("\n")[0].slice(0, 160));

    // 6. page Connexions
    await pg.evaluate(() => { location.hash = "connexions"; }); await pg.waitForFunction(() => /Voix gratuite sur l’ordinateur/.test((document.getElementById("cx-body") || {}).innerText || ""), {timeout: 15000}).catch(() => {});
    const cx = await pg.evaluate(() => (document.getElementById("cx-body") || {}).innerText.replace(/\s+/g, " "));
    check("Connexions : la voix gratuite de l'ordinateur est listée comme relais sans limite", /Voix gratuite sur l’ordinateur \(Piper\).*Gratuit · sans limite/.test(cx) && /Relais automatique/.test(cx), cx.slice(0, 160));
    check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  }finally{ await b.close(); srv.kill(); fake.close(); }
  console.log(out.join("\n")); process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
