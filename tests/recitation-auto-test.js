// « Garder la voix » : analyse complète automatique dès l'envoi de la vidéo (demande de l'utilisateur, 13 octobre).
// Écoute de la voix (Gemini simulé), reconnaissance de la sourate et des versets sur le Coran complet (serveur), calage avec repères d'écoute,
// message et design proposés par l'agent (simulé), format d'origine gardé, images d'origine montrées ; puis une voix qui n'est pas du Coran
// (paroles gardées avec leurs temps). Serveur de test séparé ; aucune IA réelle, aucun quota. Le Coran complet vient d'alquran.cloud (Internet).
const p = require("puppeteer-core"), http = require("http"), path = require("path"), fs = require("fs"), {spawn, execFileSync} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const FF = require(path.join(__dirname, "..", "node_modules", "ffmpeg-static")), F = n => path.join(OUT, n), GEN = path.join(OUT, "gen-recit-auto");
const DUR = [3, 2, 4, 2.5, 3, 2, 3];
if(!fs.existsSync(F("recit-7.mp4"))){ const parts = []; DUR.forEach((d, i) => { parts.push(`sine=f=${220 + i * 40}:r=44100:d=${d}[s${i}]`, `anullsrc=r=44100:cl=mono:d=1[p${i}]`); });
  const chain = DUR.map((d, i) => `[s${i}][p${i}]`).join(""), total = DUR.reduce((a, b) => a + b, 0) + DUR.length;
  execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", `color=c=black:s=320x240:r=10:d=${total}`, "-filter_complex", `${parts.join(";")};${chain}concat=n=${DUR.length * 2}:v=0:a=1[a]`, "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", F("recit-7.mp4")]); }
const STARTS = [0, 4, 7, 12, 15.5, 19.5, 22.5];
/* ce que « Gemini » entend : Al-Fatiha en écriture simple, quelques mots mal entendus, comme une vraie écoute */
const FATIHA = ["بسم الله الرحمن الرحيم", "الحمد لله رب العالمين", "الرحمن الرحيم", "مالك يوم الدين", "اياك نعبد واياك نستعين", "اهدنا الصراط المستقيم", "صراط الذين انعمت عليهم غير المغضوب عليهم ولا الضالين"];
const FR = ["Bonjour à tous", "aujourd'hui nous parlons de patience", "la patience est une lumière", "elle aide dans les épreuves", "soyons reconnaissants", "merci de votre écoute", "à bientôt"];
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  fs.rmSync(GEN, {recursive: true, force: true, maxRetries: 20, retryDelay: 250});
  require("./coran-cache")(GEN);
  /* faux Groq : Whisper large répond avec les phrases d'Al-Fatiha (temps dans l'extrait) */
  const groq = {calls: 0, model: "", file: false};
  const gs = http.createServer((req, res) => { let b = ""; req.setEncoding("latin1"); req.on("data", d => b += d); req.on("end", () => { groq.calls++; groq.model = (/name="model"\r\n\r\n([^\r]+)/.exec(b) || [])[1] || ""; groq.file = /name="file"; filename="extrait\.wav"/.test(b) && /RIFF/.test(b);
    res.writeHead(200, {"Content-Type": "application/json"}); res.end(JSON.stringify({language: "arabic", segments: FATIHA.map((x, i) => ({start: STARTS[i], end: STARTS[i] + DUR[i], text: " " + x}))})); }); });
  await new Promise(r => gs.listen(0, "127.0.0.1", r));
  const PORT = 3000 + 600 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env: Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "x", GROQ_API_KEY: "cle-groq", GROQ_BASE_URL: `http://127.0.0.1:${gs.address().port}`, GEN_DIR: GEN}), stdio: ["ignore", "pipe", "pipe"]});
  let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 600000});
  try{
    for(let k = 0; k < 80 && !/prêt/.test(log); k++) await wait(100);
    const pg = await b.newPage(); await require("./noauto")(pg);
    const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if(m.type() === "error") errs.push(m.text()); });
    let lang = "ar"; const asked = {ecoute: 0, wav: 0, design: 0, images: 0};
    await pg.setRequestInterception(true);
    pg.on("request", r => { if(!(r.url().includes("/api/sample") && r.method() === "POST")) return r.continue();
      const body = r.postData() || "", reply = o => r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({delta: JSON.stringify(o)}) + "\n"});
      if(/transcripteur professionnel/.test(body)){ asked.ecoute++; if(/audio\/wav/.test(body)) asked.wav++;
        if(lang === "panne") return r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({error: true, code: "no_credit", message: "Quota Gemini épuisé pour aujourd'hui."}) + "\n"});
        if(lang === "mix") return reply({langue: "ar", langues: ["fr", "ar"], genre: "autre", locuteurs: [{id: "A", description: "voix"}], segments: [["Bonjour les enfants, apprenons ensemble Al-Fatiha", 0]].concat(FATIHA.slice(1).map((x, i) => [x, i + 1])).map(([x, i]) => ({t0: STARTS[i], t1: STARTS[i] + DUR[i], locuteur: "A", texte: x}))});
        const L = lang === "ar" ? FATIHA : FR; return reply({langue: lang, langues: [lang], genre: lang === "ar" ? "chanson" : "podcast", locuteurs: [{id: "A", description: "voix"}], segments: L.map((t, i) => ({t0: STARTS[i], t1: STARTS[i] + DUR[i], locuteur: "A", texte: t}))}); }
      if(/directeur artistique/.test(body)){ asked.design++; asked.images = (body.match(/image\/jpeg/g) || []).length;
        return reply({message: "Une récitation paisible de la Mère du Livre.", usage: "meditation", habillage: "lune", pourquoi: "la voix est calme et douce", titre: "Al-Fatiha · récitation apaisante", description: "La sourate d'ouverture récitée calmement.", hashtags: ["#coran", "#fatiha"]}); }
      return reply({}); });
    await pg.setViewport({width: 390, height: 844, deviceScaleFactor: 1});
    await pg.goto(BASE + "/#recitation", {waitUntil: "networkidle0"});
    /* 1. envoi : tout s'enchaîne sans rien toucher */
    await (await pg.$("#rc-file")).uploadFile(F("recit-7.mp4"));
    await pg.waitForFunction(() => /Tout est prêt|interrompue|arrêtée|Aucune parole/.test(document.getElementById("rc-auto").textContent), {timeout: 120000});
    const s1 = await pg.evaluate(() => ({lines: [...document.querySelectorAll("#rc-auto li")].map(li => li.className + " " + li.textContent), mode: __spRecit.mode, pass: __spRecit.pass, t: __spRecit.items.map(x => x.a), kinds: __spRecit.items.map(x => x.kind), anchors: __spRecit.nAnchors, follow: __spRecit.follow, theme: __spRecit.theme, fmt: __spRecit.fmt, pubT: document.getElementById("rc-pub-t").value, orig: document.querySelectorAll("#rc-orig-row img").length, steps: [2, 3, 4, 5, 6].map(k => !document.getElementById("rc-s" + k).hidden)}));
    const txt = s1.lines.join(" | ");
    if(/indisponible|fetch failed|HTTP/.test(txt)) out.push("(pas d'Internet : Coran complet non testé — " + txt.slice(0, 160) + ")");
    else{
      check("envoi seul : écoute (audio WAV envoyé à Gemini), puis tout s'enchaîne jusqu'à « Tout est prêt »", /Tout est prêt/.test(txt) && asked.ecoute === 1 && asked.wav === 1 && s1.steps.every(Boolean), txt.slice(0, 260));
      check("Coran reconnu tout seul : Al-Fatiha, versets 1 à 7 (la basmala entendue est son 1er verset)", s1.mode === "coran" && JSON.stringify(s1.pass) === JSON.stringify([{n: 1, from: 1, to: 7}]) && /Coran reconnu.*: .*\(1\), versets 1 à 7/.test(txt), JSON.stringify(s1.pass));
      check("calage avec repères d'écoute : les 7 versets commencent exactement à leur moment, sans décalage", s1.kinds.join() === "verset,verset,verset,verset,verset,verset,verset" && s1.t.join() === STARTS.join() && (s1.follow || s1.anchors >= 4) && /sans décalage/.test(txt), `${s1.t.join(",")} · ${s1.follow ? "suivi du récitant" : s1.anchors + " repères"}`);
      check("message et design par l'agent (4 images de la vidéo d'origine jointes) : habillage « Pleine lune », format d'origine 16:9", asked.design === 1 && asked.images === 4 && s1.theme === "lune" && s1.fmt === "16:9" && /Pleine lune/.test(txt) && /PC 16:9/.test(txt), `${s1.theme} · ${s1.fmt} · ${asked.images} images`);
      check("titre de publication proposé, et la vidéo d'origine montrée en 6 images (avant / après)", s1.pubT === "Al-Fatiha · récitation apaisante" && s1.orig === 6, `${s1.pubT} · ${s1.orig} images`);
      await wait(1200); const proj = await pg.evaluate(async () => (await fetch(`/api/recit/project?id=${__spRecit.id}`)).json());
      check("projet enregistré avec les paroles écoutées et le message (pour le reprendre plus tard)", (proj.heard || []).length === 7 && proj.msg && proj.msg.theme === "lune", `${(proj.heard || []).length} phrases`);
    }
    /* 2. une voix qui n'est pas du Coran : les paroles entendues sont gardées avec leurs temps */
    lang = "fr";
    await (await pg.$("#rc-file")).uploadFile(F("recit-7.mp4"));
    await pg.waitForFunction(() => /Tout est prêt|interrompue|arrêtée/.test(document.getElementById("rc-auto").textContent) && /Paroles gardées|interrompue/.test(document.getElementById("rc-auto").textContent), {timeout: 120000});
    const s2 = await pg.evaluate(() => ({mode: __spRecit.mode, lines: document.getElementById("rc-txt").value.split("\n"), t: __spRecit.items.map(x => x.a), sync: __spRecit.items.map(x => x.sync), txt: document.getElementById("rc-auto").textContent}));
    check("voix qui n'est pas du Coran : paroles gardées telles qu'entendues, chaque phrase à son moment exact", s2.mode === "texte" && s2.lines.join("|") === FR.join("|") && s2.t.join() === STARTS.join() && s2.sync.every(x => x === "ecoute"), `${s2.mode} · ${s2.t.join(",")}`);
    /* 3. son mélangé : une explication en français, puis les versets ; tout est affiché à son moment, le Coran en texte officiel */
    lang = "mix"; await pg.evaluate(() => { document.getElementById("rc-auto").innerHTML = ""; });
    await (await pg.$("#rc-file")).uploadFile(F("recit-7.mp4"));
    await pg.waitForFunction(() => /Tout est prêt|interrompue|arrêtée/.test(document.getElementById("rc-auto").textContent) && /suivant le récitant|interrompue|Paroles gardées/.test(document.getElementById("rc-auto").textContent), {timeout: 120000});
    const s3 = await pg.evaluate(() => ({follow: __spRecit.follow, k: __spRecit.items.map(x => x.kind === "verset" ? `${x.s}:${x.v}` : x.kind), t: __spRecit.items.map(x => x.a), first: (__spRecit.items[0] || {}).ar || ""}));
    check("son mélangé (explication en français puis versets) : la phrase française affichée telle qu'elle est dite, puis Al-Fatiha 2 à 7 en texte officiel, chacun à son moment", s3.follow && s3.k.join() === "parole,1:2,1:3,1:4,1:5,1:6,1:7" && s3.t.join() === STARTS.join() && /^Bonjour les enfants/.test(s3.first), `${s3.k.join(",")} · ${s3.t.join(",")}`);
    /* 4. Gemini en panne (quota épuisé) : l'écoute passe toute seule à Whisper large chez Groq, gratuit */
    lang = "panne"; await pg.evaluate(() => { document.getElementById("rc-auto").innerHTML = ""; });
    await (await pg.$("#rc-file")).uploadFile(F("recit-7.mp4"));
    await pg.waitForFunction(() => /Tout est prêt|interrompue|arrêtée/.test(document.getElementById("rc-auto").textContent) && /Groq|interrompue/.test(document.getElementById("rc-auto").textContent), {timeout: 120000}).catch(() => null);
    const s4 = await pg.evaluate(() => ({txt: document.getElementById("rc-auto").textContent, k: __spRecit.items.filter(x => x.kind === "verset").length, t: __spRecit.items.map(x => x.a)}));
    check("Gemini épuisé : relais automatique vers Whisper large (Groq, gratuit), extrait WAV envoyé avec le modèle whisper-large-v3, Al-Fatiha suivie sans décalage", /Paroles écoutées par Whisper large \(Groq/.test(s4.txt) && groq.calls >= 1 && groq.file && groq.model === "whisper-large-v3" && s4.k === 7 && s4.t.join() === STARTS.join(), `${groq.calls} appel(s) · ${groq.model} · ${s4.t.join(",")}`);
    const wide = await pg.evaluate(() => document.documentElement.scrollWidth);
    check("téléphone (390 px) : aucun défilement horizontal", wide <= 390, `${wide} px`);
    check("aucune erreur dans la console", !errs.length, errs.slice(0, 3).join(" | "));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  await b.close(); srv.kill(); gs.close(); fs.rmSync(GEN, {recursive: true, force: true, maxRetries: 20, retryDelay: 250}); console.log(out.join("\n")); process.exit(0);
})();
