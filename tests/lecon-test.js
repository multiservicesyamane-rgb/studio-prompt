// Leçons animées : 3 modèles cinématiques (Grand Théâtre, Daara de lumière, Grande Aventure) pour n'importe quelle leçon, FR / AR / EN (14 octobre).
// Page sur 390 px, exemples sans IA, leçon écrite par l'agent (simulé), garde du Coran (jamais lu par une voix de synthèse), voix gratuites simulées,
// vraie vidéo H.264 + AAC 1080 × 1920 vérifiée par FFmpeg. Serveur de test séparé ; aucune IA réelle, aucun quota.
const p = require("puppeteer-core"), path = require("path"), fs = require("fs"), {spawn, execFileSync} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const FF = require(path.join(__dirname, "..", "node_modules", "ffmpeg-static")), GEN = path.join(OUT, "gen-lecon"), wait = ms => new Promise(r => setTimeout(r, ms));
const LESSON = {titre: "حُرُوفٌ وَكَلِمَاتٌ", sous_titre: "Trois lettres", intro: "مَرْحَبًا يَا أَطْفَالُ!", fin: "أَحْسَنْتُمْ!", quiz: true,
  items: [{cle: "بَ", nom: "باء", phon: "ba", mot: "بَطَّةٌ", image: "🦆", sens: "canard", voix: "هَذَا حَرْفُ الْبَاءِ", repete: 1},
    {cle: "تَ", nom: "تاء", phon: "ta", mot: "تُفَّاحَةٌ", image: "🍎", sens: "pomme", voix: "هَذَا حَرْفُ التَّاءِ", repete: 1},
    {cle: "الحمد", nom: "", texte: "الحمد لله رب العالمين الرحمن الرحيم", voix: "", repete: 0}],
  publication: {titre: "Les lettres arabes en chantant", description: "Une leçon douce.", hashtags: ["#arabe"]}};
