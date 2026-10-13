// « Garder la voix, refaire l'image » côté serveur (recitation.js) : envoi d'une vidéo, voix gardée et vidéo d'origine supprimée,
// pauses repérées par FFmpeg, texte du Coran (si Internet), vidéo refaite reçue en morceaux puis voix remise (avec ou sans ambiance).
// Le serveur de test est lancé ici, avec un dossier séparé. Les fichiers d'essai sont fabriqués par FFmpeg.
const http = require("http"), path = require("path"), fs = require("fs"), {spawn, execFileSync} = require("child_process");
const {OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const FF = require(path.join(__dirname, "..", "node_modules", "ffmpeg-static")), F = n => path.join(OUT, n), GEN = path.join(OUT, "gen-recit");
/* 7 « versets » (sons de 2 à 4 s) séparés par des pauses d'1 s, sur une image noire : une vraie vidéo avec du son */
const DUR = [3, 2, 4, 2.5, 3, 2, 3];
if(!fs.existsSync(F("recit-7.mp4"))){ const parts = []; DUR.forEach((d, i) => { parts.push(`sine=f=${220 + i * 40}:r=44100:d=${d}[s${i}]`, `anullsrc=r=44100:cl=mono:d=1[p${i}]`); });
  const chain = DUR.map((d, i) => `[s${i}][p${i}]`).join(""), total = DUR.reduce((a, b) => a + b, 0) + DUR.length;
  execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", `color=c=black:s=320x240:r=10:d=${total}`, "-filter_complex", `${parts.join(";")};${chain}concat=n=${DUR.length * 2}:v=0:a=1[a]`, "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", F("recit-7.mp4")]); }
/* une « vidéo refaite » sans son, de la même durée */
if(!fs.existsSync(F("recit-image.mp4"))) execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=s=320x240:r=10:d=26.5", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "frag_keyframe+empty_moov", F("recit-image.mp4")]);
const req = (BASE, method, p, body, type) => new Promise(resolve => { const b = body == null ? null : Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
  const r = http.request(BASE + p, {method, headers: Object.assign({"Content-Type": type || "application/json"}, b ? {"Content-Length": b.length} : {})}, res => { let raw = ""; res.on("data", d => raw += d); res.on("end", () => { let j = {}; try{ j = JSON.parse(raw); }catch(e){} resolve({status: res.statusCode, j}); }); });
  r.on("error", e => resolve({status: 0, j: {message: e.message}})); if(b) r.write(b); r.end(); });
const waitJob = async (BASE, id, ms) => { const t0 = Date.now(); for(;;){ const s = await req(BASE, "GET", `/api/recit/status?id=${id}`); if(s.j.state === "done" || s.j.state === "failed" || Date.now() - t0 > ms) return s.j; await new Promise(r => setTimeout(r, 400)); } };
const probe = f => { try{ execFileSync(FF, ["-hide_banner", "-i", f], {stdio: ["ignore", "ignore", "pipe"]}); }catch(e){ return String(e.stderr || ""); } return ""; };
(async () => {
  fs.rmSync(GEN, {recursive: true, force: true});
  const PORT = 3000 + 400 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env: Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "x", GEN_DIR: GEN}), stdio: ["ignore", "pipe", "pipe"]});
  let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  try{
    for(let k = 0; k < 80 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
    const up = await req(BASE, "POST", "/api/recit/upload?name=" + encodeURIComponent("récitation.mp4"), fs.readFileSync(F("recit-7.mp4")), "application/octet-stream");
    check("envoi d'une vidéo (lue au fil de l'eau)", up.status === 200 && /^[a-f0-9]{12}$/.test(up.j.id), JSON.stringify(up.j));
    const id = up.j.id; await req(BASE, "POST", "/api/recit/analyze", {id, noise: -35, minPause: .45});
    const an = await waitJob(BASE, id, 60000), r = an.result || {};
    const exp = []; let t = 0; DUR.forEach(d => { exp.push([t, t + d]); t += d + 1; });
    const close = (r.speech || []).length === 7 && r.speech.every((s, i) => Math.abs(s.a - exp[i][0]) < .15 && Math.abs(s.b - exp[i][1]) < .15);
    check("analyse : 7 morceaux de parole repérés aux bons endroits (pauses d'1 s)", an.state === "done" && close, JSON.stringify((r.speech || []).map(s => `${s.a}-${s.b}`)));
    const dir = path.join(GEN, `recit-${id}`), files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    check("seule la voix est gardée : voix.m4a créée, la vidéo d'origine supprimée (place sur le disque)", files.includes("voix.m4a") && !files.some(f => /^source\./.test(f)) && Math.abs(r.duration - 26.5) < .3, files.join(", ") + ` · ${r.duration} s`);
    const voice = await new Promise(res => http.get(BASE + r.audio, {headers: {Range: "bytes=1000-1999"}}, x => { x.resume(); res(x.statusCode); }));
    check("la voix se lit à partir de n'importe quel moment (indispensable pour 5 h)", voice === 206, String(voice));
    /* le fichier vidéo a été supprimé, mais un nouveau réglage des pauses doit pouvoir réanalyser la voix gardée */
    await req(BASE, "POST", "/api/recit/analyze", {id, noise: -34, minPause: .3});
    const an2 = await waitJob(BASE, id, 60000), r2 = an2.result || {};
    check("nouvelle analyse possible après suppression de la vidéo source : la voix gardée suffit", an2.state === "done" && (r2.speech || []).length === 7 && !fs.readdirSync(dir).some(f => /^source\./.test(f)), an2.error || JSON.stringify((r2.speech || []).map(s => `${s.a}-${s.b}`)));
    /* texte du Coran */
    const s1 = await req(BASE, "GET", "/api/recit/quran/surah?n=1");
    if(s1.status === 200){ check("Coran : Al-Fatiha, 7 versets en écriture uthmani + traduction, source citée", s1.j.versets.length === 7 && /^بِسْمِ/.test(s1.j.versets[0].ar) && /Allah/.test(s1.j.versets[0].tr) && /Tanzil|alquran/.test(s1.j.source), `${s1.j.nom} · ${s1.j.versets.length} versets`);
      const s67 = await req(BASE, "GET", "/api/recit/quran/surah?n=67");
      check("Coran : la basmala est séparée du premier verset (sourate 67), pour l'afficher comme ouverture", s67.j.versets.length === 30 && !/^بِسْمِ/.test(s67.j.versets[0].ar) && /^بِسْمِ/.test(s67.j.basmala || ""), (s67.j.versets[0] || {}).ar);
      const s1b = await req(BASE, "GET", "/api/recit/quran/surah?n=1"); check("Coran : gardé en cache sur l'ordinateur", s1b.status === 200 && fs.existsSync(path.join(GEN, "_textes", "coran", "1-fr.hamidullah.json")), "");
    } else out.push(`(pas d'Internet : texte du Coran non testé — ${s1.j.message || s1.status})`);
    /* vidéo refaite : 2 morceaux écrits à leur position, puis la voix remise */
    const st = await req(BASE, "POST", "/api/recit/render/start", {id}), rid = st.j.rid, img = fs.readFileSync(F("recit-image.mp4")), half = Math.floor(img.length / 2);
    const c2 = await req(BASE, "PUT", `/api/recit/render/chunk?id=${id}&rid=${rid}&pos=${half}`, img.subarray(half), "application/octet-stream");
    const c1 = await req(BASE, "PUT", `/api/recit/render/chunk?id=${id}&rid=${rid}&pos=0`, img.subarray(0, half), "application/octet-stream");
    await req(BASE, "POST", "/api/recit/render/finish", {id, rid, duration: 26.5, nom: "Al-Fatiha"});
    const fin = await waitJob(BASE, rid, 60000), outF = fin.result ? path.join(GEN, `recit-${id}`, fin.result.name) : "", pr = outF ? probe(outF) : "";
    check("vidéo refaite reçue en 2 morceaux (dans le désordre), puis la voix d'origine remise : image + son, même durée", c1.status === 200 && c2.status === 200 && fin.state === "done" && /Video: h264/.test(pr) && /Audio: aac/.test(pr) && /Duration: 00:00:26/.test(pr), (fin.error || "") + " " + ((pr.match(/Duration: [^,]+/) || [""])[0]));
    /* avec une ambiance très douce en boucle */
    const st2 = await req(BASE, "POST", "/api/recit/render/start", {id}), rid2 = st2.j.rid;
    await req(BASE, "PUT", `/api/recit/render/chunk?id=${id}&rid=${rid2}&pos=0`, img, "application/octet-stream");
    execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "anoisesrc=d=5:c=pink:a=0.3", F("ambiance-test.wav")]);
    await req(BASE, "PUT", `/api/recit/ambiance?id=${id}`, fs.readFileSync(F("ambiance-test.wav")), "audio/wav");
    await req(BASE, "POST", "/api/recit/render/finish", {id, rid: rid2, duration: 26.5, nom: "avec-ambiance", ambiance: true, volume: .08});
    const fin2 = await waitJob(BASE, rid2, 60000), pr2 = fin2.result ? probe(path.join(GEN, `recit-${id}`, fin2.result.name)) : "";
    check("avec une ambiance en boucle (5 s répétées sur 26 s, très douce) : son mélangé, durée gardée", fin2.state === "done" && /Audio: aac/.test(pr2) && /Duration: 00:00:26/.test(pr2), fin2.error || (pr2.match(/Duration: [^,]+/) || [""])[0]);
    check("la vidéo sans son envoyée par morceaux est supprimée après la finition (place sur le disque)", !fs.readdirSync(path.join(GEN, `recit-${id}`)).some(f => /^image-/.test(f)), fs.readdirSync(path.join(GEN, `recit-${id}`)).join(", "));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  srv.kill(); fs.rmSync(GEN, {recursive: true, force: true}); console.log(out.join("\n")); process.exit(0);
})();
