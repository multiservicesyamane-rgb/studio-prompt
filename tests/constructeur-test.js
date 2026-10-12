// Constructeur : une demande + des fichiers (photos, vidéo) → l'agent écrit un plan libre → la vidéo est montée avec ces fichiers, en Full HD.
// IA simulée (aucun quota). Le serveur doit tourner (npm start). Les fichiers d'essai sont fabriqués ici par FFmpeg.
const p = require("puppeteer-core"), path = require("path"), fs = require("fs"), {execFileSync} = require("child_process");
const {BASE, EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const FF = require(path.join(__dirname, "..", "node_modules", "ffmpeg-static")), F = n => path.join(OUT, n);
const make = (name, args) => { if(!fs.existsSync(F(name))) execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", ...args, F(name)]); };
make("cb-produit.png", ["-f", "lavfi", "-i", "testsrc2=size=900x900", "-frames:v", "1"]);
make("cb-boutique.jpg", ["-f", "lavfi", "-i", "color=c=0x2266cc:size=1200x800", "-f", "lavfi", "-i", "testsrc=size=400x400", "-filter_complex", "[0][1]overlay=400:200", "-frames:v", "1"]);
make("cb-clip.mp4", ["-f", "lavfi", "-i", "testsrc=size=640x360:rate=25", "-t", "4", "-pix_fmt", "yuv420p", "-c:v", "libx264"]);
const PLAN = {titre: "Robes wax Yamane", type: "pub produit", accroche: "Ta nouvelle robe t'attend", style: {ambiance: "energique", couleurs: ["#F49C45", "#1F2937"], police: "moderne"},
  scenes: [{duree: 2.5, mise_en_page: "logo", titre: "Yamane Shop", texte: "La mode livrée chez toi", voix: "Yamane Shop présente sa nouvelle collection.", transition: "zoom"},
    {duree: 3, mise_en_page: "produit", titre: "Robes en wax", texte: "Coupe moderne", media: [{fichier: "photo 1", mouvement: "zoom_avant"}], voix: "Des robes en wax, coupe moderne.", transition: "glisse"},
    {duree: 3, mise_en_page: "plein_ecran", titre: "Livrée en 24 h", media: [{fichier: "vidéo 1", debut: 1, mouvement: "fixe"}], voix: "Livrée en vingt-quatre heures à Dakar.", transition: "fondu"},
    {duree: 3, mise_en_page: "prix", titre: "15 000 FCFA", texte: "20 000 FCFA", points: ["-25 %"], voix: "Seulement quinze mille francs.", transition: "flash"},
    {duree: 3, mise_en_page: "avantages", titre: "Pourquoi Yamane", points: ["Livraison 24 h", "Paiement à la livraison"], media: [{fichier: "photo 2"}], voix: "Livraison en vingt-quatre heures et paiement à la livraison.", transition: "fondu"},
    {duree: 3, mise_en_page: "cta", titre: "Commande sur WhatsApp", texte: "Dakar et banlieue", voix: "Commande vite sur WhatsApp.", transition: "zoom"}],
  appel: {texte: "Commande sur WhatsApp", whatsapp: "+221 77 000 00 00", site: ""}, publication: {titre: "Robes en wax", legende: "Nouvelle collection.", hashtags: ["wax", "dakar"]}};
const QUIZ = {titre: "Quiz des capitales", genre: "jeu", habillage: "arcade", accroche: "3 secondes par question",
  scenes: [{duree: 3, mise_en_page: "compte", titre: "3", texte: "C'est parti !", voix: "Prêt ?", transition: "zoom"},
    {duree: 7, mise_en_page: "question", titre: "Quelle est la capitale du Japon ?", points: ["Pékin", "Tokyo", "Séoul"], bonne: 1, compte: 3, texte: "Tokyo.", voix: "Quelle est la capitale du Japon ?", transition: "glisse"},
    {duree: 3, mise_en_page: "produit", titre: "Sans photo", emoji: "🗾", voix: "", transition: "fondu"},
    {duree: 3, mise_en_page: "cta", titre: "Écris ton score en commentaire", voix: "Écris ton score.", transition: "zoom"}],
  appel: {texte: "", whatsapp: "", site: ""}, publication: {titre: "Quiz", legende: "", hashtags: []}};
let REPLY = PLAN;
(async () => {
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000});
  const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if(m.type() === "error") errs.push(m.text()); });
  const asked = [];
  await pg.setRequestInterception(true);
  pg.on("request", r => { if(r.url().includes("/api/sample") && r.method() === "POST"){ let o = {}; try{ o = JSON.parse(r.postData()); }catch(e){} asked.push({prompt: o.prompt || "", images: (o.images || []).length});
    r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({delta: JSON.stringify(REPLY)}) + "\n" + JSON.stringify({model: "simulation"}) + "\n"}); } else r.continue(); });
  try{
    await pg.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); });
    await pg.goto(BASE + "/", {waitUntil: "networkidle0"});
    const g = await pg.evaluate(() => ({hash: location.hash, hello: document.querySelector("#view-constructeur h1").textContent, pill: !!document.querySelector("#cb-pill #cb-brief") && !!document.querySelector("#cb-pill .cb-add") && !!document.querySelector("#cb-pill #cb-go"), drop: !!document.querySelector("#cb-pill .fdrop"), sugg: document.querySelectorAll("#cb-sugg [data-cb-sugg]").length, page: document.documentElement.scrollWidth - document.documentElement.clientWidth, bar: Math.round(document.querySelector(".tabbar").getBoundingClientRect().bottom) - document.documentElement.clientHeight}));
    check("première visite, style Gemini : on arrive sur « Salut, on crée quelle vidéo ? » avec une seule barre (+, texte, envoyer) et des idées en pastilles", g.hash === "#constructeur" && /Salut, on crée quelle vidéo/.test(g.hello) && g.pill && !g.drop && g.sugg === 5, JSON.stringify(g));
    check("téléphone : la page ne s'élargit pas et la barre du bas reste à l'écran", g.page <= 0 && Math.abs(g.bar) <= 1, JSON.stringify(g));
    await pg.evaluate(() => document.querySelector('[data-cb-sugg="pub"]').click());
    const sg = await pg.evaluate(() => ({v: document.getElementById("cb-brief").value, sel: document.getElementById("cb-brief").value.slice(document.getElementById("cb-brief").selectionStart, document.getElementById("cb-brief").selectionEnd)}));
    check("une idée remplit la demande et sélectionne le premier [à compléter]", /^Une pub de 20 secondes/.test(sg.v) && sg.sel === "[mon produit]", JSON.stringify(sg));
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    const home = await pg.evaluate(() => (document.querySelector(".welcome-action") || {}).textContent || "");
    check("accueil : le premier raccourci est « Décris ta vidéo » (le Constructeur)", /Décris ta vidéo/.test(home), home.slice(0, 50));
    await pg.evaluate(() => document.querySelector(".tabbar .tab[data-go='creer']").click()); await new Promise(r => setTimeout(r, 400));
    const a0 = await pg.evaluate(() => ({vis: !document.getElementById("view-constructeur").hidden, tab: (document.querySelector(".grp-tabs [aria-current='page']") || {}).textContent, over: document.documentElement.scrollWidth - document.documentElement.clientWidth}));
    check("« Créer » ouvre le Constructeur : une zone de texte, des fichiers, un bouton", a0.vis && a0.tab === "✨ Constructeur" && a0.over <= 0, JSON.stringify(a0));
    await (await pg.$("#cb-files")).uploadFile(F("cb-produit.png"), F("cb-boutique.jpg"), F("cb-clip.mp4"));
    await pg.waitForFunction(() => document.querySelectorAll("#cb-assets .cb-chip").length === 3, {timeout: 20000});
    const chips = await pg.evaluate(() => [...document.querySelectorAll("#cb-assets .cb-chip")].map(c => c.innerText.replace(/\s+/g, " ").slice(0, 40)));
    check("fichiers joints : photo 1, photo 2, vidéo 1 « à monter », avec leur aperçu", /photo 1/.test(chips[0]) && /photo 2/.test(chips[1]) && /vidéo 1.*à monter/.test(chips[2]), chips.join(" | "));
    await pg.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("change", {bubbles: true})); };
      const opt = [...document.querySelectorAll("#cb-brand option")].find(o => /Yamane Shop/.test(o.textContent)); set("cb-brand", opt.value); set("cb-fmt", "9:16"); set("cb-dur", "15"); set("cb-voix", "none");
      document.getElementById("cb-brief").value = "Une pub pour mes robes en wax à 15 000 FCFA au lieu de 20 000, livraison à Dakar en 24 h, ton joyeux."; });
    await pg.click("#cb-go");
    await pg.waitForFunction(() => document.querySelectorAll("#cb-res .cb-scene").length === 6 && document.querySelectorAll("#cb-prev canvas").length === 3, {timeout: 30000});
    const q = asked[0] || {prompt: "", images: 0};
    check("l'agent reçoit la demande, la marque, la liste des fichiers et VOIT les photos et des images de la vidéo", /robes en wax à 15 000 FCFA/.test(q.prompt) && /MARQUE : Yamane Shop/.test(q.prompt) && /photo 1 : « cb-produit\.png »/.test(q.prompt) && /vidéo 1 : « cb-clip\.mp4 » \([\d.]+ s, à monter/.test(q.prompt) && q.images === 4, `${q.images} images`);
    check("plan de montage libre : 6 scènes modifiables et 3 images d'aperçu", true);
    await pg.evaluate(() => { const i = document.querySelector('[data-cb-f="1:titre"]'); i.value = "Robes en wax 2026"; i.dispatchEvent(new Event("input", {bubbles: true})); });
    await pg.evaluate(() => document.getElementById("cb-make").click());
    await pg.waitForFunction(() => /Vidéo prête|échoué|impossible/.test(document.getElementById("cb-vmsg").textContent), {timeout: 300000});
    const v = await pg.evaluate(async () => { const v = document.querySelector("#cb-vids video"), msg = document.getElementById("cb-vmsg").textContent; if(!v) return {msg};
      await new Promise(r => { if(v.readyState >= 1) r(); else v.onloadedmetadata = r; setTimeout(r, 8000); });
      const c = document.createElement("canvas"), seen = []; for(const t of [1.2, 4, 7, 10.5, 14]){ v.currentTime = t; await new Promise(r => { v.onseeked = r; setTimeout(r, 3000); }); c.width = v.videoWidth; c.height = v.videoHeight; const x = c.getContext("2d"); x.drawImage(v, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let s = 0, s2 = 0, n = 0; for(let i = 0; i < d.length; i += 400){ const l = (d[i] + d[i + 1] + d[i + 2]) / 3; s += l; s2 += l * l; n++; } seen.push(Math.round(Math.sqrt(s2 / n - (s / n) ** 2))); }
      return {msg, w: v.videoWidth, h: v.videoHeight, dur: v.duration, seen}; });
    check("vidéo montée en Full HD téléphone (1080 × 1920), à la durée demandée (15 s)", v.w === 1080 && v.h === 1920 && Math.abs(v.dur - 15) < 1.2 && /Full HD/.test(v.msg), `${v.w}×${v.h} · ${Math.round((v.dur || 0) * 10) / 10} s · ${v.msg}`);
    check("chaque scène est réellement dessinée (images riches, pas d'écran vide)", (v.seen || []).length === 5 && v.seen.every(x => x > 18), JSON.stringify(v.seen));
    // vidéo « modèle à imiter » : jamais montrée ; l'agent le sait
    await pg.evaluate(() => document.querySelector('#cb-assets [data-cb-role="2"]').click());
    await pg.click("#cb-go"); await pg.waitForFunction(n => window.__cbN !== n, {timeout: 1000}, 0).catch(() => {}); await new Promise(r => setTimeout(r, 1500));
    const q2 = asked[1] || {prompt: ""}, imgs3 = await pg.evaluate(() => document.querySelectorAll("#cb-res .cb-scene")[2].querySelector("img") ? "image" : "aucune");
    check("vidéo « modèle à imiter » : l'agent reprend sa construction, et elle n'apparaît jamais dans le montage", /MODÈLE À IMITER/.test(q2.prompt) && q2.images === 6 && imgs3 === "aucune", `${q2.images} images · scène 3 : ${imgs3}`);
    // un autre genre : l'agent choisit d'abord le genre ; « Autre proposition » lui dit quoi ne pas refaire ; habillage changeable d'un clic
    check("l'agent choisit d'abord le genre (pas tout en pub) puis un habillage adapté au sujet", /ÉTAPE 1, LE GENRE/.test(q.prompt) && /ÉTAPE 2, L'HABILLAGE/.test(q.prompt) && !/qui fait VENDRE/.test(q.prompt));
    REPLY = QUIZ; await pg.evaluate(() => document.getElementById("cb-again").click());
    await pg.waitForFunction(() => /Question/.test(document.getElementById("cb-res").innerText) && document.querySelectorAll("#cb-prev canvas").length > 0, {timeout: 30000});
    const qz = await pg.evaluate(() => ({label: document.querySelector("#cb-res .label").textContent, theme: document.getElementById("cb-theme").value, lays: [...document.querySelectorAll("#cb-res .cb-scene small")].map(x => x.textContent.replace(/^\d+ · /, "")).join(","), brief: document.getElementById("cb-brief").value}));
    const q3 = asked[2] || {prompt: ""};
    check("« Autre proposition » : l'agent sait quoi ne pas refaire, le texte de l'utilisateur n'est pas modifié", /PROPOSITION PRÉCÉDENTE/.test(q3.prompt) && !/autre proposition/i.test(qz.brief), qz.brief.slice(0, 60));
    check("jeu : compte à rebours, question à choix, habillage « arcade » ; une scène « produit » sans photo devient une illustration (jamais de case vide)", /Jeu \/ quiz/.test(qz.label) && qz.theme === "arcade" && qz.lays === "Compte à rebours,Question,Illustration,Appel à l’action", JSON.stringify(qz));
    await pg.evaluate(() => { const s = document.getElementById("cb-theme"); s.value = "papier"; s.dispatchEvent(new Event("change", {bubbles: true})); }); await new Promise(r => setTimeout(r, 800));
    const look = await pg.evaluate(() => { const c = document.querySelector("#cb-prev canvas"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let s = 0, n = 0; for(let i = 0; i < d.length; i += 400){ s += (d[i] + d[i + 1] + d[i + 2]) / 3; n++; } return Math.round(s / n); });
    check("changer l'habillage (Papier) redessine l'aperçu tout de suite (fond clair)", look > 150, `luminosité ${look}`);
    // sans IA, toujours possible
    const n0 = asked.length; await pg.click("#cb-free"); await new Promise(r => setTimeout(r, 1200));
    const fr = await pg.evaluate(() => ({type: (document.querySelector("#cb-res .label") || {}).textContent, n: document.querySelectorAll("#cb-res .cb-scene").length, last: (document.querySelector("#cb-res .cb-scene:last-child small") || {}).textContent}));
    check("« Sans IA » : un plan sûr sans appel à l'agent (marque, photos, prix trouvé dans la demande, appel à l'action)", asked.length === n0 && /sans IA/.test(fr.type) && fr.n >= 5 && /Appel/.test(fr.last), JSON.stringify(fr));
    await pg.evaluate(() => { location.hash = "projets"; }); await pg.waitForFunction(() => /✨ Constructeur/.test(document.getElementById("list-projects").innerText), {timeout: 10000});
    check("le plan est rangé dans Mes projets (✨ Constructeur)", true);
    const rec = await pg.evaluate(() => ({vis: !document.getElementById("side-recent").hidden, items: [...document.querySelectorAll("#side-recent .side-rec")].map(b => b.textContent)}));
    check("menu « Récentes » (comme Gemini) : les 4 essais du Constructeur y figurent, le plus récent (sans IA) en premier", rec.vis && rec.items.length === 4 && rec.items.every(x => /^✨/.test(x)) && /Yamane Shop · Une pub/.test(rec.items[0]), JSON.stringify(rec));
    await pg.evaluate(() => { location.hash = "constructeur"; }); await new Promise(r => setTimeout(r, 300));
    await pg.evaluate(() => document.getElementById("side-new").click()); await new Promise(r => setTimeout(r, 300));
    const nv = await pg.evaluate(() => ({brief: document.getElementById("cb-brief").value, files: document.querySelectorAll("#cb-assets .cb-chip").length, res: document.getElementById("cb-res").children.length}));
    check("« Nouvelle vidéo » repart de zéro (texte, fichiers et plan vidés)", nv.brief === "" && nv.files === 0 && nv.res === 0, JSON.stringify(nv));
    await pg.evaluate(() => document.querySelector("#side-recent .side-rec").click());
    await pg.waitForFunction(() => document.querySelectorAll("#cb-res .cb-scene").length >= 5, {timeout: 10000});
    check("toucher une vidéo de « Récentes » la rouvre", true);
    check("aucune erreur dans la console", errs.length === 0, errs.slice(0, 3).join(" | "));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  await b.close(); console.log(out.join("\n"));
})();
