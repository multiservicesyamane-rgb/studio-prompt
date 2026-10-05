// Teste les contrôles du code (codeDefects, routeInput, cameraOne) sans appeler de modèle.
const fs = require("fs");
const html = fs.readFileSync(require("./env").HTML, "utf8");
const grab = (start, end) => { const a = html.indexOf(start), b = html.indexOf(end, a); if(a < 0 || b < 0) throw new Error("introuvable : " + start); return html.slice(a, b); };
const src = grab("const CAM_MOVE =", "function shotLine(") + "\n" + grab("function routeInput(", "async function developCreative(");
const videoProfile = (v) => ({category: v === "doc" ? "documentary" : "story"});
const {routeInput, codeDefects, cameraOne} = new Function("videoProfile", src + "; return {routeInput, codeDefects, cameraOne};")(videoProfile);
let ok = 0, ko = 0;
const t = (name, cond) => { console.log((cond ? "OK   " : "ÉCHEC") + " " + name); cond ? ok++ : ko++; };
const shot = (dur, chars, sound) => ({characters: chars, shot_design: {duration: dur}, sound: sound || {}});
const P = {duree: "60", audio: "voice", vtype: "histoire"};

t("idée courte → IDEA", routeInput("Deux colocataires et un loyer impayé", {}).type === "IDEA");
t("scénario avec répliques → SCRIPT", routeInput("A : Salut\nB : Tu as payé ?\nA : Non\nB : Quoi ?", {}).type === "SCRIPT");
t("long texte → TEXT", routeInput("x ".repeat(400), {}).type === "TEXT");
t("audio découpé → AUDIO", routeInput("", {timeline: [{n: 1}]}).type === "AUDIO");

const good = {duration: 54, shots: [shot(4, ["a", "b"], {dialogue: "Tu as payé ?"}), shot(6, ["a", "b"], {dialogue: "Non !"}), shot(3, ["a"]), shot(8, ["a", "b"]), shot(5, ["b"])]};
t("plan correct : aucun défaut", codeDefects(good, P).length === 0);
t("trop court (30 s pour 60) → défaut durée", codeDefects(Object.assign({}, good, {duration: 30}), P).some(d => /Durée/.test(d.problem)));
const same = {duration: 40, shots: [1, 2, 3, 4, 5].map(() => shot(8, ["a"]))};
t("durées toutes identiques → défaut rythme", codeDefects(same, P).some(d => /même durée/.test(d.problem)));
const vo = {duration: 50, shots: [1, 2, 3, 4].map(() => shot(5 + Math.random() * 3 | 0, ["a"], {voice_over: "Il était une fois…"}))};
t("voix off sur tous les plans d'une fiction → défaut narration", codeDefects(vo, P).some(d => /Voix off/.test(d.problem)));
t("voix off dans un documentaire → toléré", !codeDefects(vo, Object.assign({}, P, {vtype: "doc"})).some(d => /Voix off/.test(d.problem)));
const quiet = {duration: 50, shots: [shot(4, ["a", "b"], {dialogue: "Salut"}), shot(6, ["a", "b"]), shot(5, ["a", "b"]), shot(7, ["a", "b"])]};
t("ensemble dans 4 plans, parlent dans 1 → défaut dialogue", codeDefects(quiet, P).some(d => /échange de paroles/.test(d.problem)));
t("voix off au montage : narration et dialogue libres", !codeDefects(quiet, Object.assign({}, P, {audio: "montage"})).length && !codeDefects(vo, Object.assign({}, P, {audio: "montage"})).some(d => /Voix off/.test(d.problem)));
t("audio imposé : la durée suit la source", !codeDefects(Object.assign({}, good, {duration: 10}), Object.assign({}, P, {timeline: [{n: 1}]})).some(d => /Durée/.test(d.problem)));

// V4 — découpage : jamais un quota de plans, seulement une image figée trop longue
const shs = (sc, d) => ({scene_id: sc, characters: ["a"], shot_design: {duration: d}, sound: {}});
t("V4 : scène de 24 s en une seule image figée → défaut découpage", codeDefects({duration: 40, shots: [shs("S01", 24), shs("S02", 4), shs("S02", 7), shs("S02", 3)]}, P).some(d => /trop peu de plans/.test(d.problem)));
t("V4 : scène de 24 s en 2 plans forts → accepté (compression)", !codeDefects({duration: 44, shots: [shs("S01", 12), shs("S01", 12), shs("S02", 4), shs("S02", 5), shs("S02", 3), shs("S02", 8)]}, P).some(d => /trop peu de plans/.test(d.problem)));

