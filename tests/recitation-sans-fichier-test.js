// « Garder la voix » : entrer sans fichier (demande de l'utilisateur, 14 octobre : « je dois accéder directement sans soumettre un projet »).
// Trois chemins : sans voix (piste silencieuse + ambiance), une voix qui lit mes textes (temps connus, jamais un verset du Coran),
// enregistrement au micro (faux micro du navigateur). Serveur de test séparé ; aucune IA réelle, voix de l'ordinateur simulée.
const p = require("puppeteer-core"), path = require("path"), fs = require("fs"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const GEN = path.join(OUT, "gen-recit-sans"), wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  fs.rmSync(GEN, {recursive: true, force: true, maxRetries: 20, retryDelay: 250}); require("./coran-cache")(GEN);
  const PORT = 3000 + 700 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env: Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "x", GEN_DIR: GEN}), stdio: ["ignore", "pipe", "pipe"]});
  let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 600000, args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"]});
  try{
    for(let k = 0; k < 80 && !/prêt/.test(log); k++) await wait(100);
    const pg = await b.newPage(); await require("./noauto")(pg);
    const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if(m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(m.text() + " @ " + JSON.stringify(m.location()).slice(0, 160)); });
    await pg.evaluateOnNewDocument(() => {
      window.__localCalls = [];
      const wav = secs => { const sr = 22050, n = Math.round(sr * secs), b = new ArrayBuffer(44 + n * 2), d = new DataView(b), w = (o, s) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0))); w(0, "RIFF"); d.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, sr, true); d.setUint32(28, sr * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, "data"); d.setUint32(40, n * 2, true); for(let i = 0; i < n; i++) d.setInt16(44 + i * 2, Math.round(Math.sin(i / sr * 2 * Math.PI * 220) * 9000), true); return b; };
      window.__localTtsMock = {predict: async ({text, voiceId}) => { window.__localCalls.push({text, voiceId}); return new Blob([wav(1.2)], {type: "audio/x-wav"}); }};
    });
    await pg.setRequestInterception(true);
    pg.on("request", r => { if(r.url().includes("/api/sample") && r.method() === "POST") return r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({delta: "{}"}) + "\n"}); r.continue(); });
    await pg.setViewport({width: 390, height: 844, deviceScaleFactor: 1});
    await pg.goto(BASE + "/#recitation", {waitUntil: "networkidle0"});
    await pg.evaluate(() => { document.getElementById("rc-autoon").checked = false; });
    /* 1. le bouton est là dès l'arrivée, sans fichier ni projet */
    const s0 = await pg.evaluate(() => ({btn: !!document.getElementById("rc-blank-open") && !document.getElementById("rc-blank-open").closest("[hidden]"), s2: !document.getElementById("rc-s2").hidden}));
    await pg.click("#rc-blank-open");
    const modes = await pg.evaluate(() => [...document.querySelectorAll("#rc-blank-mode [data-bm]")].map(x => x.textContent.trim()));
    check("« ✍️ Commencer sans fichier » visible dès l'arrivée (étapes 2 à 6 encore fermées), 3 façons : micro, voix qui lit, sans voix", s0.btn && !s0.s2 && modes.length === 3, modes.join(" | "));
    /* 2. sans voix : piste silencieuse d'une minute, Al-Fatiha affichée à son rythme, tout s'ouvre */
    await pg.click('#rc-blank-mode [data-bm="silence"]'); await pg.select("#rc-blank-dur", "60"); await pg.click("#rc-blank-sil");
    await pg.waitForFunction(() => /Projet sans voix/.test(document.getElementById("rc-info").textContent), {timeout: 60000});
    await pg.waitForFunction(() => !document.getElementById("rc-align").disabled, {timeout: 30000}); await pg.click("#rc-align");
    await pg.waitForFunction(() => window.__spRecit && __spRecit.items.filter(x => x.kind === "verset").length >= 7, {timeout: 60000}).catch(() => null);
    const s1 = await pg.evaluate(() => ({dur: __spRecit.an.duration, blank: !!__spRecit.an.blank, n: __spRecit.items.filter(x => x.kind === "verset").length, a: __spRecit.items.filter(x => x.kind === "verset").map(x => x.a), steps: [2, 3, 4, 5, 6].map(k => !document.getElementById("rc-s" + k).hidden)}));
    check("sans voix : projet d'une minute créé sur le serveur, Al-Fatiha (7 versets) répartie sur la durée, étapes 2 à 6 ouvertes", s1.blank && s1.dur === 60 && s1.n === 7 && s1.a[0] >= .4 && s1.a[6] < 60 && s1.a.every((x, i) => !i || x > s1.a[i - 1]) && s1.steps.every(Boolean), `${s1.dur} s · ${s1.a.map(x => x.toFixed(1)).join(", ")}`);
    /* voix signature : sans voix importée, elle se règle à la main */
    await pg.evaluate(() => { document.getElementById("rc-sig").open = true; }); await pg.click("#rc-sig-an");
    const sg = await pg.evaluate(() => ({opts: !document.getElementById("rc-sig-opts").hidden, d: document.getElementById("rc-sig-desc").textContent}));
    check("voix signature dans un projet sans voix : réglage à la main proposé (homme, femme, enfant)", sg.opts && /à la main/.test(sg.d), sg.d.slice(0, 90));
    /* 3. une voix lit mes textes : chaque passage à son moment exact, sans écoute */
    await pg.click('#rc-blank-mode [data-bm="tts"]');
    await pg.evaluate(() => { document.getElementById("rc-blank-txt").value = "Bonjour les enfants\nLa patience est une lumière\nÀ bientôt"; });
    await pg.click("#rc-blank-tts");
    await pg.waitForFunction(() => window.__spRecit && __spRecit.mode === "texte" && __spRecit.items.filter(x => x.kind !== "titre").length === 3 && __spRecit.items.every(x => x.kind === "titre" || x.sync === "ecoute"), {timeout: 120000}).catch(() => null);
    const s2 = await pg.evaluate(() => ({a: __spRecit.items.filter(x => x.kind !== "titre").map(x => x.a), ar: __spRecit.items.filter(x => x.kind !== "titre").map(x => x.ar), calls: window.__localCalls.length, txt: document.getElementById("rc-txt").value, dur: __spRecit.an.duration}));
    check("une voix lit mes textes : 3 voix fabriquées (relais gratuit), audio assemblé avec des pauses, 3 passages placés à leur moment exact (0,4 s · 2,4 s · 4,4 s)", s2.calls >= 3 && s2.ar.join("|") === "Bonjour les enfants|La patience est une lumière|À bientôt" && s2.a.join() === "0.4,2.4,4.4" && Math.abs(s2.dur - 7) < .3, `${s2.a.join(", ")} · ${s2.dur} s · ${s2.calls} voix`);
    /* le Coran n'est jamais lu par une voix de synthèse */
    const c0 = await pg.evaluate(() => window.__localCalls.length);
    await pg.evaluate(() => { document.getElementById("rc-blank-txt").value = "الحمد لله رب العالمين الرحمن الرحيم"; });
    await pg.click("#rc-blank-tts"); await pg.waitForFunction(() => /Coran/.test(document.getElementById("rc-blank-msg").textContent), {timeout: 30000}).catch(() => null);
    const s3 = await pg.evaluate(() => ({m: document.getElementById("rc-blank-msg").textContent, calls: window.__localCalls.length}));
    check("un verset du Coran est refusé pour la voix de synthèse (aucune voix fabriquée), avec la solution : micro ou vraie récitation", /Coran/.test(s3.m) && /jamais lu par une voix de synthèse/.test(s3.m) && s3.calls === c0, s3.m.slice(0, 120));
    /* 4. micro : enregistrement de 2 s (faux micro du navigateur), le projet s'ouvre comme pour un fichier */
    const id0 = await pg.evaluate(() => __spRecit.id);
    await pg.click('#rc-blank-mode [data-bm="micro"]'); await pg.click("#rc-rec"); await wait(2600);
    const rt = await pg.evaluate(() => document.getElementById("rc-rec-t").textContent); await pg.click("#rc-rec");
    await pg.waitForFunction(id0 => window.__spRecit && __spRecit.id !== id0 && /Voix gardée/.test(document.getElementById("rc-info").textContent), {timeout: 60000}, id0).catch(() => null);
    const s4 = await pg.evaluate(() => ({info: document.getElementById("rc-info").textContent, dur: __spRecit.an && __spRecit.an.duration, s2: !document.getElementById("rc-s2").hidden}));
    check("micro : enregistrement montré pendant qu'il tourne, puis voix envoyée, analysée, projet ouvert (étape 2)", /Enregistrement/.test(rt) && /Voix gardée/.test(s4.info) && s4.dur >= 1.5 && s4.dur <= 5 && s4.s2, `${rt} · ${s4.dur} s`);
    const list = await pg.evaluate(async () => (await (await fetch("/api/recit/list")).json()));
    check("les 3 projets sont dans la liste des projets (sans voix, voix qui lit, micro)", (list.projects || list.projets || list.items || list).length >= 3, JSON.stringify(Object.keys(list)).slice(0, 80));
    const wide = await pg.evaluate(() => document.documentElement.scrollWidth);
    check("téléphone (390 px) : aucun défilement horizontal", wide <= 390, `${wide} px`);
    check("aucune erreur dans la console", !errs.length, errs.slice(0, 3).join(" | "));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  await b.close(); srv.kill(); fs.rmSync(GEN, {recursive: true, force: true, maxRetries: 20, retryDelay: 250}); console.log(out.join("\n")); process.exit(0);
})();
