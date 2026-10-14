// Leçon animée à partir des fichiers de l'utilisateur (14 octobre) : image, audio, vidéo, texte ; l'agent (simulé) les voit et les écoute,
// propose 3 angles (pour qui, idée, méthode, modèle conseillé) ; l'angle choisi et le contenu des fichiers guident la leçon et sa méthode.
const p = require("puppeteer-core"), path = require("path"), fs = require("fs"), {spawn, execFileSync} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const FF = require(path.join(__dirname, "..", "node_modules", "ffmpeg-static")), GEN = path.join(OUT, "gen-lecon-fichiers"), wait = ms => new Promise(r => setTimeout(r, ms)), F = n => path.join(OUT, n);
(async () => {
  fs.rmSync(GEN, {recursive: true, force: true, maxRetries: 20, retryDelay: 250}); require("./coran-cache")(GEN);
  /* fichiers d'essai : une image, un son, une petite vidéo avec du son, un texte */
  execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=red:s=320x240:d=1", "-frames:v", "1", F("lc-rouge.png")]);
  execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "sine=f=440:d=3", F("lc-son.wav")]);
  execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=s=320x240:r=10:d=3", "-f", "lavfi", "-i", "sine=f=330:d=3", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", F("lc-clip.mp4")]);
  fs.writeFileSync(F("lc-couleurs.txt"), "Les couleurs : rouge comme la tomate, bleu comme le ciel, vert comme la feuille, jaune comme le soleil.");
  const PORT = 3000 + 950 + Math.floor(Math.random() * 40), BASE = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env: Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "x", GEN_DIR: GEN}), stdio: ["ignore", "pipe", "pipe"]});
  let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 600000});
  try{
    for(let k = 0; k < 80 && !/prêt/.test(log); k++) await wait(100);
    const pg = await b.newPage(); await require("./noauto")(pg);
    const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if(m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    const asked = {angles: null, lesson: null}; await pg.setRequestInterception(true);
    pg.on("request", r => { if(!(r.url().includes("/api/sample") && r.method() === "POST")) return r.continue(); const body = r.postData() || "", reply = o => r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({delta: JSON.stringify(o)}) + "\n"});
      const media = {jpeg: (body.match(/image\/jpeg/g) || []).length, wav: (body.match(/audio\/wav/g) || []).length};
      if(/3 ANGLES/.test(body)){ asked.angles = {media, txt: /bleu comme le ciel/.test(body), names: /lc-clip\.mp4/.test(body) && /lc-son\.wav/.test(body)};
        return reply({resume: "Une liste de couleurs avec des exemples, une image rouge, un petit son et une vidéo.", angles: [
          {titre: "Les couleurs de la nature", pour_qui: "4 à 6 ans", idee: "Chaque couleur avec un objet de la nature.", methode: ["Voir la couleur", "Dire son nom", "Trouver un objet", "Répéter", "Quiz"], modele: "aventure", pourquoi: "le paysage montre la nature", nb: 4},
          {titre: "Chanson des couleurs", pour_qui: "3 à 5 ans", idee: "Une comptine pour retenir les couleurs.", methode: ["Écouter", "Chanter", "Montrer"], modele: "theatre", pourquoi: "la scène fait chanter", nb: 4},
          {titre: "Les couleurs en arabe", pour_qui: "6 à 9 ans", idee: "Les mêmes couleurs, en arabe.", methode: ["Voir", "Lire", "Écrire"], modele: "daara", pourquoi: "la tablette pour écrire", nb: 4}]}); }
      if(/LEÇON ANIMÉE/.test(body)){ asked.lesson = {angle: /ANGLE CHOISI par l’utilisateur \(à suivre\) : « Chanson des couleurs »/.test(body), src: /CONTENU DES FICHIERS/.test(body) && /bleu comme le ciel/.test(body), media};
        return reply({titre: "Chantons les couleurs", sous_titre: "Quatre couleurs", items: [{cle: "Rouge", mot: "Tomate", image: "🍅"}, {cle: "Bleu", mot: "Ciel", image: "🌤️"}, {cle: "Vert", mot: "Feuille", image: "🍃"}, {cle: "Jaune", mot: "Soleil", image: "☀️"}],
          methode: ["Écouter la couleur", "La chanter", "Montrer l’objet", "Répéter tous ensemble"], chanson: {paroles: "[chorus]\nLes couleurs, chantons-les !\n[verse]\nRouge, rouge, comme la tomate !\nBleu, bleu, comme le ciel !"}}); }
      reply({}); });
    await pg.setViewport({width: 390, height: 844, deviceScaleFactor: 1});
    await pg.goto(BASE + "/#lecon", {waitUntil: "networkidle0"});
    await pg.waitForFunction(() => document.querySelectorAll("#lc-models canvas").length === 3, {timeout: 60000});
    await (await pg.$("#lc-files")).uploadFile(F("lc-rouge.png"), F("lc-son.wav"), F("lc-clip.mp4"), F("lc-couleurs.txt"));
    await pg.waitForFunction(() => /4 fichiers prêts/.test(document.getElementById("lc-msg").textContent), {timeout: 60000});
    const s1 = await pg.evaluate(() => ({chips: [...document.querySelectorAll("#lc-assets .cb-chip")].map(c => c.textContent.replace(/\s+/g, " ").trim()), files: __spLecon.files.map(x => [x.kind, x.blobs.length, x.text.length])}));
    check("4 fichiers lus sur la page : image (réduite), audio écouté (WAV), vidéo (4 images + son), texte", JSON.stringify(s1.files.map(x => x[0])) === '["image","audio","video","texte"]' && s1.files[0][1] === 1 && s1.files[1][1] === 1 && s1.files[2][1] === 5 && s1.files[3][2] > 50 && s1.chips.length === 4, JSON.stringify(s1.files));
    await pg.click("#lc-angles-go"); await pg.waitForFunction(() => document.querySelectorAll("#lc-angles .lc-angle").length === 3, {timeout: 60000});
    const s2 = await pg.evaluate(() => ({cards: [...document.querySelectorAll("#lc-angles h3")].map(h => h.textContent), res: document.getElementById("lc-angles").textContent.includes("Une liste de couleurs"), meth: document.querySelectorAll("#lc-angles .lc-angle ol li").length}));
    check("l'agent voit et écoute les fichiers (images et captures jointes, 1 audio, texte, noms) et propose 3 angles avec leur méthode et le modèle conseillé", asked.angles && asked.angles.media.jpeg >= 5 && asked.angles.media.wav === 1 && asked.angles.txt && asked.angles.names && s2.cards.length === 3 && s2.res && s2.meth === 11, `${JSON.stringify(asked.angles)} · ${s2.cards.join(" | ")}`);
    await pg.click('[data-lc-angle="1"]'); await pg.waitForFunction(() => /Leçon prête/.test(document.getElementById("lc-msg").textContent), {timeout: 60000});
    const s3 = await pg.evaluate(() => ({model: __spLecon.L.modele, n: __spLecon.L.items.length, meth: document.getElementById("lc-methode").textContent, pub: document.getElementById("lc-pub").value, lyr: document.getElementById("lc-song-lyrics").value}));
    check("angle choisi : modèle conseillé pris (Grand Théâtre), la leçon suit l'angle et le contenu des fichiers (médias joints), méthode affichée et dans la publication, paroles de la chanson reçues", asked.lesson && asked.lesson.angle && asked.lesson.src && asked.lesson.media.wav === 1 && s3.model === "theatre" && s3.n === 4 && /Méthode de la leçon · Chanson des couleurs/.test(s3.meth) && /Montrer l’objet/.test(s3.meth) && /Méthode :\n1\. Écouter la couleur/.test(s3.pub) && /Rouge, rouge, comme la tomate/.test(s3.lyr), `${s3.model} · ${s3.n} éléments`);
    /* embellir : galerie de la bibliothèque commune (transitions, couleurs de cinéma, ambiances) */
    await pg.evaluate(() => { document.getElementById("lc-fx").open = true; }); await pg.waitForFunction(() => document.querySelectorAll("#lc-fx-grid .rc-fxc").length > 50, {timeout: 30000});
    const nT = await pg.evaluate(() => document.querySelectorAll("#lc-fx-grid .rc-fxc").length); await pg.click('[data-lc-fxtab="looks"]'); await pg.click('[data-lc-fx="looks:cinema"]'); await pg.click('[data-lc-fxtab="ambs"]'); await pg.click('[data-lc-fx="ambs:lucioles"]');
    const fx = await pg.evaluate(() => ({e: __spLecon.L.effets, sum: document.getElementById("lc-fx-sum").textContent, nA: document.querySelectorAll("#lc-fx-grid .rc-fxc").length}));
    check("galerie « Embellir » : 77 transitions (dont « Automatique »), couleurs de cinéma et ambiances avec aperçus ; le choix est gardé dans la leçon", nT === 77 && fx.e.transition === "auto" && fx.e.look === "cinema" && fx.e.ambiance === "lucioles" && fx.nA > 50 && /Cinéma/i.test(fx.sum), `${nT} transitions · ${JSON.stringify(fx.e)} · ${fx.sum}`);
    const wide = await pg.evaluate(() => document.documentElement.scrollWidth);
    check("téléphone (390 px) : aucun défilement horizontal", wide <= 390, `${wide} px`);
    check("aucune erreur dans la console", !errs.length, errs.slice(0, 3).join(" | "));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  await b.close(); srv.kill(); fs.rmSync(GEN, {recursive: true, force: true, maxRetries: 20, retryDelay: 250}); console.log(out.join("\n")); process.exit(0);
})();
