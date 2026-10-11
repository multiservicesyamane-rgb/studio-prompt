// Contrats du pipeline « Cours du jour · Ultra ».
// Test volontairement sans navigateur et sans appel IA : il inspecte le code livré
// et exécute le normaliseur avec des réponses adversariales représentatives d'un LLM.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const HTML = path.join(__dirname, "..", "public", "index.html");
const src = fs.readFileSync(HTML, "utf8");
const out = [];
let failed = 0;

function check(name, ok, detail) {
  if (!ok) failed++;
  out.push(`${ok ? "OK   " : "ECHEC"} ${name}${detail ? " — " + detail : ""}`);
}

function between(start, end) {
  const a = src.indexOf(start);
  const b = a < 0 ? -1 : src.indexOf(end, a + start.length);
  return a >= 0 && b > a ? src.slice(a, b) : "";
}

function functionSource(name, nextName) {
  return between(`function ${name}(`, `function ${nextName}(`).trim();
}

// 1. Le mode Ultra est un vrai pipeline en trois passes, pas un simple libellé UI.
const submit = between('$("cr-form").addEventListener("submit"', '$("cr-stop").addEventListener');
const researchAt = submit.indexOf("crResearchPrompt(f)");
const lessonAt = submit.indexOf("crPrompt(f,research)");
const reviewAt = submit.indexOf("crReviewPrompt(f,research,r)");
const sampleCalls = (submit.match(/sample\.json\(/g) || []).length;

check(
  "Ultra exécute exactement les 3 passes : documentaliste → professeur-réalisateur → commission",
  researchAt >= 0 && lessonAt > researchAt && reviewAt > lessonAt && sampleCalls === 3,
  `positions ${researchAt}/${lessonAt}/${reviewAt}, ${sampleCalls} appel(s)`
);
check(
  "la recherche documentaire est réservée au mode Ultra",
  /if\s*\(f\.quality\s*===\s*["']ultra["']\)\s*\{[^{}]*crResearchPrompt\(f\)/s.test(submit)
    && /if\s*\(f\.quality\s*===\s*["']ultra["']\)\s*\{[^{}]*crReviewPrompt\(f,research,r\)/s.test(submit)
);

const researchCall = submit.slice(researchAt, lessonAt);
check(
  "le documentaliste active la recherche web avec le moteur complexe",
  /search\s*:\s*true/.test(researchCall)
    && /modelTier\s*:\s*["']complex["']/.test(researchCall)
    && /engine\s*:\s*["']best["']/.test(researchCall),
  researchCall.replace(/\s+/g, " ").slice(0, 180)
);

const researchPrompt = functionSource("crResearchPrompt", "crPrompt");
const lessonPrompt = functionSource("crPrompt", "crReviewPrompt");
const reviewPrompt = functionSource("crReviewPrompt", "crNormalize");
check(
  "chaque agent reçoit un mandat distinct et la passe finale reçoit dossier + brouillon",
  /documentaliste pédagogique/i.test(researchPrompt)
    && /DOSSIER DOCUMENTAIRE/i.test(lessonPrompt)
    && /commission finale/i.test(reviewPrompt)
    && /JSON\.stringify\(research/.test(reviewPrompt)
    && /JSON\.stringify\(course/.test(reviewPrompt)
);

// 2. Le résultat probabiliste est normalisé de façon déterministe avant affichage/export.
const normalizeText = functionSource("crNormalize", "crNormalizeLayouts");
const normalizeLayoutsText = functionSource("crNormalizeLayouts", "crRender");
const canonText = functionSource("crCanonUrl", "crVerifyResearch");
let crNormalize = null;
let crNormalizeLayouts = null;
let crCanonUrl = null;
try {
  crCanonUrl = vm.runInNewContext(`(${canonText})`, {URL}, {timeout: 1000});
  crNormalize = vm.runInNewContext(`(${normalizeText})`, {crCanonUrl, URL}, {timeout: 1000});
  crNormalizeLayouts = vm.runInNewContext(`(${normalizeLayoutsText})`, {}, {timeout: 1000});
} catch (e) {
  check("crNormalize est exécutable isolément", false, e.message);
}

if (crNormalize) {
  const research = {
    sources: [
      {id: 1, titre: "Organisation officielle", url: "https://education.example/cours"},
      {id: 2, titre: "Université", url: "https://university.example/anatomie"},
      {id: 3, titre: "URL dangereuse", url: "javascript:alert(1)"}
    ]
  };
  const raw = {
    scenes: [
      {debut: 24, fin: 80, fonction: "resume"},
      null,
      {debut: -5, fin: 8, fonction: "hook"},
      {debut: 7, fin: 7, fonction: "explication"}
    ],
    sources: [
      {id: 1, titre: "Source reconnue", url: "https://education.example/cours"},
      {id: 99, titre: "Source inventée", url: "https://invented.example/faux"},
      {id: 100, titre: "Injection", url: "javascript:alert(document.domain)"}
    ],
    demonstration_3d: {
      active: true,
      modele: "coeur",
      parties: [
        {id: "part1", nom: "Oreillette", explication: "Reçoit le sang."},
        {id: "vide", nom: "Sans explication"},
        null
      ]
    }
  };
  let norm;
  try {
    norm = crNormalizeLayouts(crNormalize(raw, {
      duration: 30,
      domaine: "Sciences",
      sujet: "Le fonctionnement du cœur"
    }, research));
  } catch (e) {
    norm = null;
    check("crNormalize accepte une réponse IA partiellement mal formée", false, e.message);
  }

  if (norm) {
    const scenes = norm.scenes || [];
    const contiguous = scenes.length === 3
      && scenes.every((s, i) => s && typeof s === "object"
        && s.n === i + 1
        && Number.isFinite(s.debut)
        && Number.isFinite(s.fin)
        && s.fin > s.debut
        && (!i ? s.debut === 0 : s.debut === scenes[i - 1].fin))
      && scenes[scenes.length - 1].fin === 30;
    check(
      "normalisation : scènes triées, contiguës, positives, numérotées et terminées à la durée exacte",
      contiguous,
      JSON.stringify(scenes.map(s => s && ({n: s.n, debut: s.debut, fin: s.fin})))
    );
    check(
      "normalisation visuelle : chaque scène reçoit un layout valide et deux cartes identiques ne se suivent pas",
      scenes.every(s => ["hero", "network", "cards", "compare", "quiz", "3d"].includes(s.layout))
        && scenes.every((s, i) => !i || s.layout !== "cards" || scenes[i - 1].layout !== "cards"),
      scenes.map(s => s.layout).join(" → ")
    );

    const urls = Array.isArray(norm.sources) ? norm.sources.map(s => String(s && s.url || "")) : [];
    check(
      "sécurité des sources : HTTPS/HTTP seulement et aucune URL absente du dossier documentaire",
      urls.length > 0
        && urls.every(u => /^https?:\/\//i.test(u))
        && urls.every(u => research.sources.some(s => s.url === u))
        && !urls.some(u => /invented|javascript:/i.test(u)),
      urls.join(" | ")
    );

    const d = norm.demonstration_3d || {};
    check(
      "sécurité médicale : modèle explicitement schématique, avertissement et parties incomplètes retirées",
      d.precision === "schématique"
        && /modèle pédagogique|atlas anatomique|professionnel de santé/i.test(d.avertissement || "")
        && Array.isArray(d.parties)
        && d.parties.length === 1,
      `${d.precision || "sans précision"} · ${(d.parties || []).length} partie(s)`
    );
  }
}

// 3. La 3D manipulable doit aussi être présente dans les pixels de la vidéo exportée.
const webglExport = functionSource("cr3dExportCreate", "mdMakeVideo");
const makeVideo = functionSource("mdMakeVideo", "crResearchPrompt");
const courseFrame = functionSource("crCourseFrame", "mdFinalizeFfmpeg");
const coursePointsText = functionSource("crCoursePoints", "crCourseFrame");
check(
  "l'export cours crée un vrai rendu WebGL déterministe",
  /import\(PR_THREE\)/.test(webglExport)
    && /new T\.WebGLRenderer/.test(webglExport)
    && /renderAt\s*\(/.test(webglExport)
    && /R\.render\(scene,cam\)/.test(webglExport)
);
check(
  "le Canvas vidéo compose les pixels WebGL, nomme la partie et libère le renderer",
  /MD_RESULT\.course/.test(makeVideo)
    && /cr3dExportCreate\(/.test(makeVideo)
    && /course3d\.renderAt\(/.test(makeVideo)
    && /drawImage\(course3d\.canvas/.test(makeVideo)
    && /part\.nom/.test(makeVideo)
    && /course3d\.dispose\(\)/.test(makeVideo)
);
check(
  "le cours possède six compositions Canvas premium et un parcours de chapitres animé",
  /hero/.test(courseFrame)
    && /network/.test(courseFrame)
    && /cards/.test(courseFrame)
    && /compare/.test(courseFrame)
    && /quiz/.test(courseFrame)
    && /demo/.test(courseFrame)
    && /PARCOURS DU COURS/.test(courseFrame)
    && /crHexPath/.test(courseFrame)
    && /Math\.min\(enter,leave\)/.test(courseFrame)
);
check(
  "le moteur vidéo réserve ces compositions au cours et ajoute les accents Web Audio",
  /if\(MD_RESULT\.course\)\s*crCourseFrame\(/.test(makeVideo)
    && /if\(!MD_RESULT\.course\)/.test(makeVideo)
    && /prWhoosh\(ac,sfx/.test(makeVideo)
    && /prHit\(ac,sfx/.test(makeVideo)
);
let malformedPointsSafe = false;
try {
  const crCoursePoints = vm.runInNewContext(`(${coursePointsText})`, {}, {timeout: 1000});
  malformedPointsSafe = Array.isArray(crCoursePoints({pedagogie: {objectifs: "pas un tableau"}}, {fonction: "objectif"}))
    && Array.isArray(crCoursePoints({demonstration_3d: {parties: "pas un tableau"}}, {fonction: "demonstration"}));
} catch (e) {}
const show3dLine = (makeVideo.match(/const showCourse3d=[^;]+;/) || [""])[0];
check(
  "le renderer résiste aux JSON mal formés, sépare les cartes verticales et replie la 3D indisponible",
  malformedPointsSafe
    && /H\*\(\.76\+i\*\.09\)/.test(courseFrame)
    && /requested==="3d"\?"cards"/.test(courseFrame)
    && /s\.layout==="3d"/.test(show3dLine)
    && !/f\.mode==="mixte"/.test(show3dLine)
);
check(
  "le réalisateur IA doit choisir un layout adapté et éviter les répétitions",
  /GRAMMAIRE VISUELLE DE RÉFÉRENCE/.test(lessonPrompt)
    && /layout=hero/.test(lessonPrompt)
    && /layout=network/.test(lessonPrompt)
    && /layout=3d/.test(lessonPrompt)
    && /Ne répète pas la même composition deux scènes de suite/.test(lessonPrompt)
);

// 4. Le format annoncé 1:1 doit réellement produire des dimensions carrées.
const dimensions = makeVideo.match(/vertical\s*=\s*f\.format\s*===\s*["']9:16["']\s*,\s*square\s*=\s*f\.format\s*===\s*["']1:1["']\s*,\s*W\s*=\s*([^,;]+)\s*,\s*H\s*=\s*([^,;]+)\s*,\s*canvas/);
let dims = null;
if (dimensions) {
  try {
    dims = vm.runInNewContext(`[${dimensions[1]}, ${dimensions[2]}]`, {vertical: false, square: true}, {timeout: 1000});
  } catch (e) {}
}
check(
  "le format 1:1 exporte un canvas réellement carré",
  !!dims && Number(dims[0]) > 0 && dims[0] === dims[1],
  dims ? `${dims[0]}×${dims[1]}` : "expressions de dimensions introuvables"
);

// Défense en profondeur : même après normalisation, l'affichage ne doit pas créer
// directement un href avec une chaîne non validée provenant du modèle.
const renderText = functionSource("crRender", "cr3dOpen");
let protocolsSafe = false;
try {
  protocolsSafe = !!crCanonUrl
    && /^https:\/\//.test(crCanonUrl("https://example.org/cours?utm_source=test#chapitre"))
    && crCanonUrl("javascript:alert(1)") === ""
    && crCanonUrl("data:text/html,boom") === ""
    && crCanonUrl("//evil.example/faux") === "";
} catch (e) {}
check(
  "les liens de sources passent par une validation de protocole avant le href",
  protocolsSafe
    && /href="\$\{esc\(crCanonUrl\(s\.url\)\)\}"/.test(renderText)
    && !/href="\$\{esc\(s\.url\)\}"/.test(renderText),
  !protocolsSafe ? "le canonicaliseur accepte un protocole dangereux"
    : /href="\$\{esc\(s\.url\)\}"/.test(renderText) ? "href construit directement depuis s.url" : ""
);

console.log(out.join("\n"));
process.exit(failed ? 1 : 0);
