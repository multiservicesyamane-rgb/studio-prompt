// Page Agence : fiches clients et suivi, affiche ou flyer à la vraie taille d'impression (A5 300 ppp), PDF pour l'imprimeur, textes sans invention,
// passage vers la pub vidéo du client. Vrai server.js, agent simulé.
const p = require("puppeteer-core"), http = require("http"), fs = require("fs"), path = require("path"), zlib = require("zlib"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
function png(w, h, rgb){ const crc = b => { let c, t = []; for(let n = 0; n < 256; n++){ c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for(const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h); for(let y = 0; y < h; y++){ raw[y * (w * 3 + 1)] = 0; for(let x = 0; x < w; x++){ const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2]; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, {level: 0})), chunk("IEND", Buffer.alloc(0))]); }
const AGENT = {titre: "Grande ouverture", sous_titre: "Le restaurant Chez Fatou ouvre ses portes", lignes: ["Samedi 12 octobre, 10 h", "Boisson offerte aux 50 premiers"], appel: "Réservez sur WhatsApp : 77 111 22 33"};
const PORT = 3000 + 1400 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
const fake = http.createServer((req, res) => { res.writeHead(req.url.includes("/models") ? 200 : 404, {"Content-Type": "application/json"}); res.end(JSON.stringify(req.url.includes("/models") ? {models: [{name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"]}]} : {error: {message: "inconnu"}})); });
const files = re => fs.readdirSync(OUT).filter(f => re.test(f)).map(f => ({f, n: fs.statSync(path.join(OUT, f)).size}));
const waitFiles = async (re, n, ms) => { for(let k = 0; k < (ms || 20000) / 250; k++){ if(files(re).length >= n) break; await new Promise(r => setTimeout(r, 250)); } await new Promise(r => setTimeout(r, 300)); return files(re); };
(async () => {
  for(const f of fs.readdirSync(OUT)) if(/^affiche-chez-fatou-/.test(f)) fs.rmSync(path.join(OUT, f), {force: true});
  const PHOTO = path.join(OUT, "agence-photo.png"), LOGO = path.join(OUT, "agence-logo.png"); fs.writeFileSync(PHOTO, png(1200, 900, [230, 120, 30])); fs.writeFileSync(LOGO, png(300, 300, [250, 250, 250]));
  await new Promise(r => fake.listen(0, "127.0.0.1", r));
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "cle-test", GEMINI_BASE_URL: `http://127.0.0.1:${fake.address().port}/v1beta`, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", PROVIDER: "gemini", APP_PASSWORD: "", GEN_DIR: path.join(OUT, "agence-gen")});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]}); let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  for(let k = 0; k < 50 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message)); let prompt = "";
  pg.on("dialog", d => d.accept());
  try{
    await pg.setViewport({width: 1366, height: 900});
    const cdp = await pg.target().createCDPSession(); await cdp.send("Browser.setDownloadBehavior", {behavior: "allow", downloadPath: OUT, eventsEnabled: true}).catch(() => cdp.send("Page.setDownloadBehavior", {behavior: "allow", downloadPath: OUT}));
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); }); await pg.reload({waitUntil: "networkidle0"});
    await pg.setRequestInterception(true);
    pg.on("request", r => { if(r.url().includes("/api/sample") && r.method() === "POST"){ try{ prompt = JSON.parse(r.postData()).prompt || ""; }catch(e){} return r.respond({status: 200, contentType: "application/x-ndjson", body: JSON.stringify({delta: JSON.stringify(AGENT)}) + "\n"}); } r.continue(); });
    // 1. page et fiche client
    const nav = await pg.evaluate(() => ({agence: !!document.querySelector('.side-link[data-go="agence"]'), links: document.querySelectorAll(".side-link").length}));
    check("menu : « Agence (mes clients) » dans « Mes contenus »", nav.agence && nav.links === 14, JSON.stringify(nav));
    await pg.click('.side-link[data-go="agence"]'); await pg.waitForFunction(() => !document.getElementById("view-agence").hidden, {timeout: 10000});
    check("nom de l'agence modifiable (Yamane Tech par défaut)", await pg.evaluate(() => document.getElementById("ag-name").value === "Yamane Tech"));
    await pg.click("#ag-new"); await pg.waitForSelector("#ag-client-form", {timeout: 5000});
    await pg.type("#agc-nom", "Chez Fatou"); await pg.type("#agc-act", "Restaurant"); await pg.type("#agc-wa", "77 111 22 33"); await pg.type("#agc-adr", "Rue 10, Médina"); await pg.evaluate(() => { document.getElementById("agc-col").value = "#2e7d32"; });
    await (await pg.$("#agc-logo")).uploadFile(LOGO); await pg.waitForFunction(() => /Logo prêt/.test(document.getElementById("agc-logo-n").textContent), {timeout: 15000});
    await pg.evaluate(() => document.querySelector("#ag-client-form button[type=submit]").click()); await pg.waitForSelector("#ag-body .ag-head", {timeout: 5000});
    const db = await pg.evaluate(() => JSON.parse(localStorage.getItem("sp-agence") || "{}"));
    const c0 = (db.clients || [])[0] || {};
    check("fiche client enregistrée (nom, activité, WhatsApp, couleur, logo dans le dossier de l'agence)", c0.nom === "Chez Fatou" && c0.activite === "Restaurant" && c0.couleur === "#2e7d32" && /^\/generated\/agence\/logo-/.test(c0.logo || "") && c0.etat === "prospect", JSON.stringify(c0).slice(0, 160));
    await pg.select("#ag-etat", "devis"); await pg.evaluate(() => { document.getElementById("ag-montant").value = "25 000"; document.getElementById("ag-notes").value = "Affiche A5 pour l'ouverture"; document.getElementById("ag-save-client").click(); });
    const sv = await pg.evaluate(() => { const c = JSON.parse(localStorage.getItem("sp-agence")).clients[0]; return {e: c.etat, m: c.montant, liste: document.getElementById("ag-list").innerText}; });
    check("suivi du client : devis envoyé, montant et notes, visible dans la liste", sv.e === "devis" && sv.m === "25 000" && /Devis envoyé/.test(sv.liste), JSON.stringify(sv));
    // 2. flyer A5 sans IA, puis par l'agent
    await (await pg.$("#ag-photos")).uploadFile(PHOTO); await pg.waitForFunction(() => /1 photo/.test(document.getElementById("ag-photos-n").textContent), {timeout: 15000});
    await pg.select("#ag-kind", "ouverture"); await pg.select("#ag-fmt", "a5"); await pg.type("#ag-infos", "Samedi 12 octobre, 10 h\nBoisson offerte aux 50 premiers");
    await pg.evaluate(() => document.getElementById("ag-design-sans").click()); await pg.waitForSelector("#ag-out img", {timeout: 20000});
    const a5 = await pg.evaluate(async () => { const im = document.querySelector("#ag-out img"); await im.decode().catch(() => {}); const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext("2d"); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let wa = 0, ph = 0; for(let i = 0; i < d.length; i += 64){ if(d[i + 1] > 180 && d[i] < 90 && d[i + 2] > 60 && d[i + 2] < 150) wa++; if(d[i] > 200 && d[i + 1] > 90 && d[i + 1] < 150 && d[i + 2] < 70) ph++; } return {w: im.naturalWidth, h: im.naturalHeight, wa, ph, txt: document.getElementById("ag-out").innerText}; });
    check("flyer A5 à la vraie taille d'impression (1748 × 2480 à 300 ppp), photo du client et bouton WhatsApp", a5.w === 1748 && a5.h === 2480 && a5.ph > 2000 && a5.wa > 500 && /Grande ouverture/.test(a5.txt) && /composés sans IA/.test(a5.txt), `${a5.w}×${a5.h} · photo ${a5.ph} · WhatsApp ${a5.wa}`);
    await pg.evaluate(() => document.getElementById("ag-dl-pdf").click());
    const pdf = await waitFiles(/^affiche-chez-fatou-a5\.pdf$/, 1); const head = pdf.length ? fs.readFileSync(path.join(OUT, pdf[0].f)).slice(0, 8).toString("latin1") : "", tail = pdf.length ? fs.readFileSync(path.join(OUT, pdf[0].f)).slice(-6).toString("latin1") : "";
    const pdfTxt = pdf.length ? fs.readFileSync(path.join(OUT, pdf[0].f)).toString("latin1") : "";
    check("PDF pour l'imprimeur : vrai fichier PDF au format A5 (420 × 595 points), image en JPEG", /^%PDF-1\.4/.test(head) && /%%EOF/.test(tail) && /\/MediaBox \[0 0 419\.53 595\.28\]/.test(pdfTxt) && /\/Filter \/DCTDecode/.test(pdfTxt) && pdf[0].n > 100000, `${pdf.map(x => `${x.f} ${x.n} octets`).join(", ")}`);
    await pg.evaluate(() => { document.getElementById("ag-dl-jpg").click(); document.getElementById("ag-dl-png").click(); });
    const imgs = await waitFiles(/^affiche-chez-fatou-a5\.(jpg|png)$/, 2);
    check("images JPEG et PNG téléchargées", imgs.length === 2, imgs.map(x => x.f).join(", "));
    await pg.select("#ag-fmt", "carre"); await pg.evaluate(() => document.getElementById("ag-design").click()); await pg.waitForFunction(() => /écrits par l’agent/.test(document.getElementById("ag-out").innerText), {timeout: 20000});
    const ca = await pg.evaluate(async () => { const im = document.querySelector("#ag-out img"); await im.decode().catch(() => {}); return {w: im.naturalWidth, h: im.naturalHeight, pdf: !!document.getElementById("ag-dl-pdf")}; });
    check("visuel carré pour les réseaux (1080 × 1080, sans PDF), textes de l'agent", ca.w === 1080 && ca.h === 1080 && !ca.pdf, JSON.stringify(ca));
    check("l'agent écrit seulement avec les infos du client (rien d'inventé)", /Chez Fatou/.test(prompt) && /Samedi 12 octobre/.test(prompt) && /rien d'inventé/.test(prompt) && /sans rien inventer/.test(prompt), prompt.length + " caractères");
    // 3. vers la pub vidéo du client
    await pg.evaluate(() => document.getElementById("ag-to-pub").click()); await pg.waitForFunction(() => !document.getElementById("view-presse").hidden && !document.getElementById("mt-pub").hidden, {timeout: 10000});
    const pub = await pg.evaluate(() => ({nom: document.getElementById("pb-nom").value, wa: document.getElementById("pb-wa").value, col: document.getElementById("pb-color").value, logo: (JSON.parse(localStorage.getItem("sp-pub") || "{}").logo) || ""}));
    check("« Faire sa pub vidéo » : la fiche du client remplit l'onglet Publicités (nom, WhatsApp, couleur, logo)", pub.nom === "Chez Fatou" && pub.wa === "77 111 22 33" && pub.col === "#2e7d32" && /\/generated\/agence\/logo-/.test(pub.logo), JSON.stringify(pub));
    // 4. téléphone, reprise, console
    await pg.click('.side-link[data-go="agence"]').catch(async () => { await pg.evaluate(() => { location.hash = "agence"; }); }); await new Promise(r => setTimeout(r, 400));
    await pg.setViewport({width: 390, height: 844}); await new Promise(r => setTimeout(r, 400));
    check("page Agence sur téléphone : pas de défilement horizontal", await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "agence"; }); await pg.waitForSelector("#ag-body .ag-head", {timeout: 10000}).catch(() => {});
    check("après rechargement : le client et son suivi sont retrouvés", await pg.evaluate(() => /Chez Fatou/.test(document.getElementById("ag-body").innerText) && document.getElementById("ag-etat").value === "devis"));
    check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  }finally{ await b.close(); srv.kill(); fake.close(); }
  console.log(out.join("\n")); process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
