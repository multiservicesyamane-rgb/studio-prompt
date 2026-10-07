// Agnes AI (gratuit pour le moment) : vrai server.js face à un FAUX Agnes (images, clips, attente demandée, image de départ refusée).
// Storyboard par Agnes d'abord (photos des personnages jointes), clips plan par plan, un à la fois, rangés tout seuls dans leur plan ; page Connexions.
const p = require("puppeteer-core"), http = require("http"), fs = require("fs"), path = require("path"), zlib = require("zlib"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
function png(w, h, rgb){ const crc = b => { let c, t = []; for(let n = 0; n < 256; n++){ c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for(const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h); for(let y = 0; y < h; y++){ raw[y * (w * 3 + 1)] = 0; for(let x = 0; x < w; x++){ const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2]; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, {level: 0})), chunk("IEND", Buffer.alloc(0))]); }
const seen = {img: [], vid: [], polls: 0, auth: new Set(), busy: 0, maxBusy: 0, img429: 0, vid429: 0, keyframe400: 0};
const videos = {};
const fake = http.createServer((req, res) => { const c = []; req.on("data", x => c.push(x)); req.on("end", () => {
  const u = new URL(req.url, "http://x"), F0 = `http://127.0.0.1:${fake.address().port}`, send = (code, o, type) => { res.writeHead(code, {"Content-Type": type || "application/json"}); res.end(typeof o === "string" || Buffer.isBuffer(o) ? o : JSON.stringify(o)); };
  if(req.headers.authorization) seen.auth.add(req.headers.authorization);
  if(u.pathname === "/v1/images/generations"){ const b = JSON.parse(Buffer.concat(c).toString("utf8") || "{}"); seen.img.push(b);
    if(!seen.img429){ seen.img429++; return send(429, {error: {message: "rate limit"}}); }   /* l'offre gratuite demande d'attendre une fois */
    return send(200, {created: 1, data: [{url: `${F0}/files/img-${seen.img.length}.png`, b64_json: null}]}); }
  if(u.pathname.startsWith("/files/img-")){ res.writeHead(200, {"Content-Type": "image/png"}); return res.end(png(360, 640, [60, 130, 220])); }
  if(u.pathname === "/v1/videos" && req.method === "POST"){ const b = JSON.parse(Buffer.concat(c).toString("utf8") || "{}");
    if(!seen.vid429){ seen.vid429++; return send(429, {error: {message: "too many requests"}}); }
    if(b.first_frame && !seen.keyframe400 && seen.vid.filter(x => x.first_frame).length === 1){ seen.keyframe400++; seen.vid.push(Object.assign({refused: true}, b)); return send(400, {error: {message: "first_frame must be a public URL"}}); }   /* une image de départ refusée : le clip est refait sans elle */
    seen.vid.push(b); seen.busy++; seen.maxBusy = Math.max(seen.maxBusy, seen.busy); const id = "v" + seen.vid.length; videos[id] = 0; return send(200, {id: "task-" + id, video_id: id, status: "queued", progress: 0, model: b.model}); }
  if(u.pathname === "/agnesapi"){ seen.polls++; const id = u.searchParams.get("video_id"); if(!(id in videos)) return send(404, {error: {message: "inconnu"}});
    videos[id]++; if(videos[id] < 2) return send(200, {status: "in_progress", progress: 40});
    if(videos[id] === 2) seen.busy--; return send(200, {status: "completed", progress: 100, url: `${F0}/files/${id}.mp4`, error: null}); }
  if(u.pathname.startsWith("/files/v")){ res.writeHead(200, {"Content-Type": "video/mp4"}); return res.end(Buffer.alloc(4000, 7)); }
  send(404, {error: {message: "inconnu " + u.pathname}});
}); });
const plan = (n, extra) => Object.assign({n, debut: `0:${String((n - 1) * 6).padStart(2, "0")}`, fin: `0:${String(n * 6).padStart(2, "0")}`, intention: `Plan ${n}`, voix_off: "", personnages: ["awa"], cadrage_en: "Medium shot", action_en: "Awa looks at the letter", decor_en: "a small living room", camera_en: "static", lumiere_en: "window light", ambiance_en: "tense", son_en: "paper", risk_level: "LOW"}, extra);
const PROJ = {kind: "project", titre: "La lettre", idee: "x", params: {style: "realiste", format: "9:16", duree: "18", langue: "fr", outil: "veo", audio: "voice", vtype: "histoire"},
  result: {titre: "La lettre", logline: "", personnages: [{id: "awa", nom: "Awa", fiche_en: "Awa, a 40-year-old woman with long braids and a green dress", rappel_en: "Awa in her green dress"}],
    plans: [plan(1, {voix_off: "Une lettre attendait sur la table."}), plan(2, {voix_off: "Personne ne savait qui l'avait posée."}), plan(3, {})],
    audio: {voix: "", mixage: ""}, montage: [], youtube: {titres: ["La lettre"], description: "Une histoire courte."}}, createdAt: Date.now(), updatedAt: Date.now()};
