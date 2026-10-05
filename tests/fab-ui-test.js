// Fabrication dans l'interface : vrai server.js (dossier de test séparé) face à un FAUX Google, dans un vrai navigateur.
// Voix des personnages (choisies selon la fiche), essai, voix d'un plan et de tout le projet, import groupé des images (Gemini)
// et des clips (Flow), pré-montage avec clips et voix, page Connexions. Aucune vraie clé, aucun quota.
const p = require("puppeteer-core"), http = require("http"), fs = require("fs"), path = require("path"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const tts = [];
const fake = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), c = []; req.on("data", x => c.push(x)); req.on("end", () => {
    const send = (code, o) => { res.writeHead(code, {"Content-Type": "application/json"}); res.end(JSON.stringify(o)); };
    if(u.pathname === "/v1beta/models") return send(200, {models: [{name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"]}]});
    if(u.pathname === "/v1beta/interactions"){ const o = JSON.parse(Buffer.concat(c).toString("utf8")), item = o.input[0].content[0];
      tts.push({voice: o.generation_config.speech_config[0].voice, text: item.text, style: item.annotations && item.annotations[0].style});
      return setTimeout(() => send(200, {steps: [{type: "model_output", content: [{type: "audio", data: Buffer.alloc(48000).toString("base64")}]}]}), 60); }
    send(404, {error: {message: "inconnu"}});
  });
});
const plan = (n, extra) => Object.assign({n, debut: `0:${String((n - 1) * 6).padStart(2, "0")}`, fin: `0:${String(n * 6).padStart(2, "0")}`, intention: `Plan ${n}`, voix_off: "", personnages: ["awa"], cadrage_en: "Medium shot", action_en: "Awa looks at the letter", decor_en: "a small living room", camera_en: "static", lumiere_en: "window light", ambiance_en: "tense", son_en: "paper", risk_level: "LOW"}, extra);
const PROJ = {kind: "project", titre: "La lettre", idee: "x", params: {style: "realiste", format: "9:16", duree: "18", langue: "fr", outil: "veo", audio: "voice", vtype: "histoire"},
  result: {titre: "La lettre", logline: "", personnages: [{id: "awa", nom: "Awa", fiche_en: "Awa, a 40-year-old woman with long braids and a green dress", rappel_en: "Awa in her green dress"}, {id: "moussa", nom: "Moussa", fiche_en: "Moussa, a 45-year-old man with a short beard", rappel_en: "Moussa with a short beard"}],
    plans: [plan(1, {repliques: [{locuteur: "awa", texte: "Qui a laissé ça ici ?", ton_en: "worried"}, {locuteur: "moussa", texte: "Ce n'est pas moi.", ton_en: "calm"}], voix_off: "Qui a laissé ça ici ? Ce n'est pas moi.", personnages: ["awa", "moussa"]}),
      plan(2, {voix_off: "Ce soir-là, personne ne dormit.", voix_ton_en: "slow"}), plan(3, {})],
    audio: {voix: "", mixage: ""}, montage: [], youtube: {titres: []}}, createdAt: Date.now(), updatedAt: Date.now()};
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const PORT = 3000 + 900 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`, GEN_DIR = path.join(OUT, "fab-gen");
(async () => {
  fs.rmSync(GEN_DIR, {recursive: true, force: true});
  await new Promise(r => fake.listen(0, "127.0.0.1", r));
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "cle-test", GEMINI_BASE_URL: `http://127.0.0.1:${fake.address().port}/v1beta`, PROVIDER: "gemini", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", APP_PASSWORD: "", GEN_DIR, GEN_POLL_MS: "50"});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]}); let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  for(let k = 0; k < 50 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
  const files = {img1: path.join(OUT, "P01-depart.png"), img2: path.join(OUT, "P03-depart.png"), clip1: path.join(OUT, "P01-flow.webm"), clip2: path.join(OUT, "P02-flow.webm")};
  fs.writeFileSync(files.img1, PNG); fs.writeFileSync(files.img2, PNG); fs.writeFileSync(files.clip1, Buffer.alloc(3000, 1)); fs.writeFileSync(files.clip2, Buffer.alloc(3000, 2));
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  try{
    await pg.setViewport({width: 1366, height: 900});
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(pr => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); localStorage.setItem("sp-local-db", JSON.stringify({"data/users/local": {fab1: pr}})); }, PROJ);
    await pg.reload({waitUntil: "networkidle0"}); await new Promise(r => setTimeout(r, 600));
    await pg.evaluate(() => { location.hash = "projets"; }); await new Promise(r => setTimeout(r, 400));
    await pg.click('#list-projects [data-open="fab1"]'); await pg.waitForSelector("#result .ptabs", {timeout: 15000});
    // 1. distribution des voix
    await pg.click('[data-ptab="paroles"]'); await pg.waitForSelector(".gen-cast", {timeout: 10000});
    const cast = await pg.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-cast]")].map(s => [s.dataset.cast, s.value])));
    check("voix des personnages : voix off + une voix par personnage, choisie selon la fiche (femme / homme)", cast._narr === "gemini|Charon" && cast.awa === "gemini|Kore" && cast.moussa === "gemini|Puck", JSON.stringify(cast));
    await pg.click('[data-cast-try="awa"]'); await pg.waitForSelector("#cast-try-awa audio", {timeout: 15000});
    check("essai de la voix d'un personnage : une de ses vraies phrases, jouable", tts.some(t => t.voice === "Kore" && t.text === "Qui a laissé ça ici ?"));
    // 2. voix d'un plan (dialogue à deux voix, avec le ton)
    await pg.click('[data-genv="0"]'); await pg.waitForFunction(() => document.querySelectorAll("#genv-0 audio").length === 2, {timeout: 20000});
    const g0 = await pg.evaluate(() => ({audios: document.querySelectorAll("#genv-0 audio").length, chips: [...document.querySelectorAll("#genv-0 .chip")].map(c => c.textContent)}));
    check("voix du plan 1 : Awa et Moussa, chacun avec sa voix et son ton", g0.audios === 2 && tts.some(t => t.voice === "Kore" && t.style === "worried") && tts.some(t => t.voice === "Puck" && t.text === "Ce n'est pas moi." && t.style === "calm"), JSON.stringify(g0));
    // 3. changer une voix, puis tout fabriquer
    await pg.select('[data-cast="_narr"]', "gemini|Aoede");
    await pg.click("#genv-all"); await pg.waitForFunction(() => /3 voix prêtes/.test((document.getElementById("genv-msg") || {}).textContent || ""), {timeout: 30000});
    const saved = await pg.evaluate(() => { const d = JSON.parse(localStorage.getItem("sp-local-db"))["data/users/local"].fab1.result; return {cast: d.voix_casting, v2: (d.generated_voices || {})[2], v3: (d.generated_voices || {})[3]}; });
    check("toutes les voix : voix off avec la nouvelle voix choisie, plan muet ignoré, projet enregistré", tts.some(t => t.voice === "Aoede" && t.text === "Ce soir-là, personne ne dormit." && t.style === "slow") && saved.cast._narr.voice === "Aoede" && saved.v2 && saved.v2[0].status === "done" && !saved.v3, JSON.stringify({narr: saved.cast._narr, v2: saved.v2 && saved.v2[0].status}));
    // 4. import groupé des images faites dans Gemini
    await pg.click('[data-ptab="board"]'); await pg.waitForSelector("#board-import", {timeout: 10000});
    await (await pg.$("#board-import")).uploadFile(files.img1, files.img2);
    await pg.waitForFunction(() => document.querySelectorAll("#board-generated img").length === 2, {timeout: 20000});
    const imgs = await pg.evaluate(() => JSON.parse(localStorage.getItem("sp-local-db"))["data/users/local"].fab1.result.generated_images || {});
    check("images de Gemini importées d'un coup et rangées par numéro (P01, P03)", imgs["1"] && imgs["3"] && !imgs["2"] && /\/generated\/fab1\/P01-depart-/.test(imgs["1"].url), JSON.stringify(Object.keys(imgs)));
    // 5. import groupé des clips faits dans Flow
    await pg.click('[data-ptab="plans"]'); await pg.waitForSelector("#clips-import", {timeout: 10000});
    await (await pg.$("#clips-import")).uploadFile(files.clip2, files.clip1);
    await pg.waitForFunction(() => document.querySelectorAll(".gen-clip video").length === 2, {timeout: 20000});
    const vids = await pg.evaluate(() => JSON.parse(localStorage.getItem("sp-local-db"))["data/users/local"].fab1.result.generated_videos || {});
    const served = await pg.evaluate(async u => (await fetch(u)).status, vids["1"] && vids["1"].url);
    check("clips de Flow importés d'un coup, chacun dans son plan, relisibles", vids["1"] && vids["2"] && /P01-flow/.test(vids["1"].name) && /P02-flow/.test(vids["2"].name) && served === 200, JSON.stringify(Object.keys(vids)));
    const vc = await pg.evaluate(() => !!document.querySelector('[data-vc-use="0"]'));
    check("bouton « Contrôler ce clip (Video Critic) » sur un plan qui a son clip", vc);
    // 6. pré-montage avec les clips et les voix du projet
    await pg.click('[data-ptab="montage"]'); await pg.waitForSelector("#pm-use-project", {timeout: 10000}); await pg.click("#pm-use-project");
    const pm = await pg.evaluate(() => ({rows: [...document.querySelectorAll("#pm-map select")].map(s => s.selectedOptions[0] && s.selectedOptions[0].textContent), voices: !!document.getElementById("pm-voices") && document.getElementById("pm-voices").checked}));
    check("pré-montage : clips du projet placés dans les bons plans, voix fabriquées ajoutées", pm.rows.length === 3 && /P01/.test(pm.rows[0]) && /P02/.test(pm.rows[1]) && pm.voices, JSON.stringify(pm));
    // 7. page Connexions
    await pg.evaluate(() => { location.hash = "connexions"; }); await pg.waitForFunction(() => /Voix Gemini/.test((document.getElementById("cx-body") || {}).innerText || ""), {timeout: 15000});
    const cx = await pg.evaluate(() => document.getElementById("cx-body").innerText.replace(/\s+/g, " "));
    check("Connexions : voix gratuites prêtes, Veo et images payants non activés, budget, guides", /Voix Gemini.*Prêt · gratuit/.test(cx) && /Veo 3\.1.*Payant · non activé/.test(cx) && /0,00 \$ dépensés aujourd’hui sur un maximum de 5,00 \$/.test(cx) && /Ajouter une clé ElevenLabs/.test(cx) && /Dernières fabrications/.test(cx), cx.slice(0, 260));
    await pg.setViewport({width: 390, height: 844}); await new Promise(r => setTimeout(r, 300));
    const over = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check("page Connexions sur téléphone : pas de défilement horizontal", over <= 1, `${over}px`);
    check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  }finally{ await b.close(); srv.kill(); fake.close(); }
  console.log(out.join("\n")); process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
