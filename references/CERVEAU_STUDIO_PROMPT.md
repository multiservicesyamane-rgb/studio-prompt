# STUDIO PROMPT — CERVEAU FONCTIONNEL

Référence de l'architecte logiciel principal. Les noms de fonctions sont ceux de `public/index.html` ; les numéros de ligne ne sont jamais cités, car ils bougent à chaque modification.
Dernière mise à jour : 5 octobre 2026 (Director Engine V4).

---

## 0. Avant toute modification

Tu es l'architecte logiciel principal de Studio Prompt et tu réponds de la cohérence de l'ensemble.

- **Le système est cumulatif.** V1, V2, V3 et V4 s'empilent. Aucune fonctionnalité, règle ou capacité existante ne disparaît sans être dite. Quand deux couches se contredisent, applique les règles d'arbitrage du §5.5 et signale le conflit.
- **Méthode obligatoire pour toute modification importante :**
  1. inspecter le projet existant ;
  2. identifier les composants concernés (§4 et §6) ;
  3. proposer l'architecture ;
  4. vérifier les risques de régression (§9) ;
  5. implémenter ;
  6. tester (§8) ;
  7. documenter les changements (ce fichier, et `DIRECTOR_ENGINE_V4.md` si le moteur change).
- **Évolution incrémentale.** Ne réécris jamais l'application si une évolution suffit. Ne crée pas de module en doublon : étends celui qui existe.
- **Corriger le moteur, jamais une vidéo.** Un défaut constaté sur un projet devient une règle, un contrôle du code ou une correction du pipeline, valable pour toutes les vidéos. La logique centrale ne contient jamais de nom de personnage, d'histoire, de langue, de pays, de marque ni de type de vidéo particulier.

## 1. Le produit

L'utilisateur est un créateur de vidéos IA basé au Sénégal, francophone et non développeur. Il publie des vidéos réalistes (histoires, séries, documentaires, vidéos virales) sur YouTube, TikTok et Facebook. Il vise surtout les pays où le RPM est élevé.

Studio Prompt est son **réalisateur IA**. À partir d'une idée, d'un texte, d'un scénario, d'un audio ou d'une vidéo réelle, il produit :
- une histoire qui retient (hook, question, progression, payoff) ;
- des scènes, puis des plans réellement générables et raccordés ;
- les prompts image et vidéo adaptés au générateur (Veo 3.1, Runway, Wan) ;
- le son, les dialogues, les sous-titres, le plan de montage, un pré-montage ;
- le contrôle de monétisation, l'adaptation à un autre pays et l'apprentissage depuis ses clips et ses statistiques.

Principe suprême : chercher d'abord **une situation que le spectateur veut comprendre**, puis la rendre belle. La beauté visuelle ne compense jamais une histoire faible.

Objectifs mesurables : rétention, compréhension sans le son, continuité des personnages, peu de crédits de génération gaspillés (plans inutiles, régénérations) et monétisation sans risque (pas de contenu réutilisé, trompeur ou protégé).

## 2. Règles non négociables

**Sécurité**
- Aucune clé API dans le code du navigateur. Les clés vivent dans `.env`, lu uniquement par `server.js`.
- `.env` n'est jamais affiché, même masqué, et jamais commité.
- Avant chaque commit, chercher dans le diff des motifs de secrets (`AIza`, `sk-`, `sb_secret`, `service_role`, `eyJ`).
- Tout ce qui est dans `public/` est publié sur GitHub Pages, et le dépôt est public. Aucun fichier privé n'y va.
- Ne jamais héberger le serveur en ligne sans `APP_PASSWORD`.

**Éthique des agents** (à conserver dans tous les prompts)
- Pas de personnes réelles ni de célébrités.
- Pas de contenu protégé.
- Pas de faux témoignages.
- Pas de conseil pour se faire passer pour un faux pays avec un VPN.

**Toujours une alternative gratuite** (règle de l'utilisateur, 6 octobre 2026) : chaque page qui utilise un service payant ou limité propose un relais gratuit (automatique quand c'est possible, sinon une méthode à la main clairement expliquée). Exemples en place :
- texte : relais des moteurs, puis Gemini gratuit ;
- web : flux RSS ;
- transcription : Whisper local ;
- analyse vidéo : images clés et Whisper local ;
- images : application ChatGPT (avec l'abonnement de l'utilisateur) ou application Gemini, en envoyant les messages préparés du Storyboard un par un, puis « Importer » ; ou photos libres de droits ;
- vidéos : Google Flow ou le site Higgsfield (prompts « Autres outils » : Seedance 2.5, MiniMax H3) puis « Importer » ;
- voix : quota gratuit de Gemini (plusieurs modèles de voix en relais), puis **voix naturelle de Hugging Face** (Chatterbox), puis **voix gratuite sur l'ordinateur** (Piper, voir ci-dessous).

**La meilleure voix gratuite, chaîne automatique** (demande du 7 octobre : « la meilleure voix… comme une voix réelle »). Recherche faite ce jour-là :
- retenues : **Gemini** (voix les plus naturelles, gratuites dans la limite du jour) et **Chatterbox Multilingual** (Resemble AI, licence MIT, très naturelle en français, servie gratuitement par un espace ZeroGPU de Hugging Face) ;
- écartées : Kokoro (anglais seulement), Voxtral (poids ouverts non commerciaux CC BY-NC, API payante), MeloTTS (licence MIT, mais aucun service gratuit hébergé fiable trouvé). À revoir si un nouveau modèle français apparaît.

Côté serveur (`generation.js`) :
- **relais entre modèles Gemini** : `TTS_MODELS` = `GEMINI_TTS_MODEL` puis `GEMINI_TTS_FALLBACKS` (5 modèles par défaut). Chaque modèle a son propre quota du jour, donc la même clé fait environ 5 fois plus de voix. `runGeminiVoice` garde le même nom de voix d'un modèle à l'autre. Un quota du jour (429 « PerDay ») bloque le modèle (`ttsBlocked`) jusqu'à la fin de son délai (6 h par défaut) et passe au suivant ; un 404 le bloque 6 h ; une limite par minute fait attendre. Tous bloqués : échec `quota_day` « … sur les N modèles de voix : elles reviennent demain matin », qui annonce le relais ;
- **voix naturelle Chatterbox** (service `chatterbox`, voix `fr_f1`) : `runChatterbox` appelle l'API Gradio de l'espace (`/gradio_api/call/generate_tts_audio`, puis lecture du résultat en flux). Le texte est découpé en morceaux de 280 caractères au plus (`splitText`, l'espace refuse plus de 300), puis les morceaux sont recollés en un seul WAV avec 0,22 s de pause (`pcmOf`). La voix de référence est un échantillon de démonstration de l'espace (`CHATTERBOX_REF_FR` pour en changer : sa propre voix seulement, jamais celle d'une personne réelle sans accord) ;
- sans compte, Hugging Face ne donne que quelques voix par jour (mesuré le 7 octobre : refus `event: error` après environ 5 appels). Un compte Hugging Face gratuit (`HF_TOKEN`) en donne davantage. Refus → échec `quota_day` « Hugging Face refuse… », qui annonce la voix de l'ordinateur ;
- `CHATTERBOX_SPACE_URL` permet de viser un autre espace (et un faux espace dans les tests).

Côté page (revue de presse) :
- choix « ⭐ La meilleure voix gratuite » (`auto`, par défaut quand le serveur répond) : Gemini « Charon » ;
- si les voix Gemini échouent sur le quota du jour, **toute** la revue est refaite par la voix naturelle de Hugging Face (`prWatch` → `prVoiceJobs("chatterbox", "fr_f1")`), pour garder une seule voix d'un bout à l'autre ;
- si Hugging Face refuse aussi, la voix de l'ordinateur (Siwis) termine la revue ;
- choix direct possible : `hf:fr_f1` ;
- l'essai de la voix gère `auto` et `hf:` ;
- Connexions affiche la ligne « Voix naturelle gratuite · Hugging Face », ainsi que le nombre de modèles Gemini en relais et combien sont épuisés aujourd'hui.

**Voix gratuite sur l'ordinateur** (`LOCAL_VOICES`, `localTts`, `localSpeak`, dans `index.html`). Mesuré le 7 octobre sur l'ordinateur de l'utilisateur : premier usage ≈ 3 min (téléchargement de 60 Mo), puis 6 à 12 s par phrase. Le serveur envoie les en-têtes `Cross-Origin-Opener-Policy: same-origin` et `Cross-Origin-Embedder-Policy: credentialless` sur les pages (isolation de la page : la voix calcule sur 4 cœurs, ≈ 30 % plus vite ; les images et scripts d'autres sites se chargent toujours) ; `SP_NO_ISOLATION=1` les coupe en cas de souci.
- moteur Piper dans le navigateur (`@diffusionstudio/vits-web@1.0.3`, chargé depuis jsDelivr), sans clé, sans quota ; la première fois, la voix se télécharge (environ 60 Mo) puis reste en cache ;
- le WAV produit est enregistré dans le projet par `genApi.upload` (même stockage que les autres voix) ; sa durée est lue dans l'en-tête (`wavSecs`) ;
- voix proposées : Siwis (femme, CC BY 4.0), UPMC (CC BY-SA 4.0), MLS (CC BY 4.0), Gilles (homme, CC0). « Tom » est écartée (licence AGPL). Le crédit exigé par la licence est ajouté à la description à copier (`localCredits` pour un projet, `PR.voiceCredit` pour la revue) ;
- revue de presse : choix direct (`local:<voix>`) ou **relais automatique** (`prWatch` → `prVoiceLocal`). Dans la chaîne automatique, il passe après la voix naturelle de Hugging Face, avec Siwis. Quand une voix Gemini précise a été choisie et échoue sur « Quota du jour », il prend une voix de même genre. Sans serveur, la voix gratuite est choisie d'office ;
- onglet Paroles : voix gratuites dans la distribution (`local|<voix>`), essai, et bouton « Refaire ces voix gratuitement » (`genVoicesFree`) : chaque personnage refusé passe sur une voix gratuite du même genre et **tous** ses plans sont refaits, pour garder une seule voix par personnage ;
- tests : `window.__localTtsMock` remplace le moteur (aucun téléchargement).

**Abonnement ChatGPT de l'utilisateur** (vérifié le 6 octobre 2026 dans la documentation d'OpenAI, « Sign in with ChatGPT », page Preview limitations) : un abonnement Plus ou Pro peut payer les demandes de **texte** (Responses API) d'une application open source hébergée localement, après connexion OAuth avec retour sur `http://127.0.0.1:<port>/auth/callback` ; la **génération d'images n'est pas prise en charge** par ce chemin (« Unsupported tools: Image generation… »). Les images avec l'abonnement se font donc dans l'application ChatGPT (méthode à la main du Storyboard) ; l'API d'images (`OPENAI_API_KEY`) reste payante à part.

