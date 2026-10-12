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
- images : **Agnes AI** automatiquement, gratuit pour le moment (§4.3 ter) ; sinon application ChatGPT (avec l'abonnement de l'utilisateur) ou application Gemini, en envoyant les messages préparés du Storyboard un par un, puis « Importer » ; ou photos libres de droits ;
- vidéos : **clips Agnes AI** automatiquement, gratuits pour le moment (§4.3 ter) ; sinon Google Flow ou le site Higgsfield (prompts « Autres outils » : Seedance 2.5, MiniMax H3) puis « Importer » ;
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
| `generation.js` | Module serveur de **fabrication**, sans dépendance. Il gère les tâches suivies (`public/generated/jobs.json`, reprise après redémarrage), le budget du jour (`GEN_BUDGET_USD`), les voix (Gemini gratuit, une à la fois, avec attente si Google limite par minute et relais entre ses modèles de voix quand l'un atteint son quota du jour ; voix naturelle Chatterbox sur un espace Hugging Face ; ElevenLabs), les vidéos (Veo 3.1 avec `GEMINI_MEDIA_API_KEY` ou la clé principale, Runway, Agnes Video 2.5 Flash gratuit pour le moment), les imports (`/api/gen/upload-file`) et la lecture des médias par morceaux (Range). |
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

### 4.2 Page « Motion design » (anciennement « Depuis des infos ») : revue de presse, quiz
Demande du 7 octobre : la page doit faire « tous les vidéos de motion design », pas seulement l'information. Elle garde l'identifiant de vue `presse`. Des onglets en haut (`data-mt`, `mtShow`, choix gardé dans `sp-prefs.motion`) :
- « 📰 Infos du jour » : la revue de presse (tout ce qui suit) ;
- « 🧠 Quiz « 5 secondes » » : §4.3 quater ;
- « 📣 Publicités » : §4.3 quinquies ;
- « 🔥 Succès YouTube » : §4.3 septies (les vidéos les plus vues, recréées autrement).
D'autres onglets viendront avec la même méthode (produit tech en 3D, publicités) : chaque type a son onglet, et ils partagent la voix, la fusion, le plateau 3D, l'enregistrement, l'affiche et le kit de publication.
Chaque vidéo de la revue montre aussi son **affiche premium** sur le lecteur avant la lecture (`v.poster`, faite par `prThumb`).

#### Revue de presse

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
6. **Vidéo de la revue**, trois styles (`pr-vstyle`) et trois formats (`pr-vformat`) : 16:9 (YouTube, Facebook), 9:16 (TikTok, Shorts, Reels, WhatsApp), ou **« Les deux »** (par défaut). Les deux choix sont gardés dans `sp-prefs` (`presseStyle`, `presseFormat`).
   **Organisation du code** :
   - `prStage(opt)` prépare le décor, les images et l'habillage, puis renvoie `draw(t)` : il sert à la vidéo, à l'aperçu et à la miniature ;
   - `prVideo(opt)` enregistre en temps réel (MediaRecorder) sur la fusion. Le moteur audio est créé pendant le clic et partagé quand on fait les deux formats l'un après l'autre ;
   - `prPreview(opt)` montre deux images (un sujet, le sommaire) **sans fabriquer la vidéo**, même avant la voix : un minutage est alors estimé par `prPlanGuess` ;
   - les vidéos faites sont dans `PR.videos` (`prVideosHtml` : un lecteur et un bouton de téléchargement par format ; le premier garde l'identifiant `pr-video-dl`).
   **« Plateau 3D · dernière génération » (`studio3d`, par défaut)**, demandé le 7 octobre (« un plateau de revue de dernière génération, l'écran de dernière sortie ») : `prStudio3D` charge three.js 0.186.1 à la demande depuis jsDelivr (`PR_THREE`).
   - **Décor** : mur LED courbe qui affiche le mur d'écran animé (`wallContent`, dessiné 1,25 fois plus grand pour un texte net) ; cadre et socle en métal ; liserés lumineux ; colonnes LED animées sur les côtés.
   - **Sol et lumière** : sol brillant avec le reflet du plateau (copie inversée sous un sol semi-transparent) ; flaque de lumière ; arcs lumineux au sol ; faisceaux qui balaient ; poussière dans la lumière.
   - **Fond** : paroi courbe en carte à points, lamelles lumineuses (profondeur quand la caméra bouge), reflets calculés une fois (PMREM).
   - **Caméra de grue** : elle descend sur le plateau au générique, change d'angle à chaque sujet en avançant doucement vers le mur, puis recule à la fin.
   - **Éclat** : les zones très claires sont réduites, floutées puis ajoutées en mode « screen » (`composite`).
   - **Repli automatique sur le studio 2D**, avec une explication dans le message : pas de WebGL, pas d'internet, `window.__no3d`, ou ordinateur trop lent. `bench()` mesure 8 images avant l'enregistrement et passe en 2D au-delà de 42 ms par image ; `window.__s3Force` force la 3D dans les tests.
   - Mesuré le 7 octobre sur l'ordinateur de l'utilisateur (Intel HD 4400, via le navigateur de test) : la 3D tient le temps réel.
   **Format 9:16 du studio** : mur en portrait (648 × 620 au-dessus du bandeau), carte de l'article en haut et image en dessous, sommaire avec une vignette par sujet. En-tête sous la zone des onglets des applications, avec la date sur fond sombre. Bandeau sous le mur avec une marge à droite pour les boutons de TikTok, Shorts et Reels, puis sous-titres au-dessus de la légende des applications.
   **« Grand écran · studio télé 2D » (`studio`)**, demandé le 7 octobre d'après une émission de France 24 (présentatrice devant un mur d'écran) et un bandeau de News24 : aucune personne n'est créée, le mur se manipule tout seul (motion design). C'est aussi le relais du plateau 3D.
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
8. **Kit de publication** (`#pr-kit`, demande du 7 octobre : « si tu termines une vidéo tu prépares l'envoi YouTube, TikTok… les titres, les heures, tout »). Il est visible dès que la revue est écrite et se met à jour après chaque fusion et chaque vidéo (`prKitRender` garde les miniatures et les cartes ouvertes).
   - **Six réseaux (`PR_NETS`)** : YouTube (16:9), YouTube Shorts, TikTok, Instagram Reels (9:16), Facebook (16:9), WhatsApp. Chaque carte donne :
     - le bon fichier vidéo (`data-kit-vdl`) ;
     - les textes à copier (titre, description, tags, légende ou message) ;
     - un lien pour ouvrir la page d'envoi du réseau ;
     - un rappel dans Google Agenda au prochain créneau ;
     - la marche à suivre et une alerte si la vidéo dépasse les 3 minutes des Shorts et des Reels.
   - **Textes (`prKit`)** : ils réutilisent la revue écrite par l'agent. `PR_JSON.publication` contient en plus `legende_courte` (l'accroche des réseaux) et `texte_miniature` ; la consigne « PUBLICATION » de `prRules` dit comment les écrire (vrais, sans racolage).
     - YouTube : description avec les chapitres, les sources, les crédits des photos et de la voix, et 3 hashtags ; tags limités à 480 caractères.
     - Chapitres YouTube : ils sont pris dans le minutage de la fusion (`PR.mixPlan`) et suivent les règles de YouTube (0:00, au moins 3, 10 s au moins chacun). Sinon, la liste des sujets les remplace.
   - **Heures (`prSlot`)** : ce sont des repères pour une info du jour, en heure locale du public. Elles sont données dans le fuseau du pays visé (`PR_TZ`), avec l'heure de l'utilisateur quand elle est différente. Le prochain créneau du jour est conseillé ; plus tard, « publie maintenant ».
     - Le kit reprend aussi les heures de l'analyse du pays (`sp-last-pays`, qui garde maintenant `_pays`) quand c'est le même pays.
     - Il reprend les leçons de la mémoire d'apprentissage du domaine « publication », tirées des statistiques.
   - **Miniature YouTube 1280 × 720 et couverture TikTok, Reels 1080 × 1920 (`prThumb`)** : le plateau flouté en fond, le `texte_miniature` en très gros (blanc et jaune), une photo libre de droits du premier sujet, le nom de l'émission et un bandeau « REVUE DE PRESSE · date ». L'image d'un article n'y est jamais mise : elle appartient à son site.
   - « Tout le kit (.txt) » regroupe tous les textes, réseau par réseau.

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

### 4.3 ter Agnes AI : images et clips gratuits pour le moment (7 octobre)
Demande de l'utilisateur : « générateur de vidéo gratuit avec Agnes AI, on essaie de créer l'API », d'après un tutoriel TikTok de Laurent Voanh. Son compte GitHub n'a aucun dépôt public ; plusieurs projets libres (licence MIT) utilisent l'API d'Agnes.
- **Faits vérifiés le 7 octobre 2026** (wiki.agnes-ai.com : pricing, agnes-video-25-flash, agnes-image-25-flash, terms-of-service) :
  - gratuits : `agnes-video-2.5-flash` (« promotion limitée dans le temps », 720P seulement, 4 à 12 s, modes `text`, `keyframe`, `reference`), toutes les images `agnes-image-2.x-flash` (1K à 4K) et les textes `agnes-2.5-flash` / `agnes-3.0-flash` ;
  - payant : `agnes-video-2.5` (0,025 $ la seconde en 720P). `agnes-video-v2.0`, le modèle des anciens tutoriels « gratuit et illimité », a été retiré le 25 septembre 2026 ;
  - peu de demandes par minute en gratuit ; compte réservé aux 18 ans et plus ; les contenus produits appartiennent à l'utilisateur et peuvent être monétisés ; par défaut, Agnes entraîne ses modèles sur les contenus (on peut le refuser dans les réglages).
- **Images** (`handleAgnesImage`, `server.js`) : `POST {AGNES_BASE_URL}/v1/images/generations` avec `model`, `prompt`, `size` 1K, `ratio`, et `extra_body` contenant `response_format: "url"` et les photos des personnages en data URI (`extra_body.image`, pour garder les visages).
  - Après un 429, Studio Prompt attend puis réessaie (`AGNES_WAIT_MS`).
  - L'image est enregistrée avec sa vraie extension (`imageExt`), et son adresse publique est gardée (`generated_images[n].remote`) pour le clip.
  - Le Storyboard essaie Agnes d'abord quand la clé existe (`agnesReady`), puis Nano Banana, puis GPT Image.
- **Clips** (service `agnes` de `generation.js`, prix 0) : `POST /v1/videos` avec `seconds` = durée du plan (4 à 12), `size` 720P et `aspect_ratio` ; suivi par `GET /agnesapi?video_id=…&model_name=…`.
  - Mode `keyframe` avec l'image de départ du Storyboard : son adresse publique, sinon une data URI. Si Agnes refuse l'image (400), le clip est refait depuis le texte seul.
  - Une seule vidéo Agnes à la fois (`pump`). Le 429 fait attendre et réessayer, et la reprise après redémarrage marche (`remote.agnes`).
  - Le prompt est celui du plan (`i2vPrompt` avec image, sinon `t2vPrompt`) : le cerveau V4 du compilateur.
- **Page** :
  - carte « Clips gratuits · Agnes Video 2.5 Flash » dans l'onglet Plans (`agnesClips`) : les plans sans clip partent ;
  - `agnesWatch` range chaque clip prêt dans `generated_videos[n]` (même place que Manus et les imports, donc Video Critic et pré-montage) ;
  - si l'offre gratuite se termine (`no_credit`), un message renvoie vers Google Flow ou Higgsfield ;
  - ligne « Images et clips · Agnes AI » dans Connexions avec le guide de la clé (`AGNES_API_KEY` dans `.env`).
- Test : `agnes-test.js` (faux Agnes).

### 4.3 quater Jeux « 5 secondes » : vidéos de défis dessinées par le code (7 octobre)
Demande de l'utilisateur : des formats qui marchent « sans utiliser l'IA », faits par l'agent, les plus vus sur YouTube et TikTok, « de façon extrêmement cool ». Son texte classait en tête les jeux et énigmes, et proposait un moteur répétable « 5 SECONDES ». C'est l'onglet « 🧠 Quiz « 5 secondes » » de la page **Motion design** (voir plus bas).
- **Format** : accroche (chronomètre, nom de la série, « seulement 3 % trouvent… »), puis pour chaque niveau :
  - la question, puis 5 secondes de compte à rebours (anneau vert, jaune puis rouge, tic-tac de plus en plus aigu, alerte rouge à la fin) ;
  - la réponse : explication à la place de la question, bandeau « RÉPONSE », confettis.
  - Fin : « combien en as-tu trouvé ? » et « nouveau défi demain ». Les niveaux sont de plus en plus difficiles (FACILE → GÉNIE).
- **Huit types** (`JX_TYPES`) :
  - intrus (grille d'emoji, paires de plus en plus proches `JX_PAIRS`) ;
  - mémoire (objets montrés 3 s puis cachés) ;
  - suite logique ;
  - vrai ou faux ;
  - quiz à 4 choix ;
  - devine l'ombre (8 octobre) : l'emoji en couleur, puis quatre silhouettes noires (`shade`). Une seule est la bonne. Les leurres sont des silhouettes proches (`JX_SHADOWS`), puis, aux niveaux difficiles, la même silhouette déformée (`jxShadowOpts`). À la réponse, la bonne ombre prend ses couleurs ;
  - trouve la différence (8 octobre) : deux images d'emoji presque identiques, une case change (paires `JX_PAIRS`) ; la différence est entourée dans les deux images ;
  - combien ? (8 octobre) : des emoji mêlés à compter, puis quatre réponses chiffrées en deux colonnes. Au niveau expert, tout bouge.
  Les emoji sont dessinés par la police de l'ordinateur : aucune image d'IA, aucun droit d'auteur.
- **Vérité** : intrus, mémoire, suite, ombre, différence et comptage sont **calculés par le code** (place de la bonne ombre, case changée, nombre de cibles : tirés puis dessinés par le code) (position de l'intrus, case de l'objet, `jxNext` retrouve la règle de la suite et corrige une mauvaise réponse de l'agent). Le vrai ou faux et le quiz viennent du savoir de l'agent : ils partent dans « À vérifier avant de publier ».
- **Deux façons de créer** :
  - « ✨ Créer les niveaux avec l'agent » (`jxPrompt` : thème, public, texte de l'utilisateur facultatif, règles : vrai, aucune personne réelle, aucune marque, ni argent, ni politique, ni religion ; `learningBlock` de la stratégie) ;
  - « 🎲 Sans IA : niveaux au hasard » (`jxRandom`) : sans quota, marche toujours, c'est aussi le relais quand l'agent est indisponible. `jxRandom(n, graine, jeux)` peut se limiter à certains jeux (utilisé par Succès YouTube).
  Si l'agent écrit moins de niveaux que demandé, les manquants sont tirés au hasard.
- **Décors animés** (`JX_DECORS`, choix « Décor animé », gardé dans `sp-prefs.jeuxDecor`) :
  - néon de nuit ;
  - manga (trame de points, lignes de vitesse, cadre de case ; encre noire et halo blanc) ;
  - nature (lever de soleil, nuages, montagnes en parallaxe, feuilles, oiseaux) ;
  - espace (nébuleuses, étoiles qui scintillent, planète à anneau, étoile filante).
  La question arrive mot par mot (`popText`), et des étincelles tournent autour de l'emoji du quiz.
- **Voix qui pose les questions** (demande du 7 octobre : « dans toutes les pages, les parleurs, pour que je choisisse les questionneurs ») : choix « Voix » (`jx-voix`, `spVoiceOptions`) : sans voix, la meilleure voix gratuite (automatique), les voix Gemini, la voix naturelle de Hugging Face, les voix de l'ordinateur.
  - `jxLines` écrit les phrases : accroche, « Niveau n » et la question, la réponse avec son explication, la fin.
  - `spSayAll` les fabrique une à une, avec la même chaîne gratuite que la revue (Gemini, puis Hugging Face, puis l'ordinateur ; `spSay`).
  - `jxPlan` donne à chaque moment le temps de sa phrase, et `spMixVoices` pose les voix en baissant la musique dessous.
  - **Voix de premier niveau** (8 octobre : « les vidéos sont très simples, je veux des voix de premier niveau ») :
    - chaque phrase part avec une direction de jeu, comme pour un comédien (`SP_STYLE.quiz` : animateur de jeu télé charismatique, enjoué, avec du suspense) ;
    - en « automatique », la voix Gemini est « Puck », enjouée (`SP_AUTO`) ;
    - la voix naturelle de Hugging Face reçoit la même direction (plus expressive) ;
    - les voix ElevenLabs apparaissent dès qu'une clé existe (`el:<id>`) ; leur jeu suit la direction (`voice_settings` plus expressifs pour un animateur, plus stables pour une voix posée), avec le relais gratuit si elles échouent.
  - **Voix de studio** (`spMixVoices`) : coupe des graves sourds (85 Hz), un peu de corps (220 Hz), présence (3,2 kHz), air (10 kHz), puis un compresseur de voix, comme à la radio.
- **Questions trouvées sur le web** (« une recherche Google qui me propose les questions les plus pertinentes ») : « 🔎 Questions de culture générale » appelle l'agent avec l'outil de recherche (`search:true`, `jxWebPrompt`) et propose 10 questions vérifiées, chacune avec sa source. On coche, puis « Créer l'épisode avec les questions cochées » : niveaux quiz, sources gardées dans « À vérifier ».
- **Plusieurs modèles** (« pas toujours les mêmes modèles ») : `JX_MODELS`. Ils changent le bandeau de la question et les réponses :
  - Classique : cartes blanches ;
  - Jeu télé : bandeau et barres hexagonales dorées sur fond bleu nuit ;
  - Bulles de BD : bulles avec contour et pointe ;
  - Minimal : une simple ligne sous chaque réponse ;
  - Au hasard : le modèle change à chaque épisode.
- **Affiche premium** (`poster`, `jxPosterBlob`) : le décor, le nom de la série en très gros, l'accroche dans un bandeau rouge, le dernier niveau en aperçu, une flèche rouge, l'épisode et le niveau. Deux tailles : affiche YouTube 1280 × 720 et couverture TikTok 1080 × 1920. Elle s'affiche aussi sur le lecteur avant la lecture.
- **Vidéo** :
  - `jxPlan` fait le minutage, `jxAudio` le son (nappe `prBed`, souffles, coups, stings et bips du compte à rebours rendus hors ligne) ;
  - `jxStage` dessine (9:16 : zone de jeu hors des boutons et de la légende des applications ; 16:9 aussi) et `jxRecord` enregistre en temps réel ;
  - « Les deux » fait les deux formats ; « 👁 Aperçu » montre l'accroche, le compte à rebours et la réponse.
  - **Couche cinéma** (`spCine`, 8 octobre, commune au quiz et aux pubs) : coup de zoom avec flash à chaque changement de moment et à chaque réponse, éclat de lumière chaude qui traverse, poussières lumineuses, vignette et grain de film. Une montée de souffle annonce chaque réponse.
- **Publication** (`jxKit`) : titre et légende de l'agent, sinon composés par le code, avec hashtags du jeu. Les heures d'un jeu (12 h 30, 18 h, 21 h) sont données dans le fuseau du pays (`PR_TZ`, `prTzAt`), avec des liens vers TikTok, YouTube et Instagram.
- Série : chaque épisode prend le numéro suivant (`sp-jeux`), et le dernier épisode est retrouvé après rechargement.
- Pistes suivantes (proposées par l'utilisateur, pas encore faites) : classements animés de données vraies (« Afrique contre le monde », sources ouvertes), simulateurs « Et si… », conversations animées (présentées comme des fictions), voix qui lit la question, épisodes tirés d'une image, d'un audio ou d'une vidéo.
- Test : `jeux-test.js`.

### 4.3 quinquies Publicités pour les commerces (7 octobre)
Demande de l'utilisateur : « un onglet pour les publicités payantes que je fais au marché ». C'est l'onglet « 📣 Publicités » de la page Motion design.
- **Ce que donne le commerçant** (`pbForm`) : nom, activité, produit, prix, ancien prix, promo, WhatsApp, adresse, horaires, avantages, couleur de la marque, durée (15 ou 30 s), photos du produit (5 au plus) et logo.
  - Les photos sont réduites avant l'envoi (`pbShrink` : 1 600 px au plus en JPEG ; logo en PNG pour garder la transparence) et rangées dans `generated/publicites/`. Sans serveur, elles restent dans le navigateur.
- **Textes** :
  - « ✨ Écrire la pub avec l'agent » (`pbPrompt`) : slogan, accroche, 3 avantages, appel, légende, hashtags. Règles : aucun prix, aucune promo, aucune garantie inventés, aucun faux témoignage, pas de « meilleur » sans preuve, aucune personne réelle ;
  - « ⚡ Sans IA » (`pbTexts`) : textes composés avec les infos du commerçant. C'est aussi le relais si l'agent échoue.
- **Vidéo** (`pbStage`, `pbPlan`, `pbAudio`, enregistreur commun `jxRecord`), en cinq temps :
  1. intro : logo qui apparaît avec une étoile, nom, accroche ;
  2. produit : photo en cadre et étoile « promo » ;
  3. avantages : coches qui arrivent une à une ;
  4. prix : l'ancien prix est barré, le nouveau claque avec des confettis ;
  5. appel : bouton vert WhatsApp avec le numéro, adresse et horaires.
  Fond aux couleurs de la marque, bandes qui défilent, nappe énergique, souffles et coups.
- **Formats** : 9:16 (statut WhatsApp, TikTok, Reels), 1:1 (Facebook, Instagram), 16:9, ou les trois.
- **Affiches** (`pbPosterBlob`) : statut WhatsApp 1080 × 1920 et Facebook, Instagram 1080 × 1080. Elles s'affichent aussi sur le lecteur avant la lecture.
- **Voix off** (`pb-voix`, mêmes voix que le quiz) : une phrase par moment (`pbLines`), avec le prix dit à voix haute (« Seulement… au lieu de… ») ; les moments s'allongent pour la voix (`pbPlan`).
- **Voix de premier niveau** (8 octobre) : voix dirigée comme une annonceuse de radio haut de gamme (`SP_STYLE.pub`, voix automatique « Laomedeia »), voix de studio et couche cinéma (§4.3 quater). Une montée de souffle annonce le prix.
- **Mes marques** (`sp-marques`, `pbBrands`) : chaque marque se reprend en un clic, et « 💾 Garder cette marque » enregistre le formulaire avec son logo.
  - Le site d'annonces de l'utilisateur, **Wanteermako** (www.wanteermako.com : « Petites annonces premium au Sénégal », publication gratuite, 0 % de commission, contact WhatsApp), est proposé d'office : couleur #6366F1 relevée sur le site, logo rapatrié une fois par `/api/photos/import`.
  - La boutique en ligne de l'utilisateur, **Yamane Shop** (smartstorephone.netlify.app : livraison en 24 h à Dakar, paiement à la livraison, retour sous 7 jours, orange #F49C45 relevé sur le site), est aussi proposée d'office (8 octobre). Son WhatsApp reste vide dans le code publié : l'utilisateur l'ajoute une fois puis garde la marque sur son ordinateur. Les marques d'office s'ajoutent aux marques déjà gardées.
- **Site web et QR code** : champ « Site web ». L'appel montre l'adresse dans un bouton aux couleurs de la marque, avec un QR code (bibliothèque libre `qrcode-generator` 1.4.4, chargée à la demande depuis jsDelivr ; sans internet, pas de QR). L'affiche met le QR en haut à droite.
- Sans photo du produit, le cadre montre le logo en grand (`noPhoto`) ; un logo large est posé dans une pastille allongée.
- **Partage** : texte du statut à copier, avec un lien pour l'envoyer sur WhatsApp. La pub est gardée dans `sp-pub`.
- Test : `pub-test.js`.

### 4.3 sexies Page « Agence » : clients et créations de communication (7 octobre)
Demande de l'utilisateur : un onglet pour son agence (« Yamane Tech » ; nom modifiable, `sp-agence.agence`, signé discrètement sur les créations) qui fait affiches, flyers, logos, communication digitale et sites. Le lien « Agence (mes clients) » est dans le groupe « Mes contenus » du menu, qui garde ses 4 groupes et tient sans défiler sur un écran de 650 pixels de haut (lignes resserrées sur les écrans bas).
- **Fiches clients** (`sp-agence.clients`) : nom, activité, WhatsApp, adresse, couleur, logo (rangé dans `generated/agence/`).
  - Suivi : prospect, devis envoyé, en cours, livré, payé (`AG_STATE`), avec le montant et des notes. C'est le début du CRM prévu sur la feuille de route.
- **Affiches et flyers** (`agDraw`) :
  - formats A4 et A5 dessinés à la vraie taille d'impression (300 points par pouce : 2480 × 3508 et 1748 × 2480), carré réseaux (1080 × 1080) et story (1080 × 1920) ;
  - types : promotion, événement, ouverture, recrutement, services ;
  - photo du client en haut avec une coupe en biais, titre très gros, sous-titre, lignes d'infos, bouton WhatsApp, adresse.
  - **PDF pour l'imprimeur** (`agPdf`) : une page au format exact (A5 = 419,53 × 595,28 points), l'affiche en JPEG, écrite sans bibliothèque. Images JPEG et PNG aussi.
- **Textes** (`agPrompt`, `agTexts`) : l'agent écrit titre, sous-titre, lignes et appel avec les seules infos données (rien d'inventé) ; « Sans IA » les compose.
- **Vers la pub vidéo** : « 📣 Faire sa pub vidéo » remplit l'onglet Publicités de Motion design avec la fiche du client (nom, activité, WhatsApp, adresse, couleur, logo).
- Prochaines étapes demandées : logos (propositions de l'agent dessinées en vecteur), visuels réseaux, sites vitrine et e-commerce (commande WhatsApp, mise en ligne), devis et factures ; Blender (gratuit) pour la 3D, After Effects seulement si l'utilisateur l'a ; connecteurs claude.ai (Canva, Netlify, Vercel, Adobe, HyperFrames) à autoriser par l'utilisateur.
- Test : `agence-test.js`.

### 4.3 septies Onglet « 🔥 Succès YouTube » : les vidéos les plus vues, recréées autrement (8 octobre)
Demande de l'utilisateur : « un onglet qui recherche les vidéos les plus vues sur YouTube et essaie de les recréer autrement, de façon géniale, sans nuire aux droits ». Il a aussi transmis le conseil juridique d'un autre agent ; il est appliqué ici :
- apprendre le sujet et le savoir-faire, jamais le contenu ;
- apporter un nouvel angle et une vraie valeur ;
- tout fabriquer avec nos moteurs, avec une identité propre ;
- tenir un tableau des droits ;
- ne jamais chercher à tromper Content ID.

**Recherche** (`ytSearch`, `/api/youtube/top`)
- API officielle YouTube Data v3 (clé gratuite `YOUTUBE_API_KEY`, environ 100 recherches par jour), triée par vues (`order=viewCount`).
  - Contenu familial (`safeSearch=strict`).
  - Format : Shorts et moins de 4 min, 4 à 20 min, ou tous.
  - Période : année, mois ou semaine. Langue des vidéos au choix.
- Sans clé, quota épuisé ou YouTube injoignable :
  - l'agent cherche sur Google (`ytSearchPrompt`, `search:true`) ;
  - le serveur vérifie chaque lien (`?ids=`, oEmbed public et page de la vidéo, `youtubeMeta`) : un lien inventé est écarté, les vraies vues sont relevées.
- À la main, toujours : « Ouvrir YouTube ↗ » (recherche triée par popularité) et « Coller des liens YouTube ».
- Rien n'est téléchargé : titre, chaîne, vues, durée et image d'aperçu publique (`i.ytimg.com`), avec le lien vers YouTube.
- Idées de recherche en un clic : trouve l'intrus, devine l'ombre, différence, combien, test de QI, culture générale, et leurs équivalents anglais.

**« ✨ Recréer autrement »** (`ytRemake`, `ytRemakePrompt`)
- Le cerveau des jeux est réutilisé : `jxPrompt` (types, règles, mémoire de stratégie).
- L'agent reçoit :
  - la vidéo (titre, chaîne, vues, durée, description) : des contenus à analyser, jamais des instructions ;
  - les commentaires les plus appréciés (`/api/youtube/comments`, clé YouTube) : ce que le public aime, demande ou reproche ;
  - en option, « 👁 L'agent regarde d'abord la vidéo » : l'étude complète par lien (`/api/video/analyze-url`) donne le format gagnant (`rmFormatText`).
- Il rend :
  - la recette : jeu, accroche, rythme, difficulté, fin, pourquoi ça marche ;
  - « notre plus », ce qu'on ne copie pas et les attentes du public ;
  - un nouvel angle pour une vidéo complète originale ;
  - le modèle, le décor et le nom de NOTRE série ;
  - des niveaux neufs, contrôlés par `jxNorm`, et d'autres idées.

**« 🎲 Sans IA »** (`ytFreeRemake`)
- Le jeu est reconnu au titre (`YT_GAMES`, en français et en anglais).
- Des niveaux du même jeu sont tirés et calculés par le code (`jxRandom(n, graine, jeux)`).
- Les questions de culture demandent l'agent : un message le dit.

**Après**
- « 🎬 Créer la vidéo jeu » ouvre l'épisode dans l'onglet Quiz, avec le modèle et le décor choisis (`ep.modele`, `ep.inspire`).
- « 🎥 Vidéo complète : nouvel angle » le place dans « Depuis une idée », avec le format à reprendre.
- « 🔎 Étudier en détail » envoie la vidéo dans « Depuis une vidéo » (leçons pour la mémoire de l'agent).

**Droits et sauvegarde**
- Chaque version a son tableau des droits : images, musique, textes, voix, emoji, vidéo d'origine. Les règles sont visibles dans l'onglet.
- La liste et la dernière version sont gardées dans `sp-succes`, les réglages dans `sp-prefs.succes`.

Test : `succes-test.js`.

### 4.3 octies Ajouts de l'autre outil (9 au 11 octobre), relus et réparés le 11 octobre
L'autre outil (Antigravity) a livré le commit 4849974. La suite complète est passée de 477 contrôles réussis à 388 réussis et 14 échecs ; tout a été réparé sans retirer ses ajouts.

**Ce qu'il a ajouté**
- **Motion design en 6 onglets** (`MOTION_TABS`) : 🎨 Projet libre, 🎓 Cours du jour, 📰 Infos du jour, 🧠 Quiz, 📣 Publicités, 🔥 Succès YouTube. Le dernier onglet utilisé est retenu (`sp-prefs.motion`) ; sans choix, la page s'ouvre sur « Projet libre ».
- **Cours du jour** : compositions Canvas, puis finition par FFmpeg sur le serveur (`ffmpeg-static`, `/api/course/finalize` et `/api/video/finalize`) : MP4 H.264 + AAC 48 kHz, sous-titres SRT. Repli dans le navigateur si FFmpeg manque.
- **Montage de pub** : le moteur de pré-montage est instancié une seconde fois (même code) dans l'onglet Publicités. On y importe images, vidéos et sons, on choisit transitions, effets et sous-titres, puis on exporte au format de la pub.
- **Quiz premium** : 100 modèles (`JX_PRESETS`), niches, palettes, transitions, animations et qualité de rendu (720p, Full HD, 2K).
- **Mémoire de documents PDF** : `/api/pdf/text` lit le texte d'un PDF (`pdf-parse`) sans jamais l'enregistrer, depuis le champ « Document PDF » de la page Mémoire. `scripts/build-document-memory.js` tire des règles des PDF rangés dans `public/` vers `public/document-memory.js` : des règles seulement, jamais le texte des livres. Les PDF, ZIP, RAR et images de référence sont ignorés par git.
- **Sauvegarde en ligne facultative (Supabase)** : `claude-shim.js` copie les projets (`data/users/local`) par `/api/db/documents`. La clé `SUPABASE_SECRET_KEY` reste dans `.env`, côté serveur. Table : `supabase/studio_prompt_documents.sql`.
- **Agnes** : nouvel essai quand la file est saturée (429, ou 503 « queue / busy »), jusqu'au délai maximum compté depuis `j.started`. Un second envoi pour le même plan rend la tâche déjà en cours.

**Règles fixées en réparant (à ne plus casser)**
- **Reprise après redémarrage** (`generation.js`) : une vidéo déjà commandée (`j.remote` : `op` pour Veo, `task` pour Runway, `agnes`) est **seulement attendue, jamais commandée une seconde fois**. `run()` vérifie aussi `j.remote` avant tout envoi. Seule une vidéo Agnes (gratuite) coupée pendant l'envoi, donc sans `remote`, est remise dans la file. Pour un service payant coupé pendant l'envoi, l'utilisateur relance à la main, car on ne sait pas si la commande est partie. L'autre outil avait remis toutes les tâches « en cours » dans la file, ce qui faisait payer deux fois Veo et Runway.
- **Modèle de quiz** (`jxStage`) : un modèle choisi à la main (Classique, Jeu télé, Bulles, Minimal) **l'emporte** sur le modèle premium (`PICK`). « Au hasard », le réglage par défaut, laisse le modèle premium décider (`PRE`) : ses polices, cartes et palettes s'appliquent alors. Avant cette réparation, le modèle premium effaçait le choix de l'utilisateur.
- **Sauvegarde en ligne absente = état normal** : si Supabase n'est pas configuré, ne répond pas (projet en pause) ou n'a pas sa table, le serveur répond 200 `{ready:false, code, message}` (délai de 15 s). Après un échec, le shim ne fait plus aucun appel pendant la visite, et aucun appel non plus sur `*.github.io` ni en `file:`. Les projets restent dans le navigateur, c'est le relais gratuit. La visite suivante renvoie à Supabase la version la plus récente. Aucune erreur rouge dans la console. La page Connexions affiche « Sauvegarde des projets ».
- **Tests** : les suites de la revue de presse et de la voix gratuite fixent `sp-prefs.motion = "infos"`, comme un utilisateur qui revient sur cet onglet. Les 3 suites de l'autre outil (`cours-ultra-test.js`, `course-ffmpeg-test.js`, `professional-tabs-test.js`) tournent dans `npm test`, et `run-all.js` compte aussi les suites `node:test` (« # pass N »).

### 4.3 nonies Export professionnel des vidéos : Full HD, téléphone d'abord (11 octobre)
Demande de l'utilisateur (8 octobre) : « le format des vidéos de chaque onglet, YouTube et TikTok, bien fait ; téléphone et PC d'abord ; des vidéos plus professionnelles ».

**Couche commune** (avant `prVideo`)
- `SP_FMT` et `SP_FMT_CHOICES` : les mêmes noms partout. 📱 Téléphone 9:16 (1080 × 1920 : TikTok, Shorts, Reels, statut WhatsApp), 💻 PC 16:9 (1920 × 1080 : YouTube, Facebook), ◻️ Carré 1:1 (1080 × 1080, pour les pubs).
- `spFmts` : « both », le choix par défaut, donne le téléphone d'abord, puis le PC.
- `spFmtTag` donne les noms de fichiers : `…-telephone-9x16.mp4`, `…-pc-16x9.mp4`, `…-carre-1x1.mp4`.
- `spMakeVideo` → `spEncode` : la vidéo est fabriquée **image par image** (WebCodecs).
  - MP4 H.264 « High » + AAC 192 kb/s, 30 images/s constantes, une image clé toutes les 2 s, index en tête du fichier.
  - Débit : 6 Mb/s en Full HD, 4,5 Mb/s au-delà de 2 min 30.
  - Assemblage par `public/vendor/mp4-muxer.min.js` (MIT, licence à côté), sinon jsDelivr.
  - `spLoudness` met le son à environ −14 LUFS, crête sous −1 dB. Vérifié avec FFmpeg : −14,7 LUFS.
- **Relais gratuit** : sans WebCodecs, ou en cas d'échec, l'enregistrement en direct d'avant est utilisé (720p, profil High d'abord). `window.__noPro` force ce relais : `succes-test.js` le vérifie.
- `spVideoFigure` et `spReadyHtml` : sous chaque vidéo, son format, ses réseaux, « ✅ Prête à publier » et les limites (statut WhatsApp 60 s, Shorts 3 min).

**Par onglet**
- **Infos du jour** (`prStage`, `prStudio3D`) : le dessin garde ses mesures 720p (`W`, `H`, `U`). En Full HD, toutes ses images (sortie, tampons des transitions, fond, vignettage, fonds flous, mur LED, rendu 3D) sont 1,5 fois plus grandes (`K`), et leurs contextes sont mis à l'échelle. Chaque `drawImage` d'un tampon plein écran donne sa taille (`W, H`). Le plateau 3D est toujours gardé à l'export, car il n'y a plus de contrainte de temps réel.
- **Quiz et Succès YouTube** (`jxStage`) : le fichier final est au moins en Full HD (`renderQuality` « pro », ou 2K si l'utilisateur choisit « Ultra »). Les aperçus restent rapides.
- **Publicités** (`pbStage`) : `big="fhd"` donne le PC en 1920 × 1080 ; le téléphone et le carré sont en 1080.
- **Projet libre et Cours du jour** (`mdMakeVideo`) : le dessin d'une image est isolé dans `drawAt(t)` (mesures 720p, échelle `KK`), et le son est rendu hors temps réel par `mdSoundOffline`, avec le même mixage. La finition FFmpeg du serveur reste appliquée ensuite et garde la taille.

**Règle (à ne plus casser)** : tout dessin de vidéo doit être **indépendant de la résolution**. Soit chaque mesure est multipliée par `U` (positions, cadres, traits et polices), soit le dessin reste en mesures 720p et le contexte est mis à l'échelle (`K`). Jamais de positions fixes en pixels avec des polices agrandies : en Full HD, le texte déborderait de ses cadres. C'était le cas de l'habillage 2D des Infos, corrigé par `K`.

**Tests** : vidéos 1080 × 1920 et 1920 × 1080 vérifiées dans `presse-*`, `jeux-test.js`, `pub-test.js` et `motion-libre-test.js` (nouveau : vraie vidéo de « Projet libre » + FFmpeg). Les positions lues dans les images sont proportionnelles. Délais : 9 min pour le plateau 3D sans carte graphique, 15 min par suite.

**Aussi le 11 octobre** : un PDF déposé par erreur dans « Ton export YouTube Studio » donne un message clair. Il est rangé dans « Apprendre depuis un document PDF » sans lancer l'agent (`stats-test.js`). Les menus « Format » de Projet libre et du Cours du jour portent les mêmes noms (téléphone, PC, carré).

### 4.3 decies Cours du jour : des diapos adaptées à chaque cours (11 octobre)
Remarque de l'utilisateur : « tous les cours ont toujours le même format ; je veux que chaque cours ait des diapos adaptées, pas un seul design ».

**Les deux causes corrigées**
- `crPrompt` imposait à tous les cours la même grammaire (« présentation technologique sur fond bleu nuit »), et `crCourseFrame` n'avait qu'un seul fond.
- La « mise en scène » choisie (tableau, infographie…) était dessinée par `mdMakeVideo`, puis recouverte par ce fond : elle ne se voyait jamais.

**Habillages** (`CR_THEMES`, après `crCourseFrame`)
- Il y en a 9 : nuit technologique, tableau à craie, cahier d'écolier, éditorial clair, archives et frises, laboratoire, plan d'ingénieur, couleurs vives, professionnel.
- Chacun a son fond (3 couleurs), son encre, ses cadres (`forme` : hex, trait, post-it, bloc, sceau, rond, cote, bulle), son décor (`motif` : grille, craie et cadre en bois, lignes et marge, filets, papier ancien, papier millimétré, plan, confettis sur les bords, diagonales) et ses polices (titres et texte). Le décor est fixe : son « hasard » ne scintille pas.
- Lisibilité contrôlée : encre ≥ 7 de contraste sur le fond, texte secondaire ≥ 4,5, accents ≥ 3. Les couleurs proposées par l'IA ne remplacent celles de l'habillage que si elles restent lisibles (≥ 2,4).

**Choix de l'habillage** (`crThemeOf`)
- Ordre : choix fait à la main (`direction.habillage_main`), puis mise en scène imposée (« tableau » → tableau à craie, « 3d » → nuit), puis choix de l'agent (`direction.habillage`, avec `habillage_raison`).
- Sans choix valable, l'habillage est déduit du domaine et du niveau (enfant → couleurs vives ou cahier). Il varie d'un cours à l'autre selon le titre.
- Écran du résultat (`crThemeCard`, `crThemePreview`) : le nom de l'habillage, sa raison, un menu « Changer l'habillage », et un aperçu de trois diapos (première, milieu, dernière), redessiné à chaque changement. La vidéo suit ce choix.

**Mises en page** (13, une par diapo selon son contenu)
- Celles d'avant : hero, network, cards, compare, quiz, 3d.
- Les nouvelles :
  - definition : le mot souligné, sa définition, un exemple ;
  - formule : calcul ligne par ligne, résultat encadré ;
  - frise : dates et événements, verticale en 9:16, horizontale en 16:9 ;
  - schema : l'objet au centre, ses parties reliées ;
  - etapes : cartes avec flèches en 9:16, chevrons en 16:9 ;
  - chiffre : le nombre monte jusqu'à sa valeur exacte, avec sa source ;
  - citation : texte exact et auteur.
- Le contenu exact de chaque diapo est dans `scene.items` (`titre`, `texte`, `valeur`), nettoyé par `crNormalizeLayouts` (6 éléments au plus). Sans `items`, les points de la scène servent. Deux mises en page identiques ne se suivent jamais, et la commission (`crReviewPrompt`) garde l'habillage et les items.
- « Erreur fréquente » : deux cadres l'un sous l'autre, en grand texte. Le trait doré de l'accroche passe sous la phrase, et non plus au travers.

**Plus de mots techniques à l'écran** : « CANVAS • WEBGL • FFMPEG » (cours) et « CANVAS + WEB AUDIO + FFMPEG » (projet libre) sont retirés. Le bas de la diapo indique le niveau, et le projet libre la fonction de la scène en français (« ACCROCHE », « À RETENIR »…).

Test : `cours-habillage-test.js`. Faux canvas, sans navigateur ni IA : 9 habillages × 13 mises en page × 2 formats, lisibilité, choix de l'habillage, normalisation, consignes. Bout en bout : `cours-video-test.js`. La consigne garde le titre « GRAMMAIRE VISUELLE DE RÉFÉRENCE », pour la partie commune à tous les habillages (`cours-ultra-test.js`).

### 4.3 undecies Plus jamais bloqué sur « 1/4 · Le documentaliste… » (11 octobre)
Remarque de l'utilisateur : le cours restait sur « 1/4 · Le documentaliste vérifie… ». Les quotas gratuits étaient épuisés (3 modèles Gemini sur 4 bloqués, recherche web limitée à la minute, OpenAI sans crédits). La grosse demande passait donc par le petit modèle de secours, qui pouvait écrire très longtemps ou tourner en rond (jusqu'à `MAX_OUT`), et rien ne l'arrêtait.
- **Serveur** (`handleSample`) :
  - un modèle muet pendant `SAMPLE_IDLE_MS` (150 s) ou trop long (`SAMPLE_MAX_MS`, 10 min) est arrêté avec un message clair (`code:"timeout"`, 504 avant la réponse, ligne d'erreur pendant) ;
  - une réponse qui tourne en rond (`sampleLoops` : les 200 derniers caractères reviennent 4 fois dans les 6 000 derniers) est coupée (`code:"loop"`), et le modèle est mis de côté 10 minutes.
- **Cours** (`crStep`) :
  - chaque étape affiche son temps et les caractères reçus, et a un délai (150 s, 6 min, 4 min) ;
  - en cas de délai dépassé, de boucle, de saturation ou de réponse illisible, l'étape est relancée une fois avec le modèle rapide (`opts.over`) ;
  - le documentaliste et la commission sont facultatifs : bouton « Passer cette étape » (`#cr-skip`). En cas d'échec, le cours continue et un avertissement le dit.
  - Les 3 appels et leurs réglages littéraux restent, comme l'exige `cours-ultra-test.js`.
- **Finition FFmpeg** : si elle est occupée, le serveur répond 200 `{busy:true}`, et la page attend son tour (5 min au plus) au lieu d'échouer.
- Tests : `sample-garde-test.js` (faux Google muet, lent, en boucle) et `cours-relais-test.js` (documentaliste passé, commission relancée avec le modèle rapide).

### 4.3 duodecies Le Constructeur : une demande + tes fichiers → n'importe quelle vidéo (12 octobre)
Demande de l'utilisateur : les pages faisaient toujours les mêmes vidéos (quiz, pubs figés). Il voulait un constructeur comme les sites de génération : une zone de texte, des fichiers joints, un bouton, et n'importe quelle vidéo. Priorité : la vente.
- **Page** `view-constructeur` : premier onglet de « Créer » et premier raccourci de l'accueil (« Décris ta vidéo »).
  - On y trouve : la demande, les fichiers (photos, vidéos, audio, PDF ou texte), la marque (`pbBrands`), le format, la durée, la voix off et un lien facultatif.
  - Une vidéo jointe est « à monter » ou « modèle à imiter » ; un audio est « musique » ou « voix ».
- **Cerveau** (`cbPrompt`) :
  - l'agent VOIT les photos et 2 images de chaque vidéo à monter (4 pour un modèle), 8 images au plus (`cbImages`) ;
  - il écrit librement un plan de montage JSON : type, accroche, style (ambiance, couleurs, police), scènes (durée, mise en page, titre, texte, points, médias avec début et mouvement, voix, transition), appel à l'action, texte de publication ;
  - `cbNorm` nettoie le plan. Un « modèle à imiter » n'est jamais monté (`cbFind` le refuse) ; seule sa construction est reprise.
- **11 mises en page** (`cbStage`) : plein écran, produit, prix (étiquette, ancien prix barré, badge promo), avantages, avant/après, étapes, chiffre, galerie, mots animés, marque, appel à l'action (bouton WhatsApp, site).
  - Transitions : coupe, fondu, glisse, zoom, flash. Ken Burns sur les photos ; les vidéos sont rejointes image par image (`cbSeek`, `spEncode` attend un dessin asynchrone).
  - Dessin en mesures 720p, mis à l'échelle K pour la Full HD.
- **Son** (`cbAudio`) : musique de l'utilisateur ou nappe d'ambiance (`PR_MOODS`), voix off gratuite par scène (`spSayAll`, voix d'annonceur), whoosh aux transitions, impact sur le prix, et voix enregistrée de l'utilisateur si elle est jointe. `cbTimeline` respecte la durée demandée et le temps des voix.
- **Résultat** : aperçu de 3 images, scènes modifiables (titre, texte, voix), « Fabriquer la vidéo » (téléphone, PC, les deux ou carré), « Autre proposition », texte de publication à copier. Le plan va dans Mes projets (`creationSave` type `video`) ; les fichiers restent sur l'ordinateur.
- **Sans quota** : « ⚡ Sans IA » (`cbPlanFree`) compose un plan sûr à partir de la demande, des fichiers et de la marque : logo, photos, prix trouvé dans la demande, avantages de la marque, appel à l'action. Si l'agent échoue, ce plan prend le relais.
- **Règles** : rien d'inventé, aucun faux témoignage, aucune personne réelle, textes courts, appel à l'action seulement avec des coordonnées connues.
- Test : `constructeur-test.js`. Vraies images et vrai clip faits par FFmpeg : l'agent voit 4 images, plan de 6 scènes, vidéo 1080 × 1920 de 15 s dessinée, modèle jamais monté, « Sans IA » sans appel, rangement dans Mes projets.
- **Thème clair** : les en-têtes sombres des pages de fabrication (`data-prof` production, audio, broadcast, post, sound, infrastructure) étaient écrasés par la règle générale, plus forte, d'où un texte blanc sur fond clair. Leurs sélecteurs ont maintenant la même force. Le cadre de focus des titres ouverts par le code est retiré.
- **Suite prévue**, souhait de l'utilisateur : deux pages principales, « Créer une vidéo » (le Constructeur, avec les anciens outils dans « Plus d'outils ») et « Prompts ». Ensuite, des références de pubs envoyées par l'utilisateur, à étudier, et de vraies images libres pour les cours.
- **Genres et habillages (12 octobre, suite)** : retour de l'utilisateur, capture à l'appui. « Crée un jeu animé » donnait encore une pub sur fond dégradé en 3 scènes, avec une case vide : « toujours la même chose, quel que soit le sujet ».
  - Causes : la consigne disait « agence qui fait VENDRE » (tout devenait une pub) ; un seul habillage ; la scène « produit » sans photo laissait une case vide.
  - **Le genre d'abord** (`cbPrompt`, étape 1) : pub, jeu, explication, histoire, top, conseils, motivation, annonce (`CB_GENRES`), chacun avec sa construction. Ce n'est une pub que si la demande parle de vendre. Durée automatique selon le genre.
  - **10 habillages** (`CB_THEMES`, étape 2) : dégradé, néon, arcade, pop, papier, pastel, luxe, tech, journal, nature. Chacun a son fond animé (`DECO`), ses couleurs, sa police. `look(kind)` peint le fond et rend les couleurs du texte. L'agent choisit selon le sujet ; sans choix, `cbPickTheme` tire l'habillage du texte. Menu « 🎨 Habillage » sur le résultat : on change d'un clic, l'aperçu se redessine.
  - **18 mises en page** : les 11 d'avant, plus question (2 à 4 choix, compte à rebours, bonne réponse en vert avec ✓, explication ; minutage commun image et son `cbQTime`), compte (`cbCTime`), liste (top révélé du dernier au premier), citation (jamais une personne réelle), dialogue (bulles de messagerie, points de saisie), illustration (grand émoji), versus. Un émoji peut flotter dans un coin.
  - **Jamais de case vide** : une scène peut demander une photo libre (`image_libre`, mots-clés en anglais) ; `cbFreeImages` la cherche par `/api/photos` (Openverse, Wikimedia), l'importe (`/api/photos/import`) et crédite l'auteur dans le texte de publication. Sans serveur, ou sans résultat, `cbFixLayouts` change la scène en illustration ou en mots animés.
  - **Son** : tic-tac du compte à rebours (`cbTick`), « ding » de la bonne réponse (`cbDing`).
  - **« Autre proposition »** : l'agent reçoit l'habillage et les mises en page à ne pas refaire (`CB.again`). Le texte de l'utilisateur n'est plus modifié.
  - Ponctuation française : « ? », « ! », « : » restent collés au mot (espace insécable dans `write`).
  - Scènes modifiables : on peut aussi changer les choix ou les points (séparés par « | »).
- **Sous-titres mot par mot (12 octobre, nuit)** : demande de l'utilisateur (« les sous-titres, les transitions », vidéos GAPS).
  - Temps de chaque mot (`cbWordTimes`) : la voix est décodée, les silences sont mesurés (enveloppe par tranches de 20 ms). Les morceaux de phrase (ponctuation) sont posés sur les plus grands silences, et les mots répartis selon leurs syllabes (`cbSyll`). Sans voix, les mots suivent le rythme de la phrase sur la durée de la scène.
  - `cbCaptions` prépare les mots par scène (aperçu : sans voix ; vidéo : avec la vraie voix). `drawCaps` les dessine par-dessus l'image, après les transitions.
  - Styles (`CB_SUBS`) : karaoké (mot dit en jaune), pop (un gros mot à la fois), boîte (mot dit encadré), classique (phrase sur bandeau), sans. Les chiffres, prix et mots forts (`CB_KEYWORD`) sont en jaune. Menu « 💬 Sous-titres » sur le résultat, gardé pour les vidéos suivantes (`sp-prefs.cbSubs`).
  - Seulement sur les scènes d'image (`CB_CAP_LAYS`) ; les scènes faites de texte (question, liste, conversation…) n'en ont pas besoin. Avec sous-titres, le titre du plein écran passe en haut et le petit texte de produit, marque et illustration laisse la place.
- **Bibliothèque d'effets (`public/studio-fx.js`, 12-13 octobre)** : demande de l'utilisateur, « au moins 50 modèles pour chaque chose, comme Photoshop, After Effects, Premiere, Illustrator, Blender… mais utilisés simplement ». Fichier à part, chargé avant le programme ; fonctions pures qui dessinent sur le contexte reçu ; tout marche hors ligne et sans quota (`window.SP_FX`).
  - 421 modèles : 64 sous-titres (`subs`, `drawCaps`), 76 transitions (`trans`, `transition`), 63 effets d'image (`looks`, `look` : filtres + calques grain, vignette, fuites de lumière, VHS, bichromie, trame, halo…), 61 palettes (`palettes`), 52 styles de titres (`tstyles`, `styledText` : contours, ombres, lueur, relief 3D, dégradés, pastille, surligneur…), 54 animations de titres (`anims`, `drawTitle` : par bloc, mot ou lettre), 51 mouvements de caméra (`moves`, `move`).
  - Les anciens noms restent compris (`alias` : zoom_avant, glisse, karaoke…). `kits` = familles de transitions qui vont ensemble.
  - Moteur (`cbStage`) : une scène se dessine sur un contexte de travail (`paint`) ; pendant une transition, la fin de la scène précédente (A) et le début de la nouvelle (B) sont mélangés ; l'effet d'image est appliqué à l'image finale ; les sous-titres viennent ensuite. Photo qui n'a pas la forme de l'écran : entière au centre, sur un fond flou fait d'elle-même.
  - L'agent choisit dans la bibliothèque (listes tirées de `SP_FX.list` par `cbFxIds`, donc toujours à jour) : `style.look`, `style.palette`, `style.titre`, `style.sous_titres`, et par scène `transition`, `anim`, `mouvement`. `cbFxId` valide chaque nom. Sans IA, `cbFxAuto` tire un ensemble cohérent du texte.
  - Résultat : panneau « 🎛 Studio d'effets » (7 onglets, un aperçu par modèle, animé sous la souris ou le doigt, un clic applique à toute la vidéo), « 🤖 Les choix de l'agent » (retour au plan de l'agent, `_fx0`), « 🎲 Surprends-moi » (combinaison au hasard, cohérente). Chaque scène affiche sa transition et son animation.
  - Test : `effets-test.js` (chaque modèle se dessine sans erreur, au moins 50 images différentes par catégorie, planches-contact dans `tests/out/effets-*.png`).
- **Éléments animés et ambiances (13 octobre)** : 64 éléments (`elems`, `drawElem` : macarons, étiquette de prix, tampon, bannière, bulles, flèches et cercles qui se dessinent comme des tracés découpés, cadres, viseur REC, barre de progression, boutons « Abonne-toi », « Lien en bio », émojis animés…) et 57 ambiances (`ambs`, `ambiance` : neige, pluie, confettis, bulles, étincelles, rayons, feux d'artifice, flammes, code qui tombe, ondes, sol rétro, réseau, spectre audio, pluies d'émojis…). Particules calculées à partir du temps : l'aperçu et l'export donnent la même image. Aucun faux avis ni fausse note étoilée parmi les éléments.
- **Éditeur de scènes (13 octobre)** : retour de l'utilisateur, « tu changes les effets mais pas l'affichage, les images, le nombre d'images : tout doit être dynamique et c'est l'utilisateur qui choisit ».
  - Chaque scène (`cbSceneCard`) : mise en page (23), images à montrer et leur nombre (0 à 6, touchées une à une, numérotées), cadrage (`cadrage` : automatique, remplir, image entière sur fond flou, carte), durée (une durée choisie passe la vidéo en durée libre), textes, puis transition, animation du titre, mouvement de caméra, élément animé (+ son texte), ambiance de la scène. Outils : monter, descendre, dupliquer, supprimer, voir, ajouter une scène (`cbNewScene` prend une image pas encore utilisée).
  - 5 mises en page pour plusieurs images : diaporama (les médias l'un après l'autre, points de progression), collage (tirages posés), écran partagé, image dans l'image, carrousel ; la galerie fait une vraie grille de 1 à 6 (`cbGrid`). Deux images ajoutées à une scène « plein écran » ou « produit » la passent en diaporama.
  - Chaque carte montre l'image de sa scène (`cbPreview`). « ▶ Aperçu animé » (`cbPlay`) joue la vidéo en direct (sans le son), depuis n'importe quelle scène ; Échap ou « Fermer » l'arrête.
  - L'agent reçoit les nouvelles mises en page et la consigne de varier le nombre d'images ; sans IA, 3 photos ou plus vont dans une scène à plusieurs images.
- **Moteur de montage des vidéos jointes (13 octobre)** : question de l'utilisateur, « un moteur qui monte la vidéo insérée de façon plus performante, sans toujours les mêmes formats ». Avant : 4 images prises à des moments fixes, la vidéo démarrait où l'agent disait.
  - `cbAnalyze` (sur l'ordinateur, sans réseau ni quota, avec sa propre copie de la vidéo) : une petite image toutes les ~0,25 s (120 au plus). Changements de plan par histogrammes **en couleur** (rouge, vert, bleu séparés : deux plans de même lumière mais de couleurs différentes sont bien séparés), seuil adapté à la vidéo, coupe retrouvée à quelques centièmes près par recherche par moitiés. Mouvement, netteté (laplacien), lumière et son (`OfflineAudioContext`) mesurés par plan, rapportés au 90e centile de la vidéo (une image ratée ne fausse plus tout). Plans de plus de ~3 s coupés en morceaux. Note par plan, 3 meilleurs marqués ★, étiquette en français (« mouvement fort, net, son fort »).
  - Point d'intérêt : là où l'image diffère à la fois de l'instant d'avant et de l'instant d'après (la position actuelle de l'action), lissé à l'intérieur de chaque plan, avec un saut net à chaque coupe (`a.focus`, `cbFocusAt`). Cadrage « suivi » (et « automatique » pour une vidéo d'une autre forme) : le recadrage vertical suit l'action.
  - L'agent reçoit les plans repérés (début, fin, étiquette) et 4 images (milieu des meilleurs plans, complétées par des moments bien répartis) ; il choisit `debut`, `fin`, `vitesse` (0,5× à 2×) par média. `cbVidTime` : le plan s'arrête sur sa dernière image.
  - Éditeur : pour chaque vidéo d'une scène, plan (liste des plans repérés), début, fin, vitesse ; choisir un plan règle aussi la durée de la scène. La vignette du fichier dit « analyse… » puis « N plans ». Sans IA : les meilleurs plans deviennent des scènes, dans un ordre qui dépend de la demande.
  - **Fichiers jamais oubliés (13 octobre)** : capture de l'utilisateur, une vidéo de 40 s jointe « à monter » n'apparaissait dans aucune scène, et 2 scènes étaient étirées sur 1 minute. `cbUseFiles` (après le plan de l'agent, avant `cbFixLayouts`) : une vidéo jamais utilisée entre par ses 3 meilleurs plans, des photos jamais utilisées par un diaporama ou une galerie, et une durée demandée se remplit d'autres bons plans des vidéos. `cbTimeline` n'étire plus une scène au-delà de 1,6 fois sa durée. Consigne de l'agent : une scène toutes les 2 à 4 s (15 à 25 pour une minute), les fichiers à monter sont le cœur de la vidéo, « analyse la vidéo » ou « monte ma vidéo » = monter CE fichier. Analyse impossible : découpage simple toutes les 3 s, signalé sur la vignette.
  - Test : `montage-test.js` (vidéo FFmpeg de 3 plans de couleurs de même lumière, carré blanc qui traverse, son sur le 3e plan : 3 plans, coupes à 2,0 et 4,0 s, étiquettes, éditeur, recadrage qui garde le carré au centre, montage sans IA).
- **Agents gratuits de secours : Groq et OpenRouter (13 octobre)** : question de l'utilisateur (« où sont les autres IA ? »). Avant, seul Gemini écrivait (pas de clé OpenAI ni Anthropic), et rien ne prenait le relais quand son quota était épuisé.
  - `server.js` : `GROQ_API_KEY`, `OPENROUTER_API_KEY` (API compatibles OpenAI, `/chat/completions` en continu). Ordre des moteurs : Gemini → Groq → OpenRouter → payants. Une seule clé Groq suffit pour que l'agent marche.
  - `relayModel` choisit le meilleur modèle gratuit dans la liste du service (gardée une heure), un modèle qui regarde les images quand il y en a ; sur OpenRouter, seulement les modèles gratuits (« :free » ou prix nul). `GROQ_MODEL`, `OPENROUTER_MODEL` pour imposer un modèle.
  - `/api/status` et `/api/gen/status` disent quels relais sont prêts (jamais les clés). Page Connexions : deux lignes avec le guide pour créer les clés. `.env.example` mis à jour.
  - Agnes (images et clips gratuits) marche (essai réel du 13 octobre) mais n'est branché que sur « Depuis une idée », pas encore sur le Constructeur.
  - **Pourquoi « Agnes ne marche pas » (13 octobre)** : les images marchent ; ce sont les clips vidéo. Sur 85 demandes de clips : 3 réussies, 48 « file vidéo pleine » (503 chez Agnes, offre gratuite saturée, 9 octobre), 19 « trop de demandes par minute » (429), 13 coupures de connexion (11 octobre). Essai réel du 13 octobre : « file Agnes saturée », le site attend et réessaie. `generation.js` : une coupure ou une saturation AVANT la commande d'un clip Agnes se réessaie toute seule (1, 2, 4, 8 puis 15 min, 6 essais ; `wait`, `tries`), jamais d'échec immédiat ; jamais de seconde commande (seulement sans commande en cours). Les services payants gardent la relance à la main.
  - Test : `relais-gratuits-test.js` (faux Gemini épuisé, faux Groq, faux OpenRouter).

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

**Menu simplifié (11 octobre)** : beaucoup de pages se ressemblaient, et l'utilisateur a demandé une version plus simple.
- Le menu compte 5 entrées (`GROUPS`) et Réglages. La barre du bas du téléphone montre les 5 entrées ; Réglages s'ouvre par ☰.
  - **Créer** : `constructeur` (✨ Constructeur, ouvert par défaut), `assistant` (en 3 questions), `studio`, `audio`, `reel`, `presse:motion` (Motion design, avec le dernier type de vidéo choisi, `motionCreer`).
  - **Idées** : `idees`, `tendances`, `presse:succes` (Succès YouTube).
  - **Mes projets** : `projets`, `persos`, `images`, `agence`.
  - **Ma chaîne** : `niches`, `pays`, `chaine`, `memoire`.
  - **Réglages** : `connexions`.
- Les pages d'un même groupe sont des onglets en haut de la page (`syncGroupNav`, `.grp-tabs`, 2 par ligne sur téléphone). Chaque entrée rouvre son dernier onglet (`sp-prefs.grp`).
- `qualite` (réparer une image) et `son` restent des sous-pages d'Images et de Projets (`SUBVIEW_OF`).
- **Aucune page n'est supprimée.** Les adresses `#studio`, `#presse`, `#niches`, `#strategie`… marchent toujours, et `#experts` mène à l'accueil.
- **Créer en 3 questions** (`view-assistant`, `asRender`, `asGo`), premier raccourci de l'accueil :
  1. Le type de vidéo : film IA, infos du jour, quiz, cours, publicité, animation.
  2. Le point de départ : idée, audio, vidéo ou lien YouTube, actualité d'un pays, textes, thème, quiz au hasard sans IA, sujet, document PDF ou texte, commerce.
  3. Le format (téléphone, PC, ou les deux pour infos, quiz et pub) et la durée (courte, moyenne, longue, convertie pour chaque outil par `AS_DUREES`).
  - L'assistant ouvre l'outil existant (`setView("presse:quiz")`…), remplit ses champs et clique sur son bouton de lancement : aucun moteur en double.
  - Les fichiers passent par `DataTransfer`, et un PDF de cours par `/api/pdf/text`.
  - Ensuite, « Créer » revient à l'assistant. Les réponses sont gardées dans `sp-prefs.assistant`. Il y a toujours un chemin sans quota : quiz au hasard, pub sans IA.
- **Mes projets montre tout** (étape 3) :
  - Les quiz, infos, pubs, cours et animations s'enregistrent automatiquement à côté des films (`kind:"creation"`, `type`, `state`, par `creationSave`). Ils sont exclus de `savedProjects`.
  - Chaque onglet garde son propre état (`sp-jeux`, `sp-presse`, `sp-pub`, `MD_RESULT`) : la copie enregistrée est ce même état. Une clé stable par création (`sp-prefs.crea`) évite les doublons, et l'écriture est regroupée (1,2 s).
  - « Mes vidéos » mélange films et créations, de la plus récente à la plus ancienne, avec leur type (🎬 Film IA, 🧠 Quiz, 📰 Infos du jour, 📣 Publicité, 🎓 Cours, 🎨 Animation). « Ouvrir » (`creationOpen`) rouvre la création dans son onglet ; un cours retrouve son habillage. Les images préparées pour la vidéo ne sont pas gardées : il faut les refaire.
  - Les idées : Idées originales, Tendances du jour et Vidéos à succès sont réunies dans l'entrée « Idées » (étape 1).
- **Design façon Gemini / ChatGPT (12 octobre)** : demande de l'utilisateur, capture de Gemini à l'appui (« faire les design comme ce genre d'abord »).
  - **Première visite** : on arrive sur le Constructeur (`prefs0.view||"constructeur"`), puis sur la dernière page ouverte. Les adresses avec `#` ne changent pas.
  - **Menu** : clair en thème clair (variables `--side*`, dont `--side-line`, `--side-strong`, `--side-chip`, `--side-well`), sombre inchangé en thème sombre. Entrées en pastilles arrondies.
    - En haut, **« Nouvelle vidéo »** (`#side-new`, `.side-new`, pas une `.side-link`) : ouvre le Constructeur ; si on y est déjà, repart de zéro (texte, fichiers, plan), sauf pendant que l'agent écrit.
    - En bas, **« Récentes »** (`#side-recent`, `renderRecent`, appelée par `renderLists`) : les 8 dernières vidéos (films et créations), rouvertes d'un clic par les mêmes boutons `data-open` / `data-opencr` que Mes projets. Elle défile seule : le menu reste visible sans défiler sur un écran de 650 px.
  - **Constructeur** : un bonjour centré (« Salut, on crée quelle vidéo ? »), une seule barre arrondie `#cb-pill` (texte qui grandit, « + » pour joindre, réglages repliés `#cb-opt` / `#cb-tools` avec leur résumé, micro, bouton envoyer `#cb-go`), 5 idées en pastilles (`CB_SUGG`, textes génériques avec des [cases à compléter]), une lueur douce. Les identifiants des champs n'ont pas changé.
    - Entrée envoie sur ordinateur (Maj + Entrée : nouvelle ligne) ; sur téléphone, Entrée va à la ligne.
    - Glisser des fichiers sur la barre les joint (`cbAdd`). Le champ fichier n'est pas transformé en zone de dépôt (`data-fdrop="0"`).
    - Micro : dictée du navigateur (`SpeechRecognition`), bouton caché si le navigateur ne la connaît pas ; en cas d'échec, un message invite à écrire.
    - Sur téléphone, les onglets de « Créer » tiennent sur une ligne qui défile. La lueur reste dans la largeur de la page (sinon la page s'élargit et la barre du bas sort de l'écran).

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
| `ui-test.js`, `menu-test.js` | Vues, menu simplifié (5 entrées + Réglages, onglets des groupes, dernier onglet retenu, anciennes adresses), mobile, mode sombre, console sans erreur |
| `presse-test.js` | Revue de presse avec un vrai `server.js` face à de faux Google Actualités, Google voix et site d'actualité : infos cochées, règles de vérité, voix d'or, audio complet, textes et liens, reprise, vidéo |
| `gen-api-test.js` | `generation.js` face à de faux Google, Runway et ElevenLabs : clé gratuite pour les voix, clé payante pour Veo, budget, facturation absente, voix une à la fois, limites par minute et par jour, imports, Range, sécurité des chemins, reprise |
| `fab-ui-test.js` | Interface de fabrication avec un vrai `server.js` (`GEN_DIR` séparé) : voix par personnage, essai, voix d'un plan ou de tout le projet, imports groupés d'images et de clips, pré-montage, page Connexions |
| `video-analyze-test.js` | Vrai `server.js` face à un faux Google : envoi reprenable, état ACTIVE, images/s, mode agentic en flux, schéma, suppression, quota, format refusé |
| `remake-test.js` | Page « Depuis une vidéo » : vraie petite vidéo, rapport, transcription, découpage, reconstruction, quota épuisé |
| `presse-unes-test.js` | Unes du jour face à une fausse page : recherche web, images en hauteur gardées, lecture des unes, une ancienne écartée, import de photos, nom corrigé à la main, titres dans la matière, vraie une avant les images et dans la vidéo |
| `manus-clips-test.js` | Clips par Manus face à un faux Manus : prompts H3 et Seedance dans chaque plan (format officiel, paroles balisées, caméra), images de départ jointes, clips rapatriés dans leur plan, crédits épuisés → méthode gratuite |
| `youtube-learn-test.js` | Étude de liens YouTube face à un faux YouTube et un faux Gemini : lien lu en entier, quota épuisé → images de la vidéo, leçons fusionnées et gardées en mémoire, idée originale avec le format gagnant, reconstruction réinventée, bloc « ce qui marche » |
| `presse-studio-test.js` | Revue « Grand écran » face à un faux Google Actualités et de faux sites : liens décodés, image og:image et image du titre, crédits, voix renforcée, vidéo 1280 × 720 avec décor, bandeau rouge et vraies images à l'écran, diaporama toujours disponible |
| `agence-test.js` | Agence : menu, nom de l'agence, fiche client (logo rangé), suivi (devis, montant, notes), flyer A5 à 1748 × 2480 (photo, bouton WhatsApp), PDF A5 valide, JPEG et PNG, visuel carré par l'agent (rien d'inventé), passage vers la pub vidéo, téléphone, reprise |
| `pub-test.js` | Publicités : onglet, infos du commerçant, photo et logo enregistrés (réduits), textes sans IA puis par l'agent (règles : rien d'inventé), aperçu des trois formats, vidéo 9:16 avec voix off (5 phrases, prix dit), photo, prix doré, bouton WhatsApp, affiche sur le lecteur, affiches 1080 × 1920 et 1080 × 1080, marques (Wanteermako d'office, marque gardée), site web avec QR code, téléchargements, téléphone, reprise |
| `jeux-test.js` | (avec voix lue, questions trouvées sur le web et quatre modèles) Jeux « 5 secondes » : accès (menu, accueil), niveaux sans IA (réponses calculées, suites justes), niveaux de l'agent (thème et règles dans la demande, suite fausse corrigée par le code, « à vérifier »), aperçu 9:16, vidéo 9:16 de la durée prévue (compte à rebours, réponse en vert), téléchargement, publication (heures d'un jeu, hashtags), téléphone, reprise |
| `succes-test.js` | Succès YouTube face à un faux YouTube (API, oEmbed, page) et un faux Gemini : recherche triée par vues (Shorts, période, langue, contenu familial), Sans IA (même jeu reconnu au titre), agent (vidéo, commentaires les plus aimés, vidéo regardée, rien copié, nouvel angle), niveaux contrôlés par le code, envoi dans le Quiz (modèle et décor), voix dirigée (Puck, animateur de jeu télé), ombre, différence et comptage dessinés, affiche, quota épuisé → agent sur Google avec liens vérifiés, liens collés, étude en détail, reprise, téléphone |
| `agnes-test.js` | Agnes AI face à un faux Agnes : état du serveur (gratuit, clé cachée), Connexions, Storyboard par Agnes d'abord (format, 1K, photo du personnage en data URI, attente après un 429), clips plan par plan (720P, durée du plan, image de départ, image refusée → texte seul, un à la fois), rangés dans leur plan, téléphone |
| `presse-plateau-test.js` | Plateau 3D et format 9:16 : réglages par défaut, aperçu dans les deux formats (avant la voix), repli sur le studio 2D, vidéo « Les deux » (1280 × 720 puis 720 × 1280, bandeau, images des articles sur le mur LED), kit de publication (6 réseaux, heures du pays, analyse du pays, leçon des statistiques, textes, fichier par réseau, rappel, .txt), miniatures, chapitres YouTube, téléphone |
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
| `cours-ultra-test.js` | Cours du jour (sans navigateur) : compositions, normaliseur face à de mauvais JSON, format carré 1080 × 1080, liens des sources validés |
| `course-ffmpeg-test.js` | Finition FFmpeg réelle : MP4 H.264 yuv420p, AAC 48 kHz, SRT servi, capture temporaire supprimée, repli navigateur |
| `professional-tabs-test.js` | Structure accessible des 6 onglets de Motion design (`node:test`) |
| `cours-habillage-test.js` | Cours du jour : 9 habillages lisibles et distincts, choix (main, mise en scène, agent, matière, niveau), 13 mises en page dessinées en 9:16 et 16:9 sur un faux canvas, normalisation des items, consignes, aperçu, aucun mot technique à l'écran |
| `cours-video-test.js` | Cours du jour de bout en bout (IA simulée) : consigne avec les habillages, mise en scène « tableau » → tableau à craie, aperçu de trois diapos, changement d'habillage à la main, vraie vidéo 1080 × 1920 de 30 s avec FFmpeg qui suit ce choix, téléphone sans défilement |
| `assistant-test.js` | Créer en 3 questions : raccourci de l'accueil, 6 types, quiz au hasard sans IA (4 niveaux, format « les deux »), retour à l'assistant, réponse manquante, cours rempli et lancé, film depuis un lien YouTube, choix gardés, téléphone, console ; Mes projets : quiz et cours listés avec les films, rouverts dans leur onglet, sans doublon |
| `sample-garde-test.js` | Délais de sécurité des agents face à un faux Google : modèle muet ou qui ne commence jamais (timeout clair), réponse qui tourne en rond (coupée, code loop), serveur toujours disponible ensuite |
| `cours-relais-test.js` | Cours Ultra sans impasse : temps affiché, « Passer cette étape » pour le documentaliste, commission en boucle reprise par le modèle rapide, cours livré avec un avertissement |
| `relais-gratuits-test.js` | Quota Gemini épuisé : Groq répond (modèle gratuit, JSON, images vers un modèle qui voit), puis OpenRouter (« :free » seulement), une clé Groq seule suffit, état sans les clés |
| `montage-test.js` | Moteur de montage : 3 plans repérés (couleurs de même lumière), coupes exactes, étiquettes (mouvement, son), plans envoyés à l'agent, éditeur plan, début, fin, vitesse, recadrage vertical qui suit l'action, montage sans IA, console |
| `effets-test.js` | Bibliothèque d'effets : 9 catégories (dont éléments animés et ambiances) de 50 modèles au moins, chacun dessiné sans erreur, images différentes, anciens noms compris, console |
| `constructeur-test.js` | Constructeur : arrivée façon Gemini (bonjour, une barre, idées, pas de débordement, barre du bas visible), idée en pastille, accueil, page, fichiers joints (2 photos, 1 clip FFmpeg), demande + marque + images vues par l'agent, plan libre de 6 scènes, vidéo Full HD 15 s dessinée avec les fichiers, modèle à imiter jamais monté, Sans IA, sous-titres (karaoké par défaut, retirés par « Sans sous-titres »), genre choisi d'abord, « Autre proposition » sans toucher au texte, quiz (compte à rebours, question, habillage arcade, produit sans photo devenu illustration), changement d'habillage, Mes projets, éditeur de scènes (image ajoutée → diaporama, collage, durée, ajout, ordre, suppression, aperçu animé), « Récentes », « Nouvelle vidéo » qui repart de zéro, réouverture depuis Récentes, console |
| `motion-libre-test.js` | Projet libre : IA simulée, vraie vidéo fabriquée image par image en 1080 × 1920, finition FFmpeg (H.264, −14 LUFS), scènes visibles, console sans erreur |

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
16. images du Storyboard, analyse des paroles, mode secours, **analyse complète des vidéos** (commencées par un autre assistant, terminées et testées) ;
17. page **Motion design** : revue de presse en plateau 3D, quiz « 5 secondes », publicités, agence, puis **Succès YouTube**, voix de premier niveau et couche cinéma (6 au 8 octobre) ;
18. ajouts de l'autre outil (Cours du jour, montage de pub, quiz premium, mémoire PDF, sauvegarde Supabase), puis réparation des 14 régressions (11 octobre, §4.3 octies) ;
19. export professionnel Full HD de toutes les vidéos de Motion design, téléphone d'abord (11 octobre, §4.3 nonies) ;
20. Cours du jour : un habillage propre à chaque cours et une mise en page adaptée à chaque diapo (11 octobre, §4.3 decies) ;
21. menu simplifié : 5 entrées, les pages proches en onglets (11 octobre, §7) ; puis « Créer en 3 questions » et « Mes projets » qui montre tout (§7) ;
22. le Constructeur : une demande + des fichiers → n'importe quelle vidéo, priorité à la vente (12 octobre, §4.3 duodecies).
23. design façon Gemini / ChatGPT : menu clair, « Nouvelle vidéo », « Récentes », Constructeur en une seule barre centrée (12 octobre, §7) ;
24. Constructeur : le genre d'abord, 10 habillages, 18 mises en page (quiz, liste, dialogue…), photos libres, jamais de case vide (12 octobre, §4.3 duodecies).
25. sous-titres mot par mot synchronisés avec la voix, puis bibliothèque de 421 effets (`studio-fx.js`) et Studio d'effets (13 octobre, §4.3 duodecies).
26. éléments animés, ambiances et éditeur de scènes : mise en page, images et leur nombre, cadrage, durée, ordre, aperçu animé (13 octobre, §4.3 duodecies).
27. moteur de montage des vidéos jointes : plans repérés, meilleurs moments, début, fin, vitesse, recadrage qui suit l'action (13 octobre, §4.3 duodecies).
28. agents gratuits de secours Groq et OpenRouter quand Gemini est épuisé (13 octobre, §4.3 duodecies).

## 11. Chantiers ouverts (proposés, pas encore faits)

**Prochains chantiers** (formats Full HD faits le 11 octobre, §4.3 nonies) :
- Fait le 11 octobre : Cours du jour, des diapos adaptées à chaque cours (§4.3 decies).
- Ensuite, un « mode simple » en 3 étapes : type de vidéo, 3 questions, puis l'onglet rempli avec le vrai agent. L'idée vient d'une maquette faite dans une autre conversation.

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
