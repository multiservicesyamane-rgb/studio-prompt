# WAN 3.0 --- Guide pour l'agent

Sources étudiées : documentation officielle Alibaba Cloud Model Studio.

## Formule de base

`Entity + Scene + Motion`

## Image-to-Video

L'image définit largement entité, scène et style. Prioriser :
`Motion + Camera movement`

## Structure Wan 3.0

`Overall description` `Shot 1 [0-3s]: ...` `Shot 2 [3-6s]: ...`
`Dialogue: ...` `Sound effects / BGM: ...` `Style / Mood: ...`
`Negative prompt: ...`

Wan 3.0 accepte des descriptions multi-shot avec timestamps continus.

## Références

Selon le mode, Wan 3.0 peut exploiter première frame, première/dernière
frame, références sujet, mouvement, style, audio, keyframes,
storyboard/multi-grid, fichiers et liens publics.

Les références peuvent être désignées comme `Image 1`, `Video 1`, etc.

## Son

Le prompt peut décrire paroles, émotion/timbre/vitesse de voix, effets
sonores, ambiance et musique. Des instructions explicites telles que
`No dialogue` ou `No background music` peuvent supprimer ces éléments
dans les modes concernés.

## Architecture

`CONCEPT → STORY BEAT → TIMING → ACTION → REACTION → CAMERA → SOUND → STYLE → NEGATIVE`
