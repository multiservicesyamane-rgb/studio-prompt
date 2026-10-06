// Clips par Manus (MiniMax H3) : vrai server.js face à un FAUX Manus. Prompts au format officiel H3 et Seedance 2.5 dans chaque plan,
// envoi des plans avec leurs images de départ (pièces jointes), clips rapatriés tout seuls dans leur plan, crédits épuisés → méthode gratuite.
const p = require("puppeteer-core"), http = require("http"), fs = require("fs"), path = require("path"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const bodies = []; let seq = 0, noCredit = false; const polls = {};
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypmp42"), Buffer.alloc(4000, 3)]);
const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(3000, 9)]);
const fake = http.createServer((req, res) => { const c = []; req.on("data", x => c.push(x)); req.on("end", () => {
  const send = (code, o) => { res.writeHead(code, {"Content-Type": "application/json"}); res.end(JSON.stringify(o)); };
  if(req.url === "/v2/task.create"){ const o = JSON.parse(Buffer.concat(c).toString("utf8")); if(noCredit) return send(402, {ok: false, error: {message: "insufficient credits"}});
    bodies.push(o); const id = "c" + (++seq); return send(200, {ok: true, task_id: id, task_url: `https://manus.im/app/${id}`}); }
  const u = new URL(req.url, "http://x"), F0 = `http://127.0.0.1:${fake.address().port}`, id = u.searchParams.get("task_id");
  if(u.pathname === "/v2/task.detail"){ polls[id] = (polls[id] || 0) + 1; return send(200, {ok: true, task: {id, status: polls[id] < 3 ? "running" : "stopped", credit_usage: 300}}); }
  if(u.pathname === "/v2/task.listMessages"){ const files = polls[id] < 3 ? ["P01.mp4"] : ["P01.mp4", "P03.mp4", "clip-final.mp4"];
    return send(200, {ok: true, messages: [{id: "m1", type: "assistant_message", assistant_message: {content: "Voici les clips.", attachments: files.map(n => ({type: "file", filename: n, url: `${F0}/files/${n}`, content_type: "video/mp4", file_uid: "v-" + n}))}}]}); }
  if(u.pathname.startsWith("/files/")){ res.writeHead(200, {"Content-Type": "video/mp4"}); return res.end(MP4); }
  send(404, {ok: false});
}); });
const plan = (n, extra) => Object.assign({n, debut: `0:${String((n - 1) * 6).padStart(2, "0")}`, fin: `0:${String(n * 6).padStart(2, "0")}`, intention: `Plan ${n}`, voix_off: "", personnages: ["awa"], cadrage_en: "Medium shot", action_en: "Awa looks at the folded letter on the table", decor_en: "a small living room with blue walls", camera_en: "static", lumiere_en: "soft window light", ambiance_en: "tense", son_en: "paper rustling", fin_en: "Awa holds the letter against her chest", risk_level: "LOW"}, extra);
const PROJ = {kind: "project", titre: "La lettre", idee: "x", params: {style: "realiste", format: "9:16", duree: "18", langue: "fr", outil: "veo", audio: "voice", vtype: "histoire"},
  result: {titre: "La lettre", logline: "", personnages: [{id: "awa", nom: "Awa", fiche_en: "Awa, a 40-year-old woman with long braids and a green dress", rappel_en: "Awa in her green dress"}, {id: "moussa", nom: "Moussa", fiche_en: "Moussa, a 45-year-old man with a short beard", rappel_en: "Moussa with a short beard"}],
    plans: [plan(1, {repliques: [{locuteur: "awa", texte: "Qui a laissé ça ici ?", ton_en: "worried"}, {locuteur: "moussa", texte: "Ce n'est pas moi.", ton_en: "calm"}], voix_off: "Qui a laissé ça ici ? Ce n'est pas moi.", personnages: ["awa", "moussa"]}),
      plan(2, {voix_off: "Ce soir-là, personne ne dormit.", voix_ton_en: "slow", camera_en: "slow push-in toward her face"}), plan(3, {camera_en: "pans right revealing the door"})],
    generated_images: {"1": {url: "/generated/clips1/P01-depart.png", model: "test"}, "2": {url: "/generated/clips1/P02-depart.png", model: "test"}},
    audio: {voix: "", mixage: ""}, montage: [], youtube: {titres: []}}, createdAt: Date.now(), updatedAt: Date.now()};
