// Agents gratuits de secours : quand Gemini a épuisé son quota, Groq puis OpenRouter écrivent à sa place (server.js, /api/sample).
// Faux Gemini, faux Groq, faux OpenRouter : aucune vraie clé, aucun quota. Le serveur de test est lancé ici.
const http = require("http"), path = require("path"), {spawn} = require("child_process");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const seen = {gemini: 0, groq: [], openrouter: [], agnes: []}, mode = {groq: "ok", openrouter: "ok", busyModel: ""};
const sse = o => `data: ${JSON.stringify(o)}\n\n`;
const fake = http.createServer((req, res) => { const c = []; req.on("data", d => c.push(d)); req.on("end", () => {
  const u = new URL(req.url, "http://x"), body = (() => { try{ return JSON.parse(Buffer.concat(c).toString("utf8")); }catch(e){ return {}; } })();
  /* faux Gemini : toujours « quota atteint » */
  if(u.pathname === "/gemini/models"){ res.writeHead(200, {"Content-Type": "application/json"}); return res.end(JSON.stringify({models: [{name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"]}]})); }
  if(u.pathname.startsWith("/gemini/")){ seen.gemini++; res.writeHead(429, {"Content-Type": "application/json"}); return res.end(JSON.stringify({error: {code: 429, message: "quota", details: [{retryDelay: "3600s"}]}})); }
  /* faux Groq et faux OpenRouter (API compatibles OpenAI) */
  const kind = u.pathname.startsWith("/groq/") ? "groq" : u.pathname.startsWith("/openrouter/") ? "openrouter" : u.pathname.startsWith("/agnes/") ? "agnes" : "";
  if(kind && u.pathname.endsWith("/models")){ res.writeHead(200, {"Content-Type": "application/json"}); return res.end(JSON.stringify({data: kind === "groq"
    ? [{id: "whisper-large-v3"}, {id: "llama-3.3-70b-versatile", context_window: 131072}, {id: "meta-llama/llama-4-scout-17b-16e-instruct", context_window: 131072}]
    : [{id: "openai/gpt-x", pricing: {prompt: "0.000002", completion: "0.000008"}}, {id: "deepseek/deepseek-chat-v3:free", pricing: {prompt: "0", completion: "0"}, context_length: 64000, architecture: {input_modalities: ["text"]}}, {id: "google/gemini-flash:free", pricing: {prompt: "0", completion: "0"}, context_length: 1000000, architecture: {input_modalities: ["text", "image"]}}]})); }
  if(kind && u.pathname.endsWith("/chat/completions")){ seen[kind].push({model: body.model, auth: req.headers.authorization, images: JSON.stringify(body.messages || "").split('"type":"image_url"').length - 1, json: !!body.response_format, stream: body.stream});
    if(mode[kind] === "quota" || body.model === mode.busyModel){ res.writeHead(429, {"Content-Type": "application/json"}); return res.end(JSON.stringify({error: {message: "Rate limit reached"}})); }
    res.writeHead(200, {"Content-Type": "text/event-stream"}); res.write(sse({choices: [{delta: {content: `{"de":"${kind}",`}}]})); res.write(sse({choices: [{delta: {content: '"ok":true}'}}]})); res.write("data: [DONE]\n\n"); return res.end(); }
  res.writeHead(404); res.end("{}");
}); });
const ask = (BASE, prompt, images) => new Promise(resolve => { const b = JSON.stringify({prompt, json: true, images: images || []});
  const r = http.request(BASE + "/api/sample", {method: "POST", headers: {"Content-Type": "application/json", "Content-Length": Buffer.byteLength(b)}}, res => { let raw = ""; res.on("data", d => raw += d); res.on("end", () => {
    const lines = raw.split("\n").filter(Boolean).map(l => { try{ return JSON.parse(l); }catch(e){ return {}; } });
    resolve({status: res.statusCode, err: lines.find(l => l.error) || null, text: lines.map(l => l.delta || "").join(""), model: (lines.find(l => l.model) || {}).model || ""}); }); });
  r.on("error", e => resolve({status: 0, err: {message: e.message}, text: "", model: ""})); r.end(b); });
const start = async (env) => { const PORT = 3000 + 600 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env: Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", GEMINI_API_KEY: "", GROQ_API_KEY: "", OPENROUTER_API_KEY: "", AGNES_API_KEY: "", GEN_DIR: path.join(require("./env").OUT, "gen-relais")}, env), stdio: ["ignore", "pipe", "pipe"]});
  let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d); for(let k = 0; k < 80 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100)); return {srv, BASE, log: () => log}; };
(async () => {
  await new Promise(r => fake.listen(0, "127.0.0.1", r)); const F = `http://127.0.0.1:${fake.address().port}`;
  const urls = {GEMINI_BASE_URL: F + "/gemini", GROQ_BASE_URL: F + "/groq", OPENROUTER_BASE_URL: F + "/openrouter", AGNES_BASE_URL: F + "/agnes"};
  let s1 = null, s2 = null, s3 = null;
  try{
    s1 = await start(Object.assign({GEMINI_API_KEY: "cle-gemini", PROVIDER: "gemini", GROQ_API_KEY: "cle-groq", OPENROUTER_API_KEY: "cle-or"}, urls));
    const st = await new Promise(r => http.get(s1.BASE + "/api/status", res => { let raw = ""; res.on("data", d => raw += d); res.on("end", () => { try{ r(JSON.parse(raw)); }catch(e){ r({}); } }); }));
    check("l'état dit quels agents de secours sont prêts (jamais les clés)", st.relais && st.relais.groq === true && st.relais.openrouter === true && !/cle-groq|cle-or/.test(JSON.stringify(st)), JSON.stringify(st.relais));
    const a = await ask(s1.BASE, "Écris un plan en JSON.");
    check("quota Gemini épuisé : Groq répond à sa place (meilleur modèle gratuit, mode JSON, réponse en continu)", a.status === 200 && a.text === '{"de":"groq","ok":true}' && /Groq · llama-3\.3-70b-versatile/.test(a.model) && seen.groq[0] && seen.groq[0].auth === "Bearer cle-groq" && seen.groq[0].json && seen.groq[0].stream && seen.gemini > 0, `${a.model} · ${a.text}`);
    const img = {mime: "image/png", data: "iVBORw0KGgo="};
    const b = await ask(s1.BASE, "Regarde ces photos et écris le plan en JSON.", [img, img]);
    const last = seen.groq[seen.groq.length - 1];
    check("avec des photos : Groq prend un modèle qui sait regarder les images, et les lui envoie", b.text === '{"de":"groq","ok":true}' && /llama-4-scout/.test(last.model) && last.images === 2, `${last.model} · ${last.images} images`);
    mode.groq = "quota";
    const c = await ask(s1.BASE, "Écris un plan en JSON.");
    const or = seen.openrouter[seen.openrouter.length - 1] || {};
    check("Groq épuisé lui aussi : OpenRouter prend le relais avec un modèle gratuit (« :free »), jamais un payant", c.text === '{"de":"openrouter","ok":true}' && /OpenRouter · deepseek\/deepseek-chat-v3:free/.test(c.model) && or.auth === "Bearer cle-or", `${c.model}`);
    mode.busyModel = "deepseek/deepseek-chat-v3:free";
    const e = await ask(s1.BASE, "Écris un plan en JSON.");
    check("modèle gratuit saturé : un autre modèle gratuit du même service (openrouter/free) répond aussitôt", e.text === '{"de":"openrouter","ok":true}' && /OpenRouter · openrouter\/free/.test(e.model) && seen.openrouter.some(x => x.model === "openrouter/free"), e.model);
    mode.busyModel = "";
    s1.srv.kill(); s1 = null;
    mode.groq = "ok";
    s2 = await start(Object.assign({GROQ_API_KEY: "cle-groq"}, urls));
    const d = await ask(s2.BASE, "Écris un plan en JSON.");
    check("sans clé Gemini, une seule clé Groq suffit pour que l'agent marche", d.status === 200 && d.text === '{"de":"groq","ok":true}', `${d.status} · ${d.model}`);
    s2.srv.kill(); s2 = null;
    /* Agnes écrit aussi : juste après Gemini, avec les photos, en JSON, modèle gratuit « flash » ; quota épuisé (403) → agnes-2.5-flash */
    s3 = await start(Object.assign({GEMINI_API_KEY: "cle-gemini", PROVIDER: "gemini", AGNES_API_KEY: "cle-agnes", GROQ_API_KEY: "cle-groq"}, urls));
    const g = await ask(s3.BASE, "Regarde ces photos et écris le plan en JSON.", [img]);
    const ag = seen.agnes[seen.agnes.length - 1] || {};
    check("Agnes écrit juste après Gemini (modèle gratuit agnes-3.0-flash), voit les photos, répond en JSON, avant Groq", g.text === '{"de":"agnes","ok":true}' && /Agnes · agnes-3\.0-flash/.test(g.model) && ag.auth === "Bearer cle-agnes" && ag.images === 1 && ag.json, `${g.model} · ${ag.images} image`);
    mode.busyModel = "agnes-3.0-flash";
    const h = await ask(s3.BASE, "Écris un plan en JSON.");
    check("modèle Agnes refusé (quota) : agnes-2.5-flash prend la suite", h.text === '{"de":"agnes","ok":true}' && /Agnes · agnes-2\.5-flash/.test(h.model), h.model);
    mode.busyModel = "";
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  if(s1) s1.srv.kill(); if(s2) s2.srv.kill(); if(s3) s3.srv.kill(); fake.close(); console.log(out.join("\n")); process.exit(0);
})();
