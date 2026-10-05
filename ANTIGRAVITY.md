# Continuer Studio Prompt avec l'agent d'Antigravity

## Prompt de départ (à coller dans une nouvelle tâche)

```
Tu reprends le projet « Studio Prompt » ouvert dans ce dossier. Lis d'abord references/CERVEAU_STUDIO_PROMPT.md (le cerveau du projet : architecture, pipeline, règles V1 à V4 à préserver), puis LISEZMOI.md, server.js, public/claude-shim.js, et parcours public/index.html.

CE QUE C'EST
Une application web en français pour un créateur de vidéos au Sénégal. Onze agents IA produisent des prompts professionnels pour créer des vidéos virales : Idées, Studio (Agent maître : plans, prompts image → vidéo et texte → vidéo pour Veo et Wan), Images (Nano Banana, ChatGPT Images, Midjourney, Flux, Ideogram), Audio → vidéo (analyse d'un audio dans le navigateur et découpage au dixième de seconde), Vidéo réelle (lecture d'une vidéo, détection des scènes, remake IA), Niches, Pays et monétisation, Personnages, Contrôle qualité, Son et sous-titres, Chaîne YouTube.

ARCHITECTURE À RESPECTER
- public/index.html contient toute l'interface et toute la logique, dans une seule fonction (IIFE). Les agents appellent l'IA uniquement via window.claude.use("sample") puis sample.json(prompt, {signal, onText, images, modelTier, cache}).
- public/claude-shim.js recrée window.claude localement : sample → POST /api/sample (flux NDJSON), db → localStorage avec l'interface collection(path).doc(id).set/delete et orderBy().limit().onSnapshot(), user.id() → "local", downloads.save({filename, data}). Ne change pas cette interface : si tu changes le stockage ou le moteur, change l'adaptateur, pas les appels dans index.html.
- server.js (Node 18, sans dépendance) appelle Gemini (choix automatique du modèle le plus récent) ou Claude ; les clés restent dans .env. Ne mets JAMAIS une clé API dans le code du navigateur.
- Les prompts envoyés aux générateurs sont assemblés par l'application (fonctions keyframePrompt, i2vPrompt, t2vPrompt, speechLine, motionLine, STYLES, BASE_AVOID) à partir des champs JSON renvoyés par l'Agent maître (agentPrompt, normalize). Le contrôle technique de chaque plan est dans lintPlan.

RÈGLES
- Toute l'interface reste en français simple, responsive (téléphone d'abord), sans débordement horizontal.
- Ne supprime aucune fonction existante. Garde les règles éthiques des agents : pas de personnes réelles ni de célébrités, pas de contenu protégé, pas de faux témoignages, pas de conseil de faux pays avec un VPN.
- Après chaque changement : lance « npm start », ouvre http://localhost:3000 dans le navigateur intégré, teste la vue modifiée sur une largeur de téléphone (390 px) et sur ordinateur, et vérifie la console (aucune erreur).
- Fais des changements petits et vérifiés, un à la fois, et explique-moi en français ce que tu as changé.

Pour commencer : lance l'application, vérifie que chaque vue s'ouvre sans erreur, puis attends ma première demande.
```

## Idées de prochaines améliorations à demander à l'agent
1. Remplacer localStorage par IndexedDB dans `claude-shim.js` (plus de place pour les projets).
2. Ajouter un export PDF ou Word d'un projet complet.
3. Ajouter une connexion avec un compte (Firebase Authentication) et un stockage en ligne (Firestore) pour retrouver tes projets sur ton téléphone.
4. Mettre l'application en ligne (Firebase Hosting ou Cloud Run), avec le serveur pour garder la clé secrète.
5. Ajouter la génération directe d'images avec l'API Gemini (Nano Banana) depuis le serveur, pour voir les images dans l'application.
