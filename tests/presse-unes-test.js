// Les unes du jour : vrai server.js face à une FAUSSE page qui publie des unes ; l'agent qui cherche et lit les unes est simulé.
// Recherche web → page lue → images en hauteur gardées → lecture des unes (journal, date, titres) → une d'un autre jour écartée,
// import de photos (WhatsApp), nom corrigé à la main, titres des unes dans la matière, vraie une montrée avant les images et dans la vidéo.
const p = require("puppeteer-core"), http = require("http"), fs = require("fs"), path = require("path"), zlib = require("zlib"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
function png(w, h, rgb){ const crc = b => { let c, t = []; for(let n = 0; n < 256; n++){ c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for(const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h); for(let y = 0; y < h; y++){ raw[y * (w * 3 + 1)] = 0; for(let x = 0; x < w; x++){ const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2]; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, {level: 0})), chunk("IEND", Buffer.alloc(0))]); }
const IMG = {"une-lib.png": png(400, 560, [20, 60, 230]), "une-soleil.png": png(400, 560, [20, 200, 60]), "une-vieille.png": png(400, 560, [120, 120, 120]), "logo.png": png(400, 120, [250, 0, 0]), "bandeau.png": png(800, 300, [250, 200, 0]), "photo.png": png(900, 600, [200, 120, 60])};
const PAGE = `<html><head><title>Les unes du jour</title><meta property="og:image" content="/img/une-lib.png"></head><body><img src="/img/logo.png" alt="Logo du site" width="400" height="120">
<img data-src="/img/une-lib.png" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Une Libération"><img src="/img/une-soleil.png" alt=""><img srcset="/img/une-vieille.png 400w, /img/petite.png 120w" src="/img/petite.png"><img src="/img/bandeau.png" alt="bandeau"></body></html>`;
const fake = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if(u.pathname === "/v1beta/models"){ res.writeHead(200, {"Content-Type": "application/json"}); return res.end(JSON.stringify({models: [{name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"]}]})); }
  if(u.pathname === "/unes.html"){ res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"}); return res.end(PAGE); }
  const f = u.pathname.replace("/img/", ""); if(IMG[f]){ res.writeHead(200, {"Content-Type": "image/png"}); return res.end(IMG[f]); }
  res.writeHead(404); res.end();
});
const d = new Date(), TODAY = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const REVUE = {nom_emission: "Le Point du Jour", titre: "Les unes du jour", accroche: "Bonjour, voici Le Point du Jour.", sommaire: "Au sommaire : Dakar après les pluies et le code pétrolier.",
  segments: [{titre: "Dakar, le jour d'après", texte: "À la une de Libération, Dakar, le jour d'après : la capitale méconnaissable au lendemain des fortes pluies.", sources: ["Libération"], preuve: "Dakar, le jour d'après"},
    {titre: "Le code pétrolier", texte: "Le Soleil titre sur le Conseil constitutionnel qui rejette la proposition de loi.", sources: ["Le Soleil"], preuve: "Le Conseil constitutionnel rejette la proposition de loi"}],
  chiffre_du_jour: {texte: "", source: ""}, a_retenir: "Prudence après les pluies.", conclusion: "C'était Le Point du Jour.", appel: "Abonne-toi.", publication: {titres: ["Les unes"], description: "Les unes du jour.", hashtags: ["#unes"]}, a_verifier: []};
const PORT = 3000 + 500 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`, GEN_DIR = path.join(OUT, "presse-unes-gen");
const seen = {vision: 0, search: 0, prompt: ""};
(async () => {
  fs.rmSync(GEN_DIR, {recursive: true, force: true});
  await new Promise(r => fake.listen(0, "127.0.0.1", r)); const F = `http://127.0.0.1:${fake.address().port}`;
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "cle-test", GEMINI_BASE_URL: F + "/v1beta", NEWS_ALLOW_LOCAL: "1", PROVIDER: "gemini", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", APP_PASSWORD: "", GEN_DIR});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]}); let log = ""; srv.stdout.on("data", x => log += x); srv.stderr.on("data", x => log += x);
  for(let k = 0; k < 50 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.evaluateOnNewDocument(() => {
    const wav = secs => { const sr = 22050, n = Math.round(sr * secs), bf = new ArrayBuffer(44 + n * 2), dv = new DataView(bf), w = (o, s) => [...s].forEach((ch, i) => dv.setUint8(o + i, ch.charCodeAt(0)));
      w(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, "data"); dv.setUint32(40, n * 2, true);
      for(let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.round(6000 * Math.sin(i / 9)), true); return bf; };
    window.__localTtsMock = {predict: async ({text}) => new Blob([wav(Math.max(1.6, text.split(/\s+/).length / 2.6))], {type: "audio/x-wav"})};
  });
  try{
    await pg.setViewport({width: 1366, height: 900});
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}, presseVitesse: "1"})); }); await pg.reload({waitUntil: "networkidle0"});
    await pg.setRequestInterception(true);
    pg.on("request", r => { if(!(r.url().includes("/api/sample") && r.method() === "POST")) return r.continue();
      let body = {}; try{ body = JSON.parse(r.postData() || "{}"); }catch(e){}
      const pr = String(body.prompt || ""), n = (body.images || []).length; let rep;
      if(/documentaliste/.test(pr)){ seen.vision++; rep = seen.vision === 1 ? {unes: [{image: 1, est_une: true, journal: "Libération", date: TODAY, titre_principal: "Dakar, le jour d'après", autres_titres: ["1,9 milliard de Fcfa volé entre Abidjan et Dakar"]}, {image: 2, est_une: true, journal: "Le Soleil", date: TODAY, titre_principal: "Le Conseil constitutionnel rejette la proposition de loi", autres_titres: []}, {image: 3, est_une: true, journal: "L'Observateur", date: "2024-04-26", titre_principal: "Vieux titre d'avril 2024", autres_titres: []}].slice(0, n)}
          : {unes: [{image: 1, est_une: true, journal: "Le Quotidien", date: "", titre_principal: "La flamme olympique brille à Podor", autres_titres: []}]}; }
      else if(/Trouve sur le web/.test(pr)){ seen.search++; rep = {pages: [{url: `${F}/unes.html`, titre: "Les unes du jour"}]}; }
      else { seen.prompt = pr; rep = REVUE; }
      r.respond({status: 200, contentType: "application/x-ndjson", body: JSON.stringify({delta: JSON.stringify(rep)}) + "\n" + JSON.stringify({model: "simulation"}) + "\n"}); });

    // 1. recherche web des unes du jour → page lue → images en hauteur gardées → unes lues par l'agent
    await pg.click('.side-link[data-go="presse"]'); await pg.waitForFunction(() => !document.getElementById("view-presse").hidden, {timeout: 15000});
    await pg.select("#pr-mode", "textes"); await pg.evaluate(() => { document.getElementById("pr-unes-box").open = true; });
    await pg.click("#pr-unes-find"); await pg.waitForFunction(() => /unes? prêtes?/.test(document.getElementById("pr-unes-msg").textContent), {timeout: 30000}).catch(() => {});
    const g1 = await pg.evaluate(() => ({msg: document.getElementById("pr-unes-msg").textContent, cards: [...document.querySelectorAll("#pr-unes-grid .pr-une-card")].map(c => `${c.querySelector("input").value}|${c.querySelector(".hint").textContent}|${c.className}`), saved: JSON.parse(localStorage.getItem("sp-presse-unes") || "[]")}));
    check("recherche web des unes du jour : l'agent cherche des pages, la page est lue (logo, bandeau et petite image écartés)", seen.search === 1 && g1.cards.length === 3 && g1.saved.every(u => /^\/generated\/presse-unes\/une-/.test(u.local) && u.source === "web"), JSON.stringify(g1.cards));
    check("l'agent lit chaque une (journal, date, gros titre) en une seule demande", seen.vision === 1 && /^Libération\|✓ Une du jour · « Dakar, le jour d'après »/.test(g1.cards[0]) && /^Le Soleil\|✓ Une du jour/.test(g1.cards[1]), g1.cards.slice(0, 2).join(" / "));
    check("infos sûres : une une d'un autre jour est signalée et mise de côté", /^L'Observateur\|⚠ Autre jour : vendredi 26 avril 2024/.test(g1.cards[2]) && /old/.test(g1.cards[2]) && /3 unes prêtes · 1 d’un autre jour, mise de côté/.test(g1.msg), g1.cards[2] + " · " + g1.msg);
    // 2. import de photos (comme depuis WhatsApp) + nom corrigé à la main
    const wa = path.join(OUT, "IMG-20261006-WA0001.png"); fs.writeFileSync(wa, png(420, 600, [230, 230, 30]));
    await (await pg.$("#pr-unes-file")).uploadFile(wa); await pg.waitForFunction(() => document.querySelectorAll("#pr-unes-grid .pr-une-card").length === 4 && /4 unes? prêtes?/.test(document.getElementById("pr-unes-msg").textContent), {timeout: 30000}).catch(() => {});
    const g2 = await pg.evaluate(() => [...document.querySelectorAll("#pr-unes-grid .pr-une-card")].map(c => `${c.querySelector("input").value}|${c.querySelector(".hint").textContent}`));
    check("import des photos des unes (WhatsApp) : enregistrées et lues par l'agent ; date illisible indiquée", seen.vision === 2 && /^Le Quotidien\|Date illisible · « La flamme olympique/.test(g2[3] || ""), g2[3]);
    await pg.evaluate(() => { const i = document.querySelectorAll("#pr-unes-grid .pr-une-card input")[3]; i.value = "Le Quotidien du Sénégal"; i.dispatchEvent(new Event("change", {bubbles: true})); });
    const fixed = await pg.evaluate(() => JSON.parse(localStorage.getItem("sp-presse-unes"))[3].journal);
    check("nom du journal corrigé à la main (relais gratuit si l'agent ne peut pas lire)", fixed === "Le Quotidien du Sénégal", fixed);
    // 3. la revue s'écrit avec les titres lus sur les unes (sauf l'ancienne)
    await pg.type("#pr-text", "Note : la mairie ouvre trois centres d'accueil."); await pg.select("#pr-duree", "60");
    await pg.click("#pr-go"); await pg.waitForSelector("#pr-res .pr-seg", {timeout: 20000}); await new Promise(r => setTimeout(r, 800));
    check("titres des unes du jour ajoutés à la matière, l'ancienne une exclue, « À la une de … » demandé", /UNES DES JOURNAUX DU JOUR/.test(seen.prompt) && /- \[Libération · une du [^\]]+\] Dakar, le jour d'après ; autres titres : 1,9 milliard/.test(seen.prompt) && /\[Le Soleil · une/.test(seen.prompt) && !/Vieux titre d'avril/.test(seen.prompt) && /commence par « À la une de … »/.test(seen.prompt), (seen.prompt.match(/UNES DES JOURNAUX[\s\S]{0,260}/) || [""])[0].replace(/\n/g, " | "));
    const proof = await pg.evaluate(() => [...document.querySelectorAll("#pr-res .pr-proof")].map(e => e.className + ":" + e.textContent.slice(0, 60)));
    check("preuves des sujets retrouvées dans les titres lus sur les unes", proof.length === 2 && proof.every(x => /^pr-proof:✓/.test(x)), proof.join(" / "));
    // 4. la vraie une est montrée avant les images du sujet
    const une = await pg.evaluate(() => [...document.querySelectorAll(".pr-ph .pr-une-wrap")].map(w => ({label: w.querySelector(".hint").textContent, img: (w.querySelector("img.pr-une-own") || {}).src || ""})));
    check("chaque sujet montre la vraie une de son journal avant ses images", une.length === 2 && /vraie une de Libération/.test(une[0].label) && /\/generated\/presse-unes\/une-/.test(une[0].img) && /vraie une du Soleil/.test(une[1].label) && une[0].img !== une[1].img, JSON.stringify(une).slice(0, 300));
    // 5. vidéo : la vraie une (bleue) apparaît à l'écran
    await pg.select("#pr-voix", "local:fr_FR-siwis-medium"); await new Promise(r => setTimeout(r, 300)); await pg.evaluate(() => document.getElementById("pr-voice").click());
    await pg.waitForFunction(() => { const s = JSON.parse(localStorage.getItem("sp-presse") || "{}"); return (s.voices || []).length >= 5 && s.voices.every(v => v.status === "done") && !document.getElementById("pr-voice").disabled; }, {timeout: 40000});
    await new Promise(r => setTimeout(r, 500)); await pg.evaluate(() => document.getElementById("pr-mix").click()); await pg.waitForSelector("#pr-mix-out audio", {timeout: 60000});
    await pg.select("#pr-vstyle", "studio"); await pg.select("#pr-vformat", "16:9");   /* la une à l'écran, dans le studio 2D (le plateau 3D a son propre test) */
    await pg.evaluate(() => document.getElementById("pr-video").click());
    await pg.waitForFunction(() => /Vidéo prête|échoué/.test(document.getElementById("pr-video-msg").textContent), {timeout: 120000});
    const blue = await pg.evaluate(async () => { const v = document.querySelector("#pr-video-out video"), c = document.createElement("canvas"), hits = [];
      for(let t = 1; t <= Math.min(30, v.duration || 30); t += 0.5){ v.currentTime = t; await new Promise(r => { v.onseeked = r; setTimeout(r, 2500); }); c.width = v.videoWidth; c.height = v.videoHeight; const x = c.getContext("2d"); x.drawImage(v, 0, 0);
        const dd = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for(let i = 0; i < dd.length; i += 16) if(dd[i + 2] > 180 && dd[i] < 70 && dd[i + 1] < 110) n++; if(n > 400) hits.push(t); }
      return hits; });
    check("vidéo : la vraie une de Libération apparaît à l'écran (sommaire et début du sujet)", blue.length >= 2, blue.join(", ") || "aucune image bleue");
    const shot = await pg.$("#pr-video-out video"); if(shot){ await pg.evaluate(async t => { const v = document.querySelector("#pr-video-out video"); v.currentTime = t; await new Promise(r => { v.onseeked = r; setTimeout(r, 3000); }); }, blue[blue.length - 1] || 8); await shot.screenshot({path: path.join(OUT, "presse-unes-video.png")}); }
    // 6. téléphone, reprise, console
    await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "presse"; }); await new Promise(r => setTimeout(r, 600));
    check("unes retrouvées après rechargement", await pg.evaluate(() => document.querySelectorAll("#pr-unes-grid .pr-une-card").length === 4));
    await pg.setViewport({width: 390, height: 844}); await pg.evaluate(() => { document.getElementById("pr-unes-box").open = true; }); await new Promise(r => setTimeout(r, 300));
    check("page sur téléphone avec les unes : pas de défilement horizontal", await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  }finally{ await b.close(); srv.kill(); fake.close(); }
  console.log(out.join("\n")); process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
