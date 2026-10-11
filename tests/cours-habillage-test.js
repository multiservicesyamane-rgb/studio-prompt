// Cours du jour : un habillage propre à chaque cours et une mise en page adaptée à chaque diapo.
// Sans navigateur ni IA : le dessin est exécuté sur un faux canvas qui enregistre les appels.
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.env.SP_HTML || require("./env").HTML, "utf8");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const between = (a, b) => { const i = html.indexOf(a), j = i < 0 ? -1 : html.indexOf(b, i + a.length); return i >= 0 && j > i ? html.slice(i, j) : ""; };
const line = a => { const i = html.indexOf(a); return i < 0 ? "" : html.slice(i, html.indexOf("\n", i)); };
const code = [line("function crRoundPath("), line("function crHexPath("), line("function mdCover("), between("function crCoursePoints(", "function crCourseFrame("), between("function crCourseFrame(", "async function mdFinalizeFfmpeg(")].join("\n");
/* faux contexte 2D : garde les réglages, enregistre les appels et les couleurs utilisées */
function fakeCtx(){
  const calls = [], colors = [], grad = {addColorStop(o, c){ colors.push(c); }};
  const base = {calls, colors, measureText: t => ({width: String(t).length * 9}), createLinearGradient: () => grad, createRadialGradient: () => grad, setLineDash(){}, fillText(...a){ calls.push("text:" + String(a[0]).slice(0, 12)); }};
  return new Proxy(base, {get(o, k){ if(k in o) return o[k]; return (...a) => { calls.push(String(k)); }; }, set(o, k, v){ if(k === "fillStyle" && typeof v === "string") colors.push(v); o[k] = v; return true; }});
}
const LAYOUTS = ["hero", "network", "cards", "compare", "quiz", "3d", "definition", "formule", "frise", "schema", "etapes", "chiffre", "citation"];
let API = null;
try{ const sb = {}; vm.runInNewContext(code + "\n;this.API={CR_THEMES,crThemeOf,crItems,crContrast,crCourseFrame};", sb, {timeout: 5000}); API = sb.API; }
catch(e){ check("le dessin des cours se charge isolément", false, e.message); }
if(API){
  const {CR_THEMES, crThemeOf, crContrast, crCourseFrame} = API, ids = Object.keys(CR_THEMES);
  // 1. des habillages vraiment différents et complets
  const complete = ids.every(id => { const t = CR_THEMES[id]; return t.nom && t.quand && Array.isArray(t.bg) && t.bg.length === 3 && t.ink && t.soft && t.card && t.motif && t.forme && t.font && t.titre && Array.isArray(t.acc) && t.acc.length === 3 && typeof t.dark === "boolean"; });
  check("au moins 8 habillages complets (fond, encre, cadres, motif, polices, couleurs)", ids.length >= 8 && complete, ids.join(", "));
  check("habillages vraiment différents : fonds, motifs et cadres distincts", new Set(ids.map(id => CR_THEMES[id].bg[1])).size === ids.length && new Set(ids.map(id => CR_THEMES[id].motif)).size === ids.length && new Set(ids.map(id => CR_THEMES[id].forme)).size >= ids.length - 1 && ids.some(id => CR_THEMES[id].dark) && ids.some(id => !CR_THEMES[id].dark));
  // 2. toujours lisible
  const low = ids.flatMap(id => { const t = CR_THEMES[id], c = x => crContrast(x, t.bg[1]); return [c(t.ink) < 7 ? `${id} encre ${c(t.ink).toFixed(1)}` : "", c(t.soft) < 4.5 ? `${id} texte ${c(t.soft).toFixed(1)}` : "", ...t.acc.map(a => c(a) < 3 ? `${id} accent ${a} ${c(a).toFixed(1)}` : "")].filter(Boolean); });
  check("lisible sur chaque fond : encre ≥ 7, texte secondaire ≥ 4,5, couleurs d'accent ≥ 3 (contraste)", !low.length, low.join(" | "));
  // 3. le bon habillage pour le bon cours
  const th = (r, f) => crThemeOf(r, f).id;
  check("l'agent choisit l'habillage du cours (choix valable gardé)", th({direction: {habillage: "archive"}}, {domaine: "Mathématiques"}) === "archive" && th({direction: {habillage: "labo"}}, {}) === "labo");
  check("la mise en scène demandée s'applique : « tableau » → tableau à craie, « 3d » → nuit technologique", th({direction: {habillage: "pop"}}, {mode: "tableau"}) === "tableau" && th({}, {mode: "3d"}) === "nuit");
  check("le choix fait à la main l'emporte sur tout", th({direction: {habillage: "editorial", habillage_main: true}}, {mode: "tableau"}) === "editorial");
  const fb = ["Mathématiques", "Sciences", "Histoire et géographie", "Langues", "Informatique et technologie", "Économie et droit", "Métiers et formation", "Arts et culture", "Santé et vie quotidienne"].map(d => th({titre: "Cours", direction: {habillage: "inconnu"}}, {domaine: d, niveau: "college", sujet: "Une leçon"}));
  check("sans choix valable : habillage déduit de la matière (histoire → archives ; au moins 5 habillages différents pour 9 matières)", fb[2] === "archive" && ["tableau", "plan"].includes(fb[0]) && new Set(fb).size >= 5, fb.join(", "));
  check("niveau enfant : habillage joyeux (couleurs vives ou cahier)", ["pop", "cahier"].includes(th({titre: "A"}, {niveau: "enfant", domaine: "Sciences"})) && ["pop", "cahier"].includes(th({titre: "Bb"}, {niveau: "enfant", domaine: "Histoire"})));
  // 4. chaque mise en page se dessine, dans chaque habillage et chaque format
  const scene = l => ({layout: l, fonction: l === "hero" ? "hook" : l === "quiz" ? "quiz" : l === "compare" ? "erreur" : "explication", texte_ecran: "Titre de la diapo", message: "Une phrase d'explication.", voix_off: "Première idée. Deuxième idée.",
    items: l === "frise" ? [{valeur: "1900", texte: "Début"}, {valeur: "1950", texte: "Milieu"}, {valeur: "2000", texte: "Fin"}] : l === "chiffre" ? [{valeur: "75 %", texte: "Une donnée.", titre: "Source officielle"}] : [{titre: "Un", texte: "Premier élément."}, {titre: "Deux", texte: "Deuxième élément."}, {titre: "Trois", texte: "Troisième élément."}]});
  const fails = [], sigs = {}, bgs = {};
  for(const id of ids) for(const [W, H] of [[720, 1280], [1280, 720]]) for(const l of LAYOUTS){
    const g = fakeCtx(), r = {titre: "Cours", direction: {habillage: id}, pedagogie: {objectifs: ["A", "B", "C"]}, scenes: LAYOUTS.map(scene)};
    try{ crCourseFrame(g, r, {domaine: "Sciences", niveau: "college", mode: "auto"}, r.scenes[LAYOUTS.indexOf(l)], LAYOUTS.indexOf(l), .7, 3, W, H, [], null, false); }
    catch(e){ fails.push(`${id} ${l} ${W}×${H} : ${e.message}`); continue; }
    if(g.calls.length < 25) fails.push(`${id} ${l} ${W}×${H} : ${g.calls.length} appels`);
    if(W === 720){ (sigs[id] = sigs[id] || new Set()).add(g.calls.join(",")); bgs[id] = g.colors.slice(0, 3).join(" "); }
  }
  check(`les ${LAYOUTS.length} mises en page se dessinent sans erreur dans les ${ids.length} habillages, en 9:16 et en 16:9`, !fails.length, fails.slice(0, 3).join(" | "));
  check("chaque mise en page a sa propre composition (au moins 12 dessins différents par habillage)", ids.every(id => sigs[id] && sigs[id].size >= 12), ids.map(id => `${id}:${sigs[id] ? sigs[id].size : 0}`).join(" "));
  check("le fond de chaque vidéo suit son habillage", ids.every(id => (bgs[id] || "").includes(CR_THEMES[id].bg[0])), ids.map(id => bgs[id]).slice(0, 2).join(" / "));
}
// 5. normalisation : nouvelles mises en page et contenu structuré (fonction autonome)
try{
  const crNormalizeLayouts = vm.runInNewContext(`(${between("function crNormalizeLayouts(", "function crRender(").trim()})`, {}, {timeout: 1000});
  const n = crNormalizeLayouts({scenes: [{layout: "frise", items: [{valeur: 1900, texte: "  Début  "}, null, "texte seul", {}]}, {layout: "frise"}, {layout: "inconnu", fonction: "quiz"}, {layout: "formule", items: Array.from({length: 9}, (_, i) => ({texte: `ligne ${i}`}))}]}).scenes;
  check("normalisation : nouvelles mises en page gardées, deux identiques jamais de suite, inconnue → selon la fonction", n[0].layout === "frise" && n[1].layout !== "frise" && n[2].layout === "quiz" && n[3].layout === "formule", n.map(s => s.layout).join(" → "));
  check("normalisation : éléments nettoyés (objets seulement, textes coupés, 6 au plus)", n[0].items.length === 1 && n[0].items[0].valeur === "1900" && n[0].items[0].texte === "Début" && n[3].items.length === 6, JSON.stringify(n[0].items));
}catch(e){ check("normalisation exécutable isolément", false, e.message); }
// 6. la consigne de l'agent et l'écran du résultat
const lesson = between("function crPrompt(f,research){", "function crReviewPrompt("), review = between("function crReviewPrompt(", "function crNormalize(");
check("consigne : l'agent choisit un habillage propre au cours, parmi la liste, et l'explique", /direction\.habillage/.test(lesson) && /Object\.entries\(CR_THEMES\)/.test(lesson) && /habillage_raison/.test(lesson) && /deux cours différents ne doivent pas se ressembler/.test(lesson));
check("consigne : une mise en page adaptée au contenu de chaque diapo, avec son contenu exact (items)", ["definition", "formule", "frise", "schema", "etapes", "chiffre", "citation"].every(l => lesson.includes(`layout=${l}`)) && /"items":\[\{"titre":"","texte":"","valeur":""\}\]/.test(lesson) && /au moins 4 mises en page différentes/.test(lesson));
check("la commission garde l'habillage et le contenu structuré", /direction\.habillage/.test(review) && /items exacts/.test(review));
check("résultat : l'habillage choisi est expliqué, montré sur trois diapos et se change avant la vidéo", /function crThemeCard\(/.test(html) && /id="cr-theme"/.test(html) && /habillage_main=true/.test(html) && /function crThemePreview\(/.test(html) && /\$\("md-res"\)\.innerHTML=""; crThemePreview\(\); \}/.test(html));
check("plus de mots techniques dans les vidéos (Canvas, WebGL, Web Audio, FFmpeg)", !/CANVAS • WEBGL • FFMPEG|WEB AUDIO \+ FFMPEG/.test(html));
console.log(out.join("\n"));