(async () => {
  fs.rmSync(GEN, {recursive: true, force: true, maxRetries: 20, retryDelay: 250}); require("./coran-cache")(GEN);
  const PORT = 3000 + 800 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env: Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "x", GEN_DIR: GEN}), stdio: ["ignore", "pipe", "pipe"]});
  let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 1800000});
  try{
    for(let k = 0; k < 80 && !/prêt/.test(log); k++) await wait(100);
    const pg = await b.newPage(); await require("./noauto")(pg);
    const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if(m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await pg.evaluateOnNewDocument(() => {
      window.__localCalls = [];
      const wav = secs => { const sr = 22050, n = Math.round(sr * secs), b = new ArrayBuffer(44 + n * 2), d = new DataView(b), w = (o, s) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0))); w(0, "RIFF"); d.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, sr, true); d.setUint32(28, sr * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, "data"); d.setUint32(40, n * 2, true); for(let i = 0; i < n; i++) d.setInt16(44 + i * 2, Math.round(Math.sin(i / sr * 2 * Math.PI * 200) * 12000 * Math.abs(Math.sin(i / sr * 9))), true); return b; };
      window.__localTtsMock = {predict: async ({text, voiceId}) => { window.__localCalls.push({text, voiceId}); return new Blob([wav(1)], {type: "audio/x-wav"}); }};
    });
    let asked = 0; await pg.setRequestInterception(true);
    pg.on("request", r => { if(!(r.url().includes("/api/sample") && r.method() === "POST")) return r.continue(); const body = r.postData() || "";
      if(/LEÇON ANIMÉE/.test(body)){ asked++; return r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({delta: JSON.stringify(LESSON)}) + "\n"}); }
      r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({delta: "{}"}) + "\n"}); });
    await pg.setViewport({width: 390, height: 844, deviceScaleFactor: 1});
    await pg.goto(BASE + "/#lecon", {waitUntil: "networkidle0"});
    await pg.waitForFunction(() => document.querySelectorAll("#lc-models canvas").length === 4, {timeout: 60000}); await wait(1500);
    /* 1. les 3 modèles, chacun avec un vrai moment de leçon dessiné, tous différents */
    const s1 = await pg.evaluate(() => { const cs = [...document.querySelectorAll("#lc-models canvas")], sig = c => { const x = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let s = 0; for(let i = 0; i < x.length; i += 997) s += x[i]; return s; };
      return {names: [...document.querySelectorAll("#lc-models b")].map(x => x.textContent), sig: cs.map(sig), tab: [...document.querySelectorAll(".grp-tabs button")].map(x => x.textContent).join(" | ")}; });
    check("« Créer » : onglet « 🎓 Leçon animée » ; 4 modèles (Grand Théâtre, Daara de lumière, Grande Aventure, Capsule pédagogique) dessinés par le moteur, tous différents", /Leçon animée/.test(s1.tab) && s1.names.join() === "Grand Théâtre,Daara de lumière,Grande Aventure,Capsule pédagogique" && s1.sig.every(x => x > 1000) && new Set(s1.sig).size === 4, s1.names.join(", "));
    /* 2. sans IA : l'alphabet arabe prêt (28 lettres, un mot et une image chacune), dans la Daara */
    await pg.evaluate(() => { document.getElementById("lc-more").open = true; }); await pg.click('[data-lc-preset="ar_abc"]');
    await pg.waitForFunction(() => document.querySelectorAll("#lc-prev img").length === 3, {timeout: 60000});
    const s2 = await pg.evaluate(() => ({n: document.querySelectorAll("#lc-items .lc-item").length, model: document.querySelector('#lc-models [aria-checked="true"]').dataset.lcModel, cle: document.querySelector("#lc-items .lc-cle").value, mot: document.querySelector("#lc-items .lc-mot").value, emo: document.querySelector("#lc-items .lc-emo").value, imgs: document.querySelectorAll("#lc-prev img").length}));
    check("sans IA : « Alphabet arabe » prêt — 28 lettres avec un mot et une image (ا, أَرْنَبٌ, 🐇), modèle Daara, aperçu de 3 moments", s2.n === 28 && s2.model === "daara" && s2.cle === "ا" && s2.mot === "أَرْنَبٌ" && s2.emo === "🐇" && s2.imgs === 3, JSON.stringify(s2));
    /* 3. changer de modèle : la même leçon passe au Grand Théâtre */
    await pg.click('[data-lc-model="theatre"]'); await wait(1200);
    const s3 = await pg.evaluate(() => ({m: __spLecon.L.modele}));
    check("changer de modèle d'un clic : la leçon passe au Grand Théâtre", s3.m === "theatre", s3.m);
    /* 4. l'agent écrit la leçon (simulé) */
    await pg.select("#lc-langue", "ar"); await pg.click('[data-lc-model="daara"]'); await pg.evaluate(() => { document.getElementById("lc-sujet").value = "Deux lettres arabes et un verset"; }); await pg.click("#lc-go");
    await pg.waitForFunction(() => /Leçon prête/.test(document.getElementById("lc-msg").textContent), {timeout: 60000});
    const s4 = await pg.evaluate(() => ({n: document.querySelectorAll("#lc-items .lc-item").length, titre: document.getElementById("lc-titre").value, pub: document.getElementById("lc-pub").value}));
    check("l'agent écrit la leçon (titre, éléments, publication), avec la grammaire des leçons de référence dans la consigne", asked === 1 && s4.n === 3 && s4.titre === "حُرُوفٌ وَكَلِمَاتٌ" && /Les lettres arabes en chantant/.test(s4.pub), `${s4.n} éléments · ${s4.titre}`);
    /* 5. vraie vidéo 9:16 Full HD : voix (relais gratuit simulé), chœur, quiz ; le verset n'est jamais lu par la voix */
    await pg.select("#lc-fmt", "9:16"); await pg.select("#lc-voix", "auto"); await pg.select("#lc-amb", "vent");
    const t0 = Date.now(); await pg.click("#lc-make");
    await pg.waitForFunction(() => /Vidéo prête|échoué|arrêtée/.test(document.getElementById("lc-vmsg").textContent), {timeout: 1500000});
    const s5 = await pg.evaluate(async () => { const LC = __spLecon, v = LC.videos[0] || null, calls = window.__localCalls.map(x => x.text);
      let b64 = ""; if(v){ const ab = new Uint8Array(await v.blob.arrayBuffer()); let s = ""; for(let i = 0; i < ab.length; i += 32768) s += String.fromCharCode.apply(null, ab.subarray(i, i + 32768)); b64 = btoa(s); }
      return {msg: document.getElementById("lc-vmsg").textContent, calls, voices: [...new Set(window.__localCalls.map(x => x.voiceId))], b64, w: v && v.w, h: v && v.h, pro: v && v.pro, sec: v && v.seconds, muet: LC.L.muet || [], fig: document.querySelectorAll("#lc-vids video").length}; });
    const file = path.join(OUT, "lecon-daara-9x16.mp4"); if(s5.b64) fs.writeFileSync(file, Buffer.from(s5.b64, "base64"));
    let probe = ""; try{ execFileSync(FF, ["-hide_banner", "-i", file], {stdio: ["ignore", "ignore", "pipe"]}); }catch(e){ probe = String(e.stderr || ""); }
    const dur = (/Duration: (\d+):(\d+):([\d.]+)/.exec(probe) || []).slice(1).map(Number), D = dur.length ? dur[0] * 3600 + dur[1] * 60 + dur[2] : 0;
    check("vidéo Full HD 1080 × 1920 : H.264 + AAC, durée de la leçon, montrée et téléchargeable", s5.pro && s5.w === 1080 && s5.h === 1920 && /Video: h264/.test(probe) && /Audio: aac/.test(probe) && D > 15 && Math.abs(D - s5.sec) < 1.5 && s5.fig === 1, `${s5.w} × ${s5.h} · ${D.toFixed(1)} s · ${Math.round((Date.now() - t0) / 1000)} s de fabrication`);
    check("le verset du Coran n'est jamais lu par la voix de synthèse (repéré sur le texte du Coran) ; les autres phrases sont dites en arabe par le relais gratuit (voix Kareem)", s5.muet.length >= 1 && !s5.calls.some(t => /الحمد لله رب العالمين/.test(t)) && s5.calls.some(t => /هَذَا حَرْفُ الْبَاءِ/.test(t)) && s5.voices.includes("ar_JO-kareem-medium"), `${s5.muet.join(",")} muet · ${s5.calls.length} voix · ${s5.voices.join(",")}`);
    /* une image de la vidéo : la tablette et la classe sont bien là (pas d'image noire) */
    const png = path.join(OUT, "lecon-daara-image.png"); try{ execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-ss", "8", "-i", file, "-frames:v", "1", "-vf", "scale=360:-2", png]); }catch(e){}
    const big = fs.existsSync(png) ? fs.statSync(png).size : 0; check(`image de la vidéo à 8 s non vide (contrôle : ${png})`, big > 30000, `${big} octets`);
    const wide = await pg.evaluate(() => document.documentElement.scrollWidth);
    check("téléphone (390 px) : aucun défilement horizontal", wide <= 390, `${wide} px`);
    check("aucune erreur dans la console", !errs.length, errs.slice(0, 3).join(" | "));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  await b.close(); srv.kill(); fs.rmSync(GEN, {recursive: true, force: true, maxRetries: 20, retryDelay: 250}); console.log(out.join("\n")); process.exit(0);
})();
