// Chaîne des voix gratuites : vrai server.js face à un FAUX Google (3 modèles de voix, chacun son quota du jour) et un FAUX espace Hugging Face (Chatterbox).
// Relais entre modèles Gemini, voix naturelle de Hugging Face découpée et recollée, puis voix de l'ordinateur ; revue de presse en mode automatique.
const p = require("puppeteer-core"), http = require("http"), fs = require("fs"), path = require("path"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const wav = (secs, rate) => { const n = Math.round(rate * secs), b = Buffer.alloc(44 + n * 2); b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40); for(let i = 0; i < n; i++) b.writeInt16LE(Math.round(6000 * Math.sin(i / 9)), 44 + i * 2); return b; };
const DAY = {error: {code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded", details: [{"@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}, {"@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "3600s"}]}};
const st = {gemini: [], hf: [], hfMode: "ok", dayModels: new Set(["tts-a"])};
const fake = http.createServer((req, res) => { const c = []; req.on("data", x => c.push(x)); req.on("end", () => {
  const u = new URL(req.url, "http://x"), F0 = `http://127.0.0.1:${fake.address().port}`, body = Buffer.concat(c).toString("utf8"), send = (code, o, type) => { res.writeHead(code, {"Content-Type": type || "application/json"}); res.end(typeof o === "string" || Buffer.isBuffer(o) ? o : JSON.stringify(o)); };
  if(u.pathname === "/v1beta/models") return send(200, {models: [{name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"]}]});
  if(u.pathname === "/v1beta/interactions"){ const o = JSON.parse(body || "{}"); st.gemini.push(o.model); if(st.dayModels.has(o.model)) return send(429, DAY);
    return send(200, {steps: [{type: "model_output", content: [{type: "audio", data: wav(1.5, 24000).toString("base64")}]}]}); }
  if(u.pathname === "/gradio_api/call/generate_tts_audio" && req.method === "POST"){ const o = JSON.parse(body || "{}"); st.hf.push(o.data); return send(200, {event_id: "ev" + st.hf.length}); }
  if(u.pathname.startsWith("/gradio_api/call/generate_tts_audio/")){ if(st.hfMode === "error") return send(200, "event: error\ndata: null\n\n", "text/event-stream");
    return send(200, `event: complete\ndata: [{"path": "/tmp/gradio/x/audio.wav", "url": "${F0}/gradio_api/file=/tmp/gradio/x/audio.wav", "meta": {"_type": "gradio.FileData"}}]\n\n`, "text/event-stream"); }
  if(u.pathname.startsWith("/gradio_api/file=")) return send(200, wav(1.0, 24000), "audio/wav");
  send(404, {});
}); });
const REVUE = {nom_emission: "Le Point du Jour", titre: "Les nouvelles", accroche: "Bonjour, voici Le Point du Jour.", sommaire: "Au sommaire : la pluie et l'école.",
  segments: [{titre: "La pluie", texte: "Selon le Journal A, il a beaucoup plu cette nuit.", sources: ["Journal A"], preuve: "il a beaucoup plu"}], chiffre_du_jour: {texte: "", source: ""}, a_retenir: "Prudence.", conclusion: "C'était Le Point du Jour.", appel: "", publication: {titres: ["Le point"], description: "", hashtags: []}, a_verifier: []};
const PORT = 3000 + 100 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`, GEN_DIR = path.join(OUT, "relais-gen");
const post = (pth, o) => new Promise((ok, ko) => { const d = JSON.stringify(o), q = http.request({host: "127.0.0.1", port: PORT, path: pth, method: "POST", headers: {"Content-Type": "application/json", "Content-Length": Buffer.byteLength(d)}}, r => { const c = []; r.on("data", x => c.push(x)); r.on("end", () => ok({status: r.statusCode, body: JSON.parse(Buffer.concat(c).toString("utf8") || "{}")})); }); q.on("error", ko); q.end(d); });
const getJ = pth => new Promise((ok, ko) => http.get(`${BASE}${pth}`, r => { const c = []; r.on("data", x => c.push(x)); r.on("end", () => ok(JSON.parse(Buffer.concat(c).toString("utf8") || "{}"))); }).on("error", ko));
const waitJob = async (project, id) => { for(let k = 0; k < 150; k++){ const j = ((await getJ(`/api/gen/jobs?project=${project}&ids=${id}`)).jobs || [])[0]; if(j && !/queued|running/.test(j.status)) return j; await new Promise(r => setTimeout(r, 100)); } return null; };
(async () => {
  fs.rmSync(GEN_DIR, {recursive: true, force: true});
  await new Promise(r => fake.listen(0, "127.0.0.1", r)); const F = `http://127.0.0.1:${fake.address().port}`;
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "cle-test", GEMINI_BASE_URL: F + "/v1beta", GEMINI_TTS_MODEL: "tts-a", GEMINI_TTS_FALLBACKS: "tts-b,tts-c", CHATTERBOX_SPACE_URL: F, HF_TOKEN: "", PROVIDER: "gemini", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", APP_PASSWORD: "", GEN_DIR, GEN_POLL_MS: "50", GEN_RETRY_MS: "50"});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]}); let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  for(let k = 0; k < 50 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
  const b = await p.launch({executablePath: EDGE, headless: true}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  try{
    // 1. relais entre modèles de voix Gemini (chacun son quota du jour)
    let r = await post("/api/gen/start", {kind: "voice", service: "gemini", voice: "Charon", text: "Bonjour à tous.", project: "relais", plan: 1}); let j = await waitJob("relais", r.body.job.id);
    check("modèle de voix épuisé pour la journée → le modèle suivant prend le relais (même voix)", j && j.status === "done" && j.model === "tts-b" && st.gemini.join() === "tts-a,tts-b", `${st.gemini.join(",")} · ${j && j.status} · ${j && j.model}`);
    r = await post("/api/gen/start", {kind: "voice", service: "gemini", voice: "Charon", text: "Encore.", project: "relais", plan: 2}); j = await waitJob("relais", r.body.job.id);
    check("le modèle épuisé n'est plus redemandé de la journée", j && j.model === "tts-b" && st.gemini.slice(2).join() === "tts-b", st.gemini.slice(2).join(","));
    st.dayModels = new Set(["tts-a", "tts-b", "tts-c"]); r = await post("/api/gen/start", {kind: "voice", service: "gemini", voice: "Charon", text: "Toujours.", project: "relais", plan: 3}); j = await waitJob("relais", r.body.job.id);
    check("les 3 modèles épuisés → échec clair (demain matin) qui annonce le relais", j && j.code === "quota_day" && /3 modèles de voix/.test(j.error) && /demain/.test(j.error) && /Hugging Face/.test(j.error), j && j.error);
    // 2. voix naturelle de Hugging Face : texte découpé (280 caractères au plus), morceaux recollés
    const long = "Bonjour et bienvenue dans Le Point du Jour. " + "Voici une phrase assez longue pour dépasser la limite de l'espace de Hugging Face, avec des mots et encore des mots. ".repeat(5);
    r = await post("/api/gen/start", {kind: "voice", service: "chatterbox", voice: "fr_f1", text: long, project: "relais", plan: 4, style: "warm and lively"}); j = await waitJob("relais", r.body.job.id);
    check("voix naturelle (Hugging Face, sans clé) : texte découpé en morceaux de 280 caractères au plus, voix française de référence", j && j.status === "done" && st.hf.length >= 3 && st.hf.every(d => d[0].length <= 280 && d[1] === "fr" && /fr_f1\.flac$/.test(d[2].path)), `${st.hf.length} morceaux · ${st.hf.map(d => d[0].length).join(",")}`);
    check("morceaux recollés en un seul fichier WAV, avec de courtes pauses", j && Math.abs(j.seconds - st.hf.length * 1.22) < 0.15 && j.model === "Chatterbox (Hugging Face)", `${j && j.seconds} s pour ${st.hf.length} morceaux`);
    st.hfMode = "error"; r = await post("/api/gen/start", {kind: "voice", service: "chatterbox", voice: "fr_f1", text: "Bonjour.", project: "relais", plan: 5}); j = await waitJob("relais", r.body.job.id);
    check("Hugging Face refuse (minutes du jour épuisées) → échec clair qui annonce la voix de l'ordinateur", j && j.status === "failed" && /Hugging Face refuse/.test(j.error) && /HF_TOKEN/.test(j.error) && /voix de l'ordinateur prend le relais/.test(j.error), j && j.error);
    // 3. revue de presse en mode automatique : Gemini épuisé → Hugging Face ; puis Hugging Face aussi → voix de l'ordinateur
    st.hfMode = "ok"; const nHf = st.hf.length;
    await pg.evaluateOnNewDocument(() => { window.__localCalls = []; const w = secs => { const sr = 22050, n = Math.round(sr * secs), bf = new ArrayBuffer(44 + n * 2), d = new DataView(bf), s = (o, t) => [...t].forEach((ch, i) => d.setUint8(o + i, ch.charCodeAt(0))); s(0, "RIFF"); d.setUint32(4, 36 + n * 2, true); s(8, "WAVE"); s(12, "fmt "); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, sr, true); d.setUint32(28, sr * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); s(36, "data"); d.setUint32(40, n * 2, true); return bf; };
      window.__localTtsMock = {predict: async ({text, voiceId}) => { window.__localCalls.push(voiceId); return new Blob([w(1.2)], {type: "audio/x-wav"}); }}; });
    await pg.setViewport({width: 1366, height: 900});
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(rv => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); localStorage.setItem("sp-presse", JSON.stringify({r: rv, o: {pays: "sn", langue: "fr", duree: 60, ton: "inspirant", sources: []}, id: "presse-relais", voices: []})); }, REVUE);
    await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "presse"; }); await pg.waitForSelector("#pr-res .pr-seg", {timeout: 15000});
    const opt = await pg.evaluate(() => ({val: document.getElementById("pr-voix").value, hf: [...document.querySelectorAll("#pr-voix option")].some(o => o.value === "hf:fr_f1"), txt: document.getElementById("pr-res").innerText}));
    check("revue : « la meilleure voix gratuite (automatique) » par défaut, voix naturelle de Hugging Face proposée", opt.val === "auto" && opt.hf && /Gemini « Charon » \(3 modèles de voix en relais/.test(opt.txt), `${opt.val} · ${(opt.txt.match(/La meilleure voix gratuite[^\n]{0,120}/) || [""])[0]}`);
    await new Promise(r => setTimeout(r, 500)); await pg.evaluate(() => document.getElementById("pr-voice").click());
    await pg.waitForFunction(() => { const s = JSON.parse(localStorage.getItem("sp-presse") || "{}"); return (s.voices || []).length && s.voices.every(v => v.status === "done" && v.service === "chatterbox"); }, {timeout: 30000}).catch(() => {});
    const a1 = await pg.evaluate(() => { const s = JSON.parse(localStorage.getItem("sp-presse") || "{}"); return {v: (s.voices || []).map(v => `${v.service}:${v.status}`), name: s.voiceName, txt: document.getElementById("pr-res").innerText}; });
    check("Gemini épuisé sur tous ses modèles → la voix naturelle de Hugging Face fait toute la revue (même voix partout)", a1.v.length && a1.v.every(x => x === "chatterbox:done") && a1.name === "Voix naturelle (Hugging Face)" && st.hf.length > nHf && /Voix naturelle de Hugging Face \(Chatterbox\), gratuite\./.test(a1.txt), a1.v.join(" "));
    st.hfMode = "error"; await new Promise(r => setTimeout(r, 400)); await pg.evaluate(() => document.getElementById("pr-voice").click());
    await pg.waitForFunction(() => { const s = JSON.parse(localStorage.getItem("sp-presse") || "{}"); return (s.voices || []).length && s.voices.every(v => v.status === "done" && v.local); }, {timeout: 40000}).catch(() => {});
    const a2 = await pg.evaluate(() => { const s = JSON.parse(localStorage.getItem("sp-presse") || "{}"); return {v: (s.voices || []).map(v => `${v.local ? "ordinateur" : v.service}:${v.status}`), calls: window.__localCalls.slice()}; });
    check("Hugging Face refuse aussi → la voix de l'ordinateur termine la revue (toujours une voix gratuite)", a2.v.length && a2.v.every(x => x === "ordinateur:done") && a2.calls.length >= 1 && a2.calls.every(v => v === "fr_FR-siwis-medium"), a2.v.join(" "));
    // 4. Connexions
    await pg.evaluate(() => { location.hash = "connexions"; }); await pg.waitForFunction(() => /Hugging Face/.test((document.getElementById("cx-body") || {}).innerText || ""), {timeout: 15000}).catch(() => {});
    const cx = await pg.evaluate(() => (document.getElementById("cx-body") || {}).innerText.replace(/\s+/g, " "));
    check("Connexions : voix naturelle de Hugging Face (sans compte, peu de voix par jour ; HF_TOKEN pour plus) et relais des modèles Gemini", /Voix naturelle gratuite · Hugging Face \(Chatterbox\) Voix très naturelle en français[^]*?HF_TOKEN[^]*?Gratuit · peu de voix par jour/.test(cx) && /3 modèles de voix en relais, chacun son quota du jour ; 3 épuisés aujourd’hui/.test(cx), (cx.match(/Voix naturelle gratuite · Hugging Face[^.]{0,80}/) || [""])[0]);
    check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  }finally{ await b.close(); srv.kill(); fake.close(); }
  console.log(out.join("\n")); process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