**Higgsfield** (vérifié le 6 octobre 2026, centre d'aide de Higgsfield et serveur MCP) : les générations gratuites ou illimitées du forfait marchent **seulement sur le site** higgsfield.ai. L'API (`api.higgsfield.ai`, clé sur la console) est un produit séparé payé en dollars (recharge de 5 $ au moins). La connexion pour agents (MCP, `https://mcp.higgsfield.ai/mcp`, OAuth via `clerk.higgsfield.ai` : inscription dynamique du client, PKCE, ou code d'appareil) dépense les **crédits du compte** à chaque génération, même avec un forfait illimité (exemples publiés : Seedance 2.5, 15 s en 1080p = 270 crédits ; image Soul 2.0 = 0,5 crédit). Studio Prompt propose donc la méthode gratuite à la main (boutons « Ouvrir Higgsfield » au Storyboard et aux Plans, puis import) ; une connexion automatique par MCP, comme pour Manus, reste possible si l'utilisateur accepte de dépenser des crédits.

**Utiliser le cerveau de l'agent** : toute nouvelle fonction réutilise les briques existantes (Director V4, `keyframePrompt` et le compilateur, fiches des personnages, `learningBlock`, critiques) plutôt que des consignes isolées.

**Interface**
- Français simple, pensée pour le téléphone d'abord (390 px), sans défilement horizontal.
- Mode sombre et mode clair.
- Aucune erreur dans la console.

**Code**
- Ne supprime aucune fonction existante qui marche.
- Les prompts envoyés aux générateurs sont **assemblés par l'application** à partir des champs JSON, pas recopiés tels quels depuis la réponse du modèle.

## 3. Architecture actuelle

| Fichier | Rôle |
|---|---|
| `public/index.html` | Toute l'interface et toute la logique (≈ 6 200 lignes, ≈ 300 fonctions, dans une seule IIFE) : agents, prompts, pipeline, contrôles, rendu. |
| `public/claude-shim.js` | Adaptateur qui recrée `window.claude` sur l'ordinateur. **Son interface est stable** : changer le moteur ou le stockage se fait dans l'adaptateur, jamais dans les appels de `index.html`. |
| `server.js` | Serveur Node 18+, **sans dépendance**. Il sert `public/`, expose `POST /api/sample` (flux NDJSON) et `GET /api/status`, choisit et relaie les moteurs d'IA et fait la recherche web gratuite. Il expose aussi :
- `POST /api/images/generate` : images du Storyboard (payant) ;
- `POST /api/video/analyze` : analyse complète d'une vidéo (gratuite) ;
- `GET /api/news` : une de Google Actualités pour l'édition d'un pays, plus les titres du jour de chaque journal via `site:` (`GOOGLE_NEWS_BASE` pour les tests) ;
- `POST /api/news/read` : texte principal d'un article à partir de son lien. Les adresses locales sont refusées, sauf avec `NEWS_ALLOW_LOCAL` en test ; les liens Google Actualités sont refusés avec une explication. `SP_NO_DOTENV=1` ignore `.env`, pour les tests. |
| `generation.js` | Module serveur de **fabrication**, sans dépendance. Il gère les tâches suivies (`public/generated/jobs.json`, reprise après redémarrage), le budget du jour (`GEN_BUDGET_USD`), les voix (Gemini gratuit, une à la fois, avec attente si Google limite par minute et relais entre ses modèles de voix quand l'un atteint son quota du jour ; voix naturelle Chatterbox sur un espace Hugging Face ; ElevenLabs), les vidéos (Veo 3.1 avec `GEMINI_MEDIA_API_KEY` ou la clé principale, Runway), les imports (`/api/gen/upload-file`) et la lecture des médias par morceaux (Range). |
| `public/*_PROMPTING_GUIDE.md`, `public/MASTER_VIDEO_PROMPT_AGENT.md` | Guides de rédaction par générateur. |
| `references/` | Specs (`DIRECTOR_ENGINE_V4.md`, `creative-director-v2/`, ce fichier), analyses de style et prompts réussis. |
| `tests/` | Tests de non-régression avec IA simulée (§8). |
| `.github/workflows/pages.yml` | Publie `public/` sur GitHub Pages à chaque push sur `main`. Pages n'a pas de serveur : l'interface s'affiche, mais les agents ne marchent pas. |

### 3.1 Interfaces stables

**`window.claude.use("sample").json(prompt, {signal, onText, images, modelTier, cache, web})`**
- C'est le seul point d'appel à l'IA.
- Erreurs typées : `rate_limited`, `bad_key`, `network`, `overloaded`, `quota_exceeded`, etc.
- Le modèle réellement utilisé est attaché à la réponse (`_model`, non énumérable) et affiché par étape.

**`window.claude.db`**
- `collection(path).doc(id).set/delete`, `orderBy().limit().onSnapshot()`.
- Aujourd'hui sur `localStorage` (clé `sp-local-db`, environ 5 Mo).
- Préférences dans `sp-prefs`.

**`user.id()`** renvoie `"local"`. **`downloads.save({filename, data})`** enregistre un fichier.

**`window.claude.use("gen")`** (seulement en local ; absent sur claude.ai et sur GitHub Pages)
- Méthodes : `status()`, `voices(provider)`, `jobs(project, ids)`, `start({kind:"voice"|"video", …})`, `upload(file, {project, base})`.
- Dans la page, cette capacité s'appelle `genApi`. L'état est dans `FAB`.
- Le projet garde dans `result` :
  - `voix_casting` : une voix fixe par personnage, `_narr` étant la voix off ;
  - `generated_voices[n]` ;
  - `generated_images[n]` : images importées ou générées ;
  - `generated_videos[n]` : clips importés.

### 3.2 Moteurs d'IA (côté serveur)

Ordre du relais :
1. **Sol** (OpenAI, s'il reste des crédits) ;
2. **chaîne Gemini gratuite** (`GEMINI_FALLBACKS`) : en cas de 429, le modèle est bloqué et on passe au suivant ; en cas de 500, 502, 503 ou 504, il est marqué « occupé » et on passe au suivant ;
3. **Luna** (`OPENAI_FALLBACK`), essayé en premier si tous les Gemini corrects sont bloqués ;
4. **Flash-Lite**, en dernier recours.

Autres règles du relais :
- L'audio va toujours vers Gemini.
- Erreur réseau : un nouvel essai, puis le relais.
- Le shim relance une fois sur `overloaded`.
- `/api/status` renvoie l'état du quota et l'heure de remise à zéro.

**Recherche web sans quota** : `gatherWeb` lit les flux RSS Google Tendances et Google Actualités, puis les injecte dans la demande (« DONNÉES DU WEB RÉCUPÉRÉES À L'INSTANT… »).

## 4. Le pipeline vidéo

Point d'entrée : `generateProject`.

**Journal du pipeline**
- Chaque étape est journalisée par `pipeStart` et `pipeStep`, avec les états READY, DONE, FAIL ou SKIPPED et le modèle utilisé.
- Ce journal est affiché par `pipelineHtml`.
- Le suivi en direct est fait par `GEN_STEPS`, `genStart`, `genEnd` et `renderGenSteps`.

| Étape (identifiant du journal) | Fonctions | Contrôles |
|---|---|---|
| `INPUT_ROUTER` | `routeInput` → IDEA, TEXT, SCRIPT, AUDIO ou VIDEO | — |
| `LEARNING_MEMORY` | `activeLessons`, `learningBlock(p, cible)` : leçons générales injectées | Les leçons ne citent jamais un projet. |
| `IDEA_ENGINE + CREATIVE_CRITIC` | `creativePrompt` → `developCreative` → `normalizeCreative` | Seuils du format (`videoProfile(...).gates`), test de prévisibilité, refus des histoires génériques |
| `SCENE_ENGINE + SCENE_CRITIC` | `scenePlanPrompt` (+ `DIRECTOR_V4`) → `developScenes` → `normalizeScenePlan`, `scenePlanPasses` | Une scène = une unité dramatique. `sceneRange` donne le nombre de scènes selon la durée (jusqu'à 20). |
| `MASTER_PLAN + DIRECTOR_CRITIC` | `executionPlanPrompt` (+ `DIRECTOR_V4`, REALIZATION ORCHESTRATOR) → `directExecution` / `directByBatches` (`sceneBatches`, `BATCH_SHOTS = 12`, `batchParams`) → `finishMaster`, `normalizeMasterPlan`, `assignMasterTimes` | `codeDefects` (code) + `masterPlanFailures` (dur ou souple) ; une réécriture (`rewritePack`), puis « PASS AVEC RÉSERVES » plutôt qu'une exception |
| Audio imposé | `audioLockedOf`, `lockShotsToAudio`, `setUnitText`, `fillMissingUnits` | Un plan par unité audio. Le texte est placé par l'application, jamais réécrit. |
| `DIALOGUE_DOCTOR` | `dialoguePrompt` → `dialogueDoctor` | Limite de mots par plan (`max_mots`), plans muets voulus |
| `MODEL_ROUTER + MODEL_ADAPTER` | `routeMasterPlan`, `routeShotModel`, `evaluateShotModel`, `modelExecutionMode`, `routeFallback`, `MODEL_CAPABILITIES` (veo, runway, wan), `MODEL_ADAPTER_CONTRACT` | Le Master Video Plan est verrouillé : l'adaptateur traduit, il ne réécrit pas l'histoire. |
| `PROMPT_COMPILER` | `prepareProduction`, `productionIdea`, `agentPrompt` (+ `PROMPT_V4`), compilation par morceaux, `normalize`, `validResult` | `lintPlan` / `lintSummary`, prompts assemblés par `keyframePrompt`, `i2vPrompt`, `t2vPrompt`, `startPrompt`, `videoPrompt`, `negPrompt`, `shotLine`, `cameraOne`, `STYLES`, `BASE_AVOID`, `VEO_CLEAN` |
| `GENERATION` (faite par l'utilisateur) | Prompts copiés dans Veo, Runway ou Wan | `riskOf` / `riskChip` : risque faible, moyen ou élevé avant génération |
| Après génération | `videoCriticPrompt`, `runVideoCritic` (VIDEO CRITIC), `vcApplyMasterPatch` (TARGETED REGENERATION), `fixShot`, `learnFromClip` / `storeLesson` | Décisions : APPROVED, APPROVED WITH NOTES, REGENERATE, REJECT |

### 4.1 Entrée « Depuis une vidéo » (analyse complète)

1. `analyzeFullVideo` envoie le **fichier entier** à `/api/video/analyze`.
2. Le serveur passe par l'envoi reprenable de la Files API Gemini, attend l'état ACTIVE, puis appelle `/interactions` avec `processing` : 4 images/s jusqu'à 2 min, 2 jusqu'à 5 min, puis le mode « agentic » en flux pour les vidéos longues. Le rapport JSON structuré (`videoAnalysisSchema`) contient la transcription mot à mot, les scènes, les plans horodatés (cadrage, angle, focale, mouvement caméra, lumière, son, transitions, raccords), les défauts et les pistes de reconstruction. Il est rédigé en français ; les paroles restent dans leur langue d'origine. La copie est ensuite supprimée chez Google.
3. `normalizeFullVideo` répare les minutages. `renderRmReport` montre ce que l'agent a compris (bouton « 1. Analyser la vidéo complète »). La transcription remplit `rm-text`, qui reste modifiable.
4. `rmTimeline` / `splitFullVideoShots` découpent chaque plan source à la durée du générateur. Un segment technique garde l'action, l'axe et l'état.
5. `params.fullVideoAnalysis` est injecté dans le Scene Engine (« ANALYSE MULTIMODALE ») et dans le Master Plan (« ANALYSE DES PLANS SOURCE »).
6. Si l'analyse complète échoue (quota, format), les images clés locales (`readVideo` + `describeFrames`) prennent le relais.

Page simplifiée (demande de l'utilisateur du 5 octobre) :
- On ne voit que la vidéo, « Ce que tu veux améliorer » (ses conseils) et deux boutons.
- Les paroles extraites (`#rm-words`), le rapport et la ligne « Réglages choisis automatiquement » (`rmAutoSettings`) n'apparaissent qu'après l'analyse.
- Le format vient des dimensions de la vidéo. Le type et le style viennent du classement de l'analyse : le catalogue `X-Catalog` est envoyé au serveur, et le schéma impose `overview.video_type` et `overview.style_id`. Si l'API refuse ce classement, l'analyse est refaite sans lui.
- Les réglages restent modifiables, repliés sous « Modifier les réglages ». Le formulaire « conseils sans fichier » est replié.

Sans analyse complète (quota épuisé) :
- `rmLocalWords` extrait quand même les paroles avec le transcripteur gratuit local (`transcribeLocal` accepte une autre source que la page audio) ;
- les images clés prennent ensuite le relais.

**Mode RECONSTRUCTION** (`creativePrompt`) :
- Avec la propre vidéo de l'utilisateur, hors choix « Réinventée », le moteur d'idées ne génère pas 12 concepts.
- L'histoire, les personnages, les lieux, l'ordre des événements, les paroles et le message sont verrouillés ; seule la réalisation est améliorée.
- Avant ce mode, le moteur pouvait choisir une autre histoire (bug signalé : « il mélange une autre »).

Règle des paroles :
- avec la propre vidéo de l'utilisateur, les paroles sont verrouillées (`audioLockedOf`) ;
- avec la vidéo d'un autre (`remakeSrc === "autre"`), elles servent seulement de contexte, et rien n'est recopié.

**Étudier des vidéos YouTube à forte audience** (page « Depuis une vidéo », champ « Ou des liens YouTube à étudier », jusqu'à 5 liens ; demande de l'utilisateur du 6 octobre avec trois Shorts éducatifs de plus d'un milliard de vues chacun) :
- `POST /api/video/analyze-url` : métadonnées publiques (`youtubeMeta` : oEmbed + page : titre, chaîne, vues, durée, date) puis analyse complète par Gemini **directement depuis le lien** (`fileData.fileUri`, sans téléchargement), avec la consigne partagée `videoAnalysisPrompt` et la consigne d'étude `learnPrompt` (objet `succes` : format, accroche, rythme, structure, visuel, son, texte à l'écran, boucle, titre et hashtags, public, pourquoi ça marche, leçons, idées originales) ;
- relais des modèles : chaque modèle gratuit a son quota du jour (20 demandes pour gemini-2.5-flash le 6 octobre) ; `GEMINI_VIDEO_FALLBACKS` (par défaut gemini-3.5-flash-lite, gemini-3.1-flash-lite) lit aussi les liens YouTube, vérifié en vrai ;
- secours gratuit : `GET /api/video/yt-frames` découpe les planches d'aperçu publiques de YouTube (environ une image par seconde, `ytFrames`) ; l'agent étudie alors ces images (`learnFramesPrompt`) et la reconstruction s'en sert comme de captures ;
- `renderRmLearn` montre pour chaque vidéo pourquoi elle marche, les leçons (fusionnées sans doublon) à cocher et les idées originales ; « 🧠 Apprendre ces leçons à mon agent » les range dans la mémoire (`storeLesson`, `source:"modele"`, `cible:"strategie"`, origine = titre et vues), et le bloc `learningBlock(…, "strategie")` les injecte dans les idées, les histoires, la veille et la revue de presse ;
- « Créer cette idée » envoie l'idée dans « Depuis une idée » avec le format gagnant (`rmFormatText`) et l'obligation d'un contenu entièrement nouveau ; « 2. Reconstruire » part de la première vidéo étudiée, toujours en mode « vidéo d'un autre » (réinventée), avec le format gagnant dans la demande ;
- éthique : on apprend le savoir-faire, jamais le contenu ; les personnes réelles ne sont jamais identifiées ; aucun nom de chaîne ni de personne dans les leçons.

### 4.2 Entrée « Depuis des infos » (revue de presse)

1. **Matière**, au choix :
   - automatique : `prFetch` → `/api/news`. `PRESSE_SITES` est une liste de grands médias par pays, simple point de départ modifiable par l'utilisateur. L'utilisateur coche les infos à garder. Une info de plus de 3 jours avant la plus récente n'est pas cochée d'office et porte la mention « ancienne » (`prNewsHtml`).
   - ses textes et ses liens : `prReadLinks` → `/api/news/read`.
2. **Écriture** (`prPrompt`). Les **règles de vérité** sont non négociables :
   - seulement la matière fournie, chaque info attribuée à son média ;
   - rester au niveau du titre quand on n'a que le titre ;
   - aucune rumeur ni accusation présentée comme un fait, aucun parti pris.
   La longueur suit la durée (`PR_WPS` = 2,7 mots par seconde, débit d'un présentateur vif). La revue fournit aussi la publication et les points `a_verifier`. Le texte est modifiable. Le bloc `learningBlock(…, "strategie")` (ce qui marche sur la chaîne de l'utilisateur) est ajouté aux règles : la revue utilise le cerveau de l'agent.
   **Preuve de chaque fait** : chaque sujet porte `preuve`, copie mot pour mot du passage de la matière qui prouve le fait principal. `prProof` la cherche dans la matière (mot pour mot, ou 85 % des mots importants) : « ✓ Fait vérifié dans la source » sinon « ⚠ Preuve introuvable » et une ligne dans « À vérifier avant de publier ».
   **Format signature** (`prRules`) :
   - nom de l'émission (`pr-nom`, gardé dans `sp-prefs.presseNom` ; inventé par l'IA la première fois) ;
   - ouverture, sommaire, sujets, « Le chiffre du jour » sourcé, « Ce qu'il faut retenir », fin signée avec rendez-vous.
   **Journaux dits à voix haute**, demandés à l'IA puis **contrôlés par le code** (`prNameSources`) : si un sujet ou le chiffre du jour ne nomme pas son journal, l'application ajoute « C'est ce que rapporte… » dans la langue de la revue. `prSourceName` donne le nom tel qu'on le dit. Pour un article lu par lien, le serveur renvoie `og:site_name`.
   **« Rendre la revue encore plus forte »** (`prImprovePrompt`) : le directeur de l'information relit et réécrit, toujours à partir de la seule matière (`PR.matiere`).
3. **Voix d'or** :
   - `prParts` découpe dans l'ordre de l'émission, en parties de 800 caractères au plus ;
   - `prVoice` les envoie avec le style `PR_STYLE` et la voix choisie ;
   - `prPlayAll` les lit d'un trait, `prDownload` les met bout à bout (voix seule, en MP3 ou en WAV).
   - `PR_STYLE` demande un rythme vif, sans pauses qui traînent (plainte de l'utilisateur : « la voix est lente »).
4. **Fusion finale** (`prMix`, `OfflineAudioContext`, stéréo 44,1 kHz, entièrement dans le navigateur et gratuite) :
   - jingle d'ouverture : souffle, accord, impact grave ;
   - transition sonore seulement quand le sujet change ;
   - musique de fond `prBed` qui baisse sous la voix et remonte entre les sujets ;
   - fin signée, puis compression et normalisation.
   - Ambiances `PR_MOODS` : journal, inspirant, énergique, sobre. Jingle et musique de l'utilisateur possibles (libres de droits).
   - **Vitesse de la voix** (`pr-speed`, gardée dans `sp-prefs.presseVitesse`) : normale ×1, vive ×1,12 (par défaut), très rapide ×1,25. `prTighten` ramène les pauses longues à 0,28 s, puis `prTempo` accélère sans rendre la voix aiguë (WSOLA : morceaux de 40 ms recollés au point le plus ressemblant).
   - **Formats** : revue finale en MP3 (`prMp3`, encodeur LAME `@breezystack/lamejs` chargé depuis jsDelivr ; `window.__lameMock` dans les tests) ou en WAV ; sous-titres `.srt` (`prSrt`, mêmes temps que la vidéo grâce à `prSubTimes`) ; texte, sources et crédits en `.txt` ; vidéo en MP4 quand le navigateur sait l'enregistrer, sinon WebM.
   **Quota des voix** : l'offre gratuite de Google accepte peu de voix par jour (environ 12 le 5 octobre 2026). `prChunks` regroupe donc toute la revue en blocs de 2 400 caractères au plus, avec une ligne vide entre les parties, soit une ou deux demandes par revue. La fusion recoupe chaque bloc aux pauses les plus proches des frontières attendues (`prSplit`) ; si c'est impossible, le bloc reste entier et les images suivent la longueur des textes.
5. **Images réelles** (`/api/photos`, `prPhotoSearch`, `prPhotoPick`) :
   - Openverse (`license_type=commercial,modification`) et Wikimedia Commons ;
   - `FREE_LICENSE` exclut les licences NC et ND ainsi que l'usage équitable (fair use) ; seules les photos de 600 px de large au moins sont gardées ;
   - mots-clés `image_en` écrits par l'IA pour chaque sujet ;
   - l'image choisie est importée dans le projet (`/api/photos/import`) avec son crédit ; l'utilisateur peut mettre sa propre photo ;
   - deux autres images du même sujet sont importées (`prPhotoExtras`, `PR.extra`, cadre pointillé) pour que la vidéo change de plan ;
   - les crédits de toutes les photos (`prPhotoCredits`) sont ajoutés à la publication et au fichier texte, comme l'exigent leurs licences ; dans la vidéo, chaque photo porte « Image d'illustration · Photo : … » ;
   - le serveur écarte les titres d'images choquants (`UNSAFE_IMAGE`) en plus du filtre `mature=false` d'Openverse ;
   - les photos des journaux et des agences ne sont jamais reprises.
   **Les unes du jour** (vraies unes des journaux, demande de l'utilisateur avec des exemples de unes sénégalaises) : bloc « 📰 Les unes du jour » du formulaire, pour les deux modes.
   - Trois façons de les avoir : importer les photos (par exemple reçues sur WhatsApp, `prUnesImport`), coller le lien d'une page qui les publie (`prUnesReadPage` → `POST /api/news/images`, qui renvoie les images de la page sans logos, icônes ni pixels de suivi), ou « Chercher les unes du jour sur internet » (`prUnesFind` : recherche Google de l'agent, puis lecture des pages trouvées).
   - Seules les images en hauteur (format d'une page de journal) sont gardées, puis l'agent lit chaque une (`prUnesRead`, 4 unes par demande, images réduites par `prShrink`) : journal, date imprimée, gros titre et autres titres recopiés mot pour mot, sans jamais identifier les personnes d'après leur visage.
   - Infos sûres : une une d'un autre jour est signalée (« ⚠ Autre jour : … ») et n'est ni utilisée ni montrée ; date illisible indiquée. Sans lecture possible (quota), l'utilisateur écrit le nom du journal sous chaque une : relais gratuit.
   - Les titres lus (`prUnesMatiere`) s'ajoutent à la matière (« UNES DES JOURNAUX DU JOUR ») et passent par le même contrôle des preuves ; un sujet tiré d'une une commence par « À la une de … ».
   - `prUneMatch` / `prUneOf` relient chaque sujet à la une de son journal (`prJournalKey` ignore les articles et « quotidien »). Cette vraie une remplace la une recréée, dans la page et dans la vidéo (zoom lent vers les gros titres, un peu plus longtemps à l'écran) ; le sommaire montre le mur des unes du jour.
   - Les unes sont gardées dans `localStorage["sp-presse-unes"]` et les fichiers dans `generated/presse-unes/`. Droits : elles appartiennent à leurs journaux, elles sont citées avec leur nom dans la revue ; l'interface conseille de ne pas les utiliser comme miniature.
   **Vraies images des articles** (« pas des images fictives », demande du 7 octobre) : `POST /api/news/resolve` retrouve l'article réel derrière chaque lien de Google Actualités (`resolveNewsLink` : page de l'article chez Google, signature `data-n-a-sg` et horodatage `data-n-a-ts`, puis `batchexecute` `Fbv4je` → `garturlres`, vérifié en vrai le 7 octobre) et lit l'article (`articleInfo` : titre, site, description, image « à la une » `og:image`, sinon `twitter:image`, sinon l'image dont le texte alternatif reprend le titre, en pleine taille). Pour les liens donnés à la main, `/api/news/read` renvoie aussi l'image et la description. `prArticleFor` relie chaque sujet à l'article de sa source (mots communs), `prArticleImages` importe l'image dans le projet (`PR.arts`) ; bouton « 📰 Seulement les vraies images des articles », et « Chercher les images de tous les sujets » commence par elles. Ces images appartiennent à leurs sites : elles sont montrées comme une citation (site, titre, lien), leurs sources vont dans les crédits de publication, et l'interface conseille de ne pas les utiliser comme miniature. `metaTag` lit les balises `<meta>` en respectant leurs guillemets (avant, un titre avec une apostrophe était coupé).
   **Voix de studio renforcée** (`pr-vboost`, cochée par défaut) : dans `prMix`, la voix passe par un filtre passe-haut (85 Hz), un peu de chaleur (220 Hz), de la présence (3,2 kHz), de l'air (10 kHz), un compresseur de voix puis un gain, avant le compresseur général.
   **Une recréée : seulement sur demande** (7 octobre : l'utilisateur ne veut « pas des images fictives ») : par défaut, un sujet montre la vraie une du jour si elle existe, sinon la vraie image de l'article et les photos ; la case « Montrer une une recréée… » (`sp-prefs.presseUneRecreee`) remet l'ancienne carte. `prUne` prend le titre de l'article du sujet (`prArticleFor`), plus le premier article du même journal (bug vu par l'utilisateur : la une d'un sujet sur la dette portait le titre d'un autre article de RFI). Dans le diaporama, l'image de l'article ouvre les images du sujet.
   **La une du journal avant les images** (demande de l'utilisateur) : `prUne` / `prUneHtml` recréent la une du journal qui porte le sujet (nom du journal, vrai titre de l'info pris dans les sources, date, chapeau, colonnes suggérées). C'est une citation : aucune page de journal n'est copiée. L'utilisateur peut mettre sa propre photo de la une (`PR.unes`, seulement s'il a le droit de l'utiliser) et revenir à la une recréée.
6. **Vidéo de la revue** (`prVideo`), deux styles (`pr-vstyle`) :
   **« Grand écran · studio télé » (par défaut, toujours 16:9, 1280 × 720)**, demandé le 7 octobre d'après une émission de France 24 (présentatrice devant un mur d'écran) et un bandeau de News24 : aucune personne n'est créée, le mur se manipule tout seul (motion design).
   - décor : studio bleu nuit, panneau de lumière chaude à gauche, faisceaux, sol avec le reflet du mur, légère dérive de caméra ;
   - mur d'écran géant (`wallContent`, fond « carte à points » stylisée, ligne de balayage) : générique, sommaire avec les images des sujets, pour chaque sujet la carte de l'article (site, date, vrai titre, description) qui arrive, une touche lumineuse (`ripple`), puis la vraie image de l'article reliée par un cercle (`node`), qui s'agrandit avec le titre en petit devant ; balayage lumineux au changement de sujet, sortie en glissé ; chiffre du jour avec anneau ; « ce qu'il faut retenir », puis « Abonne-toi » ;
   - image montrée : celle de l'article (`PR.arts`, « Image de l'article · site »), sinon la vraie une du jour, sinon une photo libre (« Image d'illustration ») ; sans image, une citation de la première phrase ;
   - habillage (`hudStudio`) : lieu (pays de la revue) en haut à gauche, nom de l'émission et date en haut à droite, bandeau rouge « REVUE DE PRESSE » avec le titre du sujet en capitales et la source (le site seulement s'il ajoute quelque chose), « SUJET 2 / 5 », texte défilant « EN BREF » avec tous les titres, barre de progression, grain ; sous-titres mot à mot au-dessus du bandeau.
   **« Diaporama plein écran »** (9:16 ou 16:9), montée comme au journal télévisé (plainte de l'utilisateur du 6 octobre : « pas du tout professionnel ») :
   - canevas en 9:16 ou 16:9 enregistré en temps réel (MediaRecorder) sur la fusion. Le son est décodé et lancé par le moteur audio dès le clic, sinon le navigateur bloque la lecture automatique ;
   - générique animé (nom de l'émission, date), sommaire animé (sujets numérotés qui arrivent un par un) ;
   - chaque sujet commence par **la une du journal** (carte papier qui arrive avec un léger rebond, tampon « À LA UNE · JOURNAL »), puis ses photos en mouvement (zoom avant, zoom arrière, travelling, photo en largeur sur fond flouté en vertical) avec fondus entre les photos ;
   - bandeau du sujet (numéro, « SUJET 2 SUR 5 », titre, « Source : … »), carte « Le chiffre du jour » animée, « Ce qu'il faut retenir », carte de fin « Abonne-toi · demain, même heure » ;
   - transitions entre sujets (poussée, zoom avec flash, volet aux couleurs de l'émission, glissement), placées pendant le souffle de la fusion ;
   - sous-titres mot à mot (le mot dit s'allume en jaune), crédit de chaque photo, barre de progression, grain et vignette. Le plan vient de `PR.mixPlan`, calculé par `prMix` ;
   - fond animé quand un sujet n'a pas d'image.
7. La dernière revue est gardée dans le navigateur (`sp-presse`, photos comprises). « En faire une vidéo » envoie le texte dans « Depuis une idée ».

### 4.3 Manus AI (ajouté par l'autre assistant, relu le 5 octobre)
- `POST /api/manus/task` (`handleManusTask`) crée une tâche Manus (API v2, `x-manus-api-key`, clé `MANUS_API_KEY` dans `.env`, délai maximum de 30 s) et renvoie `task_url`.
- Boutons « 🤖 Créer avec Manus AI » (Storyboard, toutes les scènes) et « 🤖 Générer le visuel avec Manus » (page Images).
- Limite de Manus : 5 000 « tokens » par message. `manusBoardPrompts` envoie seulement les fiches des personnages et le prompt d'image de chaque plan (P01…), en tâches de 10 000 caractères au plus. Si Manus refuse encore, les parties sont deux fois plus petites et l'envoi recommence. Les images sont demandées nommées P01.png, P02.png…, pour l'import automatique. Test : `manus-test.js` (faux Manus, `MANUS_BASE_URL`).
- Les images restent sur le site de Manus : l'utilisateur les télécharge puis les dépose avec « Importer mes images » (`genImportFiles`).
- Les crédits Manus ne sont pas comptés dans le budget de sécurité de la fabrication.
- **Images rapatriées toutes seules** :
  - le serveur suit chaque tâche avec `/api/manus/status` (`task.detail` et `task.listMessages`, images trouvées dans les fichiers joints) ;
  - `/api/manus/import` télécharge chaque nouvelle image dans le projet ; le numéro du plan vient du nom du fichier (P01, plan 2…), et une image sans numéro va au premier plan sans image ;
  - côté page, `manusTick` passe toutes les 15 s et chaque image n'est importée qu'une fois ;
  - une ligne d'état s'affiche dans le Storyboard, et le suivi reprend à l'ouverture du projet.
- **Relais d'images** (`generateBoardImages`) : Manus sans crédits → Nano Banana → GPT Image (`provider:"gpt"`, gpt-image-2 puis gpt-image-1, compté dans le budget) → message clair avec la méthode gratuite (application Gemini puis « Importer mes images »).
- **Clips par Manus (MiniMax H3)** (demande de l'utilisateur, 6 octobre ; Manus lui a confirmé que MiniMax H3 est activé dans son compte, pas Seedance) :
  - onglet Plans, carte « Clips par Manus · MiniMax H3 », bouton « 🎬 Créer les clips avec Manus » (`clips-manus-go`) ;
  - `manusClipTasks` regroupe les plans sous la limite de Manus ; chaque plan porte sa durée (5 à 15 s), son prompt au format officiel H3 (`h3Prompt`) et, s'il existe, son image de départ du Storyboard ;
  - `handleManusTask` accepte `files` : les images du projet (seulement sous `/generated/`, 19 Mo au plus) sont jointes au message en `file_data` (contenu « text » + « file » de l'API v2) ;
  - `manusFiles` trouve images et vidéos dans les messages ; `/api/manus/import` télécharge aussi les vidéos (mp4, mov, webm ; 300 Mo au plus) ;
  - `manusTick` range chaque clip dans `r.generated_videos[n]` (`model:"Manus · MiniMax H3"`), le clip sans numéro dans le premier plan de la tâche sans clip ; Video Critic et pré-montage les prennent comme les clips importés ;
  - tâches marquées `kind:"video"` (ligne d'état dans les Plans, pas dans le Storyboard) ; sans crédits Manus : message avec la méthode gratuite (Google Flow ou application Hailuo avec les prompts « MiniMax H3 », puis « Importer mes clips »), jamais de relais payant automatique.
- `manus-mcp.js` : serveur MCP séparé, pour les agents d'Antigravity ; il n'est pas utilisé par l'application.

### 4.3 bis Adaptateurs MiniMax H3 et Seedance 2.5
- Registre `MODEL_CAPABILITIES` (version `2026-10-06.local.3`) : entrées `minimax` et `seedance`, vérifiées le 6 octobre 2026, listées dans `adapter_models` et **pas** dans `supported_models` (le routage automatique des plans ne change pas).
- Sources : MiniMax H3 = guide officiel de MiniMax (dépôt GitHub `MiniMax-AI/MiniMax-H3`, `.claude/skills/h3-prompt-writing/references/base-en.txt`) ; Seedance 2.5 = guide de fal.ai (aucun guide officiel de ByteDance trouvé), sorti le 31 juillet 2026.
- `h3Prompt` : phrase d'alignement `<Picture 1>` quand l'image de départ existe, puis les trois champs `integrated_multimodal_description` / `overall_soundscape` / `non_diegetic_music` ; `[Shot N]` avec heure de coupe pour les plans à plusieurs prises ; caméra au vocabulaire officiel (`h3Camera` : type + amplitude + vitesse) ; paroles `Nom (S1) says, ton: <d>[French] mots exacts</d>` avec des identifiants de voix stables pour tout le projet (`h3Speakers`) ; voix off « says in an off-screen voiceover … lips remain completely closed » ; aucune consigne négative (H3 n'en tient pas compte) ; musique `N/A` (elle est ajoutée au montage).
- `seedancePrompt` : FORMAT, REFERENCE ROLES (`@Image1` = image de départ), STARTING STATE, TIMELINE, CAMERA, CONTINUITY, AUDIO, ENDING STATE, CONSTRAINTS (Seedance accepte les interdits explicites).
- Dans chaque plan, un bloc replié « Autres outils : MiniMax H3 · Seedance 2.5 » montre les deux prompts à copier (relais gratuit à la main).
- Les deux adaptateurs suivent `MODEL_ADAPTER_CONTRACT` : ils traduisent le plan maître (cadrage, action, repères, caméra, lumière, son, paroles, état de fin) sans rien inventer.

### 4.4 Autres ajouts du 5 octobre
- **Images du Storyboard** (`generateBoardImages` → `/api/images/generate`, Nano Banana). Elles sont stockées dans `public/generated/` (ignoré par git) et dans `r.generated_images[n]`. Ce service est **payant** dans l'API ; avec la clé gratuite, l'appel échoue sans frais.
- **Analyse des paroles** sur la page audio (`analyzeLyrics`). Le texte original n'est jamais réécrit.
- **Mode secours** (`fallbackMasterFromScenes`) : si la réalisation détaillée échoue, un Master minimal est construit à partir des scènes validées.
- **Lots plus petits** : `BATCH_SHOTS = 8`, `AUDIO_BATCH_SHOTS = 4`.

Le projet est enregistré par `saveProject`. Il est rendu par `renderProject` puis organisé par `buildScenes`, `attachMasterPlan` et `scenesOf` en **scènes contenant des plans**, jamais en liste plate de plans.

## 5. Couches de règles (cumulatives)

> La numérotation V1 à V4 est reconstituée à partir de l'historique du projet ; elle sert à savoir d'où vient chaque règle.

### 5.1 V1 — Base de Studio Prompt
- Agents spécialisés : Idées, Studio (agent maître), Images, Audio → vidéo, Vidéo réelle, Niches, Pays et monétisation, Personnages, Contrôle qualité, Son et sous-titres, Chaîne YouTube.
- Les prompts des générateurs sont assemblés par le code à partir des champs JSON (fonctions `*Prompt`, `STYLES`, `BASE_AVOID`, `lintPlan`).
- Fiche de personnage en anglais (`fiche_en`) et rappel (`rappel_en`), répétés dans chaque prompt pour garder les mêmes visages et les mêmes tenues.
- Règles §2 : sécurité, éthique, interface en français pensée pour le téléphone.

### 5.2 V2 — AI Creative Director (`references/creative-director-v2/`, 7 modules)
- **Orchestrateur** : la création passe avant la technique.
  - Séparation cerveau / moteur : le réalisateur décide **ce qui se passe**, l'adaptateur décide **comment le demander**.
  - Un générateur ne dicte jamais l'histoire.
  - Une corrélation virale n'est jamais présentée comme une causalité.
- **Idea Engine** :
  - un thème n'est pas une histoire ; il faut un désir, un obstacle et une question visible ;
  - divergence (de 10 à 20 concepts réellement différents), anti-cliché, test de la première seconde sans le son ;
  - classement jusqu'au Top 3, puis un gagnant.
- **Story Architect** :
  - progression flexible : hook, question, objectif, obstacle, action, réaction, conséquence, complication, escalade, révélation, payoff ;
  - open loops ;
  - révélation préparée honnêtement (de 2 à 3 indices) ;
  - mode muet ;
  - la voix off ne sert pas de béquille.
- **Scene Engine** :
  - test en 10 questions par scène ;
  - formule DÉCLENCHEUR → ACTION → RÉACTION → CHANGEMENT ;
  - pas d'images illustratives ;
  - le second personnage modifie la situation ;
  - objet narratif, escalade visible, fin de scène sur un événement.
- **Human Behavior & Acting** :
  - émotions traduites en comportements visibles ;
  - micro-réactions, réactions asymétriques ;
  - le dialogue modifie l'action ;
  - continuité du tempérament.
- **Viral Retention** :
  - la rétention vient des questions, des changements de situation et du payoff, pas d'un zoom toutes les deux secondes ;
  - le hook est toujours payé.
- **Director Critic** :
  - gardien entre la création et la production ;
  - détecte le générique IA ;
  - critique utile : problème, raison, scène concernée, correction, effet attendu ;
  - décisions : APPROVED FOR PRODUCTION, APPROVED WITH NOTES, REWRITE REQUIRED, REJECT CONCEPT ;
  - en cas de refus, renvoi au module fautif.

### 5.3 V3 — AI Film Director (pipeline et production)
- Pipeline du §4, avec un rapport d'exécution et le modèle utilisé à chaque étape.
- **Scènes, puis plans** : une scène est un lieu et un moment, elle contient des plans.
- Vidéos longues (jusqu'à 15 min, 20 scènes et environ 100 plans) réalisées par lots, puis compilées par morceaux.
- Master Video Plan : `causal_beats`, `blocking`, `performance`, `shot_design` (`must_notice`, `camera_reason`), `sound`, `continuity` (`state_in` / `state_out`), `model_requirements`.
- Contrôles faits par le code, indépendants de la note que le modèle se donne :
  - durée couverte d'au moins 65 % ;
  - durées toutes identiques ;
  - voix off qui raconte au lieu de faire jouer ;
  - personnages qui ne se parlent pas.
- Audio imposé verrouillé ; transcription par Gemini ou par Whisper local (gratuit).
- Docteur des dialogues ; routeur de modèles appuyé sur des capacités **documentées** (registre versionné).
- Video Critic après génération et régénération ciblée.
- **Mémoire d'apprentissage** : uniquement des leçons générales, jamais propres à une histoire.
- Compétences : adapter à un autre pays (`adaptProject`), contrôle monétisation (`runMonet`), apprendre des statistiques YouTube (`statsFromCsv`, `statsPrompt`), pré-montage (`runPremontage`), onglet Paroles (`parolesHtml`, `saveParoles`), veille (`runVeille`).

### 5.4 V4 — Director Engine (`references/DIRECTOR_ENGINE_V4.md`)

Les 14 règles injectées (`DIRECTOR_V4`, `PROMPT_V4`) :
1. la durée vient de l'action ;
2. test d'existence de chaque plan ;
3. compression ;
4. causalité (ÉVÉNEMENT → PERCEPTION → RÉACTION → RÉPONSE → CHANGEMENT) ;
5. question dramatique ;
6. une scène = une unité dramatique ;
7. caméra motivée, un seul mouvement dominant, sinon caméra fixe ;
8. lumière venue du lieu réel ;
9. pas de figurant par défaut ;
10. crédibilité temporelle (ellipses) ;
11. jeu d'acteur sobre ;
12. une génération = une intention, et le prompt image → vidéo décrit ce qui change et l'état de fin ;
13. un risque plutôt qu'une note avant génération ;
14. test de suppression.

Ce que le code contrôle (`codeDefects`) :
- même cadrage et même mouvement sur plus de 50 % des plans ;
- mouvement de caméra sur plus de 75 % des plans ;
- au moins 70 % des durées à ±0,75 s de la médiane ;
- scène de plus de 10 plans ;
- LED, néon ou lampe dans une scène extérieure de jour ;
- figurants sur au moins la moitié des plans ;
- une seule image figée de 20 s ou plus.

Ce que le code corrige :
- `cameraOne`, appliqué dans **tous** les constructeurs de prompts (Veo, Runway, Wan, vidéo directe et image → vidéo), garde un seul mouvement par plan et n'associe jamais caméra fixe et caméra à l'épaule. Sans mouvement précisé, le prompt demande une caméra fixe.
- L'état de fin (`fin_en`) est transmis aux trois outils.
- `lintPlan` signale les mouvements empilés au lieu d'exiger un mouvement.

`STYLES` ne décrit plus que le rendu : aucune lumière, caméra ni figurant injecté. `shotTarget` est un **maximum** (environ un plan pour 6 s, au plus 8 par scène), jamais un quota.

### 5.5 Arbitrage entre couches
1. **Découpage** : V4 l'emporte. Plus de quota du type « un plan toutes les 3 à 5 s ». Les « relances toutes les 2 à 4 s » de V2 sont des événements ou des informations, pas des coupes.
2. **Notes** : les scores sur 10 de V2 restent des **signaux internes** des critiques (seuils de réécriture par format). Ils ne sont jamais affichés comme une note de qualité avant génération. L'interface montre le risque, « Solide » et « À surveiller ». Les notes du Video Critic, faites après génération sur un vrai clip, restent affichées.
3. **Audio imposé** (V3) : il l'emporte sur la taille de scène et le découpage V4. Il y a un plan par unité audio, et la durée suit la source.
4. **Caméra, lumière, figurants** : V4 l'emporte sur toute formule de style plus ancienne.
5. **Éthique et sécurité** (§2) : elles l'emportent sur tout le reste.
6. **Remake** :
   - avec la propre vidéo de l'utilisateur, l'histoire source est verrouillée (mode RECONSTRUCTION) et l'emporte sur l'exploration de concepts de V2 ;
   - avec la vidéo d'un autre ou le choix « Réinventée », une nouvelle histoire est obligatoire.

## 6. Carte des composants

| Composant | Statut | Où | Ce qui manque |
|---|---|---|---|
| Director Engine | ✅ existe | `DIRECTOR_V4`, `scenePlanPrompt`, `executionPlanPrompt` | — |
| Story Architect | 🟡 partiel | Fondu dans `creativePrompt` (progression, open loops, payoff) | Pas d'appel séparé, ni de sortie « beats + indices de la révélation » contrôlée par le code |
| Compression Engine | 🟡 partiel | Règle COMPRESSION PASS, `shotTarget` maximum, contrôles de `codeDefects` | Pas de passe dédiée qui fusionne ou supprime des plans après le premier storyboard |
| Shot Engine | ✅ existe | Master Video Plan (REALIZATION ORCHESTRATOR) par lots | — |
| Personnages et continuité | 🟡 partiel | Bible (`fiche_en`, `rappel_en`), page Personnages, `continuity.state_in/out`, `lockedShotFingerprint` | Registre des objets de continuité, verrous d'identité, de tenue et d'état de scène sous forme de données, contrôle d'identité entre l'image et la référence |
| Director Critic | ✅ existe | Critique du modèle + `codeDefects` + `masterPlanFailures` | Contrôle par le code de la crédibilité temporelle (aujourd'hui seulement une règle du prompt) |
| Video Critic | ✅ existe | `runVideoCritic`, `vcApplyMasterPatch` | — |
| Analyse vidéo (compréhension) | ✅ existe | `/api/video/analyze`, `analyzeFullVideo`, `renderRmReport` | — |
| Cost Optimizer | 🟡 partiel | Budget du jour réservé puis rendu en cas d'échec (`generation.js`) ; prix indicatifs datés ; méthode gratuite (application Gemini + Flow, puis imports) | Estimation complète par projet avant fabrication, limite de régénérations |
| Model Router | ✅ existe | `MODEL_CAPABILITIES` (veo, runway, wan), `routeShotModel` | Adaptateurs Kling et Seedance (prévus par V2, pas encore écrits) |
| API vidéo | 🟡 partiel | Côté serveur, Veo 3.1 et Runway sont prêts et testés avec un faux service (`generation.js`). L'utilisateur reste **gratuit** : il fait ses clips dans Google Flow et les importe (`genImportFiles`, `clipHtml`). | Boutons « Fabriquer la vidéo » dans l'interface, à brancher le jour où un service payant est activé |
| Jobs asynchrones | ✅ existe (fabrication) | `generation.js` : file, une voix à la fois, vidéos en parallèle limité, `jobs.json`, reprise des vidéos déjà commandées | Le pipeline d'écriture (agents) reste lié à l'onglet ouvert |
| Montage | 🟡 partiel | Pré-montage dans le navigateur (`runPremontage`, MediaRecorder MP4) avec les clips importés et les voix fabriquées (`pmUseProject`, `pmVoices`), `editing_plan`, export SRT | Montage final avec musique, transitions et export haute qualité |
| Voix | ✅ existe | Onglet Paroles : `castHtml` (voix devinée d'après la fiche, essai), `genVoicesPlan`, « Fabriquer toutes les voix » ; Gemini gratuit (modèles en relais) ou ElevenLabs ; revue de presse : chaîne automatique Gemini → Chatterbox (Hugging Face) → Piper | Voix clonée de l'utilisateur (Chatterbox le permet : sa propre voix seulement) ; Chatterbox dans la distribution de l'onglet Paroles |
| Stockage | 🟡 partiel | `localStorage` via le shim (environ 5 Mo), un seul appareil | IndexedDB ou stockage en ligne **derrière le shim**, synchronisation avec le téléphone |

## 7. Autres vues et agents

| Vue | Rôle |
|---|---|
| `accueil` | Reprendre un projet, raccourcis |
| `studio` | Créer une vidéo : idée ou texte → pipeline complet |
| `projets` | Liste des projets. Chaque projet a des onglets Plans, Paroles, Réalisation, Créatif, Pré-montage, Monétisation, Adapter… |
| `idees` | Idées |
| `tendances` | Veille et tendances |
| `audio` | Audio → vidéo, en 3 étapes, avec transcription |
| `reel` | Vidéo réelle → remake IA |
| `images` | Prompts image |
| `persos` | Personnages |
| `qualite` | Contrôle qualité |
| `son` | Son et sous-titres |
| `chaine` | Série et chaîne |
| `niches` | Niches |
| `pays` | Pays et monétisation |
| `memoire` | Leçons apprises et statistiques |
| `presse` | « Depuis des infos » : revue de presse fidèle aux sources, avec voix d'or |
| `connexions` | « Connexions et voix » : ce qui est gratuit et ce qui est payant, budget du jour, guides des clés (ElevenLabs, projet Google payant séparé), dernières fabrications |

- Le menu compte 4 groupes et 13 liens.
- Les anciens liens restent valides grâce aux alias (par exemple `strategie`).

## 8. Tests

**Lancement**
- Dossier `tests/`, IA simulée : **aucun quota consommé**.
- Commandes : `cd tests`, `npm install`, puis `npm test` (le serveur doit tourner, avec `npm start` à la racine).
- `npm run test:code` lance seulement les tests du code, sans navigateur.
- Les captures d'écran vont dans `tests/out/` (ignoré par git).
- Navigateur : Edge, via `puppeteer-core`. Variables `EDGE_PATH` et `SP_URL` si besoin.

**Suites**

| Suite | Ce qu'elle vérifie |
|---|---|
| `gates-test.js` | Routage d'entrée, tous les contrôles du code V3 et V4, `cameraOne` |
| `audio-lock-test.js` | Alignement des plans sur l'audio importé |
| `ui-test.js`, `menu-test.js` | Vues, menu, mobile, mode sombre, console sans erreur |
| `presse-test.js` | Revue de presse avec un vrai `server.js` face à de faux Google Actualités, Google voix et site d'actualité : infos cochées, règles de vérité, voix d'or, audio complet, textes et liens, reprise, vidéo |
| `gen-api-test.js` | `generation.js` face à de faux Google, Runway et ElevenLabs : clé gratuite pour les voix, clé payante pour Veo, budget, facturation absente, voix une à la fois, limites par minute et par jour, imports, Range, sécurité des chemins, reprise |
| `fab-ui-test.js` | Interface de fabrication avec un vrai `server.js` (`GEN_DIR` séparé) : voix par personnage, essai, voix d'un plan ou de tout le projet, imports groupés d'images et de clips, pré-montage, page Connexions |
| `video-analyze-test.js` | Vrai `server.js` face à un faux Google : envoi reprenable, état ACTIVE, images/s, mode agentic en flux, schéma, suppression, quota, format refusé |
| `remake-test.js` | Page « Depuis une vidéo » : vraie petite vidéo, rapport, transcription, découpage, reconstruction, quota épuisé |
| `presse-unes-test.js` | Unes du jour face à une fausse page : recherche web, images en hauteur gardées, lecture des unes, une ancienne écartée, import de photos, nom corrigé à la main, titres dans la matière, vraie une avant les images et dans la vidéo |
| `manus-clips-test.js` | Clips par Manus face à un faux Manus : prompts H3 et Seedance dans chaque plan (format officiel, paroles balisées, caméra), images de départ jointes, clips rapatriés dans leur plan, crédits épuisés → méthode gratuite |
| `youtube-learn-test.js` | Étude de liens YouTube face à un faux YouTube et un faux Gemini : lien lu en entier, quota épuisé → images de la vidéo, leçons fusionnées et gardées en mémoire, idée originale avec le format gagnant, reconstruction réinventée, bloc « ce qui marche » |
| `presse-studio-test.js` | Revue « Grand écran » face à un faux Google Actualités et de faux sites : liens décodés, image og:image et image du titre, crédits, voix renforcée, vidéo 1280 × 720 avec décor, bandeau rouge et vraies images à l'écran, diaporama toujours disponible |
| `voix-relais-test.js` | Chaîne des voix gratuites face à un faux Google (3 modèles de voix, chacun son quota du jour) et un faux espace Hugging Face : modèle suivant en relais, modèle épuisé plus redemandé, message « demain matin » ; texte découpé (280 caractères) et recollé ; refus de Hugging Face ; revue en mode automatique (Gemini → Hugging Face → ordinateur) ; Connexions |
| `voix-gratuite-test.js` | Voix gratuite sur l'ordinateur face à un faux Google sans quota : relais automatique de la revue, choix direct, essai, fusion, crédit de licence, reprise ; onglet Paroles (refaire gratuitement, une voix par personnage, crédit YouTube) ; Connexions |
| `../tests/director-pipeline.test.js` | Contrôles de structure de l'autre assistant (`npm test` à la racine) |
| `v4-prompts-test.js` | Prompts réellement affichés pour 8 styles × 3 outils : ni lampes, ni LED, ni figurants, ni micro-mouvements ; un seul mouvement de caméra ; état de fin transmis |
| `long-mock-test.js` | Vidéo de 5 min : 20 scènes, maximum de plans V4, lots, compilation, docteur des dialogues, aucun `${` envoyé à l'IA |
| `adapt-test.js` | Adaptation à un autre pays |
| `monet-test.js` | Contrôle monétisation |
| `stats-test.js` | Lecture des exports de YouTube Studio |
| `premont-test.js` | Pré-montage |
| `paroles-test.js`, `paroles-voix-test.js` | Onglet Paroles |

**Règles**
- Toute nouvelle règle du moteur ajoute un cas positif et un cas négatif dans `gates-test.js`.
- Une génération réelle (qui consomme du quota) n'est faite qu'en complément, jamais à la place des tests simulés.

## 9. Avant de livrer

1. La syntaxe des deux scripts de `index.html` et de `server.js` est valide.
2. `npm test` passe sans échec, ou chaque échec est expliqué et corrigé.
3. Vérification à 390 px et à 1 366 px, en clair et en sombre, sans erreur dans la console ni débordement horizontal.
4. Aucun `${` brut dans un prompt envoyé à l'IA. Les prompts d'exemple ne contiennent pas de lampes, LED, figurants ou micro-mouvements caméra injectés.
5. Aucune fonction ni règle existante supprimée sans le dire.
6. Pas de secret dans le diff. `.env` n'est ni affiché ni commité. Rien de privé dans `public/`.
7. Ce fichier est mis à jour, ainsi que la spec concernée dans `references/`.
8. Commit en français, push sur `main` (ce qui publie sur GitHub Pages).
9. Compte rendu à l'utilisateur en **français simple**, sans jargon : ce qui change pour lui, ce qu'il doit faire, par exemple régénérer ou améliorer les anciens projets pour profiter d'une nouvelle règle.

## 10. Historique

Les commits sont en français. Étapes majeures :
1. application de base ;
2. histoires plus fortes et vrais dialogues ;
3. contrôles par le code ;
4. audio → vidéo fiable ;
5. Whisper local ;
6. design et pages ;
7. scènes, puis plans ;
8. mémoire d'apprentissage ;
9. vidéos longues ;
10. recherche web sans quota ;
11. adaptation, monétisation, statistiques, pré-montage ;
12. onglet Paroles ;
13. relais Luna et docteur des dialogues ;
14. suivi des étapes en direct ;
15. **Director Engine V4** ;
16. images du Storyboard, analyse des paroles, mode secours, **analyse complète des vidéos** (commencées par un autre assistant, terminées et testées).

## 11. Chantiers ouverts (proposés, pas encore faits)

Par ordre de valeur pour l'utilisateur :
1. **Cost Optimizer** : estimer les crédits par plan et par modèle avant génération, et proposer de compresser ou de passer en mode image → vidéo moins cher.
2. **Registre des objets de continuité et verrous d'identité** sous forme de données (au lieu de texte libre), contrôlés par le code d'un plan à l'autre.
3. **Passe de compression dédiée** après le premier storyboard, avec un rapport des plans fusionnés ou supprimés.
4. **Stockage IndexedDB, puis en ligne** derrière `claude-shim.js`, pour avoir plus de place et retrouver ses projets sur le téléphone.
5. **Pipeline d'écriture côté serveur** (les agents) pour les vidéos longues : reprise si l'onglet se ferme. La fabrication l'a déjà.
6. **Boutons « Fabriquer la vidéo »** (Veo, Runway) dans l'interface, le jour où l'utilisateur active un service payant. Le serveur est prêt ; il faudra brancher le Video Critic automatique sur le clip reçu.
7. Adaptateur **Kling**, avec des capacités documentées, une source officielle et une date de vérification (MiniMax H3 et Seedance 2.5 : faits le 6 octobre, §4.3 bis). Plus tard : MiniMax H3 et Seedance comme outils de rédaction à part entière (aujourd'hui, l'histoire s'écrit pour Veo puis les adaptateurs traduisent).

Idées de l'utilisateur (5 octobre), à faire avec la même méthode :
8. **Temps forts d'un long match** (45 min et plus) : l'analyse complète (agentic) repère les moments les plus denses, et l'application propose les coupes, avec leur minutage, pour une vidéo courte.
9. **Plusieurs vidéos → une vidéo virale** : analyser jusqu'à 5 vidéos, choisir les meilleurs moments et les enchaîner (ordre, raccords, accroche, rythme), dans le respect des droits de chaque source.
10. **Revue de presse automatique chaque jour** : par pays, à heure fixe (avec la veille), voix d'or comprise.

Proposé le 6 octobre (à confirmer par l'utilisateur) : **connexion Higgsfield automatique** (MCP, crédits du compte) pour les images du Storyboard et les clips, avec le même suivi que Manus. **Connexion ChatGPT pour le texte** (« Sign in with ChatGPT », gratuit pour les applications open source locales) : les agents écrivent avec l'abonnement Plus de l'utilisateur quand le quota gratuit de Gemini est épuisé. Pas d'images par ce chemin.

Ordre fixé par l'utilisateur (6 octobre), chaque étape terminée et validée avant la suivante :
11. **Partie infos** (revue de presse) : une du journal, vidéo montée, voix vive, MP3 et autres formats, infos et images sûres. Fait le 6 octobre (commit aa3523f), en attente de l'avis de l'utilisateur.
12. **Page des niches** : la niche « infos, revue de presse » d'abord ; suivi de chaque chaîne (CRM : publications, rendez-vous, idées) et performances par chaîne (en réutilisant la lecture des statistiques YouTube et `learningBlock(…, "strategie")`).
13. **Pages YouTube, TikTok, etc.**, quand chaque niche marche bien.
14. **Partie histoires** : les plus belles histoires du Coran et des grands livres, lues par une voix de sage, avec images et vidéos pour le montage. Règles : aucune représentation des prophètes ni de leurs compagnons (paysages, calligraphie, symboles) ; textes du domaine public ou racontés avec nos propres mots, jamais une traduction protégée ; versets cités exactement avec leur référence.