// V4 — caméra, rythme, taille des scènes
const sd = (sc, dur, framing, move) => ({scene_id: sc, shot_id: "SH", characters: ["a"], shot_design: {duration: dur, framing, camera_movement: move}, sound: {}});
const formula = {duration: 44, shots: [3, 7, 4, 6, 2, 8, 5, 9].map((d, i) => sd(i < 4 ? "S01" : "S02", d, "Close-up", i % 2 ? "slow zoom in, 50mm" : "Slow zoom in 35mm"))};
t("V4 : « Close-up + slow zoom » sur tous les plans → formule répétée", codeDefects(formula, P).some(d => /formule répétée/.test(d.problem)));
const FR = ["Wide establishing shot", "Medium shot", "Over-the-shoulder", "Insert on the key", "POV", "Two-shot", "Reaction close-up", "Reveal wide shot"];
const deco = {duration: 44, shots: ["slow dolly in", "pan left", "tilt up", "tracking shot", "arc around", "push-in", "crane up", "handheld"].map((m, i) => sd(i < 4 ? "S01" : "S02", [3, 7, 4, 6, 2, 8, 5, 9][i], FR[i], m))};
t("V4 : mouvement de caméra sur tous les plans → mouvements décoratifs", codeDefects(deco, P).some(d => /mouvements décoratifs/.test(d.problem)));
const mech = {duration: 41, shots: [5, 5, 5, 5.5, 4.5, 5, 5, 6].map((d, i) => sd(i < 4 ? "S01" : "S02", d, FR[i], i % 3 ? "static" : "slow dolly in"))};
t("V4 : durées toutes autour de 5 s → découpage mécanique", codeDefects(mech, P).some(d => /découpage mécanique/.test(d.problem)));
const varied = {duration: 40, shots: [[2, "static"], [5, "locked camera"], [3, "slow push-in"], [7, "static"], [1.5, "static"], [4, "pan right"], [9, "static"], [3, "tracking shot"]].map(([d, m], i) => sd(i < 4 ? "S01" : "S02", d, FR[i], m))};
const vd = codeDefects(varied, P);
t("V4 : plans variés, caméra motivée, durées libres → aucun défaut", vd.length === 0);
if(vd.length) console.log("      ", vd.map(d => d.problem).join(" | "));
const big = {duration: 60, shots: Array.from({length: 12}, (_, i) => sd("S01", [3, 7, 4, 6, 2, 8, 5, 9, 3, 6, 4, 3][i], FR[i % 8] + " " + i, i % 3 ? "static" : "pan left"))};
t("V4 : une scène de 12 plans → scène trop chargée", codeDefects(big, P).some(d => /trop chargée/.test(d.problem)));
t("V4 : audio imposé → la taille de scène suit l'audio", !codeDefects(big, Object.assign({}, P, {timeline: [{n: 1}]})).some(d => /trop chargée/.test(d.problem)));

// V4 — lumière contextuelle et figurants
const lit = (moment, light) => ({duration: 40, scene_plan: {scenes: [{scene_id: "S01", int_ext: "EXT", moment}]}, shots: [Object.assign(sd("S01", 6, "Wide shot", "static"), {shot_id: "SH01", continuity: {light}}), sd("S01", 4, "Close-up", "static"), sd("S01", 8, "Insert", "static")]});
t("V4 : LED dans un extérieur de jour → défaut lumière", codeDefects(lit("midi", "colored LED accents"), P).some(d => /extérieure de jour/.test(d.problem)));
t("V4 : néons dans un extérieur de nuit → accepté", !codeDefects(lit("nuit", "neon signs of the street"), P).some(d => /extérieure de jour/.test(d.problem)));
t("V4 : soleil de midi dans un extérieur de jour → accepté", !codeDefects(lit("midi", "hard midday sun, bounce from the sand"), P).some(d => /extérieure de jour/.test(d.problem)));
const extras = {duration: 40, shots: [6, 4, 8, 5].map((d, i) => Object.assign(sd("S01", d, FR[i], "static"), {blocking: {background: "background extras moving naturally"}}))};
t("V4 : figurants ajoutés sur tous les plans → défaut", codeDefects(extras, P).some(d => /Figurants/.test(d.problem)));

// V4 — un seul mouvement de caméra
t("cameraOne : fixe + micro-mouvement à l'épaule → caméra fixe", cameraOne("static shot, subtle handheld camera micro-movement") === "static shot");
t("cameraOne : trois mouvements → seulement le premier", cameraOne("slow dolly in, then pan left while tracking") === "slow dolly in");
t("cameraOne : caméra fixe seule → inchangée", cameraOne("locked-off wide shot") === "locked-off wide shot");
console.log(`\n${ok} OK, ${ko} échec(s)`);
