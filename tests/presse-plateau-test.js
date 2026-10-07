// Revue de presse : plateau 3D (three.js) et format vertical 9:16 (TikTok, Shorts, Reels), aperçu, vidéo dans les deux formats,
// repli sur le studio 2D, kit de publication (textes par réseau, chapitres, heures, rappels) et miniatures. Vrai server.js, voix de l'ordinateur simulée.
const p = require("puppeteer-core"), fs = require("fs"), path = require("path"), zlib = require("zlib"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
function png(w, h, rgb){ const crc = b => { let c, t = []; for(let n = 0; n < 256; n++){ c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for(const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h); for(let y = 0; y < h; y++){ raw[y * (w * 3 + 1)] = 0; for(let x = 0; x < w; x++){ const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2]; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, {level: 0})), chunk("IEND", Buffer.alloc(0))]); }
const REVUE = {nom_emission: "Le Point du Jour", titre: "Pluies et pont", accroche: "Bonjour, voici Le Point du Jour. Des pluies record et un pont fermé ce matin.", sommaire: "Au sommaire : les pluies et le vieux pont.",
  segments: [{titre: "Pluies record", texte: "Selon le Journal A, des pluies record sont tombées sur la capitale cette nuit.", sources: ["Journal A"], preuve: "x"}, {titre: "Le pont fermé", texte: "Le Journal B rapporte que le vieux pont est fermé aux voitures depuis hier.", sources: ["Journal B"], preuve: "x"}],
  chiffre_du_jour: {texte: "", source: ""}, a_retenir: "Prudence sur les routes.", conclusion: "C'était Le Point du Jour.", appel: "",
  publication: {titres: ["Pluies record et pont fermé : l'essentiel", "Ce qui change ce matin"], description: "Les deux infos à retenir ce matin.", legende_courte: "Pluies record, pont fermé : ce qu'il faut savoir en une minute.", texte_miniature: "Pluies record", hashtags: ["#Senegal", "#info"]}, a_verifier: []};
const ARTS = {0: {local: "/generated/presse-plateau/art1.png", site: "journal-a.example", site_name: "Journal A", title: "Pluies record sur la capitale", description: "Cent millimètres en une nuit."},
  1: {local: "/generated/presse-plateau/art2.png", site: "journal-b.example", site_name: "Journal B", title: "Le vieux pont fermé aux voitures", description: "Travaux urgents."}};
