// Vidéo longue (5 min) avec une IA SIMULÉE : vérifie 20 scènes, la réalisation par lots et ~80 plans, sans aucun quota.
const p = require("puppeteer-core");
const DUR = process.env.DUR || "300", NSC = Number(process.env.NSC || 20), SCDUR = Number(DUR) / NSC;
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const S9 = keys => Object.fromEntries(keys.map(k => [k, 9]));
const CREA = ["concept","hook","curiosite","desir_personnage","conflit","clarte","visual_storytelling","acting","progression","escalade","surprise","emotion","payoff","potentiel_visuel","comprehension_muette","originalite","simplicite_ia","continuite","retention"];
const EXEC = ["event","causality","blocking","performance","objects","camera_motivation","information_control","continuity","sound_editing","feasibility"];
const calls = {creative: 0, scenes: 0, master: 0, dialogue: 0, compile: 0, autre: 0}; let compilePrompt = "", ddPrompt = "", masterSizes = [];
const raw=[];
function reply(prompt){ const k = prompt.indexOf("$" + "{"); if(k >= 0) raw.push(prompt.slice(Math.max(0, k - 60), k + 60).replace(/\s+/g, " "));
  if(/Tu es AI Creative Director/.test(prompt)){ calls.creative++;
    return {concepts: [{titre: "L'héritage", situation: "x", scores: S9(CREA)}], selection: {titre: "L'héritage", raison: "x", hook_silencieux: "Une enveloppe scellée", decision: "APPROVED FOR PRODUCTION", comprehension_mode_muet: 100, scores: S9(CREA), progression: [{etape: "HOOK", action: "x"}]}}; }
  if(/Tu es SCENE ENGINE/.test(prompt)){ calls.scenes++;
    const lieux = ["Le salon familial", "La cour de la maison", "Le bureau du notaire", "Le marché", "La chambre du grand-père"];
    return {scenes: Array.from({length: NSC}, (_, i) => ({scene_id: `S${String(i + 1).padStart(2, "0")}`, source_n: i + 1, titre: `Étape ${i + 1}`, int_ext: i % 2 ? "EXT" : "INT", lieu: lieux[i % lieux.length], moment: i % 3 ? "jour" : "soir", duree_s: SCDUR, purpose: `Enjeu ${i + 1}`, change: "La situation change", characters: ["mere", "fils"], event: `Événement ${i + 1}`, causal_beats: [{beat: 1, what_happens: "x", caused_by: "y", who_reacts: "z", reaction: "r", change: "c", why_next: "w"}], silent_readability: 100})), scene_critic: {decision: "APPROVED", scores: S9(["event","causality","observable_behavior","object_function","visual_readability","type_fit"])}}; }
  if(/REALIZATION ORCHESTRATOR/.test(prompt)){ calls.master++; if(calls.master===1) require("fs").writeFileSync("master-prompt.txt", prompt);
    const m = prompt.match(/DÉCOUPAGE CIBLE[^:\[]*: (\[.*?\])\./s); const cible = m ? JSON.parse(m[1]) : [];
    const shots = [];
    cible.forEach(c => { for(let k = 0; k < c.shots; k++) shots.push({shot_id: "SH", scene_id: c.scene_id, source_n: 1, purpose: "p", change: "c", characters: ["mere", "fils"], event: `Plan ${k + 1} de ${c.scene_id}`, blocking: {start_positions: "a"}, performance: [{character: "mere", observable_behavior: "regarde"}], causal_beats: [{beat: 1}],
      shot_design: {must_notice: "le geste", camera_reason: "suivre le geste", duration: 3 + (k % 3), framing: "medium"}, sound: {dialogue: k % 2 ? "" : "Tu le savais ?", diegetic: "pièce"}, continuity: {state_in: `état ${c.scene_id}`, state_out: `état ${c.scene_id}`}, complexity: {characters: 1, decision: "KEEP"}, model_requirements: {mode: "t2v"}}); });
    masterSizes.push(shots.length);
    return {version: "master-video-plan-1", shots, continuity_map: [], editing_plan: {}, director_critic: {decision: "APPROVED FOR ADAPTATION", scores: S9(EXEC), defects: []}}; }
  if(/DOCTEUR DES DIALOGUES/.test(prompt)){ calls.dialogue++; ddPrompt = prompt; const ids = [...prompt.matchAll(/"shot_id":"(SH\d+)"/g)].map(m => m[1]); return {shots: ids.map((id, k) => ({shot_id: id, dialogue: k % 3 === 2 ? [] : [{speaker: "mere", line: "Tu le savais depuis quand ?", tone_en: "cold"}, {speaker: "fils", line: "Depuis toujours.", tone_en: "quiet"}], voice_over: ""})), notes: []}; }
  const a = prompt.match(/produis exactement (\d+) plans/), b = prompt.match(/contenant exactement (\d+) plans, numérotés de (\d+) à (\d+)/);
  if(a || b){ calls.compile++; if(!compilePrompt) compilePrompt = prompt;
    const n = b ? Number(b[1]) : Number(a[1]), from = b ? Number(b[2]) : 1;
    const plans = Array.from({length: n}, (_, i) => ({n: from + i, debut: "0:00", fin: "0:04", intention: `Plan ${from + i}`, voix_off: "", personnages: [], cadrage_en: "Medium shot", action_en: "A woman opens an envelope", decor_en: "a living room", camera_en: "slow push in", lumiere_en: "window light", son_en: "paper", note: 8}));
    return b ? {plans} : {titre: "L'héritage", logline: "x", lecon: "x", public: "familles", palette_en: "warm", personnages: [], plans, audio: {voix: "", mixage: ""}, montage: [], youtube: {titres: ["a"]}, retention: {}, critique: {}}; }
  calls.autre++; return {};
}
(async () => {
  const br = await p.launch({executablePath: require("./env").EDGE, headless: true, protocolTimeout: 600000});
  const pg = await br.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.setRequestInterception(true);
  pg.on("request", r => { if(r.url().includes("/api/sample") && r.method() === "POST"){ let prompt = ""; try{ prompt = JSON.parse(r.postData()).prompt || ""; }catch(e){}
    const body = JSON.stringify({delta: JSON.stringify(reply(prompt))}) + "\n" + JSON.stringify({model: "simulation"}) + "\n";
    r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body}); } else r.continue(); });
  await pg.setViewport({width: 1366, height: 900});
  await pg.goto(require("./env").BASE + "/#studio", {waitUntil: "networkidle0"});
  await pg.evaluate(() => { const p = JSON.parse(localStorage.getItem("sp-prefs") || "{}"); localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: p.veille || {auto: false}})); });
  await pg.reload({waitUntil: "networkidle0"});
  const opts = await pg.$$eval("#f-duree option", o => o.map(x => x.textContent));
  check("durées longues proposées", opts.includes("5 min") && opts.includes("15 min"), opts.join(", "));
  await pg.type("#idee", "Une famille découvre qu'un héritage cache une dette, sur trois générations.");
  for(const [id, v] of Object.entries({"#f-vtype": "histoire", "#f-duree": DUR, "#f-audio": "voice"})){ try{ await pg.select(id, v); }catch(e){} }
  const t0 = Date.now(); await pg.click("#go");
  await pg.waitForFunction(() => document.querySelector("#result .ptabs") || document.getElementById("status").classList.contains("err"), {timeout: 300000, polling: 500});
  const err = await pg.evaluate(() => document.getElementById("status").classList.contains("err") ? document.getElementById("status-text").textContent : "");
  if(err){ check("génération", false, err); }
  else {
    const r = await pg.evaluate(() => ({scenes: document.querySelectorAll("#s-plans .scene-h").length, plans: document.querySelectorAll("#s-plans .shot").length, title: document.querySelector("#s-plans h3").innerText, report: (document.querySelector("#s-pipeline pre") || {}).textContent || "", first: (document.querySelector("#s-plans .scene-h") || {}).innerText || ""}));
    check(`${NSC} scènes affichées`, r.scenes === NSC, r.title);
    const maxi = NSC * Math.min(8, Math.max(1, Math.round(SCDUR / 6)));   /* V4 : maximum par scène, jamais un quota toutes les 4-5 s */
    check("V4 : plans = maximum du découpage cible (≈ 1 pour 6 s), tous compilés", r.plans === maxi, `${r.plans} plans (maximum ${maxi}) en ${Math.round((Date.now() - t0) / 1000)} s`);
    check("réalisation par lots de ~12 plans", calls.master >= 2 && masterSizes.every(n => n <= 12), `${calls.master} lots : ${masterSizes.join(" + ")} plans`);
    check("compilation par morceaux (si plus de 28 plans)", calls.compile >= 2 || r.plans <= 28, `${calls.compile} appels`);
    const line = r.report.split("\n").find(l => /MASTER_PLAN/.test(l)) || "", next = r.report.split("\n")[r.report.split("\n").indexOf(line) + 1] || "";
    check("rapport : scènes, plans, lots", /lots/.test(next) && /scènes/.test(next), (line + " " + next).replace(/\s+/g, " ").slice(0, 220));
    console.log("Première scène :", r.first.replace(/\s+/g, " "));
  }
  check("docteur des dialogues : appelé, max_mots par plan, dialogues transmis à la compilation", calls.dialogue >= 1 && /max_mots/.test(ddPrompt) && /Tu le savais depuis quand/.test(compilePrompt), calls.dialogue + " appel(s)");
  const rep = (await pg.evaluate(() => (document.querySelector("#s-pipeline pre") || {}).textContent || "")).split("\n");
  const ddIdx = rep.findIndex(l => /DIALOGUE_DOCTOR/.test(l)), ddLine = ddIdx >= 0 ? rep[ddIdx] + " " + (rep[ddIdx + 1] || "") : "";
  check("rapport : étape DIALOGUE_DOCTOR", ddIdx >= 0, ddLine.replace(/\s+/g, " "));
  check("aucun code brut ${...} envoyé à l'IA", raw.length === 0, raw.slice(0,3).join(" | "));
  check("aucune erreur JavaScript", errs.length === 0, errs.join(" | "));
  console.log("Appels simulés :", JSON.stringify(calls));
  await br.close(); console.log(out.join("\n"));
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.message); });
