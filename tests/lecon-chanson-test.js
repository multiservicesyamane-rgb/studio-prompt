// Chanson de la leçon (14 octobre) : paroles d'office et modifiables, voix chantée par l'IA (ACE-Step sur Hugging Face, simulé) avec les temps
// des lignes, compte Hugging Face relié depuis la page, chanson de l'application (musique composée, voix posée sur les temps), vraie vidéo
// « clip musical » où chaque unité apparaît quand elle est chantée. Serveur de test séparé ; aucune IA réelle, aucun quota.
const p = require("puppeteer-core"), http = require("http"), path = require("path"), fs = require("fs"), {spawn, execFileSync} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const FF = require(path.join(__dirname, "..", "node_modules", "ffmpeg-static")), GEN = path.join(OUT, "gen-chanson"), wait = ms => new Promise(r => setTimeout(r, ms));
/* une « chanson » de 12 s : mélodie simple, en WAV */
const song = (() => { const sr = 22050, n = sr * 12, b = Buffer.alloc(44 + n * 2); b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  const notes = [262, 294, 330, 349, 392, 440]; for(let i = 0; i < n; i++){ const f = notes[Math.floor(i / sr / .5) % notes.length]; b.writeInt16LE(Math.round(Math.sin(2 * Math.PI * f * i / sr) * 9000), 44 + i * 2); } return b; })();
(async () => {
  fs.rmSync(GEN, {recursive: true, force: true, maxRetries: 20, retryDelay: 250}); require("./coran-cache")(GEN);
  /* faux espace ACE-Step : /config (réglages par leur nom), file d'attente Gradio (SSE), fichier rendu ; faux « whoami » de Hugging Face */
  const seen = {joins: 0, auth: [], lyrics: "", lrcAsked: false, lang: "", model: ""};
  const fake = http.createServer((req, res) => { let body = ""; req.on("data", d => body += d); req.on("end", () => { const u = new URL(req.url, "http://x"), base = `http://127.0.0.1:${fake.address().port}`;
    if(u.pathname === "/whoami"){ const ok = /^Bearer hf_[A-Za-z0-9]{20,}$/.test(req.headers.authorization || ""); res.writeHead(ok ? 200 : 401, {"Content-Type": "application/json"}); return res.end(JSON.stringify(ok ? {name: "testeur"} : {error: "Invalid"})); }
    if(u.pathname === "/config"){ res.writeHead(200, {"Content-Type": "application/json"}); return res.end(JSON.stringify({dependencies: [{api_name: "autre", inputs: []}, {api_name: "generation_wrapper", inputs: [1, 2, 3, 4, 5, 6, 7, 8, 9]}],
      components: [{id: 1, type: "dropdown", props: {label: "models", value: "acestep-v15-xl-turbo"}}, {id: 2, type: "radio", props: {value: "simple"}}, {id: 3, type: "textbox", props: {label: "Prompt"}}, {id: 4, type: "textbox", props: {label: "Lyrics"}}, {id: 5, type: "dropdown", props: {label: "Vocal Language", value: "unknown"}}, {id: 6, type: "number", props: {label: "Audio Duration (seconds)", value: -1}}, {id: 7, type: "checkbox", props: {label: "Get LRC", value: false}}, {id: 8, type: "slider", props: {value: 7, visible: false}}, {id: 9, type: "state", props: {}}]})); }
    if(u.pathname === "/gradio_api/queue/join"){ const o = JSON.parse(body || "{}"); seen.joins++; seen.auth.push(req.headers.authorization || ""); seen.data = o.data; seen.lyrics = o.data[3]; seen.lrcAsked = o.data[6] === true; seen.lang = o.data[4]; seen.model = o.data[0]; seen.mode = o.data[1]; seen.fn = o.fn_index;
      seen.sessions = seen.sessions || {}; seen.sessions[o.session_hash] = !!req.headers.authorization; res.writeHead(200, {"Content-Type": "application/json"}); return res.end(JSON.stringify({event_id: "ev" + seen.joins})); }
    if(u.pathname === "/gradio_api/queue/data"){ const authed = (seen.sessions || {})[u.searchParams.get("session_hash")]; res.writeHead(200, {"Content-Type": "text/event-stream"});
      const send = m => res.write(`data: ${JSON.stringify(m)}\n\n`);
      send({msg: "estimation", rank: 0}); send({msg: "process_starts"});
      if(!authed){ send({msg: "process_completed", success: false, output: {error: "You have exceeded your ZeroGPU quota (60s requested vs. 0s left). Authenticate with a Hugging Face token for more quota"}}); return res.end(); }
      send({msg: "progress", progress_data: [{index: 4, length: 8}]});
      setTimeout(() => { send({msg: "process_completed", success: true, output: {data: [{url: `${base}/file/chanson.wav`, path: "chanson.wav", mime_type: "audio/wav"}, null, "Generation finished", "[00:01.00]Viens chanter avec moi,\n[00:02.50]on apprend en s’amusant !\n[00:04.00]A, A, comme Avion !\n[00:06.00]B, B, comme Ballon !\n[00:08.00]C, C, comme Chat !\n[00:10.00]Bravo, bravo, on a tout appris !"]}}); res.end(); }, 300); return; }
    if(u.pathname === "/file/chanson.wav"){ res.writeHead(200, {"Content-Type": "audio/wav", "Content-Length": song.length}); return res.end(song); }
    res.writeHead(404); res.end(); }); });
  await new Promise(r => fake.listen(0, "127.0.0.1", r)); const FB = `http://127.0.0.1:${fake.address().port}`;
  const PORT = 3000 + 900 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env: Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "x", GEN_DIR: GEN, ACESTEP_SPACE_URL: FB, ACESTEP1_SPACE_URL: FB, HF_WHOAMI_URL: FB + "/whoami", HF_TOKEN: ""}), stdio: ["ignore", "pipe", "pipe"]});
  let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 1800000});
  try{
    for(let k = 0; k < 80 && !/prêt/.test(log); k++) await wait(100);
    const pg = await b.newPage(); await require("./noauto")(pg);
    const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if(m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await pg.evaluateOnNewDocument(() => { window.__songPoll = 200; window.__localCalls = [];
      const wav = secs => { const sr = 22050, n = Math.round(sr * secs), b = new ArrayBuffer(44 + n * 2), d = new DataView(b), w = (o, s) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0))); w(0, "RIFF"); d.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, sr, true); d.setUint32(28, sr * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, "data"); d.setUint32(40, n * 2, true); for(let i = 0; i < n; i++) d.setInt16(44 + i * 2, Math.round(Math.sin(i / sr * 2 * Math.PI * 220) * 9000), true); return b; };
      window.__localTtsMock = {predict: async ({text, voiceId}) => { window.__localCalls.push({text, voiceId}); return new Blob([wav(1.1)], {type: "audio/x-wav"}); }}; });
    await pg.setRequestInterception(true);
    pg.on("request", r => { if(r.url().includes("/api/sample") && r.method() === "POST") return r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({delta: "{}"}) + "\n"}); r.continue(); });
    await pg.setViewport({width: 390, height: 844, deviceScaleFactor: 1});
    await pg.goto(BASE + "/#lecon", {waitUntil: "networkidle0"});
    await pg.waitForFunction(() => document.querySelectorAll("#lc-models canvas").length === 4, {timeout: 60000});
    /* 1. une leçon sans IA (3 lettres) : ses paroles de chanson sont là d'office, avant la vidéo */
    await pg.evaluate(() => { document.getElementById("lc-more").open = true; document.getElementById("lc-lignes").value = "A | a | Avion | ✈️\nB | bé | Ballon | 🎈\nC | cé | Chat | 🐱"; document.getElementById("lc-sujet").value = "Les lettres A, B, C"; });
    await pg.select("#lc-langue", "fr"); await pg.click("#lc-free");
    await pg.waitForFunction(() => !document.getElementById("lc-s5").hidden, {timeout: 30000});
    const s1 = await pg.evaluate(() => ({lyr: document.getElementById("lc-song-lyrics").value, hf: !document.getElementById("lc-hf").hidden, order: [...document.querySelectorAll("#view-lecon .rc-step h2")].map(h => h.textContent)}));
    check("étape « 4 · La chanson » avant « 5 · La vidéo », paroles d'office (refrain + « A, A, comme Avion ! »…), modifiables", /\[chorus\]/.test(s1.lyr) && /A, A, comme Avion !/.test(s1.lyr) && /C, C, comme Chat !/.test(s1.lyr) && s1.order.some(x => /^4 · La chanson/.test(x)) && s1.order.some(x => /^5 · La vidéo/.test(x)), s1.lyr.split("\n").slice(0, 7).join(" / "));
    /* 2. sans compte : le chanteur refuse (quota), message clair pour relier le compte */
    await pg.click("#lc-song-ace"); await pg.waitForFunction(() => /compte|jeton/.test(document.getElementById("lc-song-msg").textContent) && !document.getElementById("lc-song-ace").disabled, {timeout: 60000});
    const s2 = await pg.evaluate(() => document.getElementById("lc-song-msg").textContent);
    check("sans compte Hugging Face : refus du chanteur expliqué (relier le jeton gratuit), la case du jeton est montrée", /jeton Hugging Face gratuit/.test(s2) && s1.hf, s2.slice(0, 140));
    /* 3. relier le compte : jeton vérifié, jamais renvoyé, case cachée */
    await pg.type("#lc-hf-token", "hf_" + "a1B2c3D4e5F6g7H8i9J0k1L2m3"); await pg.click("#lc-hf-link");
    await pg.waitForFunction(() => /relié/.test(document.getElementById("lc-song-msg").textContent), {timeout: 30000});
    const s3 = await pg.evaluate(async () => ({m: document.getElementById("lc-song-msg").textContent, box: document.getElementById("lc-hf").hidden, st: await (await fetch("/api/gen/hf")).json(), val: document.getElementById("lc-hf-token").value}));
    check("compte Hugging Face relié depuis la page (jeton vérifié chez Hugging Face, jamais renvoyé au navigateur)", /relié \(testeur\)/.test(s3.m) && s3.box && s3.st.linked === true && !JSON.stringify(s3.st).includes("hf_") && s3.val === "", s3.m);
    /* 4. la chanson chantée : paroles, style et langue envoyés, temps des lignes reçus (LRC), lignes reliées aux lettres */
    await pg.select("#lc-song-voice", "enfants"); await pg.click("#lc-song-ace");
    await pg.waitForFunction(() => /Chanson prête/.test(document.getElementById("lc-song-msg").textContent), {timeout: 120000});
    const s4 = await pg.evaluate(() => { const C = __spLecon.L.chanson, P = SP_LECON.plan(__spLecon.L, null, {seconds: C.audio.seconds, lines: C.audio.lines, bpm: 108}), so = P.parts.find(x => x.k === "song");
      return {m: document.getElementById("lc-song-msg").textContent, par: C.audio.par, sec: C.audio.seconds, a: C.audio.lines.map(l => l.a), map: so.lines.map(l => l.i), aud: !document.getElementById("lc-song-audio").hidden}; });
    check("chanson chantée par l'IA : demande authentifiée (jeton), paroles + style + langue + temps des lignes demandés, modèle rapide", seen.auth.slice(-1)[0].startsWith("Bearer hf_") && /A, A, comme Avion !/.test(seen.lyrics) && seen.lrcAsked && seen.lang === "fr" && seen.model === "acestep-v15-turbo" && seen.mode === "custom" && seen.fn === 1 && seen.data.length === 9 && seen.data[7] === 7 && seen.data[8] === null, `${seen.model} · ${seen.lang} · ${seen.data.length} réglages`);
    check("chanson reçue (12 s), 6 lignes calées sur les temps rendus (1 s, 2,5 s, 4 s…), chaque lettre reliée à sa ligne (refrain = toutes les lettres)", s4.par === "ace" && Math.abs(s4.sec - 12) < .1 && s4.a.join() === "1,2.5,4,6,8,10" && s4.map.join() === "-1,-1,0,1,2,-1" && s4.aud, `${s4.a.join(",")} · ${s4.map.join(",")}`);
    /* 5. clip musical : « seulement la chanson », vraie vidéo 9:16 de la durée de la chanson */
    await pg.select("#lc-song-place", "seule"); await pg.select("#lc-fmt", "9:16"); await pg.click("#lc-make");
    await pg.waitForFunction(() => /Vidéo prête|échoué/.test(document.getElementById("lc-vmsg").textContent), {timeout: 1500000});
    const s5 = await pg.evaluate(async () => { const v = __spLecon.videos[0]; let b64 = ""; if(v){ const ab = new Uint8Array(await v.blob.arrayBuffer()); let s = ""; for(let i = 0; i < ab.length; i += 32768) s += String.fromCharCode.apply(null, ab.subarray(i, i + 32768)); b64 = btoa(s); } return {m: document.getElementById("lc-vmsg").textContent, b64, calls: window.__localCalls.length}; });
    const file = path.join(OUT, "lecon-clip-9x16.mp4"); if(s5.b64) fs.writeFileSync(file, Buffer.from(s5.b64, "base64"));
    let probe = ""; try{ execFileSync(FF, ["-hide_banner", "-i", file], {stdio: ["ignore", "ignore", "pipe"]}); }catch(e){ probe = String(e.stderr || ""); }
    const dm = /Duration: (\d+):(\d+):([\d.]+)/.exec(probe), D = dm ? +dm[1] * 3600 + +dm[2] * 60 + +dm[3] : 0;
    check("clip musical : vidéo 1080 × 1920 H.264 + AAC de la durée de la chanson (12,4 s), sans leçon parlée", /1080x1920/.test(probe) && /Audio: aac/.test(probe) && Math.abs(D - 12.4) < .6 && s5.calls === 0, `${D.toFixed(1)} s · ${s5.calls} voix parlées`);
    const png = path.join(OUT, "lecon-clip-avion.png"); try{ execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-ss", "4.8", "-i", file, "-frames:v", "1", "-vf", "scale=360:-2", png]); }catch(e){}
    check(`image du clip quand « Avion » est chanté (contrôle : ${png})`, fs.existsSync(png) && fs.statSync(png).size > 25000, fs.existsSync(png) ? `${fs.statSync(png).size} octets` : "absente");
    /* 6. la chanson de l'application, sans compte : voix posée sur les temps, musique composée */
    await pg.click("#lc-song-app"); await pg.waitForFunction(() => /Chanson prête/.test(document.getElementById("lc-song-msg").textContent) && /application/.test(document.getElementById("lc-song-msg").textContent), {timeout: 300000});
    const s6 = await pg.evaluate(() => { const A = __spLecon.L.chanson.audio; return {par: A.par, sec: A.seconds, n: A.lines.length, a: A.lines.map(l => l.a), url: A.url, voices: window.__localCalls.length}; });
    check("chanson de l'application (sans compte) : chaque ligne dite une fois puis posée sur les temps (mesures de 2,2 s), musique composée autour, enregistrée sur l'ordinateur", s6.par === "app" && s6.n >= 10 && s6.a[0] > 4 && s6.a.every((x, i) => !i || x > s6.a[i - 1]) && s6.sec > s6.a[s6.n - 1] && /^\/generated\//.test(s6.url) && s6.voices >= 8, `${s6.n} lignes · ${s6.sec.toFixed(1)} s · ${s6.voices} voix`);
    const wide = await pg.evaluate(() => document.documentElement.scrollWidth);
    check("téléphone (390 px) : aucun défilement horizontal", wide <= 390, `${wide} px`);
    check("aucune erreur dans la console", !errs.length, errs.slice(0, 3).join(" | "));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  await b.close(); srv.kill(); fake.close(); fs.rmSync(GEN, {recursive: true, force: true, maxRetries: 20, retryDelay: 250}); console.log(out.join("\n")); process.exit(0);
})();
