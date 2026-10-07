// Page Motion design, onglet Publicités : pub animée pour un commerce (photos, logo, prix, promo, WhatsApp), textes sans invention
// (sans IA ou par l'agent), aperçu des trois formats, vidéo 9:16 avec prix et bouton WhatsApp, affiches, téléchargements. Vrai server.js, agent simulé.
const p = require("puppeteer-core"), http = require("http"), fs = require("fs"), path = require("path"), zlib = require("zlib"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
function png(w, h, rgb){ const crc = b => { let c, t = []; for(let n = 0; n < 256; n++){ c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for(const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h); for(let y = 0; y < h; y++){ raw[y * (w * 3 + 1)] = 0; for(let x = 0; x < w; x++){ const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2]; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, {level: 0})), chunk("IEND", Buffer.alloc(0))]); }
const AGENT = {slogan: "Le téléphone qu'il te faut", accroche: "Nouveau stock arrivé !", points: ["Garantie 6 mois", "Livraison rapide", "Grand stockage"], appel: "Commande sur WhatsApp", legende: "Nouveau stock chez Boutique Awa. Écris-nous vite !", hashtags: ["#Dakar", "telephone"]};
const PORT = 3000 + 1300 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
const fake = http.createServer((req, res) => { res.writeHead(req.url.includes("/models") ? 200 : 404, {"Content-Type": "application/json"}); res.end(JSON.stringify(req.url.includes("/models") ? {models: [{name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"]}]} : {error: {message: "inconnu"}})); });
const files = re => fs.readdirSync(OUT).filter(f => re.test(f)).map(f => ({f, n: fs.statSync(path.join(OUT, f)).size}));
const waitFiles = async (re, n, ms) => { for(let k = 0; k < (ms || 20000) / 250; k++){ if(files(re).length >= n) break; await new Promise(r => setTimeout(r, 250)); } await new Promise(r => setTimeout(r, 300)); return files(re); };
(async () => {
  for(const f of fs.readdirSync(OUT)) if(/^(pub|affiche)-boutique-awa/.test(f)) fs.rmSync(path.join(OUT, f), {force: true});
  const PHOTO = path.join(OUT, "pub-photo-produit.png"), LOGO = path.join(OUT, "pub-logo.png"); fs.writeFileSync(PHOTO, png(800, 600, [40, 110, 230])); fs.writeFileSync(LOGO, png(300, 300, [250, 250, 250]));
  await new Promise(r => fake.listen(0, "127.0.0.1", r));
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "cle-test", GEMINI_BASE_URL: `http://127.0.0.1:${fake.address().port}/v1beta`, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", PROVIDER: "gemini", APP_PASSWORD: "", GEN_DIR: path.join(OUT, "pub-gen")});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]}); let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  for(let k = 0; k < 50 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message)); let prompt = "";
  await pg.evaluateOnNewDocument(() => {   /* voix de l'ordinateur simulée : aucun téléchargement pendant le test */
    const wav = secs => { const sr = 22050, n = Math.round(sr * secs), bf = new ArrayBuffer(44 + n * 2), dv = new DataView(bf), w = (o, s) => [...s].forEach((ch, i) => dv.setUint8(o + i, ch.charCodeAt(0)));
      w(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, "data"); dv.setUint32(40, n * 2, true);
      for(let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.round(5000 * Math.sin(i / 7)), true); return bf; };
    window.__voiceTexts = []; window.__localTtsMock = {predict: async ({text}) => { window.__voiceTexts.push(text); return new Blob([wav(Math.max(1.2, text.split(/\s+/).length / 2.6))], {type: "audio/x-wav"}); }};
  });

  try{
    await pg.setViewport({width: 1366, height: 900});
    const cdp = await pg.target().createCDPSession(); await cdp.send("Browser.setDownloadBehavior", {behavior: "allow", downloadPath: OUT, eventsEnabled: true}).catch(() => cdp.send("Page.setDownloadBehavior", {behavior: "allow", downloadPath: OUT}));
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); }); await pg.reload({waitUntil: "networkidle0"});
    await pg.setRequestInterception(true);
    pg.on("request", r => { if(r.url().includes("/api/sample") && r.method() === "POST"){ try{ prompt = JSON.parse(r.postData()).prompt || ""; }catch(e){} return r.respond({status: 200, contentType: "application/x-ndjson", body: JSON.stringify({delta: JSON.stringify(AGENT)}) + "\n"}); } r.continue(); });
    // 1. onglet
    await pg.click('.side-link[data-go="presse"]'); await pg.waitForFunction(() => !document.getElementById("view-presse").hidden, {timeout: 15000});
    await pg.click('[data-mt="pub"]'); await pg.waitForFunction(() => !document.getElementById("mt-pub").hidden, {timeout: 10000});
    check("page Motion design : onglet Publicités (avec Infos du jour et Quiz)", await pg.evaluate(() => [...document.querySelectorAll("[data-mt]")].map(b => b.dataset.mt).join() === "infos,quiz,pub" && document.getElementById("mt-infos").hidden));
    // 2. infos du commerçant, photos et logo
    const fill = {"#pb-nom": "Boutique Awa", "#pb-act": "Téléphones", "#pb-prod": "Téléphone 128 Go", "#pb-prix": "85 000 FCFA", "#pb-ancien": "100 000 FCFA", "#pb-promo": "-15 % ce week-end", "#pb-wa": "77 000 00 00", "#pb-adr": "Marché central", "#pb-hor": "9 h à 21 h"};
    for(const [sel, v] of Object.entries(fill)) await pg.type(sel, v);
    await pg.type("#pb-av", "Garantie 6 mois"); await pg.evaluate(() => { const c = document.getElementById("pb-color"); c.value = "#1565c0"; });
    await (await pg.$("#pb-photos")).uploadFile(PHOTO); await pg.waitForFunction(() => document.querySelectorAll("#pb-thumbs img").length >= 1, {timeout: 15000});
    await (await pg.$("#pb-logo")).uploadFile(LOGO); await pg.waitForFunction(() => document.querySelectorAll("#pb-thumbs img").length >= 2, {timeout: 15000});
    const st = await pg.evaluate(() => JSON.parse(localStorage.getItem("sp-pub") || "{}"));
    check("photo du produit et logo enregistrés dans le dossier des publicités (réduits en JPEG, logo en PNG)", (st.photos || []).length === 1 && /^\/generated\/publicites\/produit-.+\.jpg$/.test(st.photos[0]) && /^\/generated\/publicites\/logo-.+\.png$/.test(st.logo || ""), JSON.stringify(st).slice(0, 160));
    // 3. sans IA, puis par l'agent
    await pg.evaluate(() => document.getElementById("pb-sans").click()); await pg.waitForSelector("#pb-res .card", {timeout: 10000});
    const sans = await pg.evaluate(() => document.getElementById("pb-res").innerText);
    check("« Sans IA » : textes composés avec les seules infos du commerçant", /Chez Boutique Awa/.test(sans) && /Téléphone 128 Go|-15 % ce week-end/.test(sans) && /textes composés sans IA/.test(sans) && /Garantie 6 mois/.test(sans), sans.slice(0, 120).replace(/\n/g, " / "));
    await pg.evaluate(() => document.getElementById("pb-go").click()); await pg.waitForFunction(() => /Le téléphone qu'il te faut/.test(document.getElementById("pb-res").innerText), {timeout: 20000});
    check("l'agent écrit la pub avec les infos données et des règles strictes (rien d'inventé, pas de faux témoignage)", /85 000 FCFA/.test(prompt) && /-15 % ce week-end/.test(prompt) && /aucun prix, aucune promo, aucune garantie inventés/.test(prompt) && /aucun faux témoignage/.test(prompt), prompt.length + " caractères");
    // 4. aperçu des trois formats
    await pg.evaluate(() => { document.getElementById("pb-vfmt").value = "tous"; document.getElementById("pb-preview").click(); });
    await pg.waitForFunction(() => document.querySelectorAll("#pb-prev img").length === 9, {timeout: 30000});
    const pv = await pg.evaluate(async () => Promise.all([...document.querySelectorAll("#pb-prev img")].map(async im => { await im.decode().catch(() => {}); return `${im.naturalWidth}×${im.naturalHeight}`; })));
    check("aperçu des trois formats : 9:16 (statut), 1:1 (Facebook, Instagram), 16:9", pv.join() === ["720×1280", "720×1280", "720×1280", "1080×1080", "1080×1080", "1080×1080", "1280×720", "1280×720", "1280×720"].join(), pv.join(" "));
    // 5. vidéo 9:16 de 15 s
    await pg.evaluate(() => { document.getElementById("pb-vfmt").value = "9:16"; document.getElementById("pb-voix").value = "local:fr_FR-siwis-medium"; document.getElementById("pb-video").click(); });
    await pg.waitForFunction(() => /Vidéo prête|échoué|navigateur/.test(document.getElementById("pb-vmsg").textContent), {timeout: 120000});
    const vid = await pg.evaluate(async () => { const v = document.querySelector("#pb-vids video"); await new Promise(r => { if(v.readyState >= 1) r(); else v.onloadedmetadata = r; setTimeout(r, 6000); });
      if(!(isFinite(v.duration) && v.duration > 0)) await new Promise(r => { v.ondurationchange = () => { if(isFinite(v.duration)) r(); }; v.currentTime = 1e7; setTimeout(r, 5000); });
      const c = document.createElement("canvas"), hits = {gold: 0, wa: 0, blue: 0};
      for(let t = 1; t < Math.min(v.duration, 40); t += 0.7){ v.currentTime = t; await new Promise(r => { v.onseeked = r; setTimeout(r, 2500); }); c.width = v.videoWidth; c.height = v.videoHeight; const x = c.getContext("2d"); x.drawImage(v, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let g = 0, w = 0, bl = 0;
        for(let i = 0; i < d.length; i += 16){ if(d[i] > 225 && d[i + 1] > 180 && d[i + 2] < 110) g++; if(d[i + 1] > 180 && d[i] < 90 && d[i + 2] > 60 && d[i + 2] < 150) w++; if(d[i + 2] > 200 && d[i] < 80 && d[i + 1] > 90 && d[i + 1] < 140) bl++; } if(g > 2000) hits.gold++; if(w > 2000) hits.wa++; if(bl > 2000) hits.blue++; }
      return {msg: document.getElementById("pb-vmsg").textContent, w: v.videoWidth, h: v.videoHeight, dur: v.duration, poster: v.getAttribute("poster") || "", hits, said: window.__voiceTexts.slice()}; });
    check("vidéo pub 9:16 (720 × 1280) avec voix off (5 phrases, prix dit à voix haute), au moins 15 s, affiche avant la lecture", /Vidéo prête/.test(vid.msg) && vid.w === 720 && vid.h === 1280 && vid.dur >= 14.5 && vid.dur < 45 && /^blob:/.test(vid.poster) && vid.said.length === 5 && vid.said.some(t => /Seulement 85 000 FCFA, au lieu de 100 000 FCFA/.test(t)), `${vid.w}×${vid.h} · ${Math.round(vid.dur * 10) / 10} s · ${vid.said.length} phrases · ${vid.msg}`);
    check("à l'écran : la photo du produit, le prix sur l'étiquette dorée, puis le bouton vert WhatsApp", vid.hits.blue >= 1 && vid.hits.gold >= 1 && vid.hits.wa >= 1, JSON.stringify(vid.hits));
    await pg.evaluate(() => document.querySelector('[data-pb-dl="0"]').click());
    const vf = await waitFiles(/^pub-boutique-awa-9x16\.(mp4|webm)$/, 1);
    check("téléchargement de la pub (pub-boutique-awa-9x16)", vf.length === 1 && vf[0].n > 50000, JSON.stringify(vf));
    // 6. affiches
    for(const f of ["9:16", "1:1"]){ await pg.evaluate(f => document.querySelector(`[data-pb-poster="${f}"]`).click(), f); await pg.waitForFunction(n => document.querySelectorAll("#pb-posters img").length >= n, {timeout: 30000}, f === "9:16" ? 1 : 2); }
    const ps = await pg.evaluate(async () => Promise.all([...document.querySelectorAll("#pb-posters img")].map(async im => { await im.decode().catch(() => {}); return `${im.naturalWidth}×${im.naturalHeight}`; })));
    const pf = await waitFiles(/^affiche-boutique-awa-(9x16|1x1)\.jpg$/, 2);
    check("affiches : statut WhatsApp 1080 × 1920 et Facebook, Instagram 1080 × 1080, téléchargées", ps.join() === "1080×1920,1080×1080" && pf.length === 2, `${ps.join(", ")} · ${pf.map(x => x.f).join(", ")}`);
    const leg = await pg.evaluate(() => document.getElementById("pb-leg").value);
    check("texte du statut prêt à copier, avec les hashtags", /Nouveau stock chez Boutique Awa/.test(leg) && /#Dakar/.test(leg) && /#telephone/.test(leg), leg.replace(/\n/g, " / "));
    // 6 bis. marques : Wanteermako proposé d'office, marque gardée, site web avec QR code sur l'affiche
    const br = await pg.evaluate(() => [...document.querySelectorAll("[data-pb-brand]")].map(b => b.textContent.trim()));
    check("« Mes marques » : le site d'annonces Wanteermako est proposé d'office", br.some(t => /Wanteermako/.test(t)), br.join(" | "));
    await pg.evaluate(() => { document.getElementById("pb-site").value = "www.boutique-awa.sn"; document.getElementById("pb-brand-save").click(); });
    const kept = await pg.evaluate(() => (JSON.parse(localStorage.getItem("sp-marques") || "[]")).map(b => `${b.nom}|${b.site}|${b.logo ? "logo" : ""}`));
    check("« Garder cette marque » : la boutique est gardée avec son site et son logo, à côté de Wanteermako", kept.some(k => /^Boutique Awa\|www\.boutique-awa\.sn\|logo$/.test(k)) && kept.some(k => /^Wanteermako/.test(k)), kept.join(" ; "));
    await pg.evaluate(() => document.getElementById("pb-sans").click()); await new Promise(r => setTimeout(r, 800));
    await pg.evaluate(() => { const b = document.getElementById("pb-posters"); if(b) b.innerHTML = ""; document.querySelector('[data-pb-poster="9:16"]').click(); }); await pg.waitForFunction(() => document.querySelectorAll("#pb-posters img").length >= 1, {timeout: 30000});
    const qr = await pg.evaluate(async () => { const im = document.querySelector("#pb-posters img"); await im.decode().catch(() => {}); const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext("2d"); x.drawImage(im, 0, 0); const d = x.getImageData(c.width - 330, 40, 300, 300).data; let bk = 0, wh = 0; for(let i = 0; i < d.length; i += 16){ const L = (d[i] + d[i + 1] + d[i + 2]) / 3; if(L < 40) bk++; if(L > 225) wh++; } return {lib: typeof window.qrcode, bk, wh}; });
    check("site web : QR code noir et blanc sur l'affiche (bibliothèque libre chargée à la demande)", qr.lib === "function" && qr.bk > 2000 && qr.wh > 2000, JSON.stringify(qr));
    // 7. téléphone, reprise, console
    await pg.setViewport({width: 390, height: 844}); await new Promise(r => setTimeout(r, 400));
    const wide = await pg.evaluate(() => [...document.querySelectorAll("#view-presse *")].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && e.offsetParent).slice(0, 4).map(e => `${e.tagName.toLowerCase()}#${e.id}.${String(e.className).split(" ")[0]}`));
    check("page sur téléphone : pas de défilement horizontal", await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1), wide.join(" | "));
    await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "presse"; }); await pg.waitForSelector("#pb-res .card", {timeout: 10000}).catch(() => {});
    check("après rechargement : l'onglet Publicités, les infos du commerce et la pub sont retrouvés", await pg.evaluate(() => !document.getElementById("mt-pub").hidden && document.getElementById("pb-nom").value === "Boutique Awa" && /Chez Boutique Awa/.test(document.getElementById("pb-res").innerText) && document.getElementById("pb-site").value === "www.boutique-awa.sn" && document.querySelectorAll("#pb-thumbs img").length === 2));
    check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  }finally{ await b.close(); srv.kill(); fake.close(); }
  console.log(out.join("\n")); process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
