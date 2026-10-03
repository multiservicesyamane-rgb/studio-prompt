# Analyse de tes vidéos de référence

**52 vidéos analysées** :
- 10 liens du premier lot (5 YouTube, 5 TikTok) ;
- 22 liens TikTok du deuxième lot (1 n'a pas pu s'ouvrir : erreur du lecteur TikTok) ;
- 20 vidéos déposées dans `videos/` (3 doublons retirés).

Les captures sont dans `images/`. Les détails sont dans `captures.json` (liens) et `captures-videos.json` (fichiers).

> Les vidéos envoyées par WhatsApp sont réduites en 360 × 640. Pour juger la netteté, les liens TikTok et YouTube sont meilleurs (576 × 1024 à 1440 × 2560).

## Les 5 familles, et comment les reproduire dans l'application

| | Famille | Exemples | Réglages dans le Studio |
|---|---|---|---|
| A | **Cuisine 3D « cosy »** : personnage façon film d'animation, nourriture photoréaliste en très gros plan, sons ASMR, dégustation à la fin | @receitas.iaoficial, @cozinha_ia | Type « Recette de cuisine », style « Personnage 3D, décor réel » (choisi automatiquement) |
| B | **Drames de fruits et légumes personnages** : têtes de fruit très détaillées, décors photoréalistes, histoire morale, larmes en gros plan | YouTube 1-3, @voixintime1 | Type « Histoire », style « Fruits et légumes personnages » |
| C | **Séries africaines photoréalistes IA** : villas, écoles, hôpitaux, riche et pauvre, belle-mère, réussite, épisodes « Partie 4 » | @amadoukonemousa, @mao123991, @ykm_creative | Type « Histoire », style « Série africaine (cinéma) », mode « Photos de référence → vidéo » |
| D | **Contes moraux en 3D** : familles africaines, histoires islamiques, marché et commissariat, sous-titres en grandes lettres | @princessyaon, @islamfr.ia, @kingpro2536, @astucesxxx | Type « Histoire », style « Animation 3D (conte, film d'animation) » |
| E | **Vraies séries tournées à Dakar** : le niveau « comme réel » à viser | @macdi_cc | Leur rendu caméra est la base du style « Série africaine (cinéma) » |

## Ce qui fait la qualité de ces vidéos
1. **Netteté :** l'œil et le visage sont nets, sans bruit, avec des textures fines (peau, tissus, nourriture, peau des fruits).
2. **Rendu caméra de cinéma (famille E) :** objectif 50 mm très ouvert, arrière-plan très flou, lumière douce sur les visages, lampes chaudes et touches de LED colorées derrière.
3. **Peaux noires riches et bien éclairées**, jamais grises ni plastiques.
4. **Mise en scène :** gros plans sur les réactions, champ-contrechamp pour les dialogues, un plan large pour situer chaque lieu.
5. **Personnages identiques dans tous les plans :** utilise le mode « Photos de référence → vidéo » (Veo 3.1).
6. **Histoires :** riche et pauvre, injustice puis retournement, morale claire, suspense à la fin de chaque épisode.
7. **Texte et sous-titres ajoutés au montage** (CapCut, sous-titres automatiques), jamais dans la vidéo générée.
8. **Export :** génère en 1080p dans Flow, ou améliore la qualité (upscale) avant d'exporter en 1080 × 1920.

## Rythme de montage des vraies séries (mesuré)
Mesure faite image par image (4 images par seconde, coupes détectées automatiquement et vérifiées à l'œil) sur 7 vidéos de @macdi_cc, soit 116 plans. Détails dans `rythme-macdi.json`.

| Mesure | Valeur |
|---|---|
| Durée moyenne d'un plan | **2,7 s** |
| Durée médiane | **1,8 s** |
| Plans de moins de 3 s | **73 %** |
| Plans de plus de 6 s (émotion, monologue) | 12 % |

Grammaire observée : plan large pour situer, puis plans rapprochés en alternance (celui qui parle, la réaction de l'autre), puis retour au plan à deux.

**Dans l'application :** en style « Série africaine (cinéma) », chaque clip Veo de 8 s contient une séquence montée de 3 prises de vue (0-3 s, 3-6 s, 6-8 s) avec de vraies coupes, selon la technique officielle des prompts minutés de Veo 3.1. Environ 1 plan sur 8 reste une prise continue, pour les moments forts.

## À ne pas copier
Les marques, les logos et les placements de produits visibles dans certaines vidéos. Les agents créent toujours des personnages et des histoires originaux.
