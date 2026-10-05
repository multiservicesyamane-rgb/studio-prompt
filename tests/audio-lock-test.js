// Teste l'alignement des plans sur l'audio importé (sans appeler de modèle).
const fs = require("fs");
const html = fs.readFileSync(require("./env").HTML, "utf8");
const a = html.indexOf("const timelineLockedOf"), b = html.indexOf("function normalizeMasterPlan(", a);
const {audioLockedOf, lockShotsToAudio, fillMissingUnits} = new Function(html.slice(a, b) + "; return {audioLockedOf, lockShotsToAudio, fillMissingUnits};")();
let ok = 0, ko = 0;
const t = (name, cond) => { console.log((cond ? "OK   " : "ÉCHEC") + " " + name); cond ? ok++ : ko++; };
const units = [{n: 1, texte: "Il était une fois un pêcheur."}, {n: 2, texte: "Un matin, la mer devint rouge."}, {n: 3, texte: ""}, {n: 4, texte: "Il comprit enfin."}];
const P = {audioKind: "histoire", timeline: units};
const sh = (id, n, sound) => ({shot_id: id, source_n: n, event: "e" + id, sound: sound || {}});

t("audio importé reconnu ; remake de SA vidéo verrouillé, vidéo d'un autre jamais recopiée", audioLockedOf(P) && audioLockedOf({audioKind: "remake", timeline: units}) && !audioLockedOf({audioKind: "remake", remakeSrc: "autre", timeline: units}) && !audioLockedOf({}));
let r = lockShotsToAudio([sh("A", 1, {voice_over: "Il était un fois un pecheur"}), sh("B", 2), sh("B2", 2), sh("C", 3), sh("D", 4)], units, true);
t("un plan par unité (le doublon de l'unité 2 est retiré)", r.length === 4 && r.map(s => s.source_n).join() === "1,2,3,4");
t("texte exact placé par l'application (faute du modèle corrigée)", r[0].sound.voice_over === "Il était une fois un pêcheur." && r[1].sound.voice_over === "Un matin, la mer devint rouge.");
t("unité sans texte : pas de voix inventée", !r[2].sound.voice_over);
r = lockShotsToAudio([sh("A", undefined), sh("B", "x"), sh("C", undefined), sh("D", undefined)], units, true);
t("plans sans source_n rangés dans l'ordre des unités", r.map(s => s.shot_id).join() === "A,B,C,D" && r[3].sound.voice_over === "Il comprit enfin.");
r = lockShotsToAudio([sh("A", 1, {dialogue: "bla"}), sh("D", 4)], units, true);
t("réplique d'un personnage : le texte exact va dans dialogue", r[0].sound.dialogue === "Il était une fois un pêcheur." && !r[0].sound.voice_over);
const d = {shots: lockShotsToAudio([sh("A", 1), sh("D", 4)], units)};
const scenes = {scenes: [{scene_id: "S02", source_n: 2, event: "La mer devient rouge sous les yeux du pêcheur", characters: ["pecheur"]}]};
const filled = fillMissingUnits(d, P, scenes);
t("unités manquantes couvertes, dans l'ordre", filled.join() === "2,3" && d.shots.map(s => String(s.source_n)).join() === "1,2,3,4");
t("unité 2 construite depuis SA scène (pas une copie du voisin)", d.shots[1].event === "La mer devient rouge sous les yeux du pêcheur" && d.shots[1].scene_id === "S02" && d.shots[1].shot_id === "SH02");
t("le plan construit porte le texte exact de son unité", d.shots[1].sound.voice_over === "Un matin, la mer devint rouge.");
t("sans scène : suite du plan d'origine, sans chaîne de copies", /^Suite du plan A : eA$/.test(d.shots[2].event) && d.shots[2].shot_id === "SH03");
console.log(`\n${ok} OK, ${ko} échec(s)`);
