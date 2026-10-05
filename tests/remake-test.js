// Page « Depuis une vidéo » : vraie petite vidéo déposée, analyse complète SIMULÉE (aucun quota), rapport de ce que l'agent
// a compris, transcription modifiable, découpage à la durée du générateur, puis reconstruction complète avec une IA simulée.
const p = require("puppeteer-core"), fs = require("fs"), path = require("path");
const {EDGE, BASE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const S9 = keys => Object.fromEntries(keys.map(k => [k, 9]));
const CREA = ["concept","hook","curiosite","desir_personnage","conflit","clarte","visual_storytelling","acting","progression","escalade","surprise","emotion","payoff","potentiel_visuel","comprehension_muette","originalite","simplicite_ia","continuite","retention"];
const EXEC = ["event","causality","blocking","performance","objects","camera_motivation","information_control","continuity","sound_editing","feasibility"];
const ANALYSIS = {overview: {summary: "Une femme découvre une lettre qu'elle n'attendait pas.", story: "Elle entre, voit la lettre, hésite, l'ouvre.", visual_style: "naturel, fenêtre", editing_style: "lent", audio_style: "voix et ambiance de rue", language: "fr", duration: 24, video_type: "tale", style_id: "anim3d"},
  characters: [{id: "c1", nom: "Awa", fiche_fr: "femme de 40 ans, tresses, robe verte", fiche_en: "Awa, a 40-year-old woman with long braids and a green dress", rappel_en: "Awa in her green dress"}], locations: [{id: "l1", name: "Salon", description: "petit salon lumineux"}],
  transcript: [{t0: 1, t1: 4, speaker: "Awa", text: "Qui a laissé ça ici ?", language: "fr"}, {t0: 16, t1: 19, speaker: "Awa", text: "Ce n'est pas possible.", language: "fr"}],
  scenes: [{scene_id: "S01", t0: 0, t1: 24, location_id: "l1", objective: "comprendre d'où vient la lettre", event: "une lettre posée sur la table", change: "le doute s'installe", characters: ["c1"]}],
  shots: [{shot_id: "P01", scene_id: "S01", t0: 0, t1: 14, characters: ["c1"], description: "Awa entre et voit la lettre", action: "entre, s'arrête", performance: "hésite", framing: "plan large", angle: "hauteur d'yeux", lens: "35mm", camera_movement: "caméra fixe", focus: "", lighting: "fenêtre", color: "chaud", dialogue: "Qui a laissé ça ici ?", speaker: "Awa", music: "", sfx: "porte", ambience: "rue", transition_in: "", transition_out: "coupe franche", continuity_in: "", continuity_out: "", object_state: "lettre fermée", reconstruction_note: ""},
    {shot_id: "P02", scene_id: "S01", t0: 14, t1: 24, characters: ["c1"], description: "Gros plan sur la lettre ouverte", action: "ouvre la lettre", performance: "", framing: "insert", angle: "plongée", lens: "", camera_movement: "léger travelling avant", focus: "la lettre", lighting: "fenêtre", color: "", dialogue: "Ce n'est pas possible.", speaker: "Awa", music: "", sfx: "papier", ambience: "", transition_in: "coupe franche", transition_out: "", continuity_in: "", continuity_out: "", object_state: "lettre ouverte", reconstruction_note: ""}],
  defects: [{t0: 2, t1: 5, problem: "image floue au début", improvement: "mise au point sur le visage"}], reconstruction: {keep: ["l'hésitation d'Awa"], improve: ["révéler l'expéditeur plus tard"], risks: ["mains sur le papier"]},
  analysis_source: "full_video", model: "gemini-3.8-flash", processing: "static_4fps", source_deleted: true};
const prompts = {creative: "", scene: "", master: [], compile: ""}; let analyzeCalls = 0, analyzeReq = null, quota = false;
function reply(pr){
  if(/Tu es AI Creative Director/.test(pr)){ prompts.creative = pr; } if(/Tu es AI Creative Director/.test(pr)) return {concepts: [{titre: "La lettre", situation: "x", scores: S9(CREA)}], selection: {titre: "La lettre", raison: "x", hook_silencieux: "Une lettre sur la table", decision: "APPROVED FOR PRODUCTION", comprehension_mode_muet: 100, scores: S9(CREA), progression: [{etape: "HOOK", action: "x"}]}};
  if(/Tu es SCENE ENGINE/.test(pr)){ prompts.scene = pr; const n = (pr.match(/"source_shot_id":/g) || []).length;
    return {scenes: Array.from({length: n}, (_, i) => ({scene_id: `S${String(i + 1).padStart(2, "0")}`, source_n: i + 1, titre: `Unité ${i + 1}`, int_ext: "INT", lieu: "Le salon", moment: "jour", duree_s: 6, purpose: "x", change: "x", characters: ["c1"], event: `Événement ${i + 1}`, causal_beats: [{beat: 1, what_happens: "x", caused_by: "y", who_reacts: "z", reaction: "r", change: "c", why_next: "w"}], silent_readability: 100})), scene_critic: {decision: "APPROVED", scores: S9(["event","causality","observable_behavior","object_function","visual_readability","type_fit"])}}; }
  if(/REALIZATION ORCHESTRATOR/.test(pr)){ prompts.master.push(pr); const m = pr.match(/SCENE PLAN VERROUILLÉ : (\[.*\])/); const scs = m ? JSON.parse(m[1]) : [];
    return {version: "master-video-plan-1", shots: scs.map((sc, k) => ({shot_id: "SH", scene_id: sc.scene_id, source_n: sc.source_n, purpose: "p", change: "c", characters: ["c1"], event: sc.event, blocking: {start_positions: "a"}, performance: [{character: "c1", observable_behavior: "regarde"}], causal_beats: [{beat: 1}],
      shot_design: {must_notice: "la lettre", camera_reason: "lire le geste", duration: 6, framing: k % 2 ? "insert" : "wide shot", camera_movement: k % 2 ? "slow push-in" : "static"}, sound: {diegetic: "pièce"}, continuity: {state_in: "x", state_out: "y"}, complexity: {characters: 1, decision: "KEEP"}, model_requirements: {mode: "i2v"}})), continuity_map: [], editing_plan: {}, director_critic: {decision: "APPROVED FOR ADAPTATION", scores: S9(EXEC), defects: []}}; }
  if(/DOCTEUR DES DIALOGUES/.test(pr)) return {shots: [], notes: []};
  const a = pr.match(/produis exactement (\d+) plans/), b = pr.match(/contenant exactement (\d+) plans, numérotés de (\d+) à (\d+)/);
  if(a || b){ if(!prompts.compile) prompts.compile = pr; const n = b ? Number(b[1]) : Number(a[1]), from = b ? Number(b[2]) : 1;
    const plans = Array.from({length: n}, (_, i) => ({n: from + i, debut: "0:00", fin: "0:06", intention: `Plan ${from + i}`, voix_off: "", personnages: ["c1"], cadrage_en: "Medium shot", action_en: "Awa opens the letter", decor_en: "a small living room", camera_en: "static", lumiere_en: "window light", son_en: "paper", risk_level: "LOW"}));
    return b ? {plans} : {titre: "La lettre", logline: "x", lecon: "x", public: "familles", palette_en: "warm", personnages: [{id: "c1", nom: "Awa", fiche_en: "Awa, a 40-year-old woman with long braids and a green dress", rappel_en: "Awa in her green dress"}], plans, audio: {voix: "", mixage: ""}, montage: [], youtube: {titres: ["a"]}, retention: {}, critique: {}}; }
  return {};
}
(async () => {
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.evaluateOnNewDocument(() => { const f = window.fetch; window.fetch = (u, o) => { if(String(u).includes("/api/video/analyze") && o && o.body) window.__sent = {size: o.body.size, type: o.body.type}; return f(u, o); }; });
  await pg.setViewport({width: 1366, height: 900});
  await pg.goto(BASE + "/#reel", {waitUntil: "networkidle0"});
  await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); }); await pg.reload({waitUntil: "networkidle0"});
  // 1. une vraie petite vidéo (3 s, image et son)
  const b64 = await pg.evaluate(async () => {
    const c = document.createElement("canvas"); c.width = 320; c.height = 180; const g = c.getContext("2d");
    const ac = new AudioContext(), osc = ac.createOscillator(), dst = ac.createMediaStreamDestination(); osc.connect(dst); osc.start();
    const rec = new MediaRecorder(new MediaStream([...c.captureStream(30).getVideoTracks(), ...dst.stream.getAudioTracks()]), {mimeType: "video/webm"}), ch = [];
    rec.ondataavailable = e => ch.push(e.data); rec.start(200);
    const t0 = performance.now(); await new Promise(res => { const f = () => { const t = performance.now() - t0; g.fillStyle = t < 1500 ? "#c33" : "#36c"; g.fillRect(0, 0, 320, 180); if(t > 3000) return res(); requestAnimationFrame(f); }; f(); });
    await new Promise(res => { rec.onstop = res; rec.stop(); }); osc.stop(); ac.close();
    const buf = new Uint8Array(await new Blob(ch).arrayBuffer()); let s = ""; for(let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return btoa(s);
  });
  const file = path.join(OUT, "ma-video-test.webm"); fs.writeFileSync(file, Buffer.from(b64, "base64"));
  await pg.setRequestInterception(true);
  pg.on("request", r => {
    if(r.url().includes("/api/video/analyze") && r.method() === "POST"){ analyzeCalls++; analyzeReq = {headers: r.headers()};
      return quota ? r.respond({status: 429, contentType: "application/json", body: JSON.stringify({code: "rate_limited", message: "Quota gratuit de Gemini atteint pour l'analyse de la vidéo complète : les images clés prennent le relais, ou réessaie plus tard."})})
        : r.respond({status: 200, contentType: "application/json", body: JSON.stringify(ANALYSIS)}); }
    if(r.url().includes("/api/sample") && r.method() === "POST"){ let pr = ""; try{ pr = JSON.parse(r.postData()).prompt || ""; }catch(e){}
      return r.respond({status: 200, contentType: "application/x-ndjson", body: JSON.stringify({delta: JSON.stringify(reply(pr))}) + "\n" + JSON.stringify({model: "simulation"}) + "\n"}); }
    r.continue();
  });
  await (await pg.$("#rm-file")).uploadFile(file);
  await pg.waitForFunction(() => !document.getElementById("rm-go").disabled, {timeout: 20000});
  // 1 bis. page simple : la vidéo et tes conseils ; le reste est caché jusqu'à l'analyse
  const simple = await pg.evaluate(() => { const vis = id => { const el = document.getElementById(id); return !!el && el.getClientRects().length > 0; };
    return {note: vis("rm-note"), go: vis("rm-go"), words: vis("rm-words"), vcat: vis("rm-vcat"), src: vis("rm-src"), style: vis("rm-style"), srt: vis("rm-srt"), rl: (d => !!d && (d.open || d.getBoundingClientRect().height > 60))(document.querySelector(".rl-box")), toggle: (document.querySelector("#rm-form .advanced-toggle") || {}).textContent || ""}; });
  check("page simple avant l'analyse : seulement la vidéo, tes conseils et les boutons", simple.note && simple.go && !simple.words && !simple.vcat && !simple.src && !simple.style && !simple.srt && !simple.rl && /choisis automatiquement/.test(simple.toggle), JSON.stringify(simple));
  // 2. étape 1 : analyse complète et rapport
  await pg.click("#rm-analyze");
  await pg.waitForFunction(() => !document.getElementById("rm-report").hidden || (!document.getElementById("rm-status").hidden && document.getElementById("rm-status").classList.contains("err")), {timeout: 20000});
  const sent = await pg.evaluate(() => window.__sent || {}); if(analyzeReq) analyzeReq.size = sent.size;
  const rep = await pg.evaluate(() => ({text: document.getElementById("rm-report").innerText, sums: [...document.querySelectorAll("#rm-report summary")].map(s => s.textContent), srt: document.getElementById("rm-text").value, facts: document.getElementById("rm-facts").innerText.replace(/\s+/g, " ")}));
  check("vidéo envoyée entière à l'analyse (type, nom, taille)", analyzeCalls === 1 && analyzeReq.headers["x-video-mime"] === "video/webm" && /ma-video-test/.test(decodeURIComponent(analyzeReq.headers["x-video-name"] || "")) && analyzeReq.size === fs.statSync(file).size, JSON.stringify({calls: analyzeCalls, mime: analyzeReq && analyzeReq.headers["x-video-mime"], size: analyzeReq && analyzeReq.size, fichier: fs.statSync(file).size}));
  check("rapport : résumé, personnages, scènes, plans avec caméra et son, paroles, défauts", /découvre une lettre/.test(rep.text) && /Awa/.test(rep.text) && rep.sums.some(s => /Scènes \(1\)/.test(s)) && rep.sums.some(s => /caméra et son \(2\)/.test(s)) && rep.sums.some(s => /Paroles minutées \(2\)/.test(s)) && /image floue au début/.test(rep.text) && /révéler l'expéditeur/.test(rep.text), rep.sums.join(" | "));
  const det = await pg.evaluate(() => { document.querySelectorAll("#rm-report details").forEach(d => d.open = true); return document.getElementById("rm-report").innerText; });
  check("détail des plans : cadrage, mouvement caméra, transitions, son", /plan large/.test(det) && /léger travelling avant/.test(det) && /coupe franche/.test(det) && /Qui a laissé ça ici/.test(det));
  const words = await pg.evaluate(() => ({vis: document.getElementById("rm-words").getClientRects().length > 0, label: (document.querySelector('label[for="rm-text"]') || {}).textContent || ""}));
  check("paroles extraites et affichées après l'analyse (modifiables)", /Qui a laissé ça ici \?/.test(rep.srt) && /-->/.test(rep.srt) && words.vis && /Paroles extraites/.test(words.label), rep.srt.slice(0, 80).replace(/\n/g, " "));
  const auto = await pg.evaluate(() => ({vtype: document.getElementById("rm-vtype").value, style: document.getElementById("rm-style").value, format: document.getElementById("rm-format").value, line: document.getElementById("rm-auto").hidden ? "" : document.getElementById("rm-auto").innerText}));
  const cat = (() => { try{ return JSON.parse(decodeURIComponent(analyzeReq.headers["x-catalog"] || "")); }catch(e){ return {}; } })();
  check("réglages choisis automatiquement d'après l'analyse (type, style, format)", auto.vtype === "tale" && auto.style === "anim3d" && auto.format === "16:9" && /choisis automatiquement/.test(auto.line) && (cat.types || []).some(t => t[0] === "tale") && (cat.styles || []).some(t => t[0] === "anim3d"), JSON.stringify(auto));
  check("faits : analyse complète, 24 s → 4 plans Veo de 8 s au plus", /vidéo complète \+ audio/i.test(rep.facts) && /Plans IA prévus\s*4/i.test(rep.facts), rep.facts);
  // 3. téléphone : rien ne déborde
  await pg.setViewport({width: 390, height: 844}); await new Promise(r => setTimeout(r, 300));   // sans « isMobile » : cela rechargerait la page et viderait la vidéo
  const over = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check("rapport lisible sur téléphone sans défilement horizontal de la page", over <= 1, `${over}px`);
  await pg.screenshot({path: path.join(OUT, "remake-rapport-tel.png"), fullPage: false});
  await pg.setViewport({width: 1366, height: 900}); await new Promise(r => setTimeout(r, 200));
  // 4. étape 2 : reconstruction (l'analyse n'est pas refaite)
  await pg.click("#rm-go");
  await pg.waitForFunction(() => document.querySelector("#result .ptabs") || document.getElementById("rm-status").classList.contains("err"), {timeout: 120000, polling: 300});
  const err = await pg.evaluate(() => document.getElementById("rm-status").classList.contains("err") ? document.getElementById("rm-status-text").textContent : "");
  const proj = await pg.evaluate(() => ({plans: document.querySelectorAll("#s-plans .shot").length, perso: (document.getElementById("s-perso") || {}).innerText || ""}));
  check("reconstruction faite sans nouvelle analyse, un plan par segment (4)", !err && analyzeCalls === 1 && proj.plans === 4, err || `${proj.plans} plans, ${analyzeCalls} analyse(s)`);
  check("histoire de ta vidéo verrouillée : pas de nouveaux concepts inventés (mode reconstruction)", /mode RECONSTRUCTION/.test(prompts.creative) && /n'invente aucune autre histoire/.test(prompts.creative));
  check("le Scene Engine reçoit l'analyse multimodale complète", /ANALYSE MULTIMODALE DE LA VIDÉO COMPLÈTE/.test(prompts.scene) && /découvre une lettre/.test(prompts.scene));
  check("le Master Plan reçoit chaque plan source (caméra, son) et les segments techniques", prompts.master.some(m => /ANALYSE DES PLANS SOURCE/.test(m) && /léger travelling avant/.test(m) && /"technical_continuation":true/.test(m)), `${prompts.master.length} lot(s)`);
  check("personnage de la vidéo repris dans le projet (photo de référence)", /Awa/.test(proj.perso));
  // 5. quota épuisé à l'étape 1 : message clair, la page reste utilisable
  quota = true; await pg.goto(BASE + "/#reel", {waitUntil: "networkidle0"});
  await (await pg.$("#rm-file")).uploadFile(file); await pg.waitForFunction(() => !document.getElementById("rm-go").disabled, {timeout: 20000});
  await pg.click("#rm-analyze");
  await pg.waitForFunction(() => document.getElementById("rm-status").classList.contains("err"), {timeout: 20000});
  const q = await pg.evaluate(() => ({msg: document.getElementById("rm-status-text").textContent, go: !document.getElementById("rm-go").disabled, an: !document.getElementById("rm-analyze").disabled, rep: document.getElementById("rm-report").hidden}));
  check("quota épuisé : message en français (sans répétition), boutons réactivés, pas de rapport faux", /Quota gratuit/.test(q.msg) && (q.msg.match(/images clés/g) || []).length === 1 && q.go && q.an && q.rep, JSON.stringify(q));
  check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  await b.close(); console.log(out.join("\n"));
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.message); process.exit(1); });
