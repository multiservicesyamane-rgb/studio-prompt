// Revue de presse « Grand écran » : vrai server.js face à un FAUX Google Actualités (liens d'articles à décoder) et à de FAUX sites d'info.
// Vrais articles retrouvés derrière les liens, image « à la une » de chaque article (og:image, ou l'image qui porte le titre),
// voix de studio renforcée, vidéo 16:9 en studio télé virtuel (mur d'écran, bandeau rouge, image de l'article à l'écran).
const p = require("puppeteer-core"), http = require("http"), fs = require("fs"), path = require("path"), zlib = require("zlib"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
function png(w, h, rgb){ const crc = b => { let c, t = []; for(let n = 0; n < 256; n++){ c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for(const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h); for(let y = 0; y < h; y++){ raw[y * (w * 3 + 1)] = 0; for(let x = 0; x < w; x++){ const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2]; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, {level: 0})), chunk("IEND", Buffer.alloc(0))]); }
const IMG = {"art1.png": png(640, 360, [30, 190, 80]), "photo-pont.png": png(640, 360, [240, 140, 20])};
const seen = {decode: 0, prompt: ""};
const fake = http.createServer((req, res) => { const c = []; req.on("data", x => c.push(x)); req.on("end", () => {
  const u = new URL(req.url, "http://x"), F0 = `http://127.0.0.1:${fake.address().port}`, send = (code, o, type) => { res.writeHead(code, {"Content-Type": type || "application/json"}); res.end(typeof o === "string" ? o : JSON.stringify(o)); };
  const item = (t, s, id) => `<item><title>${t} - ${s}</title><link>${F0}/rss/articles/${id}?oc=5</link><pubDate>Tue, 06 Oct 2026 08:00:00 GMT</pubDate><source url="https://x.sn">${s}</source></item>`;
  if(u.pathname === "/rss") return send(200, `<?xml version="1.0"?><rss><channel>${item("Pluies record sur la capitale", "Le Journal A", "AAA")}${item("Le vieux pont fermé aux voitures", "Info Deux", "BBB")}</channel></rss>`, "application/rss+xml");
  if(u.pathname === "/rss/search") return send(200, `<?xml version="1.0"?><rss><channel></channel></rss>`, "application/rss+xml");
  if(u.pathname.startsWith("/rss/articles/")){ const id = u.pathname.split("/").pop(); return send(200, `<html><body><c-wiz><div jscontroller="x" data-n-a-id="${id}" data-n-a-ts="1791000000" data-n-a-sg="SIG${id}"></div></c-wiz></body></html>`, "text/html"); }
  if(u.pathname === "/_/DotsSplashUi/data/batchexecute"){ seen.decode++; const body = decodeURIComponent(Buffer.concat(c).toString("utf8").replace(/^f\.req=/, "")); const id = /"AAA"|\\"AAA\\"/.test(body) ? "1" : "2";
    return send(200, ")]}'\n\n" + JSON.stringify([["wrb.fr", "Fbv4je", JSON.stringify(["garturlres", `${F0}/article${id}.html`, 1]), null, null, null, "generic"]]), "application/json"); }
  if(u.pathname === "/article1.html") return send(200, `<html><head><title>Pluies record</title><meta property="og:title" content="Pluies record sur la capitale : les quartiers sous l'eau"><meta property="og:site_name" content="Le Journal A"><meta property="og:description" content="Il est tombé cent millimètres en une nuit, selon la météo nationale."><meta property="og:image" content="/img/art1.png"></head><body><p>Texte.</p></body></html>`, "text/html");
  if(u.pathname === "/article2.html") return send(200, `<html><head><title>Le vieux pont fermé aux voitures - Info Deux</title></head><body><img src="/logo.png" alt="Logo"><img class="lazy" src="/placeholder.png" data-src="${F0}/img/photo-pont-75x75.png" alt="Le vieux pont fermé aux voitures - Info Deux"></body></html>`, "text/html");
  const f = u.pathname.replace("/img/", ""); if(IMG[f]){ res.writeHead(200, {"Content-Type": "image/png"}); return res.end(IMG[f]); }
  if(u.pathname === "/v1beta/models") return send(200, {models: [{name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"]}]});
  send(404, {error: "inconnu"});
}); });
const REVUE = {nom_emission: "Le Point du Jour", titre: "Pluies et pont", accroche: "Bonjour, voici Le Point du Jour.", sommaire: "Au sommaire : les pluies et le vieux pont.",
  segments: [{titre: "Pluies record", texte: "Selon Le Journal A, des pluies record sont tombées sur la capitale.", sources: ["Le Journal A"], preuve: "Pluies record sur la capitale"}, {titre: "Le pont fermé", texte: "Info Deux rapporte que le vieux pont est fermé aux voitures.", sources: ["Info Deux"], preuve: "Le vieux pont fermé aux voitures"}],
  chiffre_du_jour: {texte: "", source: ""}, a_retenir: "Prudence.", conclusion: "C'était Le Point du Jour.", appel: "Abonne-toi.", publication: {titres: ["Le point"], description: "La revue du jour.", hashtags: ["#info"]}, a_verifier: []};
const PORT = 3000 + 200 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`, GEN_DIR = path.join(OUT, "studio-gen");
(async () => {
  fs.rmSync(GEN_DIR, {recursive: true, force: true});
  await new Promise(r => fake.listen(0, "127.0.0.1", r)); const F = `http://127.0.0.1:${fake.address().port}`;
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "cle-test", GEMINI_BASE_URL: F + "/v1beta", GOOGLE_NEWS_BASE: F, NEWS_ALLOW_LOCAL: "1", PROVIDER: "gemini", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", APP_PASSWORD: "", GEN_DIR});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]}); let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  for(let k = 0; k < 50 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.evaluateOnNewDocument(() => {
    const wav = secs => { const sr = 22050, n = Math.round(sr * secs), bf = new ArrayBuffer(44 + n * 2), dv = new DataView(bf), w = (o, s) => [...s].forEach((ch, i) => dv.setUint8(o + i, ch.charCodeAt(0)));
      w(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, "data"); dv.setUint32(40, n * 2, true);
      for(let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.round(6000 * Math.sin(i / 9)), true); return bf; };
    window.__localTtsMock = {predict: async ({text}) => new Blob([wav(Math.max(2.2, text.split(/\s+/).length / 2.6))], {type: "audio/x-wav"})};
  });
  try{
    await pg.setViewport({width: 1366, height: 900});
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}, presseVitesse: "1"})); }); await pg.reload({waitUntil: "networkidle0"});
    await pg.setRequestInterception(true);
    pg.on("request", r => { if(r.url().includes("/api/sample") && r.method() === "POST"){ try{ seen.prompt = JSON.parse(r.postData()).prompt || ""; }catch(e){} return r.respond({status: 200, contentType: "application/x-ndjson", body: JSON.stringify({delta: JSON.stringify(REVUE)}) + "\n"}); } r.continue(); });
    // 1. infos du jour (liens Google Actualités) puis revue
    await pg.click('.side-link[data-go="presse"]'); await pg.waitForFunction(() => !document.getElementById("view-presse").hidden, {timeout: 15000});
    await pg.evaluate(() => { document.getElementById("pr-sites").value = ""; }); await pg.click("#pr-fetch"); await pg.waitForSelector("#pr-news .pr-list", {timeout: 15000});
    await pg.select("#pr-duree", "60"); await pg.click("#pr-go"); await pg.waitForSelector("#pr-res .pr-seg", {timeout: 20000}); await new Promise(r => setTimeout(r, 800));
    // 2. vraies images des articles
    await pg.click("#pr-arts"); await pg.waitForFunction(() => /trouvée|Aucune|impossible/.test(document.getElementById("pr-photos-msg").textContent), {timeout: 30000});
    const ar = await pg.evaluate(() => ({msg: document.getElementById("pr-photos-msg").textContent, arts: JSON.parse(localStorage.getItem("sp-presse")).arts || {}, cards: [...document.querySelectorAll(".pr-art")].map(c => c.innerText.replace(/\s+/g, " ")), pub: document.getElementById("pr-res").innerText}));
    const a0 = ar.arts["0"] || {}, a1 = ar.arts["1"] || {};
    check("vrais articles retrouvés derrière les liens de Google Actualités (signature + horodatage, comme la page de Google)", seen.decode === 2 && /\/article1\.html$/.test(a0.url) && /\/article2\.html$/.test(a1.url), `${seen.decode} décodages · ${a0.url} · ${a1.url}`);
    check("image « à la une » de l'article (og:image) importée dans le projet, avec titre, site et description", /^\/generated\/presse-[a-z0-9]+\/article-1-/.test(a0.local) && /quartiers sous l'eau/.test(a0.title) && a0.site_name === "Le Journal A" && /cent millimètres/.test(a0.description), JSON.stringify(a0).slice(0, 200));
    check("site sans og:image : l'image qui porte le titre de l'article, en pleine taille (suffixe de vignette retiré)", /^\/generated\/presse-[a-z0-9]+\/article-2-/.test(a1.local) && /photo-pont\.png$/.test(a1.image), a1.image);
    const uneTxt = await pg.evaluate(() => [...document.querySelectorAll(".pr-ph .pr-une-wrap")].map(w => w.innerText).join(" | "));
    check("par défaut, aucune une recréée : seulement les vraies images (la une recréée reste une option)", !/À LA UNE/i.test(uneTxt) && /Pas de vraie une pour ce journal/.test(uneTxt) && await pg.evaluate(() => !!document.getElementById("pr-une-recree") && !document.getElementById("pr-une-recree").checked), uneTxt.slice(0, 120));
    check("chaque sujet montre l'image de son article avec sa source ; crédits ajoutés à la publication", ar.cards.length === 2 && /Le Journal A/.test(ar.cards[0]) && /quartiers sous l'eau/.test(ar.cards[0]) && /image de l’article de Le Journal A/.test(ar.pub), ar.cards.join(" / ").slice(0, 160));
    // 3. voix gratuite + fusion avec la voix de studio renforcée
    await pg.select("#pr-voix", "local:fr_FR-siwis-medium"); await new Promise(r => setTimeout(r, 300)); await pg.evaluate(() => document.getElementById("pr-voice").click());
    await pg.waitForFunction(() => { const s = JSON.parse(localStorage.getItem("sp-presse") || "{}"); return (s.voices || []).length >= 4 && s.voices.every(v => v.status === "done") && !document.getElementById("pr-voice").disabled; }, {timeout: 40000});
    const vb = await pg.evaluate(() => ({on: document.getElementById("pr-vboost").checked, style: document.getElementById("pr-vstyle").value, fmt: document.getElementById("pr-vformat").value, dis: document.getElementById("pr-vformat").disabled}));
    check("options : voix de studio renforcée cochée, vidéo « Grand écran » 16:9 par défaut (format verrouillé)", vb.on && vb.style === "studio" && vb.fmt === "16:9" && vb.dis, JSON.stringify(vb));
    await new Promise(r => setTimeout(r, 500)); await pg.evaluate(() => document.getElementById("pr-mix").click()); await pg.waitForSelector("#pr-mix-out audio", {timeout: 60000});
    const mixMsg = await pg.evaluate(() => document.getElementById("pr-mix-msg").textContent);
    check("fusion finale avec la voix renforcée (présence, clarté, compression)", /Émission de \d+ s prête/.test(mixMsg), mixMsg);
    // 4. vidéo « Grand écran »
    await pg.evaluate(() => document.getElementById("pr-video").click());
    await pg.waitForFunction(() => /Vidéo prête|échoué|navigateur/.test(document.getElementById("pr-video-msg").textContent), {timeout: 120000});
    const vid = await pg.evaluate(async () => { const v = document.querySelector("#pr-video-out video"); await new Promise(r => { if(v.readyState >= 1) r(); else v.onloadedmetadata = r; setTimeout(r, 4000); });
      const c = document.createElement("canvas"), hits = {red: 0, green: 0, orange: 0, navy: 0}, dur = isFinite(v.duration) ? v.duration : 20;
      for(let t = 2; t < Math.min(dur, 40); t += 0.75){ v.currentTime = t; await new Promise(r => { v.onseeked = r; setTimeout(r, 2500); }); c.width = v.videoWidth; c.height = v.videoHeight; const x = c.getContext("2d"); x.drawImage(v, 0, 0);
        const px = (X, Y) => x.getImageData(X, Y, 1, 1).data; const rb = px(700, Math.round(c.height * 0.785) + 20); if(rb[0] > 170 && rb[1] < 80 && rb[2] < 80) hits.red++;
        const bg = px(30, Math.round(c.height * 0.72)); if(bg[2] > bg[0] && bg[0] < 40) hits.navy++;
        const d = x.getImageData(Math.round(c.width * 0.15), Math.round(c.height * 0.08), Math.round(c.width * 0.78), Math.round(c.height * 0.58)).data; let g = 0, o = 0; for(let i = 0; i < d.length; i += 32){ if(d[i + 1] > 150 && d[i] < 90 && d[i + 2] < 120) g++; if(d[i] > 200 && d[i + 1] > 110 && d[i + 1] < 170 && d[i + 2] < 60) o++; } if(g > 1500) hits.green++; if(o > 1500) hits.orange++; }
      return {msg: document.getElementById("pr-video-msg").textContent, w: v.videoWidth, h: v.videoHeight, hits}; });
    check("vidéo « Grand écran » en 16:9 (1280 × 720)", /Vidéo prête/.test(vid.msg) && vid.w === 1280 && vid.h === 720, `${vid.w}×${vid.h} · ${vid.msg}`);
    check("studio télé : décor bleu nuit et bandeau rouge avec le titre du sujet", vid.hits.navy >= 4 && vid.hits.red >= 4, JSON.stringify(vid.hits));
    check("les vraies images des deux articles s'affichent sur le grand écran", vid.hits.green >= 1 && vid.hits.orange >= 1, JSON.stringify(vid.hits));
    for(const [sec, name] of [[6, "studio-test-sujet"], [10, "studio-test-image"]]){ await pg.evaluate(async t => { const v = document.querySelector("#pr-video-out video"); v.currentTime = t; await new Promise(r => { v.onseeked = r; setTimeout(r, 3000); }); }, sec); const el = await pg.$("#pr-video-out video"); if(el) await el.screenshot({path: path.join(OUT, name + ".png")}); }
    // 5. le diaporama reste disponible, avec le choix du format
    await pg.select("#pr-vstyle", "diapo"); const dia = await pg.evaluate(() => !document.getElementById("pr-vformat").disabled);
    check("style « Diaporama » toujours disponible, format au choix", dia);
    await pg.setViewport({width: 390, height: 844}); await new Promise(r => setTimeout(r, 300));
    check("page sur téléphone : pas de défilement horizontal", await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  }finally{ await b.close(); srv.kill(); fake.close(); }
  console.log(out.join("\n")); process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