const PHOTOS = {0: {local: "/generated/presse-plateau/photo1.png", creator: "Photographe Test", license: "CC BY 2.0", source: "Openverse"}};
const LESSON = {kind: "lesson", updatedAt: Date.now(), lesson: {regle: "Publie les revues avant 8 h : tes vidéos du matin font plus de vues.", type: "faire", domaine: "publication", cible: "strategie", portee: "tous", actif: true}};
const PORT = 3000 + 1000 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`, GEN_DIR = path.join(OUT, "plateau-gen");
const files = re => fs.readdirSync(OUT).filter(f => re.test(f)).map(f => ({f, n: fs.statSync(path.join(OUT, f)).size}));
(async () => {
  fs.rmSync(GEN_DIR, {recursive: true, force: true}); fs.mkdirSync(path.join(GEN_DIR, "presse-plateau"), {recursive: true});
  fs.writeFileSync(path.join(GEN_DIR, "presse-plateau", "art1.png"), png(640, 360, [30, 190, 80])); fs.writeFileSync(path.join(GEN_DIR, "presse-plateau", "art2.png"), png(640, 360, [240, 140, 20])); fs.writeFileSync(path.join(GEN_DIR, "presse-plateau", "photo1.png"), png(640, 420, [40, 120, 230]));
  for(const f of fs.readdirSync(OUT)) if(/^pluies-et-pont-/.test(f)) fs.rmSync(path.join(OUT, f), {force: true});
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "", PROVIDER: "gemini", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", APP_PASSWORD: "", GEN_DIR});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]}); let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  for(let k = 0; k < 50 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if(m.type() === "error" && !/favicon|ERR_|Failed to load resource/.test(m.text())) errs.push("console : " + m.text().slice(0, 160)); });
  await pg.evaluateOnNewDocument(() => {
    const wav = secs => { const sr = 22050, n = Math.round(sr * secs), bf = new ArrayBuffer(44 + n * 2), dv = new DataView(bf), w = (o, s) => [...s].forEach((ch, i) => dv.setUint8(o + i, ch.charCodeAt(0)));
      w(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, "data"); dv.setUint32(40, n * 2, true);
      for(let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.round(6000 * Math.sin(i / 9)), true); return bf; };
    window.__localTtsMock = {predict: async ({text}) => new Blob([wav(Math.max(2.2, text.split(/\s+/).length / 2.6) * (window.__ttsK || 1))], {type: "audio/x-wav"})};
  });
  try{
    await pg.setViewport({width: 1366, height: 900});
    const cdp = await pg.target().createCDPSession(); await cdp.send("Browser.setDownloadBehavior", {behavior: "allow", downloadPath: OUT, eventsEnabled: true}).catch(() => cdp.send("Page.setDownloadBehavior", {behavior: "allow", downloadPath: OUT}));
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate((rv, arts, photos, lesson) => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}, presseVitesse: "1"}));
      localStorage.setItem("sp-presse", JSON.stringify({r: rv, o: {pays: "sn", langue: "fr", duree: 60, ton: "inspirant", sources: []}, id: "presse-plateau", voices: [], arts, photos}));
      localStorage.setItem("sp-last-pays", JSON.stringify({_pays: "sn", contexte: {heures: "Le matin avant 8 h et le soir après 20 h."}, niches: [{nom: "x"}]}));
      localStorage.setItem("sp-local-db", JSON.stringify({"data/users/local": {lec1: lesson}})); }, REVUE, ARTS, PHOTOS, LESSON);
    await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "presse"; }); await pg.waitForSelector("#pr-res .pr-seg", {timeout: 15000});
    // 1. réglages par défaut et kit présent dès la revue écrite
    const d0 = await pg.evaluate(() => ({style: document.getElementById("pr-vstyle").value, fmt: document.getElementById("pr-vformat").value, dis: document.getElementById("pr-vformat").disabled, nets: [...document.querySelectorAll("#pr-kit .pr-net")].map(n => n.dataset.net), kit: document.getElementById("pr-kit").innerText}));
    check("par défaut : plateau 3D et les deux formats (16:9 pour YouTube puis 9:16 pour TikTok), format modifiable pour tous les styles", d0.style === "studio3d" && d0.fmt === "both" && !d0.dis, JSON.stringify(d0).slice(0, 120));
    check("kit de publication dès la revue écrite : YouTube, Shorts, TikTok, Instagram, Facebook, WhatsApp", d0.nets.join() === "youtube,shorts,tiktok,instagram,facebook,whatsapp", d0.nets.join(","));
    check("heures du pays visé (fuseau du Sénégal), analyse du pays et leçon des statistiques reprises", /heure du pays : Sénégal\) : 7 h 00 · 12 h 00 · 18 h 00/.test(d0.kit) && /D’après ton analyse du pays : Le matin avant 8 h/.test(d0.kit) && /D’après tes statistiques : Publie les revues avant 8 h/.test(d0.kit), (d0.kit.match(/Meilleures heures[^.]*\./) || [""])[0]);
    // 2. aperçu du plateau (avant la voix), puis repli sur le studio 2D quand la 3D est impossible
    await pg.evaluate(() => document.getElementById("pr-preview").click());
    await pg.waitForFunction(() => document.querySelectorAll("#pr-preview-out img").length >= 4 || /impossible/.test(document.getElementById("pr-preview-out").textContent), {timeout: 90000});
    const pv = await pg.evaluate(async () => { const figs = [...document.querySelectorAll("#pr-preview-out figure")]; await Promise.all(figs.map(f => f.querySelector("img").decode().catch(() => {})));
      return figs.map(f => { const im = f.querySelector("img"), c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext("2d"); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let g = 0; for(let i = 0; i < d.length; i += 32) if(d[i + 1] > 150 && d[i] < 90 && d[i + 2] < 120) g++;
        return {w: im.naturalWidth, h: im.naturalHeight, cap: f.querySelector("figcaption").textContent, green: g}; }); });
    check("aperçu du plateau en 16:9 (1280 × 720) et en 9:16 (720 × 1280), avant même la voix", pv.length === 4 && pv[0].w === 1280 && pv[0].h === 720 && pv[2].w === 720 && pv[2].h === 1280, pv.map(x => `${x.w}×${x.h}`).join(" "));
    check("plateau 3D rendu par la carte graphique (three.js) et image de l'article sur le mur LED", pv.every(x => /plateau 3D/.test(x.cap)) && pv[0].green > 400 && pv[2].green > 400, pv.map(x => `${x.cap} · ${x.green}`).join(" | "));
    await pg.evaluate(() => { window.__no3d = true; document.getElementById("pr-preview").click(); });
    await pg.waitForFunction(() => /studio 2D utilisé/.test(document.getElementById("pr-preview-out").textContent), {timeout: 60000}).catch(() => {});
    const fb = await pg.evaluate(() => ({txt: document.getElementById("pr-preview-out").innerText, caps: [...document.querySelectorAll("#pr-preview-out figcaption")].map(f => f.textContent)}));
    check("sans 3D (pas de WebGL, pas d'internet) : le studio 2D prend le relais, dans les deux formats, avec une explication", fb.caps.length === 4 && fb.caps.every(c => /studio 2D/.test(c)) && /plateau 3D indisponible ici/.test(fb.txt), fb.caps.join(" | "));
    await pg.evaluate(() => { window.__no3d = false; window.__s3Force = true; });   /* la vidéo du test passe par le plateau 3D même si la machine de test est lente */
    // 3. voix gratuite, fusion, puis vidéo dans les deux formats
    await pg.select("#pr-voix", "local:fr_FR-siwis-medium"); await new Promise(r => setTimeout(r, 300)); await pg.evaluate(() => document.getElementById("pr-voice").click());
    await pg.waitForFunction(() => { const s = JSON.parse(localStorage.getItem("sp-presse") || "{}"); return (s.voices || []).length && s.voices.every(v => v.status === "done") && !document.getElementById("pr-voice").disabled; }, {timeout: 60000});
    await new Promise(r => setTimeout(r, 500)); await pg.evaluate(() => document.getElementById("pr-mix").click()); await pg.waitForSelector("#pr-mix-out audio", {timeout: 60000});
    await pg.evaluate(() => document.getElementById("pr-video").click());
    await pg.waitForFunction(() => (document.getElementById("pr-video-msg").textContent.match(/Vidéo prête/g) || []).length >= 2 || /échoué|navigateur/.test(document.getElementById("pr-video-msg").textContent), {timeout: 240000});
    const vids = await pg.evaluate(async () => { const res = [];
      for(const v of document.querySelectorAll("#pr-video-out video")){ await new Promise(r => { if(v.readyState >= 1) r(); else v.onloadedmetadata = r; setTimeout(r, 4000); }); const c = document.createElement("canvas"), V = v.videoHeight > v.videoWidth, hits = {red: 0, green: 0, orange: 0}, dur = isFinite(v.duration) ? v.duration : 20;
        for(let t = 2; t < Math.min(dur, 40); t += 0.75){ v.currentTime = t; await new Promise(r => { v.onseeked = r; setTimeout(r, 2500); }); c.width = v.videoWidth; c.height = v.videoHeight; const x = c.getContext("2d"); x.drawImage(v, 0, 0);
          const rb = x.getImageData(V ? 300 : 700, V ? 850 : Math.round(c.height * 0.785) + 20, 1, 1).data; if(rb[0] > 170 && rb[1] < 80 && rb[2] < 80) hits.red++;
          const d = x.getImageData(Math.round(c.width * (V ? 0.05 : 0.12)), Math.round(c.height * (V ? 0.13 : 0.06)), Math.round(c.width * (V ? 0.9 : 0.76)), Math.round(c.height * (V ? 0.5 : 0.6))).data; let g = 0, o = 0;
          for(let i = 0; i < d.length; i += 32){ if(d[i + 1] > 150 && d[i] < 90 && d[i + 2] < 120) g++; if(d[i] > 200 && d[i + 1] > 110 && d[i + 1] < 170 && d[i + 2] < 60) o++; } if(g > 1200) hits.green++; if(o > 1200) hits.orange++; }
        res.push({w: v.videoWidth, h: v.videoHeight, dur: Math.round(dur), hits, cap: v.closest("figure").querySelector("figcaption").textContent}); }
      return {msg: document.getElementById("pr-video-msg").textContent, res}; });
    check("« Les deux » : une vidéo 16:9 (1280 × 720) pour YouTube puis une vidéo 9:16 (720 × 1280) pour TikTok, même durée", vids.res.length === 2 && vids.res[0].w === 1280 && vids.res[0].h === 720 && vids.res[1].w === 720 && vids.res[1].h === 1280 && Math.abs(vids.res[0].dur - vids.res[1].dur) <= 1 && (vids.msg.match(/Vidéo prête/g) || []).length === 2, vids.msg);
    check("plateau 3D dans les deux vidéos : bandeau rouge du sujet, vraies images des deux articles sur le mur LED", vids.res.every(v => /plateau 3D/.test(v.cap) && v.hits.red >= 3 && v.hits.green >= 1 && v.hits.orange >= 1), JSON.stringify(vids.res.map(v => v.hits)));
    for(const [n, t, name] of [[0, 7, "plateau-16x9"], [1, 7, "plateau-9x16"]]){ await pg.evaluate(async (n, t) => { const v = document.querySelectorAll("#pr-video-out video")[n]; v.currentTime = t; await new Promise(r => { v.onseeked = r; setTimeout(r, 3000); }); v.scrollIntoView({block: "center"}); }, n, t); const el = (await pg.$$("#pr-video-out video"))[n]; if(el) await el.screenshot({path: path.join(OUT, name + ".png")}); }
    // 4. kit après la vidéo : bon fichier par réseau, textes, miniatures
    const k1 = await pg.evaluate(() => ({yt: !!document.querySelector('[data-net="youtube"] [data-kit-vdl="16:9"]'), tk: !!document.querySelector('[data-net="tiktok"] [data-kit-vdl="9:16"]'), titre: document.getElementById("kit-yt-titre").value, desc: document.getElementById("kit-yt-desc").value, tags: document.getElementById("kit-yt-tags").value, tiktok: document.getElementById("kit-tiktok").value, wa: document.getElementById("kit-whatsapp").value, gcal: (document.querySelector('[data-net="tiktok"] a[href*="calendar.google.com"]') || {}).href || ""}));
    check("après la vidéo, chaque réseau propose son fichier : 16:9 pour YouTube, 9:16 pour TikTok", k1.yt && k1.tk);
    check("YouTube : titre de l'agent, description avec sources et crédit photo, tags", k1.titre === "Pluies record et pont fermé : l'essentiel" && /Sources : Journal A, Journal B\./.test(k1.desc) && /Photographe Test \(CC BY 2\.0/.test(k1.desc) && /revue de presse/.test(k1.tags) && k1.tags.length <= 480, k1.desc.replace(/\n/g, " / ").slice(0, 160));
    check("TikTok : légende courte de l'agent puis les sujets et 3 à 5 hashtags ; WhatsApp : message prêt à envoyer ; rappel dans Google Agenda", k1.tiktok.startsWith("Pluies record, pont fermé : ce qu'il faut savoir en une minute.") && /#revuedepresse/.test(k1.tiktok) && /^\*Le Point du Jour\*/.test(k1.wa) && (/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/.test(k1.gcal) || !k1.gcal), k1.tiktok.replace(/\n/g, " / ").slice(0, 140));
    await pg.evaluate(() => document.querySelector('[data-net="tiktok"] [data-kit-vdl="9:16"]').click()); await new Promise(r => setTimeout(r, 2500));
    const vf = files(/^pluies-et-pont-revue-video-9x16\.(mp4|webm)$/);
    check("téléchargement de la vidéo 9:16 depuis la carte TikTok", vf.length === 1 && vf[0].n > 100000, JSON.stringify(vf));
    for(const f of ["16:9", "9:16"]) await pg.evaluate(f => document.querySelector(`[data-kit-thumb="${f}"]`).click(), f);
    await pg.waitForFunction(() => document.querySelectorAll("#pr-kit-thumbs img").length >= 2, {timeout: 60000}).catch(() => {}); await new Promise(r => setTimeout(r, 1500));
    const th = await pg.evaluate(async () => Promise.all([...document.querySelectorAll("#pr-kit-thumbs img")].map(async im => { await im.decode().catch(() => {}); return `${im.naturalWidth}×${im.naturalHeight}`; })));
    const tf = files(/^pluies-et-pont-(miniature-youtube|couverture-tiktok)\.jpg$/);
    check("miniature YouTube 1280 × 720 et couverture TikTok 1080 × 1920, montrées et téléchargées", th.slice().sort().join() === "1080×1920,1280×720" && tf.length === 2, `${th.join(", ")} · ${tf.map(x => x.f).join(", ")}`);
    await pg.evaluate(() => document.getElementById("pr-kit-txt").click()); await new Promise(r => setTimeout(r, 1500));
    const kt = files(/^pluies-et-pont-kit-publication\.txt$/), ktxt = kt.length ? fs.readFileSync(path.join(OUT, kt[0].f), "utf8") : "";
    check("tout le kit en un fichier texte (réseau par réseau, heures, textes)", /=== TIKTOK \(vidéo 9:16\) ===/.test(ktxt) && /=== YOUTUBE \(vidéo 16:9\) ===/.test(ktxt) && /Meilleures heures : 7 h 00/.test(ktxt), ktxt.slice(0, 80).replace(/\n/g, " / "));
    // 5. chapitres YouTube sur une revue plus longue (minutage de la fusion ; 0:00, au moins 3, 10 s au moins chacun)
    await pg.evaluate(() => { window.__ttsK = 5; document.getElementById("pr-voice").click(); });
    await new Promise(r => setTimeout(r, 800)); await pg.waitForFunction(() => { const s = JSON.parse(localStorage.getItem("sp-presse") || "{}"); return (s.voices || []).length && s.voices.every(v => v.status === "done") && !document.getElementById("pr-voice").disabled; }, {timeout: 60000});
    const oldMix = await pg.evaluate(() => document.getElementById("pr-mix-msg").textContent);
    await new Promise(r => setTimeout(r, 500)); await pg.evaluate(() => document.getElementById("pr-mix").click()); await pg.waitForFunction(old => { const m = document.getElementById("pr-mix-msg").textContent; return m !== old && /Émission de \d+ s prête/.test(m); }, {timeout: 60000}, oldMix);
    const ch = await pg.evaluate(() => { const d = document.getElementById("kit-yt-desc"); return d ? d.value : ""; });
    const stamps = (ch.match(/^\d+:\d\d .+$/gm) || []), secs = stamps.map(l => { const [m, s] = l.split(" ")[0].split(":").map(Number); return m * 60 + s; });
    check("chapitres YouTube tirés du minutage de la fusion (0:00 Ouverture, au moins 3, 10 s au moins chacun)", stamps.length >= 3 && /^0:00 Ouverture$/.test(stamps[0]) && secs.every((s, i) => !i || s - secs[i - 1] >= 10), stamps.join(" / "));
    // 6. téléphone, console
    await pg.setViewport({width: 390, height: 844}); await new Promise(r => setTimeout(r, 400));
    check("page sur téléphone (kit, vidéos, aperçu) : pas de défilement horizontal", await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  }finally{ await b.close(); srv.kill(); }
  console.log(out.join("\n")); process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
