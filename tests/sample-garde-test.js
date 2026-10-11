// Délais de sécurité des agents (server.js, /api/sample) face à un faux Google : modèle muet, modèle trop lent, réponse qui tourne en rond.
// Aucun quota : tout est simulé. Le serveur de test est lancé ici, avec des délais courts.
const http = require("http"), path = require("path"), {spawn} = require("child_process");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const sse = o => `data: ${JSON.stringify(o)}\n\n`, part = t => ({candidates: [{content: {parts: [{text: t}]}}]});
const fake = http.createServer((req, res) => { const c = []; req.on("data", d => c.push(d)); req.on("end", () => {
  const u = new URL(req.url, "http://x");
  if(u.pathname === "/v1beta/models"){ res.writeHead(200, {"Content-Type": "application/json"}); return res.end(JSON.stringify({models: [{name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"]}]})); }
  if(/:streamGenerateContent$/.test(u.pathname)){
    const prompt = (() => { try{ return JSON.parse(Buffer.concat(c).toString("utf8")).contents[0].parts.map(p => p.text || "").join(" "); }catch(e){ return ""; } })();
    if(/LENT/.test(prompt)) return setTimeout(() => { try{ res.writeHead(200, {"Content-Type": "text/event-stream"}); res.end(sse(part("trop tard"))); }catch(e){} }, 6000);
    res.writeHead(200, {"Content-Type": "text/event-stream"});
    if(/MUET/.test(prompt)){ res.write(sse(part("{\"debut\":"))); return; }   /* puis plus rien */
    if(/BOUCLE/.test(prompt)){ let n = 0; const line = "Le même paragraphe revient encore et encore, sans jamais avancer d'un seul pas dans la réponse attendue. ".repeat(3); const iv = setInterval(() => { if(res.writableEnded || n++ > 120){ clearInterval(iv); try{ res.end(); }catch(e){} return; } try{ res.write(sse(part(line))); }catch(e){ clearInterval(iv); } }, 5); res.on("close", () => clearInterval(iv)); return; }
    return res.end(sse(part("{\"ok\":true}")));
  }
  res.writeHead(404); res.end("{}");
}); });
const PORT = 3000 + 700 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
const ask = prompt => new Promise(resolve => { const t0 = Date.now(), body = JSON.stringify({prompt, json: true});
  const r = http.request(BASE + "/api/sample", {method: "POST", headers: {"Content-Type": "application/json", "Content-Length": Buffer.byteLength(body)}}, res => { let raw = ""; res.on("data", d => raw += d); res.on("end", () => {
    const lines = raw.split("\n").filter(Boolean).map(l => { try{ return JSON.parse(l); }catch(e){ return {}; } });
    resolve({status: res.statusCode, ms: Date.now() - t0, err: lines.find(l => l.error || l.code) || null, text: lines.map(l => l.delta || "").join("")}); }); });
  r.on("error", e => resolve({status: 0, ms: Date.now() - t0, err: {message: e.message}, text: ""})); r.end(body); });
(async () => {
  await new Promise(r => fake.listen(0, "127.0.0.1", r)); const F = `http://127.0.0.1:${fake.address().port}`;
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "cle-test", GEMINI_BASE_URL: F + "/v1beta", PROVIDER: "gemini", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", SAMPLE_IDLE_MS: "1500", SAMPLE_MAX_MS: "60000", GEN_DIR: path.join(require("./env").OUT, "gen-garde")});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]}); let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  try{
    for(let k = 0; k < 80 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
    const ok = await ask("Réponds OK");
    check("réponse normale : elle arrive, sans erreur", ok.status === 200 && ok.text === "{\"ok\":true}" && !ok.err, JSON.stringify(ok).slice(0, 120));
    const muet = await ask("MUET");
    check("modèle muet en pleine réponse : arrêté au bout du délai, message clair (code timeout)", muet.status === 200 && muet.err && muet.err.code === "timeout" && /ne répond plus/.test(muet.err.message) && muet.ms < 8000, `${muet.ms} ms · ${JSON.stringify(muet.err)}`);
    const lent = await ask("LENT");
    check("modèle qui ne commence jamais : réponse 504 claire avant d'avoir rien reçu", lent.status === 504 && lent.err && lent.err.code === "timeout" && lent.ms < 8000, `${lent.status} · ${lent.ms} ms · ${JSON.stringify(lent.err)}`);
    const boucle = await ask("BOUCLE");
    check("réponse qui tourne en rond : coupée tôt (code loop), le modèle est mis de côté", boucle.err && boucle.err.code === "loop" && boucle.text.length < 20000 && /tourne en rond/.test(log), `${boucle.text.length} caractères · ${JSON.stringify(boucle.err)}`);
    const apres = await ask("Réponds OK");
    check("après ces incidents, le serveur répond toujours normalement", apres.status === 200 && apres.text === "{\"ok\":true}", JSON.stringify(apres).slice(0, 100));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  srv.kill(); fake.close(); console.log(out.join("\n")); process.exit(0);
})();
