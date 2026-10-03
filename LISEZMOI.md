# Studio Prompt sur ton ordinateur

Sur claude.ai, l'application utilise Claude directement. Sur ton ordinateur, c'est un petit serveur (`server.js`) qui appelle **Gemini** (ou Claude) avec **ta clé API**. La clé reste dans le fichier `.env` : elle n'est jamais mise dans la page web.

## 1. Installer (une seule fois)
1. Installe **Node.js** (version 18 ou plus récente) : https://nodejs.org (bouton « LTS »).
2. Décompresse ce dossier, par exemple dans `Documents/studio-prompt`.
3. Crée ta clé Gemini gratuite : https://aistudio.google.com/apikey
4. Dans le dossier, copie `.env.example` et renomme la copie en `.env`. Ouvre `.env` et colle ta clé après `GEMINI_API_KEY=`.

## 2. Lancer
Le plus simple : **double-clique sur « Lancer Studio Prompt.bat »** dans le dossier. L'application s'ouvre dans ton navigateur ; garde la fenêtre noire ouverte tant que tu l'utilises.

Ou, dans un terminal ouvert dans le dossier :

```
npm start
```

Puis ouvre **http://localhost:3000** dans ton navigateur.

## 3. Continuer avec Antigravity
1. Ouvre Antigravity, puis **File › Open Folder** et choisis le dossier `studio-prompt`.
2. Ouvre le fichier `ANTIGRAVITY.md` : copie le texte du bloc « Prompt de départ » et colle-le dans une nouvelle tâche de l'agent (**Agent Manager › New Task**).
3. Ensuite, demande tes changements un par un, en français. Exemple : « Ajoute un bouton pour exporter tous les prompts d'un projet en PDF ».

## Organisation des fichiers
| Fichier | Rôle |
|---|---|
| `public/index.html` | Toute l'application (interface + agents + règles de prompt) |
| `public/claude-shim.js` | Adaptateur : recrée `window.claude` (sample, db, user, downloads) sur ton ordinateur |
| `server.js` | Serveur local : sert la page et appelle Gemini ou Claude |
| `.env` | Tes clés (ne jamais partager, ne jamais mettre sur GitHub) |

## À savoir
- Tes projets sont enregistrés dans le navigateur (localStorage, environ 5 Mo). Ils ne passent pas d'un navigateur ou d'un ordinateur à l'autre.
- Gemini gratuit a des limites de requêtes par minute et par jour : si un message « Trop de demandes » apparaît, attends une minute.
- Les très longues vidéos (Vidéo réelle, Audio → vidéo) font plusieurs appels : c'est normal que ce soit plus long.
