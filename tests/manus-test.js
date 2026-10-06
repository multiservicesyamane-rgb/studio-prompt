// Manus AI : vrai server.js face à un FAUX Manus qui applique la même limite (5 000 « tokens », environ 15 000 caractères).
// Le Storyboard d'un long projet est envoyé en plusieurs tâches compactes, chaque plan une seule fois ; erreurs traduites.
const p = require("puppeteer-core"), http = require("http"), path = require("path"), {spawn} = require("child_process");
const {EDGE} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const tasks = []; let taskSeq = 0, LIMIT = 15000, manusNoCredit = false, openaiNoCredit = false; const polls = {}, gens = {gemini: 0, gpt: 0};
const IMG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(3000, 7)]);
const fake = http.createServer((req, res) => { const c = []; req.on("data", x => c.push(x)); req.on("end", () => {
  const send = (code, o) => { res.writeHead(code, {"Content-Type": "application/json"}); res.end(JSON.stringify(o)); };
  if(req.url === "/v2/task.create"){ const o = JSON.parse(Buffer.concat(c).toString("utf8")), content = o.message && o.message.content || "";
    if(req.headers["x-manus-api-key"] !== "cle-manus") return send(401, {ok: false, error: {message: "invalid api key"}});
    if(content.length > LIMIT) return send(400, {ok: false, error: {message: "message content must be at most 5000 estimated tokens"}});
    if(manusNoCredit) return send(402, {ok: false, error: {message: "insufficient credits"}});
    tasks.push(content); const id = "t" + (++taskSeq); return send(200, {ok: true, task_id: id, task_url: `https://manus.im/app/${id}`}); }
  const u = new URL(req.url, "http://x"), F0 = `http://127.0.0.1:${fake.address().port}`, id = u.searchParams.get("task_id");
  /* t1 : une image pendant le travail, puis trois à la fin (dont une sans numéro) ; t2 : terminée avec P16 ; les autres : terminées sans image */
  const att = n => ({type: "image", filename: n, url: `${F0}/files/${n}`, content_type: "image/png", file_uid: "f-" + n});
  if(u.pathname === "/v2/task.detail"){ polls[id] = (polls[id] || 0) + 1; return send(200, {ok: true, task: {id, status: id === "t1" && polls[id] < 3 ? "running" : "stopped", credit_usage: 120, title: "Storyboard"}}); }
  if(u.pathname === "/v2/task.listMessages"){ const files = id === "t1" ? (polls[id] < 3 ? ["P02.png"] : ["P01.png", "P02.png", "scene-finale.png"]) : id === "t2" ? ["P16.png"] : [];
    return send(200, {ok: true, messages: [{id: "e1", type: "status_update", status_update: {agent_status: "running"}}, {id: "e2", type: "assistant_message", assistant_message: {content: "Voici les images.", attachments: files.map(att)}}]}); }
  if(u.pathname.startsWith("/files/")){ res.writeHead(200, {"Content-Type": "image/png"}); return res.end(IMG); }
  if(u.pathname === "/v1beta/interactions"){ gens.gemini++; return send(429, {error: {code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for metric generate_content_free_tier_requests, limit: 0"}}); }
  if(u.pathname === "/v1/images/generations"){ gens.gpt++; if(openaiNoCredit) return send(429, {error: {message: "You exceeded your current quota, please check your plan and billing details.", type: "insufficient_quota"}});
    return send(200, {data: [{b64_json: IMG.toString("base64")}]}); }
  send(404, {ok: false});
}); });
const longAction = "Awa kneels by the dry well at dawn, lifts the cracked bucket and looks toward the empty road while dust drifts in the warm light ".repeat(4);
const plans = Array.from({length: 30}, (_, i) => ({n: i + 1, debut: `${Math.floor(i * 6 / 60)}:${String(i * 6 % 60).padStart(2, "0")}`, fin: `${Math.floor((i + 1) * 6 / 60)}:${String((i + 1) * 6 % 60).padStart(2, "0")}`, intention: `Plan ${i + 1}`, voix_off: "", personnages: ["awa", "moussa"], cadrage_en: "Medium shot", action_en: longAction, decor_en: "a sandy village square near a dry well", camera_en: "static", lumiere_en: "soft dawn light", ambiance_en: "quiet", son_en: "wind", risk_level: "LOW"}));
const PROJ = {kind: "project", titre: "Le puits d'Awa", idee: "x", params: {style: "realiste", format: "9:16", duree: "180", langue: "fr", outil: "veo", audio: "voice", vtype: "histoire"},
  result: {titre: "Le puits d'Awa", logline: "", personnages: [{id: "awa", nom: "Awa", fiche_en: "Awa, a 40-year-old woman with long braids and a green dress", rappel_en: "Awa in her green dress"}, {id: "moussa", nom: "Moussa", fiche_en: "Moussa, a 45-year-old man with a short beard and a white boubou", rappel_en: "Moussa in a white boubou"}],
    plans, audio: {voix: "", mixage: ""}, montage: [], youtube: {titres: []}}, createdAt: Date.now(), updatedAt: Date.now()};
const PORT = 3000 + 700 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
const post = (pth, o) => new Promise((ok, ko) => { const d = JSON.stringify(o), q = http.request({host: "127.0.0.1", port: PORT, path: pth, method: "POST", headers: {"Content-Type": "application/json", "Content-Length": Buffer.byteLength(d)}}, r => { const c = []; r.on("data", x => c.push(x)); r.on("end", () => ok({status: r.statusCode, body: JSON.parse(Buffer.concat(c).toString("utf8") || "{}")})); }); q.on("error", ko); q.end(d); });
(async () => {
  require("fs").rmSync(path.join(require("./env").OUT, "manus-gen"), {recursive: true, force: true});   // budget du jour propre à chaque passage
  await new Promise(r => fake.listen(0, "127.0.0.1", r));
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "cle-test", GEMINI_BASE_URL: `http://127.0.0.1:${fake.address().port}/v1beta`, MANUS_API_KEY: "cle-manus", MANUS_BASE_URL: `http://127.0.0.1:${fake.address().port}`, NEWS_ALLOW_LOCAL: "1", PROVIDER: "gemini", OPENAI_API_KEY: "cle-openai", OPENAI_BASE_URL: `http://127.0.0.1:${fake.address().port}/v1`, ANTHROPIC_API_KEY: "", APP_PASSWORD: "", GEN_DIR: path.join(require("./env").OUT, "manus-gen")});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]}); let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  for(let k = 0; k < 50 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
  const b = await p.launch({executablePath: EDGE, headless: true}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message)); await pg.evaluateOnNewDocument(() => { window.__manusPoll = 400; });
  try{
    // 1. message trop long envoyé directement : erreur traduite
    const big = await post("/api/manus/task", {prompt: "x".repeat(20000)});
    check("demande trop longue : message clair en français", big.status === 400 && /trop longue pour Manus/.test(big.body.message), big.body.message);
    // 2. long storyboard : plusieurs tâches compactes
    await pg.setViewport({width: 1366, height: 900});
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(pr => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); localStorage.setItem("sp-local-db", JSON.stringify({"data/users/local": {manus1: pr}})); }, PROJ);
    await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "projets"; }); await new Promise(r => setTimeout(r, 400));
    await pg.click('#list-projects [data-open="manus1"]'); await pg.waitForSelector('[data-ptab="board"]'); await pg.click('[data-ptab="board"]');
    await pg.click("#board-manus"); await pg.waitForFunction(() => /créée|créées|Erreur/.test(document.getElementById("board-status-text").textContent), {timeout: 30000});
    const st = await pg.evaluate(() => ({txt: document.getElementById("board-status-text").innerText, links: [...document.querySelectorAll("#board-status-text a")].map(a => a.href)}));
    const ids = tasks.join("\n").match(/^P\d{2} :/gm) || [];
    check("long storyboard (30 plans) : découpé en plusieurs tâches Manus, chacune sous la limite", tasks.length >= 2 && tasks.every(t => t.length <= 10500), `${tasks.length} tâches · ${tasks.map(t => t.length).join(", ")} caractères`);
    check("chaque plan envoyé une seule fois, dans l'ordre (P01 à P30)", ids.length === 30 && ids.map(x => x.slice(1, 3)).join() === Array.from({length: 30}, (_, i) => String(i + 1).padStart(2, "0")).join(), ids.length + " plans");
    check("chaque tâche rappelle les personnages et la règle des noms de fichiers (P01.png…)", tasks.every(t => /Awa : Awa, a 40-year-old woman/.test(t) && /Moussa : Moussa/.test(t) && /P01\.png/.test(t) && /partie \d+ sur \d+/.test(t)), "");
    check("seulement les prompts d'image : pas de prompts vidéo envoyés à Manus", !tasks.some(t => /Animate the attached image|Transforme l'image en vidéo/.test(t)));
    check("liens de toutes les tâches affichés, avec la marche à suivre pour importer les images", st.links.length === tasks.length && st.links[0] === "https://manus.im/app/t1" && /surveille Manus/.test(st.txt), JSON.stringify(st.links));
    // 3. Manus plus strict que prévu : l'application redécoupe toute seule en parties plus petites
    LIMIT = 6000; tasks.length = 0; await pg.click("#board-manus"); await pg.waitForFunction(() => /créées|Erreur/.test(document.getElementById("board-status-text").textContent) && !document.getElementById("board-manus").disabled, {timeout: 30000});
    const st2 = await pg.evaluate(() => document.getElementById("board-status-text").innerText);
    check("Manus plus strict : redécoupage automatique, tous les plans quand même envoyés", tasks.length >= 3 && tasks.every(t => t.length <= 6000) && (tasks.join("\n").match(/^P\d{2} :/gm) || []).length === 30 && /créées/.test(st2), `${tasks.length} tâches · ${tasks.map(t => t.length).join(", ")}`);
    // 4. Manus travaille dans son environnement : les images reviennent toutes seules dans leur plan
    await pg.waitForFunction(() => { const d = JSON.parse(localStorage.getItem("sp-local-db"))["data/users/local"].manus1.result, g = d.generated_images || {}; return ["1", "2", "3", "16"].every(n => g[n] && g[n].url) && (d.manus_tasks || []).every(t => t.done); }, {timeout: 40000}).catch(() => {});
    const got = await pg.evaluate(() => { const d = JSON.parse(localStorage.getItem("sp-local-db"))["data/users/local"].manus1.result; return {g: d.generated_images || {}, tasks: (d.manus_tasks || []).map(t => `${t.id}:${t.status}:${(t.got || []).length}`), imgs: document.querySelectorAll("#board-generated img").length, line: (document.getElementById("board-status-text") || {}).innerText || ""}; });
    check("images de Manus récupérées toutes seules : P01, P02 et P16 dans leur plan, l'image sans numéro dans le premier plan libre (P03)", ["1", "2", "3", "16"].every(n => got.g[n] && /\/generated\/manus1\/.+-manus-/.test(got.g[n].url) && got.g[n].model === "Manus AI") && /^\/generated\/manus1\/P01-/.test(got.g["1"].url) && /^\/generated\/manus1\/manus-/.test(got.g["3"].url), JSON.stringify(Object.keys(got.g)));
    check("chaque image n'est importée qu'une fois, malgré plusieurs passages", got.tasks.includes("t1:stopped:3") && got.tasks.includes("t2:stopped:1"), got.tasks.join(" "));
    check("images affichées dans le Storyboard, ligne d'état Manus visible", got.imgs >= 4 && /Manus/.test(got.line) && /terminée/.test(got.line) && /images? reçues?/.test(got.line), `${got.imgs} images · ${got.line.slice(0, 120)}`);
    // 5. relais pour les plans manquants : Nano Banana (facturation non activée) → GPT Image
    await pg.click("#board-retry"); await pg.waitForFunction(() => !document.getElementById("board-retry").disabled && (JSON.parse(localStorage.getItem("sp-local-db"))["data/users/local"].manus1.result.generated_images || {})["30"], {timeout: 60000});
    const rel = await pg.evaluate(() => { const g = JSON.parse(localStorage.getItem("sp-local-db"))["data/users/local"].manus1.result.generated_images || {}; return {n: Object.values(g).filter(x => x && x.url).length, m4: (g["4"] || {}).model, m1: (g["1"] || {}).model}; });
    check("relais : Nano Banana refusé (facturation) → GPT Image fait les 26 plans manquants, Manus gardé", rel.n === 30 && /gpt-image-2/.test(rel.m4) && rel.m1 === "Manus AI" && gens.gemini === 1 && gens.gpt === 26, JSON.stringify(Object.assign(rel, gens)));
    // 6. tout est épuisé : message clair qui propose la méthode gratuite
    manusNoCredit = true; openaiNoCredit = true;
    await pg.evaluate(pr => { const db = JSON.parse(localStorage.getItem("sp-local-db")); pr.result.plans = pr.result.plans.slice(0, 3); db["data/users/local"].manus2 = pr; localStorage.setItem("sp-local-db", JSON.stringify(db)); }, Object.assign({}, PROJ, {titre: "Projet sans crédits"}));
    await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "projets"; }); await new Promise(r => setTimeout(r, 400));
    await pg.click('#list-projects [data-open="manus2"]'); await pg.waitForSelector('[data-ptab="board"]'); await pg.click('[data-ptab="board"]');
    await pg.click("#board-manus"); await pg.waitForFunction(() => /Aucun service d'images/.test((document.getElementById("board-status-text") || {}).textContent || ""), {timeout: 30000}).catch(() => {});
    const none = await pg.evaluate(() => (document.getElementById("board-status-text") || {}).textContent || "");
    check("Manus, Nano Banana et GPT épuisés : message clair avec la méthode à la main (ChatGPT avec l'abonnement ou Gemini, puis Importer)", /Aucun service d'images automatique/.test(none) && /Importer mes images/.test(none) && /abonnement ChatGPT/.test(none), none.slice(0, 160));
    check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  }finally{ await b.close(); srv.kill(); fake.close(); }
  console.log(out.join("\n")); process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