const PORT = 3000 + 400 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`, GEN_DIR = path.join(OUT, "clips-gen");
(async () => {
  fs.rmSync(GEN_DIR, {recursive: true, force: true}); fs.mkdirSync(path.join(GEN_DIR, "clips1"), {recursive: true});
  fs.writeFileSync(path.join(GEN_DIR, "clips1", "P01-depart.png"), PNG); fs.writeFileSync(path.join(GEN_DIR, "clips1", "P02-depart.png"), PNG);
  await new Promise(r => fake.listen(0, "127.0.0.1", r));
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "cle-test", GEMINI_BASE_URL: `http://127.0.0.1:${fake.address().port}/v1beta`, MANUS_API_KEY: "cle-manus", MANUS_BASE_URL: `http://127.0.0.1:${fake.address().port}`, NEWS_ALLOW_LOCAL: "1", PROVIDER: "gemini", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", APP_PASSWORD: "", GEN_DIR});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]}); let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  for(let k = 0; k < 50 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
  const b = await p.launch({executablePath: EDGE, headless: true}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message)); await pg.evaluateOnNewDocument(() => { window.__manusPoll = 400; });
  try{
    await pg.setViewport({width: 1366, height: 900});
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(pr => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); localStorage.setItem("sp-local-db", JSON.stringify({"data/users/local": {clips1: pr}})); }, PROJ);
    await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "projets"; }); await new Promise(r => setTimeout(r, 400));
    await pg.click('#list-projects [data-open="clips1"]'); await pg.waitForSelector('[data-ptab="plans"]'); await pg.click('[data-ptab="plans"]');
    // 1. prompts des deux autres outils dans chaque plan
    const pr = await pg.evaluate(() => ({h3: [0, 1, 2].map(i => (document.getElementById(`pre-h3-${i}`) || {}).textContent || ""), sd: [0, 1, 2].map(i => (document.getElementById(`pre-sd-${i}`) || {}).textContent || ""), card: (document.getElementById("clips-manus-go") || {}).textContent || "", hint: [...document.querySelectorAll(".gen-import .hint")].map(e => e.textContent).join(" ")}));
    check("MiniMax H3 : format officiel (image de départ <Picture 1>, trois champs, [Shot 1])", /^For the target video, at 0\.00 seconds into the target video, <Picture 1> \(from \[Shot 1\]\) is fully referenced\.\n\nintegrated_multimodal_description: \[Shot 1\] Live-action, cinematic, the scene shown in <Picture 1> continues/.test(pr.h3[0]) && /\n\noverall_soundscape: Paper rustling\.\n\nnon_diegetic_music: N\/A$/.test(pr.h3[0]), pr.h3[0].slice(0, 160).replace(/\n/g, " | "));
    check("MiniMax H3 : paroles balisées (S1, S2 stables) avec la langue, mots exacts", /Awa, the woman in <Picture 1>, \(S1\) says, worried: <d>\[French\] Qui a laissé ça ici \?<\/d>/.test(pr.h3[0]) && /By the end of the shot, Awa holds the letter against her chest\./.test(pr.h3[0]) && /Moussa \(S2\) replies, calm: <d>\[French\] Ce n'est pas moi\.<\/d>/.test(pr.h3[0]) && /A warm narrator \(S3\) says in an off-screen voiceover, slow: <d>\[French\] Ce soir-là, personne ne dormit\.<\/d> while every on-screen character's lips remain completely closed\./.test(pr.h3[1]), (pr.h3[0].match(/Awa, the woman.{0,80}<\/d>/) || [""])[0]);
    check("MiniMax H3 : caméra au vocabulaire officiel (fixe, poussée lente, panoramique), sans image : texte → vidéo", /The camera holds a static shot\./.test(pr.h3[0]) && /The camera pushes in at slow speed \(slow push-in toward her face\)\./.test(pr.h3[1]) && /The camera pans right \(pans right revealing the door\)\./.test(pr.h3[2]) && /^integrated_multimodal_description: \[Shot 1\] Live-action, cinematic, medium shot frames awa/i.test(pr.h3[2]) && !/<Picture 1>/.test(pr.h3[2]), pr.h3[2].slice(0, 140));
    check("Seedance 2.5 : sections officielles, @Image1, paroles entre guillemets, contraintes", /^FORMAT\n6 seconds, 9:16, single continuous take, real-time speed\n\nREFERENCE ROLES\n@Image1 is the first frame/.test(pr.sd[0]) && /Awa says in French, worried: "Qui a laissé ça ici \?"/.test(pr.sd[0]) && /Medium shot featuring Awa, a 40-year-old woman/.test(pr.sd[0]) && /Awa and Moussa keep exactly/.test(pr.sd[0]) && /Awa keeps exactly/.test(pr.sd[1]) && /\n\nCONSTRAINTS\nNo subtitles/.test(pr.sd[0]) && !/@Image1/.test(pr.sd[2]), pr.sd[0].slice(0, 120).replace(/\n/g, " | "));
    check("carte « Clips par Manus » avec le plan sans image signalé et la méthode gratuite", /Créer les clips avec Manus \(MiniMax H3\)/.test(pr.card) && /1 plan sans image de départ/.test(pr.hint) && /méthode gratuite/i.test(pr.hint), pr.hint.slice(0, 120));
    // 2. envoi : prompts H3 + images de départ jointes
    await pg.click("#clips-manus-go"); await pg.waitForFunction(() => /créée|Erreur/.test((document.getElementById("clips-manus") || {}).textContent || ""), {timeout: 30000});
    const sent0 = bodies[0] || {}, content = (sent0.message || {}).content, parts = Array.isArray(content) ? content : [], text = (parts.find(x => x.type === "text") || {}).text || "", files = parts.filter(x => x.type === "file");
    check("Manus reçoit les plans en texte (MiniMax H3, P01 à P03, règles) et les images de départ en pièces jointes", /MiniMax H3 \(Hailuo 3\.0\)/.test(text) && /P01 · 6 s · image de départ jointe : P01-depart/.test(text) && /P03 · 6 s · sans image de départ/.test(text) && /P01\.mp4/.test(text) && files.length === 2 && files.every(f => /^data:image\/png;base64,/.test(f.file_data) && f.mime_type === "image/png") && files.map(f => f.filename).join() === "P01-depart.png,P02-depart.png", `${files.length} pièce(s) · ${files.map(f => f.filename).join(", ")}`);
    // 3. les clips reviennent tout seuls dans leur plan
    await pg.waitForFunction(() => { const v = (JSON.parse(localStorage.getItem("sp-local-db"))["data/users/local"].clips1.result.generated_videos) || {}; return ["1", "2", "3"].every(n => v[n] && v[n].url); }, {timeout: 40000}).catch(() => {});
    const got = await pg.evaluate(async () => { const r = JSON.parse(localStorage.getItem("sp-local-db"))["data/users/local"].clips1.result, v = r.generated_videos || {}; const f = v["1"] ? await fetch(v["1"].url) : null;
      return {v, code: f && f.status, type: f && f.headers.get("content-type"), task: (r.manus_tasks || []).map(t => `${t.kind}:${t.status}:${(t.got || []).length}`), line: (document.getElementById("clips-manus") || {}).innerText || "", vids: document.querySelectorAll(".gen-clip video").length}; });
    check("clips rapatriés : P01 et P03 dans leur plan, le clip sans numéro dans le premier plan libre (P02)", ["1", "2", "3"].every(n => got.v[n] && /\/generated\/clips1\/.+-manus-.+\.mp4$/.test(got.v[n].url) && got.v[n].model === "Manus · MiniMax H3") && /^\/generated\/clips1\/P01-/.test(got.v["1"].url) && /^\/generated\/clips1\/P03-/.test(got.v["3"].url) && /^\/generated\/clips1\/manus-/.test(got.v["2"].url), JSON.stringify(Object.keys(got.v)));
    check("chaque clip importé une seule fois, relisible, ligne d'état « clips reçus », clips visibles dans les plans", got.task.join() === "video:stopped:3" && got.code === 200 && /video\/mp4/.test(got.type) && /terminée · 3 clips reçus/.test(got.line) && got.vids === 3, `${got.task.join()} · ${got.line.slice(0, 80)} · ${got.vids} vidéos`);
    // 4. plus de crédits Manus : méthode gratuite
    noCredit = true; await pg.evaluate(() => document.getElementById("clips-manus-go").click()); await pg.waitForFunction(() => /crédits/.test((document.getElementById("clips-manus") || {}).textContent || ""), {timeout: 30000}).catch(() => {});
    const nc = await pg.evaluate(() => (document.getElementById("clips-manus") || {}).textContent || "");
    check("Manus sans crédits : méthode gratuite affichée (Google Flow ou Hailuo, puis Importer mes clips)", /Manus n’a plus de crédits\./.test(nc) && /Google Flow/.test(nc) && /Importer mes clips/.test(nc), nc.slice(0, 160));
    await pg.setViewport({width: 390, height: 844}); await pg.evaluate(() => document.querySelectorAll(".other-tools").forEach(d => d.open = true)); await new Promise(r => setTimeout(r, 300));
    check("plans sur téléphone avec les prompts des autres outils ouverts : pas de défilement horizontal", await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  }finally{ await b.close(); srv.kill(); fake.close(); }
  console.log(out.join("\n")); process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