const PORT = 3000 + 1100 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`, GEN_DIR = path.join(OUT, "agnes-gen");
(async () => {
  fs.rmSync(GEN_DIR, {recursive: true, force: true}); const REF = path.join(OUT, "agnes-ref-awa.png"); fs.writeFileSync(REF, png(200, 260, [200, 60, 60]));
  await new Promise(r => fake.listen(0, "127.0.0.1", r)); const F = `http://127.0.0.1:${fake.address().port}`;
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", AGNES_API_KEY: "cle-agnes-test", AGNES_BASE_URL: F, AGNES_WAIT_MS: "50", GEN_POLL_MS: "50", GEMINI_API_KEY: "", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", PROVIDER: "gemini", APP_PASSWORD: "", GEN_DIR});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]}); let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  for(let k = 0; k < 50 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
  const b = await p.launch({executablePath: EDGE, headless: true}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.evaluateOnNewDocument(() => { window.__agnesPoll = 300; });
  try{
    const st = await new Promise((ok, ko) => http.get(`${BASE}/api/gen/status`, r => { const c = []; r.on("data", x => c.push(x)); r.on("end", () => ok(JSON.parse(Buffer.concat(c).toString("utf8")))); }).on("error", ko));
    const av = (st.video || []).find(v => v.id === "agnes") || {};
    check("serveur : Agnes Video 2.5 Flash prêt et gratuit (0 $), clés jamais montrées", st.agnes && st.agnes.ready && av.ready && av.price_s === 0 && !JSON.stringify(st).includes("cle-agnes-test"), JSON.stringify(av).slice(0, 140));
    await pg.setViewport({width: 1366, height: 900});
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(pr => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); localStorage.setItem("sp-local-db", JSON.stringify({"data/users/local": {ag1: pr}})); }, PROJ);
    await pg.reload({waitUntil: "networkidle0"});
    // 1. Connexions
    await pg.evaluate(() => { location.hash = "connexions"; }); await pg.waitForFunction(() => /Agnes AI/.test((document.getElementById("cx-body") || {}).innerText || ""), {timeout: 15000}).catch(() => {});
    const cx = await pg.evaluate(() => (document.getElementById("cx-body") || {}).innerText.replace(/\s+/g, " "));
    check("Connexions : Agnes AI (images et clips gratuits pour le moment), avec le guide de la clé", /Images et clips · Agnes AI .*platform\.agnes-ai\.com.*AGNES_API_KEY.*Prêt · gratuit pour le moment/.test(cx), (cx.match(/Images et clips · Agnes AI.{0,90}/) || [""])[0]);
    // 2. Storyboard : Agnes d'abord, photo du personnage jointe, attente quand Agnes le demande
    await pg.evaluate(() => { location.hash = "projets"; }); await new Promise(r => setTimeout(r, 400));
    await pg.click('#list-projects [data-open="ag1"]'); await pg.waitForSelector("#result .ptabs", {timeout: 15000});
    await pg.click('[data-ptab="board"]'); await pg.waitForSelector("#board-generate", {timeout: 10000});
    const hint = await pg.evaluate(() => document.getElementById("s-board").innerText);
    check("Storyboard : « Générer » passe d'abord par Agnes, gratuit", /passe d’abord par Agnes AI, gratuit pour le moment/.test(hint));
    const fileInput = await pg.$("#board-refs"); await fileInput.uploadFile(REF);
    await pg.evaluate(() => document.getElementById("board-generate").click());
    await pg.waitForFunction(() => { const d = JSON.parse(localStorage.getItem("sp-local-db"))["data/users/local"].ag1.result.generated_images || {}; return Object.values(d).filter(x => x && x.url).length >= 3; }, {timeout: 60000}).catch(() => {});
    const gi = await pg.evaluate(() => JSON.parse(localStorage.getItem("sp-local-db"))["data/users/local"].ag1.result.generated_images || {});
    const imgs = Object.values(gi);
    check("3 images du Storyboard faites par Agnes, rangées dans leur plan", imgs.length === 3 && imgs.every(x => x.model === "agnes-image-2.5-flash" && /^\/generated\/ag1\/P0\d\.png$/.test(x.url)), imgs.map(x => `${x.model} ${x.url}`).join(" | "));
    const i1 = seen.img[seen.img.length - 1] || {};
    check("demande d'image : format 9:16, 1K, adresse en retour, photo du personnage jointe en data URI", i1.model === "agnes-image-2.5-flash" && i1.ratio === "9:16" && i1.size === "1K" && i1.extra_body && i1.extra_body.response_format === "url" && (i1.extra_body.image || []).length === 1 && /^data:image\/png;base64,/.test(i1.extra_body.image[0]), JSON.stringify(Object.assign({}, i1, {prompt: undefined, extra_body: {n: (i1.extra_body && i1.extra_body.image || []).length}})));
    check("offre gratuite : Agnes demande d'attendre (429), Studio Prompt attend puis réessaie tout seul", seen.img429 === 1 && seen.img.length === 4, `${seen.img.length} demandes pour 3 images`);
    // 3. Plans : clips gratuits avec Agnes, un à la fois, rangés tout seuls
    await pg.click('[data-ptab="plans"]'); await pg.waitForSelector("#clips-agnes-go", {timeout: 10000});
    const en = await pg.evaluate(() => !document.getElementById("clips-agnes-go").disabled);
    check("onglet Plans : bouton « Créer les clips gratuitement avec Agnes » actif", en);
    await pg.evaluate(() => document.getElementById("clips-agnes-go").click());
    await pg.waitForFunction(() => { const d = JSON.parse(localStorage.getItem("sp-local-db"))["data/users/local"].ag1.result.generated_videos || {}; return Object.values(d).filter(x => x && x.url).length >= 3; }, {timeout: 90000}).catch(() => {});
    const gv = await pg.evaluate(() => { const r = JSON.parse(localStorage.getItem("sp-local-db"))["data/users/local"].ag1.result; return {v: r.generated_videos || {}, jobs: r.agnes_jobs || [], line: (document.getElementById("clips-agnes") || {}).textContent || ""}; });
    const vids = Object.entries(gv.v);
    check("3 clips d'Agnes rangés dans leur plan (P01 à P03), statut à jour", vids.length === 3 && vids.every(([n, x]) => x.model === "Agnes Video 2.5 Flash" && /^\/generated\/ag1\/P0\d-video-agnes-/.test(x.url) && x.name === `P0${n}.mp4`) && /3 clips prêts/.test(gv.line), `${vids.map(([n, x]) => `${n}:${x.url}`).join(" ")} · ${gv.line}`);
    const ok = seen.vid.filter(x => !x.refused);
    check("demande de clip : agnes-video-2.5-flash, 720P, 9:16, durée du plan (6 s), image de départ du Storyboard (keyframe)", ok.length === 3 && ok.every(x => x.model === "agnes-video-2.5-flash" && x.size === "720P" && x.aspect_ratio === "9:16" && x.seconds === "6" && x.prompt.length > 40) && ok.filter(x => x.mode === "keyframe" && /^data:image\/png;base64,/.test(x.first_frame)).length === 2, ok.map(x => `${x.mode}/${x.seconds}/${x.aspect_ratio}`).join(" "));
    check("image de départ refusée par Agnes : le clip est refait depuis le texte seul, sans échec", seen.keyframe400 === 1 && ok.filter(x => x.mode === "text" && !x.first_frame).length === 1, `${seen.keyframe400} refus`);
    check("offre gratuite respectée : un clip à la fois, attente puis nouvel essai après un 429", seen.maxBusy === 1 && seen.vid429 === 1, `au plus ${seen.maxBusy} en même temps`);
    check("la clé part seulement dans l'en-tête Authorization vers Agnes", [...seen.auth].every(a => a === "Bearer cle-agnes-test"), [...seen.auth].join(","));
    await pg.setViewport({width: 390, height: 844}); await new Promise(r => setTimeout(r, 300));
    check("onglet Plans sur téléphone : pas de défilement horizontal", await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  }finally{ await b.close(); srv.kill(); fake.close(); }
  console.log(out.join("\n")); process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
