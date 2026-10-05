// Pré-montage : 3 clips de test (rouge, vert, bleu) → vidéo de 6 s, dans l'ordre des plans, avec le son.
const p = require("puppeteer-core"), fs = require("fs"), path = require("path");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const PROJ = {kind: "project", titre: "Test montage", idee: "x", params: {style: "realiste", format: "16:9", duree: "6", langue: "fr", outil: "veo"},
  result: {titre: "Test montage", personnages: [], plans: [1, 2, 3].map(n => ({n, debut: `0:0${(n - 1) * 2}`, fin: `0:0${n * 2}`, intention: `Plan ${n}`, voix_off: `Phrase du plan ${n}`, personnages: [], cadrage_en: "Wide", action_en: "x", camera_en: "y", decor_en: "z", note: 8})), audio: {}, montage: [], youtube: {titres: []}},
  createdAt: Date.now(), updatedAt: Date.now()};
(async () => {
  const b = await p.launch({executablePath: require("./env").EDGE, headless: true, args: ["--autoplay-policy=no-user-gesture-required"]});
  const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.setViewport({width: 1366, height: 900});
  await pg.goto(require("./env").BASE + "/#accueil", {waitUntil: "networkidle0"});
  // 1. fabrique 3 clips de test (2,5 s, couleur unie + numéro + son)
  for(const [name, color, hz] of [["P01-rouge.webm", "#ff0000", 440], ["zz-vert.webm", "#00ff00", 660], ["P03-bleu.webm", "#0000ff", 880]]){
    const b64 = await pg.evaluate(async (color, hz) => {
      const c = document.createElement("canvas"); c.width = 320; c.height = 180; const g = c.getContext("2d");
      const ac = new AudioContext(), osc = ac.createOscillator(), dst = ac.createMediaStreamDestination(); osc.frequency.value = hz; osc.connect(dst); osc.start();
      const rec = new MediaRecorder(new MediaStream([...c.captureStream(30).getVideoTracks(), ...dst.stream.getAudioTracks()]), {mimeType: "video/webm"}), ch = [];
      rec.ondataavailable = e => ch.push(e.data); rec.start(200);
      const t0 = performance.now(); await new Promise(res => { const f = () => { g.fillStyle = color; g.fillRect(0, 0, 320, 180); if(performance.now() - t0 > 2500) return res(); requestAnimationFrame(f); }; f(); });
      await new Promise(res => { rec.onstop = res; rec.stop(); }); osc.stop(); ac.close();
      const buf = new Uint8Array(await new Blob(ch).arrayBuffer()); let s = ""; for(let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return btoa(s);
    }, color, hz);
    fs.writeFileSync(path.join(require("./env").OUT, name), Buffer.from(b64, "base64"));
  }
  // 2. projet de 3 plans de 2 s
  await pg.evaluate(pr => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); localStorage.setItem("sp-local-db", JSON.stringify({"data/users/local": {mont1: pr}})); }, PROJ);
  await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "projets"; }); await new Promise(r => setTimeout(r, 400));
  await pg.click('#list-projects [data-open="mont1"]'); await pg.waitForSelector('[data-ptab="montage"]'); await pg.click('[data-ptab="montage"]');
  await (await pg.$("#pm-clips")).uploadFile(...["P01-rouge.webm", "zz-vert.webm", "P03-bleu.webm"].map(f => path.join(require("./env").OUT, f)));
  await new Promise(r => setTimeout(r, 500));
  const map = await pg.$$eval("#pm-map select", s => s.map(x => x.options[x.selectedIndex].text));
  check("clips placés : P01 → plan 1, P03 → plan 3, sans numéro → plan 2", map.join() === "P01-rouge.webm,zz-vert.webm,P03-bleu.webm", map.join(" | "));
  const t0 = Date.now(); await pg.click("#pm-go");
  await pg.waitForSelector("#pm-out video", {timeout: 60000});
  const info = await pg.evaluate(async () => {
    const v = document.querySelector("#pm-out video"); await new Promise(r => { if(v.readyState >= 1) r(); else v.onloadedmetadata = r; });
    if(!isFinite(v.duration)){ v.currentTime = 1e6; await new Promise(r => { v.onseeked = r; }); }
    const dur = v.duration, c = document.createElement("canvas"); c.width = 64; c.height = 36; const g = c.getContext("2d"), cols = [];
    for(const t of [1, 3, 5]){ v.currentTime = t; await new Promise(r => { v.onseeked = r; }); g.drawImage(v, 0, 0, 64, 36); const d = g.getImageData(32, 10, 1, 1).data; cols.push(d[0] > 150 && d[1] < 100 ? "rouge" : d[1] > 150 && d[0] < 100 ? "vert" : d[2] > 150 && d[0] < 100 ? "bleu" : `?${d[0]},${d[1]},${d[2]}`); }
    return {dur, cols, txt: document.querySelector("#pm-out p").textContent};
  });
  check("vidéo produite (MP4) avec bouton de téléchargement", /MP4/.test(info.txt) && !!(await pg.$("#pm-dl")), info.txt);
  check("durée totale ≈ 6 s (3 plans de 2 s, clips de 2,5 s coupés)", Math.abs(info.dur - 6) < 0.8, `${info.dur.toFixed(2)} s, monté en ${Math.round((Date.now() - t0) / 1000)} s`);
  check("ordre des plans respecté : rouge → vert → bleu", info.cols.join() === "rouge,vert,bleu", info.cols.join(" → "));
  const snd = await pg.evaluate(async () => { const url = document.querySelector("#pm-out video").src, buf = await (await fetch(url)).arrayBuffer(); try{ const ab = await new AudioContext().decodeAudioData(buf), d = ab.getChannelData(0); let e = 0; for(let i = 0; i < d.length; i += 50) e += d[i] * d[i]; return {s: ab.duration, rms: Math.sqrt(e / (d.length / 50))}; }catch(x){ return {err: String(x)}; } });
  check("le son des clips est dans la vidéo", snd.rms > 0.01, JSON.stringify(snd));
  check("aucune erreur JavaScript", errs.length === 0, errs.join(" | "));
  await b.close(); console.log(out.join("\n"));
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.message); });
