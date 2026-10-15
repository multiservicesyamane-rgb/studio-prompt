/* Studio Prompt · Leçons animées : 3 modèles cinématiques pour n'importe quelle leçon, en français, en arabe et en anglais (14 octobre).
   Demande de l'utilisateur : « crée trois modèles pour n'importe quelle leçon, français, arabe et anglais, des modèles animés, dynamiques,
   sublimes, ultra cinématiques », plus professionnels que ses vidéos de référence (chansons d'alphabet, lettres arabes au doigt, Al-Fatiha
   surlignée, cahier de voyelles, classe en 3D). Grammaire apprise de ces vidéos : UNE unité à la fois et en très grand ; son nom ; un exemple
   concret avec une image ; « répète après moi » puis un temps pour l'enfant ; un petit quiz ; la révision en grille ; bravo.
   - Grand Théâtre (français par défaut) : rideaux de velours, projecteurs, lettres en relief qui tombent sur scène, confettis, public.
   - Daara de lumière (arabe par défaut) : cour aux arcades au coucher du soleil, lanternes, le jeune oustaz et ses talibés (avatar 3D),
     la leçon s'écrit au calame sur la tablette (alluwa), voyelles en couleur (fatha rouge, kasra bleue, damma verte, soukoun orange).
   - Grande Aventure (anglais par défaut) : paysage de cinéma qui passe de l'aube à la nuit, parallaxe, lettres géantes qui volent,
     bulles, panneau en bois, constellation de révision, feu d'artifice.
   Chaque modèle marche dans les trois langues et les trois formats (16:9, 9:16, 1:1). Tout est dessiné par le code (aucune image d'IA,
   aucun droit d'auteur) ; illustrations Twemoji (licence CC BY 4.0) ou emoji du système hors ligne. Mesures en 720p, image K fois plus grande. */
(function(){
"use strict";
const cl=(v,a,b)=>Math.max(a==null?0:a,Math.min(b==null?1:b,v)), sm=v=>{ v=cl(v); return v*v*(3-2*v); }, eo=v=>1-Math.pow(1-cl(v),3);
const eb=v=>{ v=cl(v); const c1=1.9, c3=c1+1; return 1+c3*Math.pow(v-1,3)+c1*Math.pow(v-1,2); };   /* dépasse un peu, puis se pose */
const ebo=v=>{ v=cl(v); const n=7.5625, d=2.75; if(v<1/d) return n*v*v; if(v<2/d){ v-=1.5/d; return n*v*v+.75; } if(v<2.5/d){ v-=2.25/d; return n*v*v+.9375; } v-=2.625/d; return n*v*v+.984375; };   /* rebond */
const rnd=i=>{ const x=Math.sin(i*127.1+311.7)*43758.5453; return x-Math.floor(x); };
const lerp=(a,b,f)=>a+(b-a)*f, isAr=t=>/[؀-ۿ]/.test(String(t||""));
const hex=(h,a)=>{ const n=parseInt(String(h).slice(1),16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a==null?1:a})`; };
const mix=(h1,h2,f)=>{ const a=parseInt(h1.slice(1),16), b=parseInt(h2.slice(1),16), c=s=>Math.round(lerp(a>>s&255,b>>s&255,f)); return `rgb(${c(16)},${c(8)},${c(0)})`; };
const F={title:'"Cinzel","Cormorant Garamond",Georgia,serif', kid:'"Baloo 2","Hanken Grotesk","Segoe UI",sans-serif', kidAr:'"Baloo Bhaijaan 2","Noto Kufi Arabic","Segoe UI",sans-serif', ink:'"Scheherazade New","Amiri","Traditional Arabic",serif', emoji:'"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'};
const fontOf=(txt,w,px,kind)=>`${w} ${Math.round(px)}px ${isAr(txt)?(kind==="ink"?F.ink:F.kidAr):kind==="title"?F.title:F.kid}`;

/* ---------- langues : ce que dit et écrit la leçon quand l'agent ne l'a pas écrit ---------- */
const LANGS={
  fr:{nom:"Français", drapeau:"🇫🇷", dir:"ltr", repete:"Répète après moi !", toi:"À toi !", quiz:"Qu’est-ce que c’est ?", revise:"On révise !", bravo:"Bravo !", lecon:"Leçon",
    voici:(n,m)=>m?`Voici ${n}. ${n}, comme ${m} !`:`Voici ${n} !`, rep:n=>`Répète après moi : ${n} !`, intro:t=>`Bonjour les enfants ! Aujourd’hui, on apprend : ${t}. C’est parti !`, fin:t=>`Bravo ! Tu as appris : ${t}. À très bientôt !`, recap:"On révise tout ensemble !",
    pause:"Mets pause !", etapes:{question:"La question", decouverte:"On découvre", demo:"On apprend", defi:"À toi de jouer !", reponse:"La réponse", retenir:"À retenir", exercice:"Petit exercice"}},
  en:{nom:"English", drapeau:"🇬🇧", dir:"ltr", repete:"Say it with me!", toi:"Your turn!", quiz:"What is it?", revise:"Let’s review!", bravo:"Well done!", lecon:"Lesson",
    voici:(n,m)=>m?`This is ${n}. ${n}, as in ${m}!`:`This is ${n}!`, rep:n=>`Say it with me: ${n}!`, intro:t=>`Hello kids! Today we are learning: ${t}. Let’s go!`, fin:t=>`Well done! You learned: ${t}. See you soon!`, recap:"Let’s review together!",
    pause:"Pause and think!", etapes:{question:"The question", decouverte:"Let’s discover", demo:"Let’s learn", defi:"Your turn!", reponse:"The answer", retenir:"Remember", exercice:"Practice"}},
  ar:{nom:"العربية", drapeau:"🌙", dir:"rtl", repete:"كَرِّرْ بَعْدِي!", toi:"دَوْرُكَ!", quiz:"مَا هَذَا؟", revise:"لِنُرَاجِعْ!", bravo:"أَحْسَنْتَ!", lecon:"دَرْسٌ",
    voici:(n,m)=>m?`هَذَا ${n}. ${n}، مِثْلُ ${m}!`:`هَذَا ${n}!`, rep:n=>`كَرِّرْ بَعْدِي: ${n}!`, intro:t=>`مَرْحَبًا يَا أَطْفَالُ! اليَوْمَ نَتَعَلَّمُ: ${t}. هَيَّا بِنَا!`, fin:t=>`أَحْسَنْتُمْ! تَعَلَّمْتُمْ: ${t}. إِلَى اللِّقَاءِ!`, recap:"لِنُرَاجِعْ مَعًا!",
    pause:"تَوَقَّفْ وَفَكِّرْ!", etapes:{question:"السُّؤَالُ", decouverte:"نَكْتَشِفُ", demo:"نَتَعَلَّمُ", defi:"دَوْرُكَ!", reponse:"الجَوَابُ", retenir:"تَذَكَّرْ", exercice:"تَمْرِينٌ"}}};
const MODELS={
  theatre:{nom:"Grand Théâtre", lang:"fr", desc:"Rideaux de velours, projecteurs, lettres en relief qui tombent sur scène, confettis et public.", chorus:true},
  daara:{nom:"Daara de lumière", lang:"ar", desc:"Le jeune oustaz et ses talibés en 3D ; la leçon s’écrit au calame sur la tablette, voyelles en couleur.", chorus:true},
  aventure:{nom:"Grande Aventure", lang:"en", desc:"Paysage de cinéma de l’aube à la nuit, lettres géantes qui volent, bulles, feu d’artifice.", chorus:false},
  capsule:{nom:"Capsule pédagogique", lang:"fr", desc:"Une question, la découverte, la démonstration au tableau, un défi avec pause, la réponse, la phrase à retenir et un exercice ; l’enseignant et ses élèves en 3D.", chorus:false}};
const MODEL_OF={fr:"theatre", ar:"daara", en:"aventure"};

/* ---------- leçon nettoyée : au plus 40 éléments, une image (un emoji) par élément, 0 à 3 répétitions ---------- */
const str=(v,n)=>String(v==null?"":v).replace(/\s+/g," ").trim().slice(0,n);
const emoji1=e=>{ const m=String(e||"").match(/\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*/u); return m?m[0]:""; };
function norm(L){ L=L||{}; const langue=LANGS[L.langue]?L.langue:"fr", modele=MODELS[L.modele]?L.modele:MODEL_OF[langue];
  const items=(Array.isArray(L.items)?L.items:[]).slice(0,40).map(x=>{ x=x||{}; const r=parseInt(x.repete,10);
    return {cle:str(x.cle,24), nom:str(x.nom,40), mot:str(x.mot,40), image:emoji1(x.image), sens:str(x.sens,80), phon:str(x.phon,40), texte:str(x.texte,260), voix:str(x.voix,320), repete:isFinite(r)?cl(r,0,3):1}; }).filter(x=>x.cle||x.texte);
  /* capsule : les étapes ; ses unités (sons, lettres) servent aussi à la chanson et à la révision */
  const capsule=modele==="capsule"?capNorm(L.capsule):null; if(capsule&&!items.length) items.push(...capItems(capsule));
  return {titre:str(L.titre,80)||LANGS[langue].lecon, sous_titre:str(L.sous_titre,90), langue, modele, capsule, intro:str(L.intro,320), fin:str(L.fin,320), quiz:!capsule&&L.quiz!==false&&items.length>=3,
    chorus:L.chorus==null?MODELS[modele].chorus:!!L.chorus, personnage:L.personnage!==false, avatar:str(L.avatar,40), sous_titres:L.sous_titres!==false, items, chanson:songNorm(L.chanson), effets:{transition:str((L.effets||{}).transition,40)||"auto", look:str((L.effets||{}).look,40)||"naturel", ambiance:str((L.effets||{}).ambiance,40)||"aucune"}, methode:(Array.isArray(L.methode)?L.methode:[]).slice(0,8).map(x=>str(x,160)).filter(Boolean), angle:str(L.angle,120), muet:Array.isArray(L.muet)?L.muet.filter(k=>typeof k==="string"):[]}; }

/* ---------- la chanson de la leçon (14 octobre) : paroles, style, voix, place dans la vidéo, et la chanson fabriquée (adresse + temps des lignes) ---------- */
const SONG_STYLES={comptine:"Comptine joyeuse", nasheed:"Nasheed (voix et daf, sans instrument)", berceuse:"Berceuse douce", pop:"Pop pour enfants"};
function songNorm(c){ c=c||{}; const au=c.audio&&c.audio.url?{url:String(c.audio.url), par:["ace","eleven"].includes(c.audio.par)?c.audio.par:"app", model:str(c.audio.model,80), seconds:+c.audio.seconds||0, sig:str(c.audio.sig,40),
    lines:(Array.isArray(c.audio.lines)?c.audio.lines:[]).slice(0,200).map(l=>({a:+l.a||0, b:+l.b||0, text:str(l.text,160), chorus:!!l.chorus})).filter(l=>l.text&&l.b>l.a)}:null;
  return {paroles:String(c.paroles||"").slice(0,4000), style:SONG_STYLES[c.style]?c.style:"comptine", voix:["enfants","femme","homme"].includes(c.voix)?c.voix:"enfants", place:["fin","seule","aucune"].includes(c.place)?c.place:"fin", audio:au}; }
/* lignes chantées (sans les repères [verse], [chorus]…), avec leur partie */
function songLines(txt){ const out=[]; let sec="verse"; String(txt||"").split(/\n/).forEach(l=>{ const t=l.trim(); if(!t) return; const m=/^\[([^\]]+)\]$/.exec(t); if(m){ sec=m[1].toLowerCase(); return; } out.push({text:t, chorus:/chorus|refrain|hook/.test(sec)}); }); return out; }
/* quelle unité chaque ligne chante-t-elle ? (le mot exemple d'abord, puis le nom, puis l'unité en tête de ligne) ; dans l'ordre de la leçon autant que possible */
const normW=t=>String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim();
function songMap(L, lines){ let last=-1; return lines.map(l=>{ const n=" "+normW(l.text)+" ", hit=i=>{ const x=L.items[i]; if(!x) return 0; const mot=normW(x.mot), nom=normW(x.nom), cle=normW(x.cle);
      if(mot&&n.includes(" "+mot+" ")) return 3; if(nom&&nom.length>1&&n.includes(" "+nom+" ")) return 2; if(cle&&n.trim().startsWith(cle+" ")&&(cle.length>1||n.split(" "+cle+" ").length>2)) return 1; return 0; };
    let best=-1, bs=0; for(let k=0;k<L.items.length;k++){ const i=(last+1+k)%L.items.length, h=hit(i); if(h>bs){ bs=h; best=i; if(h===3) break; } }
    if(best>=0&&!l.chorus) last=best; return Object.assign({}, l, {i:l.chorus&&bs<3?-1:best}); }); }
/* ---------- ce que dit la voix : intro, chaque élément (présentation, « répète après moi », le nom seul), quiz, révision, fin ---------- */
const nameOf=x=>x.nom||x.cle||x.texte;
/* Couleur sémantique des leçons de couleurs : le mot est lui-même montré dans
   la couleur enseignée. Fonctionne en français, anglais et arabe. */
function lessonColor(x){ const n=normW([x&&x.cle,x&&x.nom,x&&x.mot,x&&x.sens].filter(Boolean).join(" ")), C=[
  [["vert","green","اخضر"],"#159447"],[["rouge","red","احمر"],"#D62828"],[["jaune","yellow","اصفر"],"#D89B00"],[["bleu","blue","ازرق"],"#1769D2"],[["orange","برتقالي"],"#E96B12"],[["marron","brun","brown","بني"],"#7A4326"],[["violet","purple","بنفسجي"],"#7B2CBF"],[["rose","pink","وردي"],"#D63384"],[["noir","black","اسود"],"#111827"],[["gris","gray","grey","رمادي"],"#667085"],[["blanc","white","ابيض"],"#A0A7B2"]];
  for(const [words,color] of C) if(words.some(w=>new RegExp(`(^| )${w}( |$)`).test(n))) return color; return ""; }
function script(L){ const T=LANGS[L.langue], S={intro:L.intro||T.intro(L.titre)};
  if(L.capsule){ L.capsule.etapes.forEach((e,s)=>e.lignes.forEach((l,j)=>{ S[`c${s}_${j}`]=l.texte; })); S.fin=L.fin||T.fin(L.titre); (L.muet||[]).forEach(k=>{ if(k in S) S[k]=""; }); return S; }
  L.items.forEach((x,i)=>{ const n=nameOf(x); S["v"+i]=x.voix||(x.texte?x.texte:T.voici(n,x.mot)); if(x.repete>0){ S["r"+i]=T.rep(n); S["n"+i]=n; } });
  const qi=quizIdx(L); if(qi.length){ S.quiz=T.quiz; qi.forEach(i=>{ S["n"+i]=S["n"+i]||nameOf(L.items[i]); }); }
  S.recap=T.recap; S.fin=L.fin||T.fin(L.titre); (L.muet||[]).forEach(k=>{ if(k in S) S[k]=""; }); return S; }
/* quiz : 3 éléments au plus, répartis dans la leçon, ceux qui ont une image d'abord */
function quizIdx(L){ const n=L.items.length; if(!L.quiz||n<3) return []; const want=Math.min(3,Math.floor(n/2)), out=[];
  for(let k=1;k<=want;k++){ let i=Math.min(n-1,Math.round(k*n/(want+1))-1); for(let d=0;d<n;d++){ const j=(i+d)%n; if(!out.includes(j)&&(L.items[j].image||d>=n-1)){ i=j; break; } } if(!out.includes(i)) out.push(i); } return out.sort((a,b)=>a-b); }
const est=(txt,lang)=>{ const w=String(txt||"").trim().split(/\s+/).filter(Boolean).length; return w?Math.max(.9,w*(lang==="ar"?.55:.4)+.35):0; };
/* minutage commun à l'image et au son ; vo = {clé: {seconds}} (durées réelles des voix), sinon estimées */
function plan(L, vo, song){ if(L.capsule) return capPlan(L, vo, song); const S=script(L), C=L.chanson||{}, sg=song&&song.seconds>0&&C.place!=="aucune"?song:null, sLines=sg?songMap(L,sg.lines):[];
  if(sg&&C.place==="seule") return {total:+(sg.seconds+.4).toFixed(3), parts:[{k:"song",a:0,b:sg.seconds+.4,at:0,lines:sLines,bpm:sg.bpm||100}], say:[], script:S, songAt:0};
  const d=k=>{ const v=vo&&vo[k]; return v&&v.seconds?+v.seconds:est(S[k],L.langue); }, parts=[], say=[];
  const sayAt=(k,t,o)=>{ if(!S[k]) return 0; const dd=d(k); say.push(Object.assign({k,t:+t.toFixed(3),d:+dd.toFixed(3)},o||{})); return dd; };
  let t=0; const di=sayAt("intro",1.2); parts.push({k:"intro",a:0,b:t=Math.max(3.6,1.2+di+1)});
  L.items.forEach((x,i)=>{ const a=t; let c=a+.95; const dv=sayAt("v"+i,c), p={k:"item",i,a,v:[c,c+dv],ex:c+Math.min(dv*.45,1.1),reps:[]}; c+=Math.max(dv,.6)+.45;
    for(let r=0;r<x.repete;r++){ const key=r===0?"r"+i:"n"+i, dk=sayAt(key,c), rp={cue:c,say:[c,c+dk]}; c+=Math.max(dk,.5)+.25;
      if(L.chorus){ const dn=sayAt("n"+i,c,{chorus:true}); rp.chorus=[c,c+dn]; c+=Math.max(dn,.5)+.3; }
      const dn=d("n"+i); rp.toi=[c,c+Math.max(1.5,dn+1.1)]; c=rp.toi[1]+.15; p.reps.push(rp); }
    p.b=c+.55; t=p.b; parts.push(p); });
  quizIdx(L).forEach(i=>{ const a=t, dq=sayAt("quiz",a+.7), q={k:"quiz",i,a,ask:[a+.7,a+.7+dq]}; q.count=[q.ask[1]+.25,q.ask[1]+3.25]; q.rev=q.count[1]; const dn=sayAt("n"+i,q.rev+.2); q.b=q.rev+.2+Math.max(dn,.6)+1.2; t=q.b; parts.push(q); });
  const n=L.items.length, step=n?Math.min(.75,Math.max(.3,7/n)):.5, dr=sayAt("recap",t+.5), rs=t+.6+Math.max(dr,.8); parts.push({k:"recap",a:t,start:rs,step,b:rs+n*step+1.4}); t=rs+n*step+1.4;
  let songAt=-1; if(sg){ songAt=t+.3; parts.push({k:"song",a:t,b:songAt+sg.seconds+.3,at:songAt,lines:sLines.map(l=>Object.assign({},l,{a:l.a+songAt,b:l.b+songAt})),bpm:sg.bpm||100}); t=songAt+sg.seconds+.3; }
  const df=sayAt("fin",t+.6); parts.push({k:"fin",a:t,b:t+Math.max(4,.6+df+2)}); t=parts[parts.length-1].b;
  return {total:+t.toFixed(3), parts, say, script:S, songAt}; }

/* ---------- CAPSULE PÉDAGOGIQUE (15 octobre) : une compétence par vidéo, en étapes ----------
   question → découverte → démonstration au tableau → défi (temps pour mettre pause) → réponse expliquée → phrase à retenir → exercice hors écran.
   Les personnages (enfants, robot) et l'enseignant sont des DONNÉES de la série ; le moteur ne connaît que des rôles. */
const CAP_TYPES={question:["❓","La question"], decouverte:["🔎","On découvre"], demo:["🧑‍🏫","On apprend"], defi:["⏸️","À toi de jouer !"], reponse:["✅","La réponse"], retenir:["⭐","À retenir"], exercice:["✏️","Petit exercice"]};
const CAP_THEMES={
  soleil:{nom:"Soleil", mur:["#FFF4D2","#FFD683"], sol:["#EAB876","#C98E4E"], acc:"#F08200", acc2:"#E2445C", tab:"#FFFDF6", ink:"#2B2118"},
  menthe:{nom:"Menthe", mur:["#E6FBF1","#A9E8CB"], sol:["#8ED0AE","#5FA987"], acc:"#0E9F68", acc2:"#1769C4", tab:"#FBFFFD", ink:"#122A1F"},
  ciel:{nom:"Ciel", mur:["#E8F3FF","#B3D6FF"], sol:["#97BCE8","#6F95C8"], acc:"#1F74E0", acc2:"#E0408A", tab:"#FCFDFF", ink:"#132238"},
  lavande:{nom:"Lavande", mur:["#F3ECFF","#D0BDFF"], sol:["#B7A1E0","#8E77C2"], acc:"#7448E0", acc2:"#EE8A00", tab:"#FFFCFF", ink:"#24183A"},
  corail:{nom:"Corail", mur:["#FFEFE8","#FFBFAA"], sol:["#E8A48E","#C67D66"], acc:"#E8503A", acc2:"#13848A", tab:"#FFFDFB", ink:"#331A14"},
  ocean:{nom:"Océan", mur:["#E4F8F9","#A2DFE5"], sol:["#83C6CD","#5A9FA6"], acc:"#0B8794", acc2:"#EF5D5A", tab:"#FBFFFF", ink:"#10292C"},
  nuit:{nom:"Nuit étoilée", mur:["#E6E9FF","#B2BCF6"], sol:["#9DA6DC","#7580BA"], acc:"#3B4DB8", acc2:"#F2A300", tab:"#FDFDFF", ink:"#161B3A"}};
/* rôles des mots au tableau : une couleur et un nom (grammaire, lecture, nombres) */
const CAP_ROLES={sujet:["#1F74E0","sujet"], verbe:["#E23B4A","verbe"], nom:["#109A4C","nom"], determinant:["#8C3FB0","déterminant"], adjectif:["#E98200","adjectif"], pronom:["#38597F","pronom"],
  majuscule:["#D2185E","majuscule"], ponctuation:["#D2185E","ponctuation"], point:["#D2185E","point"], terminaison:["#E98200","terminaison"], auxiliaire:["#00897B","auxiliaire"], participe:["#5B33B0","participe passé"],
  cod:["#7A4A32","COD"], complement:["#7A4A32","complément"], son:["#E23B4A","son"], syllabe:["#1F74E0","syllabe"], lettre:["#E23B4A","lettre"], mot:["#109A4C","mot"], radical:["#1F74E0","radical"],
  nombre:["#1F74E0","nombre"], unites:["#E23B4A","unités"], dizaines:["#109A4C","dizaines"], centaines:["#8C3FB0","centaines"], resultat:["#109A4C","résultat"]};
const CAP_VIS=["mots","sons","fusion","tableau","choix","regle","liste","objets","texte"], CAP_KINDS=["fille","enfant","robot"];
const ints=(a,max)=>(Array.isArray(a)?a:[a]).map(n=>parseInt(n,10)).filter(n=>n>=0&&n<max);
function visNorm(v){ if(!v||typeof v!=="object"||!CAP_VIS.includes(v.type)) return null; const ty=v.type, o={type:ty}, arr=a=>Array.isArray(a)?a:[];
  if(ty==="mots"){ o.mots=(Array.isArray(v.mots)?v.mots:String(v.phrase||"").split(/\s+/)).map(w=>str(w,28)).filter(Boolean).slice(0,16); if(!o.mots.length) return null;
    o.marques=arr(v.marques).slice(0,6).map(m=>({mots:ints(m&&m.mots,o.mots.length).slice(0,10), role:str(m&&m.role,20).toLowerCase(), label:str(m&&m.label,24)})).filter(m=>m.mots.length); }
  else if(ty==="sons"){ o.items=arr(v.items).slice(0,8).map(x=>({cle:str(x&&x.cle,12), mot:str(x&&x.mot,24), image:emoji1(x&&x.image)})).filter(x=>x.cle); if(!o.items.length) return null; }
  else if(ty==="fusion"){ o.parts=arr(v.parts||v.parties).map(p=>str(p,6)).filter(Boolean).slice(0,3); if(o.parts.length<2) return null; o.resultat=str(v.resultat,12)||o.parts.join(""); o.mot=str(v.mot,24); o.image=emoji1(v.image); }
  else if(ty==="tableau"){ o.titre=str(v.titre,40); o.entetes=arr(v.entetes).map(x=>str(x,24)).slice(0,3); o.lignes=arr(v.lignes).slice(0,7).map(r=>arr(Array.isArray(r)?r:[r]).slice(0,3).map(c=>str(c,32))).filter(r=>r.some(Boolean)); if(!o.lignes.length) return null; o.surligne=ints(v.surligne,o.lignes.length); }
  else if(ty==="choix"){ o.question=str(v.question,120); o.choix=arr(v.choix).map(c=>str(c,60)).filter(Boolean).slice(0,4); if(o.choix.length<2) return null; const b=parseInt(v.bonne,10); o.bonne=b>=0&&b<o.choix.length?b:0; }
  else if(ty==="regle"){ o.texte=str(v.texte,200); if(!o.texte) return null; o.icone=emoji1(v.icone)||"⭐"; }
  else if(ty==="liste"){ o.items=arr(v.items).map(x=>str(x,90)).filter(Boolean).slice(0,5); if(!o.items.length) return null; o.icones=arr(v.icones).map(emoji1).slice(0,5); }
  else if(ty==="objets"){ o.groupes=arr(v.groupes).slice(0,3).map(g=>({emoji:emoji1(g&&g.emoji)||"🍎", n:cl(parseInt(g&&g.n,10)||0,0,12), barre:cl(parseInt(g&&g.barre,10)||0,0,12)})).filter(g=>g.n>0); if(!o.groupes.length) return null; o.signes=arr(v.signes).map(s=>str(s,2)).slice(0,3); o.resultat=str(v.resultat,12); }
  else if(ty==="texte"){ o.texte=str(v.texte,420); if(!o.texte) return null; o.surligne=arr(v.surligne).map(w=>str(w,24)).filter(Boolean).slice(0,8); }
  return o; }
function capNorm(c){ c=c||{}; const cast=(Array.isArray(c.cast)?c.cast:[]).slice(0,3).map((p,i)=>{ p=p||{}; return {id:str(p.id,16).toLowerCase().replace(/[^a-z0-9_-]/g,"")||"p"+i, nom:str(p.nom,24)||`Élève ${i+1}`, kind:CAP_KINDS.includes(p.kind)?p.kind:"enfant",
    style:str(p.style,12), skin:str(p.skin,10), coiffe:str(p.coiffe,12), couleur:/^#[0-9a-f]{6}$/i.test(p.couleur||"")?p.couleur:"", voix:str(p.voix,40), fx:p.fx&&typeof p.fx==="object"?{pitch:cl(+p.fx.pitch||0,-5,5)}:null}; });
  const ids=new Set(["prof",...cast.map(p=>p.id)]), who=q=>{ q=str(q,16).toLowerCase(); return ids.has(q)?q:"prof"; };
  const etapes=(Array.isArray(c.etapes)?c.etapes:[]).slice(0,14).map(e=>{ e=e||{}; const type=CAP_TYPES[e.type]?e.type:"demo";
    return {type, titre:str(e.titre,60), lignes:(Array.isArray(e.lignes)?e.lignes:[]).slice(0,8).map(l=>({qui:who(l&&l.qui), texte:str(l&&l.texte,300)})).filter(l=>l.texte), visuel:visNorm(e.visuel), pause:type==="defi"?cl(parseInt(e.pause,10)||6,3,15):0}; }).filter(e=>e.lignes.length||e.visuel);
  return {classe:str(c.classe,24), episode:str(c.episode,30), serie:str(c.serie,60), theme:CAP_THEMES[c.theme]?c.theme:"ciel", objectif:str(c.objectif,200), prof:str(c.prof,24), cast, etapes}; }
/* unités montrées (sons, lettres, fusions) : pour la chanson et la révision */
function capItems(C){ const out=[], seen=new Set(); C.etapes.forEach(e=>{ const v=e.visuel; if(!v) return; const add=(cle,mot,image)=>{ if(!cle||seen.has(cle)) return; seen.add(cle); out.push({cle,nom:"",mot:mot||"",image:image||"",sens:"",phon:"",texte:"",voix:"",repete:0}); };
  if(v.type==="sons") v.items.forEach(x=>add(x.cle,x.mot,x.image)); if(v.type==="fusion") add(v.resultat,v.mot,v.image); }); return out.slice(0,20); }
/* qui parle : « prof » (l'enseignant) ou l'identifiant d'un personnage */
function speakers(L){ const o={intro:"prof", fin:"prof"}; if(L.capsule) L.capsule.etapes.forEach((e,s)=>e.lignes.forEach((l,j)=>{ o[`c${s}_${j}`]=l.qui; })); return o; }
/* le visuel en vigueur à chaque étape : celui de l'étape, sinon celui d'avant (le tableau garde sa démonstration) */
function capVisuals(C){ let prev=null; return C.etapes.map(e=>{ const v=e.visuel||prev; prev=v; return v; }); }
function capPlan(L, vo, song){ const S=script(L), C=L.capsule, Ch=L.chanson||{}, sg=song&&song.seconds>0&&Ch.place!=="aucune"?song:null, sLines=sg?songMap(L,sg.lines):[], parts=[], say=[], who=speakers(L);
  const d=k=>{ const v=vo&&vo[k]; return v&&v.seconds?+v.seconds:est(S[k],L.langue); };
  const sayAt=(k,t)=>{ if(!S[k]) return 0; const dd=d(k); say.push({k,t:+t.toFixed(3),d:+dd.toFixed(3),qui:who[k]||"prof"}); return dd; };
  let t=0; const di=sayAt("intro",1.5); parts.push({k:"intro",a:0,b:t=Math.max(4.4,1.5+di+1)});
  C.etapes.forEach((e,s)=>{ const a=t; let c=a+.75; const lines=[]; e.lignes.forEach((l,j)=>{ const k=`c${s}_${j}`, dd=sayAt(k,c); if(dd) lines.push({k,t:c,d:dd,qui:l.qui}); c+=Math.max(dd,.4)+.4; });
    const p={k:"cap",s,type:e.type,a,lines}; if(e.type==="defi"){ p.count=[c+.15,c+.15+e.pause]; c=p.count[1]+.35; }
    p.b=Math.max(a+2.6,c+(e.type==="retenir"?1.4:e.type==="exercice"?1.2:.55)); t=p.b; parts.push(p); });
  let songAt=-1; if(sg){ songAt=t+.3; parts.push({k:"song",a:t,b:songAt+sg.seconds+.3,at:songAt,lines:sLines.map(l=>Object.assign({},l,{a:l.a+songAt,b:l.b+songAt})),bpm:sg.bpm||100}); t=songAt+sg.seconds+.3; }
  const df=sayAt("fin",t+.6); parts.push({k:"fin",a:t,b:t+Math.max(4.4,.6+df+2.2)}); t=parts[parts.length-1].b;
  return {total:+t.toFixed(3), parts, say, script:S, songAt}; }

/* ---------- illustrations : Twemoji (CC BY 4.0), sinon l'emoji du système ---------- */
const emojiUrl=e=>{ const cps=[...String(e)].map(c=>c.codePointAt(0)).filter(c=>c!==0xFE0F).map(c=>c.toString(16)); return cps.length?`https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${cps.join("-")}.svg`:""; };
const IMGS=new Map();
function loadEmoji(e){ if(!e) return Promise.resolve(null); if(IMGS.has(e)) return IMGS.get(e).p;
  const rec={img:null}; rec.p=new Promise(res=>{ const im=new Image(); im.crossOrigin="anonymous"; let done=false; const end=ok=>{ if(done) return; done=true; rec.img=ok?im:null; res(rec.img); };
    im.onload=()=>end(im.naturalWidth>0); im.onerror=()=>end(false); setTimeout(()=>end(false),6000); im.src=emojiUrl(e); }); IMGS.set(e,rec); return rec.p; }
const FONT_SPECS=['800 64px "Baloo 2"','700 64px "Baloo 2"','800 64px "Baloo Bhaijaan 2"','700 64px "Cinzel"','900 64px "Cinzel"','700 64px "Scheherazade New"'];
async function ready(L){ const F2=document.fonts; if(F2&&F2.load) await Promise.all(FONT_SPECS.map(s=>F2.load(s,s.includes("Bhaijaan")||s.includes("Scheh")?"بَتث":"ABCabc").catch(()=>null)));
  const em=((L&&L.items)||[]).map(x=>x.image); if(L&&L.capsule){ Object.values(CAP_TYPES).forEach(x=>em.push(x[0])); em.push("🎉","⏸️");
    L.capsule.etapes.forEach(e=>{ const v=e.visuel; if(!v) return; if(v.type==="sons") v.items.forEach(x=>em.push(x.image)); if(v.type==="fusion") em.push(v.image); if(v.type==="objets") v.groupes.forEach(g=>em.push(g.emoji)); if(v.type==="liste") em.push(...v.icones); if(v.type==="regle") em.push(v.icone); }); }
  await Promise.all([...new Set(em.filter(Boolean))].map(loadEmoji)); }

/* ---------- briques de dessin communes ---------- */
function rr(x,X,Y,w,h,r){ r=Math.min(r,w/2,h/2); x.beginPath(); x.moveTo(X+r,Y); x.arcTo(X+w,Y,X+w,Y+h,r); x.arcTo(X+w,Y+h,X,Y+h,r); x.arcTo(X,Y+h,X,Y,r); x.arcTo(X,Y,X+w,Y,r); x.closePath(); }
function star(x,cx,cy,r1,r2,n,rot){ x.beginPath(); for(let i=0;i<n*2;i++){ const r=i%2?r2:r1, a=rot+i*Math.PI/n-Math.PI/2; x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r); } x.closePath(); }
const PALS=[["#FFF3B0","#FFC23D","#D98200","#8A4B00"],["#FFC2CF","#FF4D79","#C21848","#6E0A26"],["#C9FFE6","#2ED68C","#109157","#064A2B"],["#CDE8FF","#4D9DFF","#1B5FD1","#0A2E6E"],["#EBD7FF","#A66BFF","#6B2FD9","#36147A"],["#FFE0C7","#FF8A3D","#D9530F","#7A2A04"]];
/* lettre (ou mot) en relief : face en dégradé brillant, tranche épaisse, reflet ; dessinée une fois dans un petit canevas */
function relief(text,px,pal,K,opt){ opt=opt||{}; const c=document.createElement("canvas"), x=c.getContext("2d"), f=fontOf(text,800,px*K,opt.kind), dep=Math.round(px*K*(opt.depth||.085));
  x.font=f; const m=x.measureText(text), w=Math.ceil(m.width+px*K*.5+dep*2), h=Math.ceil(px*K*1.75+dep*2); c.width=Math.max(8,w); c.height=Math.max(8,h);
  x.font=f; x.textAlign="center"; x.textBaseline="middle"; x.direction=isAr(text)?"rtl":"ltr"; const cx=c.width/2-dep*.45, cy=c.height/2-dep*.5+(isAr(text)?px*K*.1:0);
  for(let k=dep;k>=1;k--){ x.fillStyle=mix(pal[3],pal[2],1-k/dep*.85); x.fillText(text,cx+k*.45,cy+k*.8); }
  x.save(); x.shadowColor="rgba(0,0,0,.25)"; x.shadowBlur=px*K*.02; const gr=x.createLinearGradient(0,cy-px*K*.62,0,cy+px*K*.55); gr.addColorStop(0,pal[0]); gr.addColorStop(.45,pal[1]); gr.addColorStop(1,pal[2]); x.fillStyle=gr; x.fillText(text,cx,cy); x.restore();
  x.save(); x.globalCompositeOperation="source-atop"; const hl=x.createLinearGradient(0,cy-px*K*.75,0,cy-px*K*.05); hl.addColorStop(0,"rgba(255,255,255,.62)"); hl.addColorStop(1,"rgba(255,255,255,0)"); x.fillStyle=hl; x.fillRect(0,0,c.width,cy-px*K*.02); x.restore();
  x.lineWidth=Math.max(1,px*K*.018); x.strokeStyle="rgba(255,255,255,.55)"; x.strokeText(text,cx,cy);
  return {c, w:c.width/K, h:c.height/K}; }
/* une bande de lumière qui traverse le relief (brillance) */
function shine(x,sp,X,Y,f,K){ if(f<=0||f>=1) return; const t=sp.tmp||(sp.tmp=document.createElement("canvas")); if(t.width!==sp.c.width||t.height!==sp.c.height){ t.width=sp.c.width; t.height=sp.c.height; } const q=t.getContext("2d"); q.globalCompositeOperation="source-over"; q.clearRect(0,0,t.width,t.height); q.drawImage(sp.c,0,0); q.globalCompositeOperation="source-atop";
  const bx=lerp(-.4,1.4,f)*t.width, gr=q.createLinearGradient(bx-t.width*.18,0,bx+t.width*.18,t.height); gr.addColorStop(0,"rgba(255,255,255,0)"); gr.addColorStop(.5,"rgba(255,255,255,.7)"); gr.addColorStop(1,"rgba(255,255,255,0)"); q.fillStyle=gr; q.fillRect(0,0,t.width,t.height);
  x.save(); x.globalCompositeOperation="lighter"; x.globalAlpha=.55; x.drawImage(t,X,Y,sp.w,sp.h); x.restore(); }
/* confettis (physique simple, sans hasard qui scintille) */
function confetti(x,t,t0,cx,cy,n,pal,pow,seed){ const dt=t-t0; if(dt<0||dt>2.6) return; x.save();
  for(let k=0;k<n;k++){ const r=rnd(k*7.3+(seed||0)), a=-Math.PI/2+(r-.5)*2.4, sp=(260+rnd(k*3.1+(seed||0))*420)*(pow||1), vx=Math.cos(a)*sp, vy=Math.sin(a)*sp, px=cx+vx*dt*.9, py=cy+vy*dt+520*dt*dt, rot=dt*(4+r*8)+k;
    x.globalAlpha=cl(1-(dt-1.6)/1); x.fillStyle=pal[k%pal.length]; x.translate(px,py); x.rotate(rot); x.fillRect(-7,-4,14*(.6+.4*Math.abs(Math.cos(dt*6+k))),8); x.setTransform(x.__T); }
  x.restore(); }
function burst(x,t,t0,cx,cy,R,col,n){ const dt=t-t0; if(dt<0||dt>1) return; const e=eo(dt/.9); x.save(); x.globalAlpha=1-dt; x.fillStyle=col;
  for(let k=0;k<(n||8);k++){ const a=k/(n||8)*Math.PI*2+.3, r=R*e; star(x,cx+Math.cos(a)*r,cy+Math.sin(a)*r,R*.11*(1-dt*.5),R*.045,5,dt*3); x.fill(); } x.restore(); }
function ring(x,cx,cy,r,f,col,w,bg){ x.save(); x.lineCap="round"; x.lineWidth=w; x.strokeStyle=bg||"rgba(255,255,255,.18)"; x.beginPath(); x.arc(cx,cy,r,0,Math.PI*2); x.stroke(); x.strokeStyle=col; x.shadowColor=col; x.shadowBlur=w*1.2; x.beginPath(); x.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*cl(f)); x.stroke(); x.restore(); }
function drawEmoji(x,e,cx,cy,s){ if(!e) return; const r=IMGS.get(e), im=r&&r.img; if(im){ x.drawImage(im,cx-s/2,cy-s/2,s,s); return; } x.save(); x.font=`${Math.round(s*.86)}px ${F.emoji}`; x.textAlign="center"; x.textBaseline="middle"; x.fillText(e,cx,cy+s*.04); x.restore(); }
/* texte qui tient dans une largeur (taille réduite au besoin), sens de lecture respecté */
function fitText(x,txt,cx,cy,maxw,px,w,kind,minPx){ let s=px; for(;s>(minPx||12);s-=2){ x.font=fontOf(txt,w,s,kind); if(x.measureText(txt).width<=maxw) break; } x.direction=isAr(txt)?"rtl":"ltr"; x.fillText(txt,cx,cy); return s; }
function wrap(x,txt,maxw){ const ws=String(txt).split(/\s+/).filter(Boolean), out=[]; let l=""; ws.forEach(w=>{ const q=l?l+" "+w:w; if(l&&x.measureText(q).width>maxw){ out.push(l); l=w; } else l=q; }); if(l) out.push(l); return out; }
/* voyelles en couleur (leçons d'arabe) : fatha rouge, kasra bleue, damma verte, soukoun orange, chadda violette ; la lettre à l'encre */
const HCOL={"َ":"#E0283F","ً":"#E0283F","ُ":"#16A34A","ٌ":"#16A34A","ِ":"#2563EB","ٍ":"#2563EB","ْ":"#EA8A00","ّ":"#9333EA"};
function inkText(x,txt,cx,cy,ink,size){ const marks=[...new Set([...txt].filter(c=>HCOL[c]))], base=txt.replace(/[ً-ْ]/g,"");
  marks.forEach(m=>{ x.fillStyle=HCOL[m]; x.fillText(txt.replace(/[ً-ْ]/g,c=>c===m?c:""),cx,cy); });
  x.fillStyle=ink; x.fillText(base,cx,cy); if(marks.length){ x.lineWidth=Math.max(1,size*.012); x.strokeStyle=ink; x.strokeText(base,cx,cy); } }

/* ======================================================================================================================== */
function stage(cv, L, P, o){ o=o||{};
  const fmt=o.fmt||"16:9", V=fmt==="9:16", Q=fmt==="1:1", W=V?720:Q?720:1280, H=V?1280:720, K=o.K||1; cv.width=Math.round(W*K); cv.height=Math.round(H*K);
  const g=cv.getContext("2d"), T=LANGS[L.langue]||LANGS.fr, M=MODELS[L.modele]?L.modele:"theatre", S=P.script, parts=P.parts, items=L.items, N=items.length, AV=typeof window!=="undefined"&&window.SP_AVATAR;
  const partAt=t=>{ for(let i=parts.length-1;i>=0;i--) if(t>=parts[i].a) return parts[i]; return parts[0]; };
  const env=(arr,t)=>{ if(!arr||!arr.length) return 0; const f=t/(o.envStep||.04), i=Math.floor(f); return cl(lerp(arr[i]||0,arr[i+1]||0,f-i)); };
  const talk=t=>{ const e=o.env&&o.env.prof; if(e&&e.length) return env(e,t); const s=P.say.find(z=>!z.chorus&&t>=z.t&&t<z.t+z.d); return s?.35+.3*Math.abs(Math.sin((t-s.t)*11)):0; };
  const kids=t=>{ const e=o.env&&o.env.kids; if(e&&e.length) return env(e,t); const s=P.say.find(z=>z.chorus&&t>=z.t&&t<z.t+z.d); return s?.4+.3*Math.abs(Math.sin((t-s.t)*12)):0; };
  const sprites=new Map(), spr=(txt,px,pi,kind,depth)=>{ const k=`${txt}|${px}|${pi}|${kind||""}`; if(!sprites.has(k)) sprites.set(k,relief(txt,px,PALS[pi%PALS.length],K,{kind,depth})); return sprites.get(k); };
  const layers={}, layer=(name,fn)=>{ if(!layers[name]){ const c=document.createElement("canvas"); c.width=cv.width; c.height=cv.height; const x=c.getContext("2d"); x.setTransform(K,0,0,K,0,0); fn(x); layers[name]=c; } return layers[name]; };
  const half={}, halfLayer=name=>{ let c=half[name]; if(!c){ c=half[name]=document.createElement("canvas"); c.width=Math.ceil(W*K/2); c.height=Math.ceil(H*K/2); } const q=c.getContext("2d"); q.setTransform(1,0,0,1,0,0); q.globalCompositeOperation="source-over"; q.globalAlpha=1; q.clearRect(0,0,c.width,c.height); q.setTransform(K/2,0,0,K/2,0,0); return [c,q]; };
  const lit=(x,name,fn)=>{ const [c,q]=halfLayer(name); fn(q); x.save(); x.globalCompositeOperation="lighter"; x.drawImage(c,0,0,W,H); x.restore(); };   /* lumières additives, en demi-résolution */
  const CAPL=L.capsule, CT=CAP_THEMES[(CAPL||{}).theme]||CAP_THEMES.ciel, ACC={theatre:"#FFC23D", daara:"#E8A33D", aventure:"#FFD84D", capsule:CT.acc}[M];
  const keyPx=txt=>{ const n=[...String(txt).replace(/[ً-ْٰ]/g,"")].length; return (V?1:.9)*(n<=1?330:n<=2?270:n<=4?200:n<=7?150:110); };
  const COLOR_LESSON=N>=2&&items.filter(it=>lessonColor(it)).length>=Math.max(2,Math.ceil(N*.6));   /* couleur du mot seulement dans une leçon de couleurs */
  const hasEx=it=>!!(it&&(it.image||it.mot)), AVON=()=>L.personnage&&M!=="daara"&&!!AV&&AV.ready();   /* présentateur visible : en 9:16, l'exemple se range à gauche */

  /* ---------------- sous-titres : la phrase dite, mot après mot ---------------- */
  function lyrics(x,t,pt){ const ln=songLine(pt,t); if(!ln) return; const txt=ln.text, rtl=isAr(txt), px=(V?54:44)*(rtl?1.08:1), maxw=W*(V?.92:.8); x.save(); x.font=fontOf(txt,800,px);
    let lines=wrap(x,txt,maxw); if(lines.length>2){ x.font=fontOf(txt,800,px*.8); lines=wrap(x,txt,maxw).slice(0,3); } const fpx=lines.length>2?px*.8:px, lh=fpx*1.32, bh=lines.length*lh+fpx*.75, by=H*(V?.9:.9)-bh/2-(lines.length-1)*lh*.2;
    const bw=Math.min(W*.96,Math.max(...lines.map(l=>x.measureText(l).width))+fpx*1.4), a=sm((t-ln.a+.1)/.15)*sm((ln.b+1.2-t)/.25); x.globalAlpha=a;
    rr(x,W/2-bw/2,by,bw,bh,bh/2.6); const bg=x.createLinearGradient(0,by,0,by+bh); bg.addColorStop(0,"rgba(20,10,40,.78)"); bg.addColorStop(1,"rgba(8,4,18,.78)"); x.fillStyle=bg; x.fill(); x.strokeStyle=hex(ACC,.8); x.lineWidth=3; x.stroke();
    const words=txt.split(/\s+/).filter(Boolean), tot=words.reduce((n,w)=>n+w.length+1,0), prog=cl((t-ln.a)/Math.max(.4,ln.b-ln.a)); let acc=0, wi=0; const lit=words.map(w=>{ const on=acc/tot<=prog; acc+=w.length+1; return on; });
    x.textBaseline="middle"; x.direction=rtl?"rtl":"ltr"; lines.forEach((l2,li)=>{ const ws=l2.split(" "), full=x.measureText(l2).width, y=by+fpx*.38+lh*(li+.5); let pos=0;
      ws.forEach((w,k)=>{ const ww=x.measureText(w+(k<ws.length-1?" ":"")).width, X=rtl?W/2+full/2-pos:W/2-full/2+pos; x.textAlign=rtl?"right":"left"; x.fillStyle=lit[wi]?ACC:"rgba(255,255,255,.95)"; if(lit[wi]){ x.shadowColor=ACC; x.shadowBlur=14; } else x.shadowBlur=0; x.fillText(w,X,y); pos+=ww; wi++; }); });
    x.restore(); }
  function captions(x,t,pt){ if(pt&&pt.k==="song"){ lyrics(x,t,pt); return; } if(!L.sous_titres) return; const s=P.say.find(z=>!z.chorus&&t>=z.t-.05&&t<z.t+z.d+.35); if(!s) return; const txt=S[s.k]; if(!txt) return;
    const rtl=isAr(txt), px=(V?46:38)*(rtl?1.08:1), maxw=W*(V?.9:.78); x.save(); x.font=fontOf(txt,700,px); const lines=wrap(x,txt,maxw).slice(0,3), lh=px*1.38, bh=lines.length*lh+px*.7, by=H*(V?.885:.9)-bh/2;
    const bw=Math.min(maxw+px*1.2,Math.max(...lines.map(l=>x.measureText(l).width))+px*1.4), a=sm((t-s.t+.05)/.2)*sm((s.t+s.d+.35-t)/.2);
    x.globalAlpha=a; rr(x,W/2-bw/2,by,bw,bh,bh/2.4); x.fillStyle=M==="daara"?"rgba(52,30,12,.72)":"rgba(8,6,20,.62)"; x.fill(); x.strokeStyle=hex(ACC,.55); x.lineWidth=2; x.stroke();
    if(CAPL&&s.qui){ const nm=cpName(s.qui); if(nm){ x.save(); x.font=`800 ${Math.round(px*.62)}px ${F.kid}`; x.direction="ltr"; const cw=x.measureText(nm).width+px*.9, chh=px*.95, cx0=W/2-bw/2+px*.5, cy0=by-chh*.62;
      rr(x,cx0,cy0,cw,chh,chh/2); x.fillStyle=cpColor(s.qui); x.fill(); x.strokeStyle="#fff"; x.lineWidth=2.5; x.stroke(); x.fillStyle="#fff"; x.textAlign="center"; x.textBaseline="middle"; x.fillText(nm,cx0+cw/2,cy0+chh/2+1); x.restore(); } }
    const words=txt.split(/\s+/).filter(Boolean), tot=words.reduce((n,w)=>n+w.length+2,0), prog=cl((t-s.t)/Math.max(.3,s.d)); let acc=0, wi=0;
    const lit=words.map(w=>{ const on=acc/tot<=prog; acc+=w.length+2; return on; });
    x.textBaseline="middle"; x.direction=rtl?"rtl":"ltr";
    lines.forEach((ln,li)=>{ const ws=ln.split(" "), full=x.measureText(ln).width, y=by+px*.35+lh*(li+.5); let pos=0;
      ws.forEach((w,k)=>{ const ww=x.measureText(w+(k<ws.length-1?" ":"")).width, X=rtl?W/2+full/2-pos:W/2-full/2+pos; x.textAlign=rtl?"right":"left"; x.fillStyle=lit[wi]?ACC:"rgba(255,255,255,.92)"; x.fillText(w,X,y); pos+=ww; wi++; }); });
    x.restore(); }
  /* ---------------- progression : « 3 / 10 » et fine barre ---------------- */
  function progress(x,t,pt){ const tot=P.total, f=cl(t/tot); x.save(); x.fillStyle="rgba(255,255,255,.18)"; x.fillRect(0,0,W,5); x.fillStyle=ACC; x.shadowColor=ACC; x.shadowBlur=8; x.fillRect(0,0,W*f,5); x.restore();
    if(pt.k!=="item"||!N) return; const txt=`${pt.i+1} / ${N}`; x.save(); x.font=`800 ${V?26:22}px ${F.kid}`; const w=x.measureText(txt).width+30, h=V?44:38, X=W-w-(V?24:22), Y=V?26:20;
    rr(x,X,Y,w,h,h/2); x.fillStyle="rgba(0,0,0,.42)"; x.fill(); x.strokeStyle=hex(ACC,.8); x.lineWidth=2; x.stroke(); x.fillStyle="#fff"; x.textAlign="center"; x.textBaseline="middle"; x.direction="ltr"; x.fillText(txt,X+w/2,Y+h/2+1); x.restore(); }
  /* ---------------- bandeau qui surgit (« Répète après moi ! », « À toi ! », « Bravo ! ») ---------------- */
  function banner(x,txt,cx,cy,px,t,t0,t1,sty){ const a=sm((t-t0)/.18)*sm((t1-t)/.2); if(a<=0) return; const s=eb((t-t0)/.42); x.save(); x.globalAlpha=a; x.translate(cx,cy); x.scale(s,s); x.rotate(sty&&sty.tilt||0);
    x.font=fontOf(txt,800,px); x.direction=isAr(txt)?"rtl":"ltr"; const w=x.measureText(txt).width+px*1.3, h=px*1.55; rr(x,-w/2,-h/2,w,h,h/2);
    const gr=x.createLinearGradient(0,-h/2,0,h/2); gr.addColorStop(0,(sty&&sty.c1)||"#FF5C8A"); gr.addColorStop(1,(sty&&sty.c2)||"#D81B60"); x.fillStyle=gr; x.shadowColor="rgba(0,0,0,.35)"; x.shadowBlur=18; x.shadowOffsetY=6; x.fill(); x.shadowColor="transparent";
    x.lineWidth=4; x.strokeStyle=(sty&&sty.edge)||"#FFE08A"; x.stroke(); x.fillStyle="#fff"; x.textAlign="center"; x.textBaseline="middle"; x.fillText(txt,0,px*.06); x.restore(); }

  /* ==================== GRAND THÉÂTRE ==================== */
  const TH={floor:V?H*.7:Q?H*.73:H*.75};
  function thBack(x){ const g0=x.createRadialGradient(W/2,H*.38,40,W/2,H*.45,Math.max(W,H)*.75); g0.addColorStop(0,"#5A1424"); g0.addColorStop(.55,"#2A0711"); g0.addColorStop(1,"#0B0206"); x.fillStyle=g0; x.fillRect(0,0,W,H);
    for(let i=0;i<26;i++){ const X=i/26*W, w=W/26; const gr=x.createLinearGradient(X,0,X+w,0); gr.addColorStop(0,"rgba(0,0,0,.28)"); gr.addColorStop(.5,"rgba(255,120,140,.06)"); gr.addColorStop(1,"rgba(0,0,0,.28)"); x.fillStyle=gr; x.fillRect(X,0,w,TH.floor); }
    const fy=TH.floor, fg=x.createLinearGradient(0,fy,0,H); fg.addColorStop(0,"#7A4424"); fg.addColorStop(.35,"#4A2814"); fg.addColorStop(1,"#1C0F07"); x.fillStyle=fg; x.fillRect(0,fy,W,H-fy);
    x.strokeStyle="rgba(0,0,0,.35)"; x.lineWidth=1.5; for(let i=-14;i<=14;i++){ x.beginPath(); x.moveTo(W/2+i*W*.03,fy); x.lineTo(W/2+i*W*.16,H); x.stroke(); }
    for(let k=1;k<7;k++){ const yy=fy+(H-fy)*Math.pow(k/7,1.7); x.strokeStyle=`rgba(0,0,0,${.12+k*.02})`; x.beginPath(); x.moveTo(0,yy); x.lineTo(W,yy); x.stroke(); }
    const lip=x.createLinearGradient(0,fy-3,0,fy+5); lip.addColorStop(0,"#FFD98A"); lip.addColorStop(1,"#8A5A1C"); x.fillStyle=lip; x.fillRect(0,fy-2,W,6);
    const sh=x.createLinearGradient(0,fy,0,fy+(H-fy)*.5); sh.addColorStop(0,"rgba(255,200,140,.18)"); sh.addColorStop(1,"rgba(255,200,140,0)"); x.fillStyle=sh; x.fillRect(0,fy,W,(H-fy)*.5);
    /* lambrequin : drapé du haut avec franges d'or */
    const vh=V?H*.075:H*.12, n=V?5:7; x.fillStyle="#8E1630"; x.beginPath(); x.moveTo(0,0); x.lineTo(W,0); x.lineTo(W,vh*.55); for(let i=n;i>=0;i--){ const cx=i/n*W; x.quadraticCurveTo(cx+W/n/2,vh*1.25,cx,vh*.55); } x.closePath();
    const vg=x.createLinearGradient(0,0,0,vh*1.2); vg.addColorStop(0,"#5E0C1F"); vg.addColorStop(.7,"#B01E3E"); vg.addColorStop(1,"#7A1028"); x.fillStyle=vg; x.fill(); x.strokeStyle="#E8B54A"; x.lineWidth=4; x.stroke();
    x.fillStyle="#F4C95D"; for(let i=0;i<n;i++){ const cx=(i+.5)/n*W; for(let k=-6;k<=6;k++){ x.fillRect(cx+k*W/n/14-1,vh*1.02-Math.abs(k)*vh*.04,2.5,vh*.14); } } }
  function thCurtains(x,t,open){ if(open>=1) return; const half=W/2, cov=half*(1-open*.86);
    [-1,1].forEach(sd=>{ const X0=sd<0?0:W-cov; x.save(); x.beginPath(); x.rect(X0,0,cov,H); x.clip(); const n=9, fw=cov/n;
      for(let i=0;i<n;i++){ const sway=Math.sin(t*1.3+i*.9)*3*(1-open*.4), X=X0+i*fw+sway, gr=x.createLinearGradient(X,0,X+fw,0); gr.addColorStop(0,"#3E0613"); gr.addColorStop(.45,"#C0203F"); gr.addColorStop(.6,"#E23A5A"); gr.addColorStop(1,"#3E0613"); x.fillStyle=gr; x.fillRect(X-1,0,fw+2,H); }
      const sh=x.createLinearGradient(0,0,0,H); sh.addColorStop(0,"rgba(0,0,0,.35)"); sh.addColorStop(.2,"rgba(0,0,0,0)"); sh.addColorStop(.9,"rgba(0,0,0,.25)"); x.fillStyle=sh; x.fillRect(X0,0,cov,H);
      x.fillStyle="#E8B54A"; x.fillRect(X0,H-14,cov,6); x.restore();
      const edge=sd<0?cov:W-cov, eg=x.createLinearGradient(edge-sd*30,0,edge,0); eg.addColorStop(0,"rgba(0,0,0,0)"); eg.addColorStop(1,"rgba(0,0,0,.45)"); x.fillStyle=eg; x.fillRect(Math.min(edge,edge-sd*30),0,30,H); }); }
  function thSpots(x,t,tx,ty,hot,col){ x.save(); x.globalCompositeOperation="lighter"; [[.14,-1],[.5,0],[.86,1]].forEach(([fx,s],k)=>{ const sx=W*fx, sy=-30, aimX=tx+Math.sin(t*.7+k*2)*W*.03, aimY=ty+H*.12;
      const ang=Math.atan2(aimY-sy,aimX-sx), len=Math.hypot(aimX-sx,aimY-sy)*1.25, sp=(k===1?.13:.1)*(1+hot*.25); x.save(); x.translate(sx,sy); x.rotate(ang);
      const gr=x.createLinearGradient(0,0,len,0); gr.addColorStop(0,hex(col,.34*(k===1?1:.75))); gr.addColorStop(.7,hex(col,.08)); gr.addColorStop(1,hex(col,0)); x.fillStyle=gr; x.beginPath(); x.moveTo(0,-6); x.lineTo(len,-len*sp); x.lineTo(len,len*sp); x.lineTo(0,6); x.closePath(); x.fill(); x.restore(); });
    const pg=x.createRadialGradient(tx,TH.floor+18,10,tx,TH.floor+18,W*.26); pg.addColorStop(0,hex(col,.34+hot*.15)); pg.addColorStop(1,hex(col,0)); x.fillStyle=pg; x.save(); x.translate(tx,TH.floor+18); x.scale(1,.22); x.translate(-tx,-(TH.floor+18)); x.beginPath(); x.arc(tx,TH.floor+18,W*.26,0,7); x.fill(); x.restore();
    for(let k=0;k<40;k++){ const px=(rnd(k)*W+t*(8+rnd(k+3)*14))%W, py=(rnd(k+9)*TH.floor+Math.sin(t*.6+k)*20); x.globalAlpha=.15+.25*Math.max(0,Math.sin(t*1.5+k)); x.fillStyle="#FFE9C8"; x.beginPath(); x.arc(px,py,1.2+rnd(k+5)*1.8,0,7); x.fill(); } x.restore(); }
  function thAudience(x,t,bob){ if(V) return; const n=Q?7:11, y=H+12; x.save(); for(let i=0;i<n;i++){ const cx=(i+.5)/n*W+(i%2?10:-10), r=(Q?44:40)+rnd(i)*10, b=Math.sin(t*6+i*1.7)*bob*8;
      x.fillStyle="#07030A"; x.beginPath(); x.arc(cx,y-r*1.55+b,r*.62,0,7); x.fill(); x.beginPath(); x.ellipse(cx,y+b,r*1.15,r*1.05,0,Math.PI,0); x.fill(); } x.restore(); }
  function thMarquee(x,t,a,title,sub){ if(a<=0) return; const w=V?W*.86:W*.62, h=V?H*.22:H*.36, X=W/2-w/2, Y=V?H*.24:H*.2; x.save(); x.globalAlpha=a; x.translate(W/2,Y+h/2); const s=lerp(.85,1,eo(a)); x.scale(s,s); x.translate(-W/2,-(Y+h/2));
    rr(x,X,Y,w,h,26); const bg=x.createLinearGradient(0,Y,0,Y+h); bg.addColorStop(0,"#2B0A12"); bg.addColorStop(1,"#12040A"); x.fillStyle=bg; x.shadowColor="rgba(255,180,60,.45)"; x.shadowBlur=40; x.fill(); x.shadowColor="transparent"; x.lineWidth=6; x.strokeStyle="#E8B54A"; x.stroke();
    const per=2*(w+h), nb=Math.round(per/34); for(let i=0;i<nb;i++){ let d=i/nb*per, bx, by; if(d<w){ bx=X+d; by=Y; } else if(d<w+h){ bx=X+w; by=Y+d-w; } else if(d<2*w+h){ bx=X+w-(d-w-h); by=Y+h; } else { bx=X; by=Y+h-(d-2*w-h); }
      const on=(Math.floor(t*8)+i)%3===0; x.fillStyle=on?"#FFF6D0":"#B8862A"; x.shadowColor=on?"#FFD36B":"transparent"; x.shadowBlur=on?14:0; x.beginPath(); x.arc(bx,by,5.5,0,7); x.fill(); } x.shadowColor="transparent";
    x.textAlign="center"; x.textBaseline="middle"; const tg=x.createLinearGradient(0,Y+h*.25,0,Y+h*.6); tg.addColorStop(0,"#FFF4C2"); tg.addColorStop(.5,"#FFC94A"); tg.addColorStop(1,"#C98A12"); x.fillStyle=tg; x.shadowColor="rgba(255,190,80,.6)"; x.shadowBlur=18;
    fitText(x,title,W/2,Y+h*(sub?.42:.5),w*.86,V?62:58,900,"title",24); x.shadowBlur=0; if(sub){ x.fillStyle="#F3D9A4"; fitText(x,sub,W/2,Y+h*.72,w*.84,V?30:26,700,"kid",14); } x.restore(); }
  function theatre(x,t,pt){ x.drawImage(layer("th",thBack),0,0,W,H);
    let open=1; if(pt.k==="intro") open=eo((t-.5)/1.8); if(pt.k==="fin") open=1-eo((t-pt.a-1.4)/1.6);
    const it=pt.k==="item"||pt.k==="quiz"?items[pt.i]:null, ex=pt.k==="item"&&hasEx(it), kx=pt.k==="item"?(V?W/2:ex?W*.36:W/2):W/2, kk=it?(it.cle||nameOf(it)):"", kpx=it?keyPx(kk):200, ky=pt.k==="item"&&!V?TH.floor-kpx*.4:V?H*.34:Q?H*.38:H*.44;
    const hot=pt.k==="item"&&pt.reps.some(r=>t>=r.cue&&t<r.toi[1])?1:0; lit(x,"spots",q=>thSpots(q,t,kx,ky,hot,hot?"#FFB3C7":"#FFE7B8"));
    if(pt.k==="item"){ const sp=spr(it.cle||nameOf(it),keyPx(it.cle||nameOf(it)),pt.i), land=pt.a+.75, dt=t-pt.a, fall=ebo(dt/.75), y0=-H*.35, y=lerp(y0,ky,fall);
      const sq=dt>.72&&dt<1.05?Math.sin((dt-.72)/.33*Math.PI)*.12:0, rep=pt.reps.find(r=>t>=r.say[0]&&t<r.say[1]+.2), pulse=1+.025*Math.sin(t*2.4)+.06*talk(t)+(rep?.05*Math.sin((t-rep.say[0])*9):0), sx=(1+sq)*pulse, sy=(1-sq)*pulse;
      const h=Math.max(0,ky-y), sh=cl(1-h/H); x.save(); x.fillStyle=`rgba(0,0,0,${.45*sh})`; x.beginPath(); x.ellipse(kx,TH.floor+16,sp.w*.36*(.4+.6*sh),sp.w*.06,0,0,7); x.fill(); x.restore();
      x.save(); x.translate(kx,y); x.rotate(Math.sin(t*1.1)*.02); x.scale(sx,sy); x.drawImage(sp.c,-sp.w/2,-sp.h/2,sp.w,sp.h); shine(x,sp,-sp.w/2,-sp.h/2,((t-pt.a)%3)/1.2,K); x.restore();
      if(dt>.72) confetti(x,t,land,kx,ky+kpx*.3,46,["#FFC23D","#FF4D79","#2ED68C","#4D9DFF","#fff"],1,pt.i);
      const nm=it.nom&&it.nom!==it.cle?it.nom:"", ph=[nm,it.phon].filter(Boolean).join(" · "); if(ph){ const a=sm((t-pt.a-.9)/.4); x.save(); x.globalAlpha=a; x.textAlign="center"; x.textBaseline="middle"; x.fillStyle="#FFE2A0"; x.shadowColor="rgba(0,0,0,.7)"; x.shadowBlur=10; fitText(x,ph,kx,V?ky+kpx*.66:TH.floor+(H-TH.floor)*.32,V?W*.8:W*.42,V?52:44,800,"kid",16); x.restore(); }
      if(ex){ const ea=t-pt.ex, a=sm(ea/.3), s=eb(ea/.5), ex0=V?(AVON()?W*.3:W/2):W*.74, ey=V?H*.6:Q?H*.62:H*.47, R=V?120:Q?96:118; if(ea>0){ x.save(); x.globalAlpha=a; x.translate(ex0,ey); x.scale(s,s);
          const bob=Math.sin(t*2)*8, rot=.86+.14*Math.cos(t*1.6); x.fillStyle="rgba(0,0,0,.35)"; x.beginPath(); x.ellipse(0,R*1.25,R*.8,R*.16,0,0,7); x.fill();
          const pg=x.createLinearGradient(-R,R*.9,R,R*1.3); pg.addColorStop(0,"#B8862A"); pg.addColorStop(.5,"#FFE08A"); pg.addColorStop(1,"#8A5A1C"); x.fillStyle=pg; x.beginPath(); x.ellipse(0,R*1.05,R*.82,R*.2,0,0,7); x.fill();
          const hg=x.createRadialGradient(0,bob-R*.1,R*.2,0,bob,R*1.15); hg.addColorStop(0,"rgba(255,230,170,.55)"); hg.addColorStop(1,"rgba(255,230,170,0)"); x.fillStyle=hg; x.beginPath(); x.arc(0,bob,R*1.15,0,7); x.fill();
          x.save(); x.translate(0,bob); x.scale(rot,1); drawEmoji(x,it.image,0,0,R*1.45); x.restore();
          if(it.mot){ const mw=Math.min(V?(AVON()?W*.5:W*.8):W*.4, R*3.4), my=R*1.62; rr(x,-mw/2,my-R*.32,mw,R*.64,14); const wg=x.createLinearGradient(0,my-R*.3,0,my+R*.3); wg.addColorStop(0,"#4A2712"); wg.addColorStop(1,"#2A140A"); x.fillStyle=wg; x.fill(); x.lineWidth=4; x.strokeStyle="#E8B54A"; x.stroke();
            x.fillStyle="#FFF4D6"; x.textAlign="center"; x.textBaseline="middle"; fitText(x,it.mot,0,my+2,mw*.88,V?44:38,800,"kid",14); if(it.sens){ x.fillStyle="#F3D9A4"; fitText(x,it.sens,0,my+R*.52,mw,V?24:20,600,"kid",11); } }
          x.restore(); } }
      pt.reps.forEach(r=>{ banner(x,T.repete,W/2,V?H*.13:H*.2,V?40:34,t,r.cue,r.toi[0],{c1:"#FF6A95",c2:"#C2185B"}); if(t>=r.toi[0]&&t<r.toi[1]+.2){ const f=(t-r.toi[0])/(r.toi[1]-r.toi[0]); ring(x,kx,ky,keyPx(it.cle||nameOf(it))*.78,f,"#FFD36B",10); banner(x,T.toi,W/2,V?H*.13:H*.2,V?44:38,t,r.toi[0],r.toi[1]+.2,{c1:"#FFC23D",c2:"#E07A00",edge:"#fff"}); } });
      thAudience(x,t,L.chorus&&pt.reps.some(r=>r.chorus&&t>=r.chorus[0]&&t<r.chorus[1])?1:.15); }
    else if(pt.k==="quiz"){ const ia=items[pt.i], a=sm((t-pt.a)/.4), rev=t>=pt.rev, qy=V?H*.4:H*.47, R=V?190:150; x.save(); x.fillStyle=`rgba(0,0,0,${.35*a})`; x.fillRect(0,0,W,H); x.restore(); lit(x,"spots2",q=>thSpots(q,t,W/2,qy,0,"#FFFFFF"));
      banner(x,T.quiz,W/2,V?H*.11:H*.12,V?44:38,t,pt.a+.3,pt.b-.2,{c1:"#7C4DFF",c2:"#4A148C"});
      if(!rev){ if(ia.image) drawEmoji(x,ia.image,W/2,qy,R*1.35); else { const sp=spr(kk,keyPx(kk)*.8,pt.i); x.drawImage(sp.c,W/2-sp.w/2,qy-sp.h/2,sp.w,sp.h); }
        const f=cl((t-pt.count[0])/3), n=Math.max(1,3-Math.floor((t-pt.count[0]))); if(t>=pt.count[0]){ ring(x,W/2,qy,R,f,"#B388FF",12); const bx=W/2+R*.75, by=qy+R*.75; x.save(); x.fillStyle="#4A148C"; x.strokeStyle="#B388FF"; x.lineWidth=5; x.beginPath(); x.arc(bx,by,V?52:44,0,7); x.fill(); x.stroke(); x.font=`900 ${V?64:54}px ${F.title}`; x.fillStyle="#fff"; x.textAlign="center"; x.textBaseline="middle"; x.fillText(String(n),bx,by+3); x.restore(); } }
      else { const sp=spr(kk,keyPx(kk)*.9,pt.i), s=eb((t-pt.rev)/.45); x.save(); x.translate(W/2,qy); x.scale(s,s); x.drawImage(sp.c,-sp.w/2,-sp.h/2,sp.w,sp.h); x.restore(); confetti(x,t,pt.rev,W/2,qy,60,["#FFC23D","#FF4D79","#2ED68C","#4D9DFF","#fff"],1.1,pt.i+50);
        const nm=nameOf(ia); if(ia.image||nm!==(ia.cle||"")){ x.save(); x.textAlign="center"; x.textBaseline="middle"; x.fillStyle="#FFE2A0"; x.shadowColor="rgba(0,0,0,.7)"; x.shadowBlur=10; fitText(x,ia.image&&ia.mot?ia.mot:nm,W/2,qy+keyPx(kk)*.62,W*.8,V?52:44,800,"kid",14); x.restore(); } } }
    else if(pt.k==="recap"){ banner(x,T.revise,W/2,V?H*.12:H*.16,V?40:34,t,pt.a+.2,pt.b,{c1:"#2ED68C",c2:"#0E7A4B"}); recapGrid(x,t,pt,V?H*.22:H*.27,V?H*.62:TH.floor-H*.31,"theatre"); }
    else if(pt.k==="song"){ songContent(x,t,pt,null); thAudience(x,t,.8); }
    else if(pt.k==="fin"){ const a=sm((t-pt.a)/.5); confetti(x,t,pt.a+.2,W*.3,H*.6,70,["#FFC23D","#FF4D79","#2ED68C","#4D9DFF","#fff"],1.2,7); confetti(x,t,pt.a+.5,W*.7,H*.6,70,["#FFC23D","#FF4D79","#2ED68C","#4D9DFF","#fff"],1.2,9);
      x.save(); x.globalAlpha=a; x.textAlign="center"; x.textBaseline="middle"; const tg=x.createLinearGradient(0,H*.3,0,H*.5); tg.addColorStop(0,"#FFF4C2"); tg.addColorStop(1,"#E0A42A"); x.fillStyle=tg; x.shadowColor="rgba(255,190,80,.7)"; x.shadowBlur=30; const s=eb((t-pt.a)/.6); x.translate(W/2,H*.42); x.scale(s,s); fitText(x,T.bravo,0,0,W*.8,V?120:110,900,isAr(T.bravo)?"kid":"title",30); x.restore(); }
    if(pt.k==="intro") thMarquee(x,t,sm((t-1.2)/.6)*sm((pt.b-t)/.4),L.titre,L.sous_titre||T.lecon);
    avatarSolo(x,t,pt); thCurtains(x,t,open); if(pt.k==="fin"&&open<.2) thMarquee(x,t,sm((t-pt.a-2.6)/.5),T.bravo,L.titre); }

  /* ==================== DAARA DE LUMIÈRE ==================== */
  const DB=V?{x:W*.05,y:H*.07,w:W*.9,h:H*.44}:Q?{x:W*.18,y:H*.04,w:W*.78,h:H*.56}:{x:W*.46,y:H*.07,w:W*.5,h:H*.8};   /* tablette */
  const DC=V?{x:-W*.04,y:H*.47,w:W*1.08,h:H*.55}:Q?{x:-W*.08,y:H*.46,w:W*.8,h:H*.56}:{x:-W*.02,y:H*.1,w:W*.52,h:H*.92};   /* la classe en 3D */
  function daBack(x){ const sky=x.createLinearGradient(0,0,0,H*.7); sky.addColorStop(0,"#F6B26B"); sky.addColorStop(.55,"#F7D49A"); sky.addColorStop(1,"#FBE7C2"); x.fillStyle=sky; x.fillRect(0,0,W,H);
    x.fillStyle="rgba(120,70,40,.45)"; for(let i=0;i<7;i++){ const px=W*(.05+i*.16), py=H*.62; x.fillRect(px,py-H*.2,5,H*.2); for(let k=0;k<6;k++){ const a=-Math.PI*.9+k*Math.PI/5.5; x.beginPath(); x.ellipse(px+2+Math.cos(a)*30,py-H*.2+Math.sin(a)*12,34,8,a,0,7); x.fill(); } }
    /* mur ocre et arcades */
    const n=V?3:Q?3:5, aw=W/n; x.save(); x.beginPath(); x.rect(0,0,W,H*.74); for(let i=0;i<n;i++){ const cx=aw*(i+.5), w=aw*.62, top=H*(V?.16:.2), bot=H*.74; x.moveTo(cx-w/2,bot); x.lineTo(cx-w/2,top+w*.5); x.quadraticCurveTo(cx-w/2,top-w*.05,cx,top-w*.32); x.quadraticCurveTo(cx+w/2,top-w*.05,cx+w/2,top+w*.5); x.lineTo(cx+w/2,bot); x.closePath(); }
    const wall=x.createLinearGradient(0,0,0,H*.74); wall.addColorStop(0,"#E9C89A"); wall.addColorStop(1,"#C99A66"); x.fillStyle=wall; x.fill("evenodd"); x.restore();
    for(let i=0;i<n;i++){ const cx=aw*(i+.5), w=aw*.62, top=H*(V?.16:.2); x.strokeStyle="#9C6A3A"; x.lineWidth=6; x.beginPath(); x.moveTo(cx-w/2,H*.74); x.lineTo(cx-w/2,top+w*.5); x.quadraticCurveTo(cx-w/2,top-w*.05,cx,top-w*.32); x.quadraticCurveTo(cx+w/2,top-w*.05,cx+w/2,top+w*.5); x.lineTo(cx+w/2,H*.74); x.stroke();
      x.strokeStyle="rgba(255,240,210,.5)"; x.lineWidth=2; x.stroke(); }
    x.fillStyle="#8E5A32"; x.fillRect(0,H*.735,W,6);
    /* natte tressée en perspective */
    const fy=H*.74, mg=x.createLinearGradient(0,fy,0,H); mg.addColorStop(0,"#C8964F"); mg.addColorStop(1,"#7A5228"); x.fillStyle=mg; x.fillRect(0,fy,W,H-fy);
    for(let k=0;k<14;k++){ const yy=fy+(H-fy)*Math.pow(k/14,1.5); x.strokeStyle=k%2?"rgba(90,50,20,.35)":"rgba(255,220,160,.25)"; x.lineWidth=2; x.beginPath(); x.moveTo(0,yy); x.lineTo(W,yy); x.stroke(); }
    for(let i=-20;i<=20;i++){ x.strokeStyle="rgba(90,50,20,.18)"; x.beginPath(); x.moveTo(W/2+i*W*.03,fy); x.lineTo(W/2+i*W*.12,H); x.stroke(); }
    const vg=x.createRadialGradient(W/2,H*.45,Math.min(W,H)*.3,W/2,H*.5,Math.max(W,H)*.8); vg.addColorStop(0,"rgba(60,25,5,0)"); vg.addColorStop(1,"rgba(60,25,5,.45)"); x.fillStyle=vg; x.fillRect(0,0,W,H); }
  function daBoard(x){ const b=DB, tab={w:b.w*.16,h:b.h*.09}; tab.x=b.x+b.w/2-tab.w/2; tab.y=b.y-tab.h*.8;
    const shape=()=>{ x.beginPath(); x.moveTo(tab.x,tab.y+tab.h); x.lineTo(tab.x,tab.y+tab.h*.3); x.quadraticCurveTo(tab.x,tab.y,tab.x+tab.w*.3,tab.y); x.lineTo(tab.x+tab.w*.7,tab.y); x.quadraticCurveTo(tab.x+tab.w,tab.y,tab.x+tab.w,tab.y+tab.h*.3); x.lineTo(tab.x+tab.w,tab.y+tab.h); x.lineTo(b.x+b.w-24,b.y); x.quadraticCurveTo(b.x+b.w,b.y,b.x+b.w,b.y+24); x.lineTo(b.x+b.w,b.y+b.h-30); x.quadraticCurveTo(b.x+b.w,b.y+b.h,b.x+b.w-30,b.y+b.h); x.lineTo(b.x+30,b.y+b.h); x.quadraticCurveTo(b.x,b.y+b.h,b.x,b.y+b.h-30); x.lineTo(b.x,b.y+24); x.quadraticCurveTo(b.x,b.y,b.x+24,b.y); x.closePath(); };
    x.save(); x.shadowColor="rgba(60,30,10,.5)"; x.shadowBlur=40; x.shadowOffsetY=16; x.fillStyle="#D9BC86"; shape(); x.fill(); x.restore();
    x.save(); shape(); x.clip(); const wg=x.createLinearGradient(b.x,0,b.x+b.w,0); wg.addColorStop(0,"#E2C792"); wg.addColorStop(.5,"#F2DFB6"); wg.addColorStop(1,"#DDBF88"); x.fillStyle=wg; x.fillRect(b.x,tab.y,b.w,b.h+tab.h);
    x.strokeStyle="rgba(120,80,40,.15)"; x.lineWidth=1.4; for(let i=0;i<40;i++){ const yy=b.y+b.h*(i/40); x.beginPath(); for(let px=0;px<=b.w;px+=10) x.lineTo(b.x+px,yy+Math.sin(px/b.w*6+i*1.3)*4+Math.sin(px/b.w*17+i)*1.5); x.stroke(); }
    const lg=x.createRadialGradient(b.x+b.w*.3,b.y+b.h*.2,10,b.x+b.w*.3,b.y+b.h*.2,b.w); lg.addColorStop(0,"rgba(255,250,230,.35)"); lg.addColorStop(1,"rgba(255,250,230,0)"); x.fillStyle=lg; x.fillRect(b.x,b.y,b.w,b.h); x.restore();
    x.lineWidth=6; x.strokeStyle="#9C6A3A"; shape(); x.stroke(); x.fillStyle="#6B4426"; x.beginPath(); x.arc(tab.x+tab.w/2,tab.y+tab.h*.45,tab.h*.17,0,7); x.fill(); }
  function daLight(x0,t){ let x; const [lc,q]=halfLayer("rays"); x=q; x.save(); x.globalCompositeOperation="lighter"; const n=V?3:5; for(let i=0;i<n;i++){ const cx=W*(i+.5)/n, a=.06+.04*Math.sin(t*.5+i); const gr=x.createLinearGradient(cx,H*.2,cx+W*.18,H*.95); gr.addColorStop(0,`rgba(255,214,150,${a})`); gr.addColorStop(1,"rgba(255,214,150,0)"); x.fillStyle=gr; x.beginPath(); x.moveTo(cx-W*.05,H*.2); x.lineTo(cx+W*.05,H*.2); x.lineTo(cx+W*.28,H); x.lineTo(cx+W*.08,H); x.closePath(); x.fill(); }
    [[.08,.12],[.92,.12]].forEach(([fx,fy],k)=>{ if(!V&&fx>.5&&!Q) return; const lx=W*fx, ly=H*fy+Math.sin(t*1.2+k)*4, fl=.8+.2*Math.sin(t*9+k*3)*Math.sin(t*5.3+k); const lg=x.createRadialGradient(lx,ly+30,4,lx,ly+30,150); lg.addColorStop(0,`rgba(255,190,90,${.55*fl})`); lg.addColorStop(1,"rgba(255,190,90,0)"); x.fillStyle=lg; x.beginPath(); x.arc(lx,ly+30,150,0,7); x.fill(); });
    for(let k=0;k<34;k++){ const px=(rnd(k)*W+t*(6+rnd(k+3)*10))%W, py=(rnd(k+11)*H*.8+Math.sin(t*.5+k)*24); x.globalAlpha=.25+.35*Math.max(0,Math.sin(t*1.3+k)); x.fillStyle="#FFE3A6"; x.beginPath(); x.arc(px,py,1+rnd(k+4)*2.2,0,7); x.fill(); } x.restore(); x0.save(); x0.globalCompositeOperation="lighter"; x0.drawImage(lc,0,0,W,H); x0.restore(); x=x0;
    [[.08,.12],[.92,.12]].forEach(([fx,fy],k)=>{ if(!V&&fx>.5&&!Q) return; const lx=W*fx, ly=H*fy+Math.sin(t*1.2+k)*4; x.save(); x.strokeStyle="#5B3A1E"; x.lineWidth=2; x.beginPath(); x.moveTo(lx,0); x.lineTo(lx,ly); x.stroke(); x.fillStyle="#7A4A22"; rr(x,lx-16,ly,32,52,8); x.fill(); x.fillStyle="rgba(255,200,110,.95)"; rr(x,lx-11,ly+8,22,36,6); x.fill(); x.restore(); }); }
  /* le calame : la plume de roseau qui écrit au bord de l'encre */
  function qalam(x,px,py,s){ x.save(); x.translate(px,py); x.rotate(-.75); const gr=x.createLinearGradient(-6*s,0,6*s,0); gr.addColorStop(0,"#8A5A2B"); gr.addColorStop(.5,"#D9A86A"); gr.addColorStop(1,"#7A4A1E"); x.fillStyle=gr; x.beginPath(); x.moveTo(-5*s,-150*s); x.lineTo(5*s,-150*s); x.lineTo(6*s,-12*s); x.lineTo(0,6*s); x.lineTo(-6*s,-12*s); x.closePath(); x.fill(); x.fillStyle="#1B120A"; x.beginPath(); x.moveTo(-3*s,-6*s); x.lineTo(3*s,-6*s); x.lineTo(0,6*s); x.closePath(); x.fill(); x.restore(); }
  /* texte écrit à l'encre sur la tablette, révélé au fil du calame (de droite à gauche en arabe) */
  function written(x,txt,cx,cy,maxw,px,t0,t,dur,kind){ x.save(); x.textAlign="center"; x.textBaseline="middle"; let s=px; for(;s>16;s-=2){ x.font=fontOf(txt,700,s,kind||"ink"); if(x.measureText(txt).width<=maxw) break; } x.font=fontOf(txt,700,s,kind||"ink"); const rtl=isAr(txt); x.direction=rtl?"rtl":"ltr";
    const w=x.measureText(txt).width, f=eo((t-t0)/dur); if(f<=0){ x.restore(); return s; } const X0=rtl?cx+w/2-w*f:cx-w/2, edge=rtl?cx+w/2-w*f:cx-w/2+w*f;
    x.save(); x.beginPath(); x.rect(rtl?X0-4:X0-4,cy-s*1.1,w*f+8,s*2.2); x.clip(); x.shadowColor="rgba(40,20,5,.25)"; x.shadowBlur=2; if(rtl) inkText(x,txt,cx,cy,"#1E140C",s); else { x.fillStyle="#1E140C"; x.fillText(txt,cx,cy); } x.restore();
    if(f<1) qalam(x,edge,cy+s*.2,s/150); x.restore(); return s; }
  function daara(x,t,pt){ x.drawImage(layer("da",daBack),0,0,W,H); daLight(x,t); x.drawImage(layer("db",daBoard),0,0,W,H);
    const b=DB, cx=b.x+b.w/2, it=pt.k==="item"||pt.k==="quiz"?items[pt.i]:null, ex=pt.k==="item"&&hasEx(it);
    if(pt.k==="intro"){ const a=sm((t-.9)/.5); x.save(); x.globalAlpha=a; written(x,L.titre,cx,b.y+b.h*.4,b.w*.84,V?80:72,.9,t,1.4,isAr(L.titre)?"ink":"kid"); if(L.sous_titre||T.lecon){ x.fillStyle="#7A4A22"; x.textAlign="center"; x.textBaseline="middle"; fitText(x,L.sous_titre||T.lecon,cx,b.y+b.h*.62,b.w*.8,V?34:30,700,"kid",14); } x.restore(); }
    if(pt.k==="item"){ const key=it.cle||nameOf(it), ky=b.y+b.h*(ex?.3:.42), kp=keyPx(key)*(V?1:.92)*(ex?.8:1.05);
      const s=written(x,key,cx,ky,b.w*.86,kp,pt.a+.35,t,.85,isAr(key)?"ink":"kid"); const rep=pt.reps.find(r=>t>=r.say[0]&&t<r.say[1]+.2), glow=rep?Math.max(0,Math.sin((t-rep.say[0])*6)):0;
      if(glow>0){ x.save(); x.globalCompositeOperation="lighter"; const gg=x.createRadialGradient(cx,ky,10,cx,ky,s*.9); gg.addColorStop(0,`rgba(255,200,90,${.35*glow})`); gg.addColorStop(1,"rgba(255,200,90,0)"); x.fillStyle=gg; x.beginPath(); x.arc(cx,ky,s*.9,0,7); x.fill(); x.restore(); }
      const nm=it.nom&&it.nom!==it.cle?it.nom:"", ph=[nm,it.phon].filter(Boolean).join(" · "); if(ph){ const a=sm((t-pt.a-1.2)/.4); x.save(); x.globalAlpha=a; x.fillStyle="#8A3B12"; x.textAlign="center"; x.textBaseline="middle"; fitText(x,ph,cx,ky+s*(isAr(key)?.66:.6),b.w*.84,V?50:42,800,"kid",14); x.restore(); }
      if(ex){ const ea=t-pt.ex, a=sm(ea/.3), sc=eb(ea/.5), cy2=b.y+b.h*.8, cw=Math.min(b.w*.86,V?560:440), ch=b.h*.24; if(ea>0){ x.save(); x.globalAlpha=a; x.translate(cx,cy2); x.scale(sc,sc); x.rotate(-.015);
          rr(x,-cw/2,-ch/2,cw,ch,18); x.fillStyle="#FFFBF0"; x.shadowColor="rgba(60,30,10,.35)"; x.shadowBlur=14; x.shadowOffsetY=6; x.fill(); x.shadowColor="transparent"; x.lineWidth=3; x.strokeStyle="#C98A3A"; x.stroke();
          x.fillStyle="#7A4A22"; x.beginPath(); x.arc(0,-ch/2+6,8,0,7); x.fill();
          const im=ch*.78, rtlW=isAr(it.mot||""), ix=it.mot?(rtlW?cw/2-im*.65:-cw/2+im*.65):0; drawEmoji(x,it.image,ix,Math.sin(t*2.2)*3,im);
          if(it.mot){ x.textAlign="center"; x.textBaseline="middle"; x.save(); x.font=fontOf(it.mot,700,V?54:46,"ink"); x.direction=rtlW?"rtl":"ltr"; const mx=it.image?(rtlW?-im*.55:im*.55):0; let s2=V?54:46; for(;s2>14;s2-=2){ x.font=fontOf(it.mot,700,s2,"ink"); if(x.measureText(it.mot).width<=cw-im*1.5) break; }
            if(rtlW) inkText(x,it.mot,mx,it.sens?-ch*.1:0,"#2A1A0E",s2); else { x.fillStyle="#2A1A0E"; x.fillText(it.mot,mx,it.sens?-ch*.1:0); } x.restore(); if(it.sens){ x.fillStyle="#8A5A2B"; fitText(x,it.sens,it.image?(rtlW?-im*.55:im*.55):0,ch*.28,cw-im*1.5,V?24:20,600,"kid",11); } }
          x.restore(); } }
      pt.reps.forEach(r=>{ banner(x,T.repete,cx,b.y+b.h*.06,V?36:30,t,r.cue,r.toi[0],{c1:"#1F8A5B",c2:"#0D5A3A",edge:"#F2C94C"}); if(t>=r.toi[0]&&t<r.toi[1]+.2){ const f=(t-r.toi[0])/(r.toi[1]-r.toi[0]); ring(x,cx,ky,Math.min(b.w,b.h)*.36,f,"#E8A33D",9,"rgba(120,80,40,.18)"); banner(x,T.toi,cx,b.y+b.h*.06,V?40:34,t,r.toi[0],r.toi[1]+.2,{c1:"#E8A33D",c2:"#B86A12",edge:"#fff"}); } }); }
    else if(pt.k==="quiz"){ const ia=items[pt.i], ky=b.y+b.h*.45; banner(x,T.quiz,cx,b.y+b.h*.06,V?36:30,t,pt.a+.3,pt.b-.2,{c1:"#6D4C9F",c2:"#3E2A63",edge:"#F2C94C"});
      if(t<pt.rev){ if(ia.image) drawEmoji(x,ia.image,cx,ky,V?260:220); else written(x,ia.cle||nameOf(ia),cx,ky,b.w*.8,keyPx(ia.cle||nameOf(ia)),pt.a+.2,t,.6,isAr(ia.cle)?"ink":"kid");
        if(t>=pt.count[0]){ const f=cl((t-pt.count[0])/3); ring(x,cx,ky,Math.min(b.w,b.h)*.36,f,"#6D4C9F",10,"rgba(120,80,40,.18)"); } }
      else { const ans=ia.image&&ia.cle?ia.cle:nameOf(ia); written(x,ans,cx,ky,b.w*.84,keyPx(ans),pt.rev,t,.7,isAr(ans)?"ink":"kid"); burst(x,t,pt.rev+.5,cx,ky,Math.min(b.w,b.h)*.42,"#E8A33D",10); } }
    else if(pt.k==="recap"){ banner(x,T.revise,cx,b.y+b.h*.06,V?36:30,t,pt.a+.2,pt.b,{c1:"#1F8A5B",c2:"#0D5A3A",edge:"#F2C94C"}); recapGrid(x,t,pt,b.y+b.h*.14,b.h*.8,"daara",b); }
    else if(pt.k==="song") songContent(x,t,pt,b);
    else if(pt.k==="fin"){ const s=written(x,T.bravo,cx,b.y+b.h*.42,b.w*.84,V?120:100,pt.a+.3,t,1,isAr(T.bravo)?"ink":"kid"); burst(x,t,pt.a+1.3,cx,b.y+b.h*.42,s*1.2,"#E8A33D",12); x.save(); x.fillStyle="#7A4A22"; x.textAlign="center"; x.textBaseline="middle"; x.globalAlpha=sm((t-pt.a-1.5)/.5); fitText(x,L.titre,cx,b.y+b.h*.7,b.w*.8,V?34:30,700,"kid",14); x.restore(); }
    /* la classe : l'oustaz montre la tablette et récite ; les talibés répètent */
    if(L.personnage&&AV&&AV.ready()){ const chorusOn=P.say.some(z=>z.chorus&&t>=z.t&&t<z.t+z.d+.1), m=talk(t), mk=kids(t), r=pt.k==="item"?pt.reps.find(q=>t>=q.cue&&t<q.toi[1]):null, point=pt.k==="item"?(t<pt.v[1]+.3?cl((t-pt.a-.2)/.4):r&&t<r.say[1]?1:0):pt.k==="quiz"?1:0;
      const say0=P.say.filter(z=>!z.chorus&&z.t<=t).pop(), since=say0?t-say0.t:9, sl=pt.k==="song"?songLine(pt,t):null, p2=pt.k==="song"?{prof:{mouth:m,speak:m>.05,since:sl?t-sl.a:9,point:sl&&sl.i>=0?1:0,up:V||Q?1:.35,side:1,rock:true},kids:{mouth:sl&&sl.chorus?Math.max(mk,m*.85):mk,speak:!!(sl&&sl.chorus),rock:true}}:chorusOn?{prof:{listen:true,look:{x:0,y:-.35}},kids:{mouth:mk,speak:mk>.05,since:t-(P.say.filter(z=>z.chorus&&z.t<=t).pop()||{t:0}).t,rock:true}}:{prof:{mouth:m,speak:m>.05,since,point,up:V||Q?1:.35,side:1,rock:m>.05},kids:{listen:true,rock:false}};
      const profile=L.avatar||(AV.defaultFor&&AV.defaultFor(L.langue))||"omar", q=AV.profiles&&AV.profiles[profile], c=AV.render(DC.w*K,DC.h*K,t,p2,{scene:"daara",profile,style:(o.avatar||{}).style||(q&&q.style)||"blanc",skin:(o.avatar||{}).skin||(q&&q.skin)||"fonce"}); if(c) x.drawImage(c,DC.x,DC.y,DC.w,DC.h); } }

  /* ==================== GRANDE AVENTURE ==================== */
  const SKIES=[{n:"aube",s:["#FF9A8B","#FECFEF","#FFE5B4"],m:["#B07A9E","#8C5A84"],h:["#7FB77E","#4E8F5A"],sun:"#FFD27A",night:0},{n:"jour",s:["#4FACFE","#8FD3FE","#D9F4FF"],m:["#7B9CC6","#5B7FAE"],h:["#6CC46A","#3E9A4A"],sun:"#FFF4B0",night:0},
    {n:"or",s:["#F7971E","#FFD200","#FFF1C1"],m:["#C27B5C","#9B5A44"],h:["#9BB84A","#6D8F33"],sun:"#FFE08A",night:0},{n:"soir",s:["#41295A","#B4507A","#F59E6B"],m:["#5B3D6E","#3E2850"],h:["#4E6B4A","#2F4A35"],sun:"#FFB36B",night:.4},
    {n:"nuit",s:["#0B1026","#1B2A5A","#3A4A8A"],m:["#26315E","#1A2348"],h:["#1F3B35","#132722"],sun:"#F4F1E0",night:1}];
  const skyIdx=pt=>pt.k==="intro"?0:pt.k==="item"?1+pt.i%3:pt.k==="quiz"?4:pt.k==="recap"?4:0;
  function avSky(pt,t){ const i=skyIdx(pt), prev=parts[parts.indexOf(pt)-1], j=prev?skyIdx(prev):i, f=sm((t-pt.a)/1.4); const A=SKIES[j], B=SKIES[i]; return {f,A,B,c:(k,n)=>mix(A[k][n],B[k][n],f), sun:mix(A.sun,B.sun,f), night:lerp(A.night,B.night,f)}; }
  const ridge=(x,seed,amp,base,par,t,cols)=>{ const pan=t*par; x.beginPath(); x.moveTo(0,H); for(let px=0;px<=W+10;px+=10){ const u=(px+pan)/W; const y=base-amp*(.55*Math.sin(u*2.1+seed)+.3*Math.sin(u*5.3+seed*2)+.15*Math.sin(u*11.7+seed*3)); x.lineTo(px,y); } x.lineTo(W,H); x.closePath(); const gr=x.createLinearGradient(0,base-amp,0,H); gr.addColorStop(0,cols[0]); gr.addColorStop(1,cols[1]); x.fillStyle=gr; x.fill(); };
  function cloud(x,cx,cy,s,a,col){ x.save(); x.globalAlpha=a; x.fillStyle=col; [[0,0,1],[-.9,.15,.7],[.9,.18,.75],[-.45,-.35,.72],[.4,-.4,.8]].forEach(([dx,dy,r])=>{ x.beginPath(); x.arc(cx+dx*s,cy+dy*s,r*s,0,7); x.fill(); }); x.restore(); }
  function aventure(x0,t,pt){ let [bgc,x]=halfLayer("land"); const sk=avSky(pt,t), sky=x.createLinearGradient(0,0,0,H*.75); sky.addColorStop(0,sk.c("s",0)); sky.addColorStop(.6,sk.c("s",1)); sky.addColorStop(1,sk.c("s",2)); x.fillStyle=sky; x.fillRect(0,0,W,H);
    if(sk.night>0){ x.save(); for(let k=0;k<120;k++){ const sx=rnd(k)*W, sy=rnd(k+40)*H*.62; x.globalAlpha=sk.night*(.4+.6*Math.abs(Math.sin(t*1.7+k))); x.fillStyle="#fff"; x.beginPath(); x.arc(sx,sy,rnd(k+7)*1.6+.4,0,7); x.fill(); } x.restore(); }
    const sunX=W*(.78-.1*sk.night), sunY=H*(.2+.05*Math.sin(t*.05)), sr=V?70:60; x.save(); x.globalCompositeOperation="lighter"; const sg=x.createRadialGradient(sunX,sunY,sr*.2,sunX,sunY,sr*(4-2.4*sk.night)); sg.addColorStop(0,hex("#FFFFFF",.9)); sg.addColorStop(.15,sk.sun); sg.addColorStop(1,"rgba(255,220,150,0)"); x.globalAlpha=.85; x.fillStyle=sg; x.beginPath(); x.arc(sunX,sunY,sr*(4-2.4*sk.night),0,7); x.fill();
    for(let k=1;k<=4;k++){ const fx=lerp(sunX,W/2,k*.45), fy=lerp(sunY,H*.55,k*.45); x.globalAlpha=.08*(1-sk.night*.6); x.fillStyle=["#9EE7FF","#FFB3E6","#FFE08A","#B3FFC9"][k-1]; x.beginPath(); x.arc(fx,fy,sr*(.3+k*.18),0,7); x.fill(); } x.restore();
    for(let k=0;k<6;k++){ const cxp=((rnd(k)*W*1.4+t*(10+k*4))%(W*1.4))-W*.2, cy=H*(.1+rnd(k+3)*.25); cloud(x,cxp,cy,(V?44:38)+rnd(k+5)*30,.75-sk.night*.62,sk.night>.5?"#2E3766":"#FFFFFF"); }
    ridge(x,1.3,H*.1,H*(V?.5:.55),12,t,[sk.c("m",0),sk.c("m",1)]); ridge(x,4.1,H*.07,H*(V?.6:.66),30,t,[sk.c("h",0),sk.c("h",1)]); ridge(x,7.7,H*.05,H*(V?.72:.8),70,t,[mix(sk.B.h[0],"#2F6B2F",.4),mix(sk.B.h[1],"#1E4A1E",.4)]);
    for(let k=0;k<26;k++){ const fx=((rnd(k)*W*1.5-t*70)%(W*1.5)+W*1.5)%(W*1.5)-W*.25, fy=H*(V?.78:.86)+rnd(k+2)*H*.08; x.fillStyle=["#FF6B9A","#FFD84D","#FFFFFF","#B48CFF"][k%4]; x.beginPath(); x.arc(fx,fy+Math.sin(t*3+k)*2,3+rnd(k+1)*3,0,7); x.fill(); }
    if(Math.floor(t/9)%2===0){ const bt=(t%9)/9; x.save(); x.strokeStyle=sk.night>.5?"rgba(220,230,255,.7)":"rgba(40,40,60,.6)"; x.lineWidth=2.2; for(let k=0;k<5;k++){ const bx=-60+bt*(W+120)+k*22, by=H*.18+k%2*14+Math.sin(t*6+k)*3, wv=Math.sin(t*10+k)*6; x.beginPath(); x.moveTo(bx-9,by-wv); x.quadraticCurveTo(bx-4,by-4,bx,by); x.quadraticCurveTo(bx+4,by-4,bx+9,by-wv); x.stroke(); } x.restore(); }
    x0.drawImage(bgc,0,0,W,H); x=x0;
    const it=pt.k==="item"||pt.k==="quiz"?items[pt.i]:null, ex=pt.k==="item"&&hasEx(it), kx=V?W/2:ex?W*.37:W/2, ky=V?H*.3:Q?H*.36:H*.4;
    if(pt.k==="intro"){ const a=sm((t-.8)/.6); const sp=spr(L.titre,Math.min(V?96:104,(V?W*.84:W*.74)/Math.max(4,[...L.titre].length*.52)),3); x.save(); x.globalAlpha=a; const s=lerp(.3,1,eo((t-.8)/1.1)); x.translate(W/2,H*(V?.32:.36)+Math.sin(t*1.4)*6); x.scale(s,s); x.drawImage(sp.c,-sp.w/2,-sp.h/2,sp.w,sp.h); x.restore();
      if(L.sous_titre||T.lecon){ x.save(); x.globalAlpha=sm((t-1.6)/.5); x.textAlign="center"; x.textBaseline="middle"; x.fillStyle="#fff"; x.shadowColor="rgba(0,0,0,.45)"; x.shadowBlur=12; fitText(x,L.sous_titre||T.lecon,W/2,H*(V?.42:.52),W*.8,V?40:34,800,"kid",14); x.restore(); } }
    if(pt.k==="item"){ const key=it.cle||nameOf(it), sp=spr(key,keyPx(key)*1.04,pt.i+2), dt=t-pt.a, fly=eo(dt/1.05), s=lerp(.08,1,fly), y=lerp(H*.55,ky,fly)+Math.sin(t*1.6)*10*fly, X=lerp(W/2,kx,fly);
      const sp0=dt-2.2, spin=sp0>0&&(sp0%7)<1.3?Math.cos((sp0%7)/1.3*Math.PI*2):1, rep=pt.reps.find(r=>t>=r.say[0]&&t<r.say[1]+.2), pulse=1+.06*talk(t)+(rep?.06*Math.sin((t-rep.say[0])*9):0);
      if(dt<1.1){ x.save(); x.globalCompositeOperation="lighter"; for(let k=0;k<14;k++){ const f=cl(fly-k*.04); const tx=lerp(W/2,kx,f), ty=lerp(H*.55,ky,f); x.globalAlpha=(1-k/14)*.5; x.fillStyle=k%2?"#FFE08A":"#9EE7FF"; star(x,tx+Math.sin(k*2)*20,ty+Math.cos(k*3)*20,8,3,5,k); x.fill(); } x.restore(); }
      x.save(); x.translate(X,y); x.rotate(Math.sin(t*1.2)*.04); x.scale(s*pulse*Math.max(.15,Math.abs(spin)),s*pulse); x.globalAlpha=cl(fly*3); x.drawImage(sp.c,-sp.w/2,-sp.h/2,sp.w,sp.h); if(fly>=1) shine(x,sp,-sp.w/2,-sp.h/2,((t-pt.a)%3.5)/1.2,K); x.restore();
      const nm=it.nom&&it.nom!==it.cle?it.nom:"", ph=[nm,it.phon].filter(Boolean).join(" · "); if(ph){ x.save(); x.globalAlpha=sm((t-pt.a-1.1)/.4); x.textAlign="center"; x.textBaseline="middle"; x.fillStyle="#fff"; x.shadowColor="rgba(0,0,0,.55)"; x.shadowBlur=12; fitText(x,ph,kx,ky+keyPx(key)*.66,V?W*.8:W*.44,V?52:44,800,"kid",14); x.restore(); }
      if(ex){ const ea=t-pt.ex; if(ea>0){ const bx=V?(AVON()?W*.32:W*.5):W*.75, by0=V?H*.6:H*.42, by=lerp(H*1.1,by0,eo(ea/1))+Math.sin(t*1.8)*12, R=V?128:110, a=sm(ea/.3); x.save(); x.globalAlpha=a; x.translate(bx,by); const wob=1+.03*Math.sin(t*4);
          const bg=x.createRadialGradient(-R*.3,-R*.3,R*.1,0,0,R); bg.addColorStop(0,"rgba(255,255,255,.35)"); bg.addColorStop(.7,"rgba(255,255,255,.08)"); bg.addColorStop(1,"rgba(180,220,255,.35)"); x.fillStyle=bg; x.beginPath(); x.ellipse(0,0,R*wob,R/wob,0,0,7); x.fill();
          ["rgba(255,120,200,.55)","rgba(120,220,255,.55)","rgba(255,230,120,.5)"].forEach((c,k)=>{ x.strokeStyle=c; x.lineWidth=3; x.beginPath(); x.ellipse(0,0,R*wob-2-k*2,R/wob-2-k*2,0,Math.PI*(.9+k*.4+t*.2),Math.PI*(1.5+k*.4+t*.2)); x.stroke(); });
          x.fillStyle="rgba(255,255,255,.8)"; x.beginPath(); x.ellipse(-R*.42,-R*.45,R*.16,R*.08,-.7,0,7); x.fill(); drawEmoji(x,it.image,0,0,R*1.2); x.restore();
          if(it.mot){ const px2=V?(AVON()?W*.32:W*.5):W*.75, py2=V?H*.78:H*.74, pw=Math.min(V?(AVON()?W*.52:W*.7):W*.36,520), sa=sm((ea-.35)/.3), sg=eb((ea-.35)/.5); if(sa>0){ x.save(); x.globalAlpha=sa; x.translate(px2,py2); x.scale(1,sg); x.fillStyle="#6B4426"; x.fillRect(-7,-10,14,H-py2+10);
              rr(x,-pw/2,-48,pw,96,14); const wg=x.createLinearGradient(0,-48,0,48); wg.addColorStop(0,"#C98A4B"); wg.addColorStop(1,"#8A5A2B"); x.fillStyle=wg; x.fill(); x.strokeStyle="#5B3A1E"; x.lineWidth=4; x.stroke();
              x.fillStyle="#FFF6E0"; x.textAlign="center"; x.textBaseline="middle"; x.shadowColor="rgba(0,0,0,.35)"; x.shadowBlur=6; fitText(x,it.mot,0,it.sens?-10:2,pw*.88,V?50:44,800,"kid",14); if(it.sens){ x.fillStyle="#FFE2B0"; fitText(x,it.sens,0,28,pw*.86,V?24:20,600,"kid",11); } x.restore(); } } } }
      pt.reps.forEach(r=>{ const by=V?H*.1:H*.13; if(t>=r.cue&&t<r.toi[0]){ const a=sm((t-r.cue)/.2), s=eb((t-r.cue)/.4); x.save(); x.globalAlpha=a; x.translate(W/2,by); x.scale(s,s); x.font=fontOf(T.repete,800,V?40:34); x.direction=isAr(T.repete)?"rtl":"ltr"; const w=x.measureText(T.repete).width+60, h=V?72:62;
          rr(x,-w/2,-h/2,w,h,h/2); x.fillStyle="#fff"; x.shadowColor="rgba(0,0,0,.25)"; x.shadowBlur=14; x.fill(); x.shadowColor="transparent"; x.beginPath(); x.moveTo(-20,h/2-2); x.lineTo(0,h/2+22); x.lineTo(14,h/2-2); x.closePath(); x.fill(); x.lineWidth=4; x.strokeStyle="#3A86FF"; rr(x,-w/2,-h/2,w,h,h/2); x.stroke(); x.fillStyle="#1D3557"; x.textAlign="center"; x.textBaseline="middle"; x.fillText(T.repete,0,2); x.restore(); }
        if(t>=r.toi[0]&&t<r.toi[1]+.2){ const f=(t-r.toi[0])/(r.toi[1]-r.toi[0]), R=keyPx(it.cle||nameOf(it))*.8; x.save(); for(let k=0;k<12;k++){ const a=-Math.PI/2+k/12*Math.PI*2, on=k/12<f; x.fillStyle=on?"#FFD84D":"rgba(255,255,255,.35)"; x.shadowColor=on?"#FFD84D":"transparent"; x.shadowBlur=on?14:0; star(x,kx+Math.cos(a)*R,ky+Math.sin(a)*R,on?16:11,on?7:5,5,t*.5); x.fill(); } x.restore(); banner(x,T.toi,W/2,by,V?44:38,t,r.toi[0],r.toi[1]+.2,{c1:"#3A86FF",c2:"#1D4ED8",edge:"#FFD84D"}); } }); }
    else if(pt.k==="quiz"){ const ia=items[pt.i], cy=H*(V?.38:.42); banner(x,T.quiz,W/2,V?H*.1:H*.13,V?40:34,t,pt.a+.3,pt.b-.2,{c1:"#7C4DFF",c2:"#4527A0",edge:"#FFD84D"});
      if(t<pt.rev){ x.save(); x.globalCompositeOperation="lighter"; const gg=x.createRadialGradient(W/2,cy,10,W/2,cy,280); gg.addColorStop(0,"rgba(235,225,255,.95)"); gg.addColorStop(.45,"rgba(190,170,255,.55)"); gg.addColorStop(1,"rgba(180,160,255,0)"); x.fillStyle=gg; x.beginPath(); x.arc(W/2,cy,280,0,7); x.fill(); x.restore();
        if(ia.image) drawEmoji(x,ia.image,W/2,cy+Math.sin(t*2)*8,V?260:220); else { const sp=spr(ia.cle||nameOf(ia),keyPx(ia.cle||nameOf(ia)),pt.i+2); x.drawImage(sp.c,W/2-sp.w/2,cy-sp.h/2,sp.w,sp.h); }
        if(t>=pt.count[0]){ const f=cl((t-pt.count[0])/3); for(let k=0;k<12;k++){ const a=-Math.PI/2+k/12*Math.PI*2, on=k/12<f; x.fillStyle=on?"#FFD84D":"rgba(255,255,255,.3)"; star(x,W/2+Math.cos(a)*(V?200:170),cy+Math.sin(a)*(V?200:170),on?15:10,on?6:4,5,0); x.fill(); } } }
      else { const ans=ia.image&&ia.cle?ia.cle:nameOf(ia), sp=spr(ans,keyPx(ans),pt.i+2), s=eb((t-pt.rev)/.45); x.save(); x.translate(W/2,cy); x.scale(s,s); x.drawImage(sp.c,-sp.w/2,-sp.h/2,sp.w,sp.h); x.restore(); fireworks(x,t,pt.rev,W/2,cy-60,pt.i); } }
    else if(pt.k==="recap"){ banner(x,T.revise,W/2,V?H*.1:H*.13,V?40:34,t,pt.a+.2,pt.b,{c1:"#3A86FF",c2:"#1D4ED8",edge:"#FFD84D"}); recapGrid(x,t,pt,V?H*.2:H*.24,V?H*.5:H*.5,"aventure"); }
    else if(pt.k==="song") songContent(x,t,pt,null);
    else if(pt.k==="fin"){ fireworks(x,t,pt.a+.3,W*.3,H*.3,1); fireworks(x,t,pt.a+.9,W*.7,H*.25,2); fireworks(x,t,pt.a+1.6,W*.5,H*.2,3); const sp=spr(T.bravo,V?110:120,0), s=eb((t-pt.a-.4)/.6); x.save(); x.globalAlpha=sm((t-pt.a-.4)/.3); x.translate(W/2,H*(V?.4:.45)); x.scale(s,s); x.drawImage(sp.c,-sp.w/2,-sp.h/2,sp.w,sp.h); x.restore(); }
    avatarSolo(x,t,pt); }
  function fireworks(x,t,t0,cx,cy,seed){ const dt=t-t0; if(dt<0||dt>2.2) return; x.save(); x.globalCompositeOperation="lighter"; const cols=["#FFD84D","#FF6B9A","#9EE7FF","#B3FFC9","#FFFFFF"];
    if(dt<.45){ x.fillStyle="#FFE9B0"; x.beginPath(); x.arc(cx,cy+(1-dt/.45)*260,4,0,7); x.fill(); } else { const e=dt-.45; for(let k=0;k<36;k++){ const a=k/36*Math.PI*2+seed, sp=170+rnd(k+seed*9)*90, px=cx+Math.cos(a)*sp*eo(e/1.2), py=cy+Math.sin(a)*sp*eo(e/1.2)+60*e*e; x.globalAlpha=cl(1-e/1.7); x.fillStyle=cols[(k+seed)%cols.length]; x.beginPath(); x.arc(px,py,3.2,0,7); x.fill(); } } x.restore(); }

  /* ---------------- la chanson : l'unité chantée apparaît, en grand, avec son image ; au refrain, toutes les unités dansent ---------------- */
  const songLine=(pt,t)=>{ let ln=null; for(const l of pt.lines||[]){ if(l.a<=t+.05) ln=l; else break; } return ln&&t<ln.b+1.2?ln:null; };
  function songContent(x,t,pt,box){ const ln=songLine(pt,t), bp=(pt.bpm||100)/60, beat=Math.pow(Math.abs(Math.sin((t-pt.at)*Math.PI*bp)),3);
    /* petites notes de musique qui montent */
    x.save(); for(let k=0;k<10;k++){ const life=((t*.35+rnd(k))%1), nx=(box?box.x+box.w*rnd(k+3):W*rnd(k+3))+Math.sin(t*1.5+k)*14, ny=(box?box.y+box.h:H*.92)-life*(box?box.h*.9:H*.75); x.globalAlpha=Math.sin(life*Math.PI)*.75; x.fillStyle=["#FFD84D","#FF6B9A","#9EE7FF","#B3FFC9"][k%4];
      x.font=`700 ${Math.round(26+rnd(k+8)*20)}px ${F.emoji}`; x.textAlign="center"; x.textBaseline="middle"; x.fillText(k%2?"♪":"♫",nx,ny); } x.restore();
    if(ln&&ln.i>=0){ const it=items[ln.i], key=it.cle||nameOf(it), ex=hasEx(it), ap=sm((t-ln.a)/.25), pop=(.82+.18*eb((t-ln.a)/.45))*(1+.05*beat);
      const cx=box?box.x+box.w/2:(V||!ex?W/2:W*.36), cy=box?box.y+box.h*(ex?.33:.46):(V?H*.32:H*.42), kp=keyPx(key)*(box?(ex?.8:1):1);
      if(box&&isAr(key)){ x.save(); x.globalAlpha=ap; x.translate(cx,cy); x.scale(pop,pop); x.textAlign="center"; x.textBaseline="middle"; let fs=kp; for(;fs>20;fs-=2){ x.font=fontOf(key,700,fs,"ink"); if(x.measureText(key).width<=box.w*.84) break; } x.direction="rtl"; inkText(x,key,0,0,"#1E140C",fs); x.restore(); }
      else { const sp=spr(key,kp,ln.i+(M==="aventure"?2:0)); x.save(); x.globalAlpha=ap; x.translate(cx,cy); x.scale(pop,pop); x.drawImage(sp.c,-sp.w/2,-sp.h/2,sp.w,sp.h); shine(x,sp,-sp.w/2,-sp.h/2,((t-ln.a)%2.2)/1.1,K); x.restore(); }
      if(ex){ const ix=box?box.x+box.w/2:(V?W/2:W*.73), iy=box?box.y+box.h*.73:(V?H*.6:H*.44), R=box?Math.min(box.w,box.h)*.15:(V?115:100), a2=sm((t-ln.a-.15)/.3); x.save(); x.globalAlpha=a2;
        if(!box){ const hg=x.createRadialGradient(ix,iy,R*.2,ix,iy,R*1.4); hg.addColorStop(0,"rgba(255,240,200,.5)"); hg.addColorStop(1,"rgba(255,240,200,0)"); x.fillStyle=hg; x.beginPath(); x.arc(ix,iy,R*1.4,0,7); x.fill(); }
        if(it.image) drawEmoji(x,it.image,ix,iy+Math.sin(t*3)*6*(1+beat),R*(it.mot?1.25:1.6));
        if(it.mot){ x.textAlign="center"; x.textBaseline="middle"; x.fillStyle=box?"#2A1A0E":"#FFFFFF"; if(!box){ x.shadowColor="rgba(0,0,0,.6)"; x.shadowBlur=12; } fitText(x,it.mot,ix,iy+(it.image?R*1.0:0),box?box.w*.8:(V?W*.8:W*.42),V?52:44,800,isAr(it.mot)&&box?"ink":"kid",14); }
        x.restore(); } }
    else recapGrid(x,t,Object.assign({},pt,{start:-1e9,step:0,dance:true}),box?box.y+box.h*.12:(V?H*.2:H*.22),box?box.h*.8:(V?H*.5:H*.52),M,box); }
  /* ---------------- révision : toutes les unités, allumées l'une après l'autre ---------------- */
  function recapGrid(x,t,pt,top,hgt,sty,box){ if(!N) return; const side=!box&&!V&&!Q&&AVON(), bw=box?box.w*.92:side?W*.72:W*(V?.9:.84), bx=box?box.x+box.w*.04:side?W*.25:W/2-bw/2, cmax=box?(V?4:5):V?4:Q?5:7, cols=N<=cmax?N:Math.min(cmax,Math.max(3,Math.ceil(Math.sqrt(N*(V?.6:1.6))))), rows=Math.ceil(N/cols), cw=bw/cols, ch=Math.min(hgt/rows,cw*1.05);
    const rtl=T.dir==="rtl", y0=top+(hgt-rows*ch)/2; items.forEach((it,i)=>{ const r=Math.floor(i/cols), c=i%cols, cxi=rtl?bx+bw-(c+.5)*cw:bx+(c+.5)*cw, cyi=y0+(r+.5)*ch, at=pt.start+i*pt.step, on=t>=at, act=t>=at&&t<at+pt.step, ap=sm((t-pt.a-.2-i*.03)/.35);
      if(ap<=0) return; const s=(act?1.12+.06*Math.sin((t-at)*14):1)*eb(ap), key=it.cle||nameOf(it), dy=pt.dance?-Math.abs(Math.sin(t*Math.PI*(pt.bpm||100)/60+i*.55))*ch*.12:0; x.save(); x.globalAlpha=ap; x.translate(cxi,cyi+dy); x.scale(s,s);
      if(sty==="daara"){ rr(x,-cw*.44,-ch*.42,cw*.88,ch*.84,14); x.fillStyle=on?"#FFFBF0":"rgba(255,251,240,.7)"; x.shadowColor="rgba(60,30,10,.3)"; x.shadowBlur=act?18:6; x.fill(); x.shadowColor="transparent"; x.lineWidth=act?4:2; x.strokeStyle=act?"#E8A33D":"#C9A26A"; x.stroke();
        x.textAlign="center"; x.textBaseline="middle"; x.direction=isAr(key)?"rtl":"ltr"; const pedagogic=COLOR_LESSON?lessonColor(it):"";
        if(isAr(key)){ let fs=Math.min(ch*.52,cw*.5); for(;fs>14;fs-=2){ x.font=fontOf(key,700,fs,"ink"); if(x.measureText(key).width<=cw*.8) break; } inkText(x,key,0,-ch*.04,on?(pedagogic||["#C2185B","#1B7F4D","#1D4ED8","#B45309","#6D28D9"][i%5]):"#9C8460",fs); } else { x.fillStyle=on?(pedagogic||"#2A1A0E"):"#9C8460"; fitText(x,key,0,-ch*.04,cw*.76,Math.min(ch*.4,cw*.32),850,"kid",12); }
        const nm=it.nom&&it.nom!==it.cle?it.nom:""; if(nm){ x.fillStyle="#8A5A2B"; fitText(x,nm,0,ch*.3,cw*.8,Math.min(22,ch*.16),700,"kid",9); } }
      else { const sp=spr(key,Math.min(ch*.62,cw*.62)*(([...key].length>2)?.6:1),i+(sty==="aventure"?2:0)); if(sty==="aventure"&&on){ x.save(); x.globalCompositeOperation="lighter"; const gg=x.createRadialGradient(0,0,4,0,0,cw*.5); gg.addColorStop(0,"rgba(255,230,140,.55)"); gg.addColorStop(1,"rgba(255,230,140,0)"); x.fillStyle=gg; x.beginPath(); x.arc(0,0,cw*.5,0,7); x.fill(); x.restore(); }
        x.globalAlpha*=on?1:.45; x.drawImage(sp.c,-sp.w/2,-sp.h/2-(act?10:0),sp.w,sp.h); }
      x.restore(); if(act) burst(x,t,at,cxi,cyi,Math.min(cw,ch)*.55,sty==="daara"?"#E8A33D":"#FFD84D",6); });
    if(sty==="aventure"){ x.save(); x.strokeStyle="rgba(255,240,180,.5)"; x.lineWidth=2; x.setLineDash([4,8]); x.beginPath(); items.forEach((it,i)=>{ if(t<pt.start+i*pt.step) return; const r=Math.floor(i/cols), c=i%cols, X=rtl?bx+bw-(c+.5)*cw:bx+(c+.5)*cw, Y=y0+(r+.5)*ch; if(i===0) x.moveTo(X,Y); else x.lineTo(X,Y); }); x.stroke(); x.restore(); } }

  /* ---------------- présentateur 3D (garçon en boubou) dans le Grand Théâtre et la Grande Aventure ---------------- */
  function avatarSolo(x,t,pt){ if(!L.personnage||M==="daara"||!AV||!AV.ready()) return; if((V||Q)&&(pt.k==="quiz"||pt.k==="recap")) return; const R=V?{x:W*.5,y:H*.5,w:W*.56,h:H*.37}:Q?{x:W*.62,y:H*.55,w:W*.42,h:H*.48}:{x:W*.78,y:H*.4,w:W*.24,h:H*.62};
    if(!V&&!Q) R.x=-W*.02; const m=talk(t), r=pt.k==="item"?pt.reps.find(q=>t>=q.cue&&t<q.toi[1]):null, point=pt.k==="item"&&t<pt.v[1]?cl((t-pt.a-.3)/.4):0, say0=P.say.filter(z=>!z.chorus&&z.t<=t).pop();
    const profile=L.avatar||(AV.defaultFor&&AV.defaultFor(L.langue))||"yasmine", q=AV.profiles&&AV.profiles[profile];
    const c=AV.render(R.w*K,R.h*K,t,{mouth:m,speak:m>.05,since:say0?t-say0.t:9,point,up:V?.6:.2,side:R.x<W/2?1:-1,open:r&&t>=r.toi[0]?1:0,rock:false},{scene:"solo",profile,style:(o.avatar||{}).style||(q&&q.style)||"indigo",skin:(o.avatar||{}).skin||(q&&q.skin)||"fonce"}); if(c) x.drawImage(c,R.x,R.y,R.w,R.h); }

  /* ==================== CAPSULE PÉDAGOGIQUE ==================== */
  const CB=V?{x:W*.04,y:H*.085,w:W*.92,h:H*.425}:Q?{x:W*.37,y:H*.08,w:W*.6,h:H*.7}:{x:W*.405,y:H*.085,w:W*.57,h:H*.71};   /* le tableau */
  const CC=V?{x:-W*.04,y:H*.5,w:W*1.08,h:H*.4}:Q?{x:-W*.05,y:H*.2,w:W*.45,h:H*.84}:{x:-W*.02,y:H*.1,w:W*.43,h:H*.95};   /* la classe en 3D */
  const CAST=CAPL?CAPL.cast:[], CVIS=CAPL?capVisuals(CAPL):[], cpSide=(()=>{ let k=0; return CAST.map(g=>g.kind==="robot"?"robot":(k++===0?"gauche":"droite")); })();
  function cpName(id){ if(id==="prof") return (CAPL&&CAPL.prof)||""; return (CAST.find(g=>g.id===id)||{}).nom||""; }
  function cpColor(id){ if(id==="prof") return CT.acc; const i=CAST.findIndex(g=>g.id===id); return (CAST[i]&&CAST[i].couleur)||["#E2445C","#1F74E0","#0E9F68"][Math.max(0,i)%3]; }
  const cpTalk=(id,t)=>{ const e=o.env&&(id==="prof"?o.env.prof:o.env.cast&&o.env.cast[id]); if(e&&e.length) return env(e,t); const s=P.say.find(z=>(z.qui||"prof")===id&&t>=z.t&&t<z.t+z.d); return s?.35+.3*Math.abs(Math.sin((t-s.t)*11)):0; };
  const cpLast=(id,t)=>{ let r=null; for(const z of P.say) if((z.qui||"prof")===id&&z.t<=t) r=z; return r; };
  const cpArea=()=>({x:CB.x+CB.w*.05, y:CB.y+CB.h*.2, w:CB.w*.9, h:CB.h*.74});
  /* bloc de texte : la plus grande taille qui tient dans le cadre, avec retours à la ligne ; jamais de débordement (au pire « … ») */
  function fitBlock(x,txt,maxw,maxh,pxMax,pxMin,w,kind){ let px=pxMax, lines=[txt]; for(;px>=pxMin;px-=2){ x.font=fontOf(txt,w,px,kind); lines=wrap(x,txt,maxw); if(lines.length*px*1.24<=maxh&&lines.every(l=>x.measureText(l).width<=maxw)) return {px,lines,lh:px*1.24}; }
    px=pxMin; x.font=fontOf(txt,w,px,kind); lines=wrap(x,txt,maxw); const mx=Math.max(1,Math.floor(maxh/(px*1.24))); if(lines.length>mx){ lines=lines.slice(0,mx); lines[mx-1]=lines[mx-1].replace(/\s*\S*$/,"")+"…"; }
    lines=lines.map(l=>{ let q=l; while(q.length>2&&x.measureText(q).width>maxw) q=q.slice(0,-2)+"…"; return q; }); return {px,lines,lh:px*1.24}; }
  function drawBlock(x,b,cx,cy,align){ x.textAlign=align||"center"; x.textBaseline="middle"; const y0=cy-(b.lines.length-1)*b.lh/2; b.lines.forEach((l,i)=>{ x.direction=isAr(l)?"rtl":"ltr"; x.fillText(l,cx,y0+i*b.lh); }); }
  /* mot avec sa terminaison en couleur : « noir|e » */
  const cpSplit=w=>{ const i=w.indexOf("|"); return i>0?{b:w.slice(0,i),e:w.slice(i+1).replace(/\|/g,"")}:{b:w.replace(/\|/g,""),e:""}; };
  function cpWord(x,w,cx,cy,px,ink,ecol){ const p=cpSplit(w); x.font=fontOf(p.b+p.e,800,px,"kid"); x.textBaseline="middle"; x.direction="ltr"; const wb=x.measureText(p.b).width, we=x.measureText(p.e).width, X=cx-(wb+we)/2;
    x.textAlign="left"; x.fillStyle=ink; x.fillText(p.b,X,cy); if(p.e){ x.fillStyle=ecol; x.fillText(p.e,X+wb,cy); x.fillRect(X+wb,cy+px*.42,we,Math.max(2,px*.07)); } return wb+we; }
  /* le décor : mur en dégradé aux couleurs du niveau, lumières douces, fenêtre, plante, sol */
  function cpBack(x){ const g0=x.createLinearGradient(0,0,W*.3,H); g0.addColorStop(0,CT.mur[0]); g0.addColorStop(1,CT.mur[1]); x.fillStyle=g0; x.fillRect(0,0,W,H);
    for(let i=0;i<9;i++){ const r=(V?120:90)+rnd(i+3)*120, gx=rnd(i)*W, gy=rnd(i+20)*H*.8, gg=x.createRadialGradient(gx,gy,0,gx,gy,r); gg.addColorStop(0,"rgba(255,255,255,.35)"); gg.addColorStop(1,"rgba(255,255,255,0)"); x.fillStyle=gg; x.fillRect(gx-r,gy-r,r*2,r*2); }
    x.fillStyle=hex(CT.acc,.05); for(let i=0;i<60;i++){ x.beginPath(); x.arc(rnd(i*3)*W,rnd(i*5+1)*H*.85,2+rnd(i+9)*4,0,7); x.fill(); }
    const fy=V?H*.88:H*.84, fg=x.createLinearGradient(0,fy,0,H); fg.addColorStop(0,CT.sol[0]); fg.addColorStop(1,CT.sol[1]); x.fillStyle=fg; x.fillRect(0,fy,W,H-fy); x.fillStyle="rgba(255,255,255,.4)"; x.fillRect(0,fy,W,3);
    x.strokeStyle="rgba(0,0,0,.07)"; x.lineWidth=1.5; for(let i=-12;i<=12;i++){ x.beginPath(); x.moveTo(W/2+i*W*.045,fy); x.lineTo(W/2+i*W*.15,H); x.stroke(); }
    const wn=V?{x:W*.62,y:H*.545,w:W*.3,h:H*.13}:Q?{x:W*.05,y:H*.05,w:W*.25,h:H*.2}:{x:W*.06,y:H*.09,w:W*.26,h:H*.28};
    rr(x,wn.x-9,wn.y-9,wn.w+18,wn.h+18,18); x.fillStyle="#FFFFFF"; x.shadowColor="rgba(0,0,0,.12)"; x.shadowBlur=14; x.fill(); x.shadowBlur=0;
    x.save(); rr(x,wn.x,wn.y,wn.w,wn.h,10); x.clip(); const sk=x.createLinearGradient(0,wn.y,0,wn.y+wn.h); sk.addColorStop(0,"#6FBDFF"); sk.addColorStop(1,"#D4EDFF"); x.fillStyle=sk; x.fillRect(wn.x,wn.y,wn.w,wn.h);
      x.fillStyle="#FFE38A"; x.beginPath(); x.arc(wn.x+wn.w*.78,wn.y+wn.h*.32,wn.h*.15,0,7); x.fill(); x.fillStyle="#7CC883"; x.beginPath(); x.ellipse(wn.x+wn.w*.28,wn.y+wn.h*1.08,wn.w*.5,wn.h*.36,0,0,7); x.fill(); x.fillStyle="#58AE62"; x.beginPath(); x.ellipse(wn.x+wn.w*.86,wn.y+wn.h*1.12,wn.w*.42,wn.h*.32,0,0,7); x.fill(); x.restore();
    x.fillStyle="#FFFFFF"; x.fillRect(wn.x+wn.w/2-4,wn.y,8,wn.h); x.fillRect(wn.x,wn.y+wn.h/2-4,wn.w,8);
    const pl=V?{x:W*.08,y:H*.84}:Q?{x:W*.32,y:H*.86}:{x:W*.36,y:H*.83}; x.fillStyle="#C8643C"; rr(x,pl.x-22,pl.y-36,44,40,8); x.fill(); x.fillStyle="#2E9E5B"; for(let k=0;k<7;k++){ const a=-Math.PI/2+(k-3)*.42; x.beginPath(); x.ellipse(pl.x+Math.cos(a)*30,pl.y-40+Math.sin(a)*34,10,26,a+Math.PI/2,0,7); x.fill(); } }
  /* le tableau blanc encadré aux couleurs du niveau */
  function cpBoard(x){ const B=CB; x.save(); x.shadowColor="rgba(20,24,48,.26)"; x.shadowBlur=34; x.shadowOffsetY=14; rr(x,B.x,B.y,B.w,B.h,30); x.fillStyle=CT.tab; x.fill(); x.shadowColor="transparent"; x.shadowBlur=0; x.shadowOffsetY=0;
    const fg=x.createLinearGradient(B.x,B.y,B.x+B.w,B.y+B.h); fg.addColorStop(0,CT.acc); fg.addColorStop(1,CT.acc2); x.lineWidth=9; x.strokeStyle=fg; x.stroke();
    x.save(); rr(x,B.x+5,B.y+5,B.w-10,B.h-10,25); x.clip(); x.strokeStyle=hex(CT.acc,.07); x.lineWidth=1.5; for(let y=B.y+B.h*.19;y<B.y+B.h;y+=Math.max(26,B.h*.08)){ x.beginPath(); x.moveTo(B.x,y); x.lineTo(B.x+B.w,y); x.stroke(); }
      const gl=x.createLinearGradient(B.x,B.y,B.x+B.w*.7,B.y+B.h); gl.addColorStop(0,"rgba(255,255,255,.6)"); gl.addColorStop(.32,"rgba(255,255,255,0)"); x.fillStyle=gl; x.fillRect(B.x,B.y,B.w,B.h); x.restore(); x.restore(); }
  /* bandeau de l'étape : icône, nom de l'étape, titre */
  function cpHeader(x,e,t,t0){ const B=CB, ic=CAP_TYPES[e.type][0], lab=(T.etapes||{})[e.type]||CAP_TYPES[e.type][1], a=sm((t-t0-.05)/.3), px=V?27:23, h=px*1.8, X=B.x+B.w*.035, y=B.y+B.h*.045; x.save(); x.globalAlpha=a;
    x.font=fontOf(lab,800,px,"kid"); const w=x.measureText(lab).width+h*1.45; rr(x,X,y,w,h,h/2); const g2=x.createLinearGradient(X,y,X+w,y+h); g2.addColorStop(0,CT.acc); g2.addColorStop(1,mix(CT.acc,CT.acc2,.55)); x.fillStyle=g2; x.shadowColor=hex(CT.acc,.35); x.shadowBlur=12; x.fill(); x.shadowBlur=0;
    drawEmoji(x,ic,X+h*.52,y+h/2,px*1.15); x.fillStyle="#fff"; x.textAlign="left"; x.textBaseline="middle"; x.direction="ltr"; x.fillText(lab,X+h*.98,y+h/2+1);
    const tw=B.x+B.w*(e.type==="defi"?.6:.965)-(X+w+px*.7); if(e.titre&&tw>70){ x.fillStyle=CT.ink; fitText(x,e.titre,X+w+px*.7,y+h/2+1,tw,px*1.05,800,"kid",13); } x.restore(); }
  /* ---- les visuels du tableau ---- */
  function cpMots(x,v,t,t0,A,pv){ const ws=v.mots.map(cpSplit), hasLab=v.marques.length>0, gap=V?12:14; let px=V?60:54, lay=null;
    for(;;px-=2){ x.font=fontOf("Aa",800,px,"kid"); const cw=ws.map(p=>x.measureText(p.b+p.e).width+px*.95), rows=[]; let cur=[], acc=0; cw.forEach((w,i)=>{ if(cur.length&&acc+gap+w>A.w){ rows.push(cur); cur=[]; acc=0; } acc+=(cur.length?gap:0)+w; cur.push(i); }); rows.push(cur);
      const ch=px*1.55, rh=ch+(hasLab?px*1.08:px*.4); lay={cw,rows,ch,rh,tot:rows.length*rh}; if((lay.tot<=A.h&&cw.every(w=>w<=A.w))||px<=16) break; }
    const pos=[], y0=A.y+(A.h-lay.tot)/2+(hasLab?0:px*.2); lay.rows.forEach((r,ri)=>{ const rw=r.reduce((s,i)=>s+lay.cw[i],0)+gap*(r.length-1); let cx=A.x+(A.w-rw)/2; r.forEach(i=>{ pos[i]={x:cx,y:y0+ri*lay.rh,w:lay.cw[i],h:lay.ch,row:ri}; cx+=lay.cw[i]+gap; }); });
    const pm=pv&&pv.type==="mots"?pv:null, mk=v.marques.map((m,k)=>{ const old=pm&&pm.marques.some(q=>q.role===m.role&&q.mots.join()===m.mots.join()); return Object.assign({},m,{ap:old?1:sm((t-t0-.7-k*.6)/.3), at:t0+.7+k*.6, col:(CAP_ROLES[m.role]||[CT.acc2])[0], lab:m.label||(CAP_ROLES[m.role]||[0,m.role])[1]}); });
    const roleOf=i=>{ let r=null; mk.forEach(m=>{ if(m.ap>0&&m.mots.includes(i)) r=m; }); return r; };
    mk.forEach(m=>{ if(m.ap<=0) return; const rows={}; m.mots.forEach(i=>{ const p=pos[i]; (rows[p.row]=rows[p.row]||[]).push(p); }); Object.values(rows).forEach(ps=>{ const x0=Math.min(...ps.map(p=>p.x))-6, x1=Math.max(...ps.map(p=>p.x+p.w))+6; x.save(); x.globalAlpha=m.ap*.9; rr(x,x0,ps[0].y-6,x1-x0,lay.ch+12,16); x.fillStyle=hex(m.col,.14); x.fill(); x.restore(); }); });
    ws.forEach((p,i)=>{ const q=pos[i], same=pm&&pm.mots[i]===v.mots[i], flip=pm&&pm.mots.length===v.mots.length&&!same, ap=same?1:flip?1:eb((t-t0-.12-i*.06)/.35), fl=flip?Math.abs(Math.cos(cl((t-t0-.35)/.5)*Math.PI)):1, shown=flip&&t-t0-.35<.25?pm.mots[i]:v.mots[i];
      if(ap<=0) return; const r=roleOf(i); x.save(); x.translate(q.x+q.w/2,q.y+q.h/2); x.scale(ap,ap*fl); rr(x,-q.w/2,-q.h/2,q.w,q.h,14); x.fillStyle=r?mix("#FFFFFF",r.col,.1):"#FFFFFF"; x.shadowColor="rgba(20,30,60,.16)"; x.shadowBlur=10; x.shadowOffsetY=4; x.fill(); x.shadowColor="transparent";
      x.lineWidth=r?4.5:2.5; x.strokeStyle=r?r.col:"#D5DBE6"; x.stroke(); cpWord(x,shown,0,2,px,CT.ink,(CAP_ROLES.terminaison)[0]); x.restore(); });
    mk.forEach(m=>{ if(m.ap<=0) return; const rows={}; m.mots.forEach(i=>{ const p=pos[i]; (rows[p.row]=rows[p.row]||[]).push(p); }); const segs=Object.values(rows); x.save(); x.globalAlpha=m.ap; x.strokeStyle=m.col; x.lineWidth=4; x.lineCap="round";
      segs.forEach(ps=>{ const x0=Math.min(...ps.map(p=>p.x))+4, x1=Math.max(...ps.map(p=>p.x+p.w))-4, y=ps[0].y+lay.ch+px*.18; x.beginPath(); x.moveTo(x0,y-8); x.lineTo(x0,y); x.lineTo(x1,y); x.lineTo(x1,y-8); x.stroke(); });
      const s0=segs[0], x0=Math.min(...s0.map(p=>p.x)), x1=Math.max(...s0.map(p=>p.x+p.w)), ly=s0[0].y+lay.ch+px*.58, lp=Math.max(13,px*.46); x.font=fontOf(m.lab,800,lp,"kid"); const lw=Math.min(Math.max(x1-x0,x.measureText(m.lab).width+lp*1.2),A.w), lx=cl((x0+x1)/2-lw/2,A.x,A.x+A.w-lw);
      x.translate(lx+lw/2,ly); x.scale(eb(m.ap),eb(m.ap)); rr(x,-lw/2,-lp*.75,lw,lp*1.5,lp*.75); x.fillStyle=m.col; x.fill(); x.fillStyle="#fff"; x.textAlign="center"; x.textBaseline="middle"; fitText(x,m.lab,0,1,lw-lp*.6,lp,800,"kid",11); x.restore();
      if(m.ap<1) burst(x,t,m.at,(x0+x1)/2,s0[0].y,Math.max(40,(x1-x0)*.4),m.col,6); }); }
  /* une image (relief) qui tient dans une case */
  function cpRelief(x,txt,cx,cy,mw,mh,pi,a){ const sp=spr(txt,Math.min(260,mh*.62),pi), f=Math.min(1,mw/sp.w,mh/sp.h)*(a==null?1:a); if(f<=0) return; x.save(); x.translate(cx,cy); x.scale(f,f); x.drawImage(sp.c,-sp.w/2,-sp.h/2,sp.w,sp.h); x.restore(); }
  function cpSons(x,v,t,t0,A){ const n=v.items.length;
    if(n===1){ const it=v.items[0], a=eb((t-t0-.15)/.45), ex=it.image||it.mot, kx=ex?(V?A.x+A.w*.3:A.x+A.w*.3):A.x+A.w/2; cpRelief(x,it.cle,kx,A.y+A.h*.45,ex?A.w*.5:A.w*.8,A.h*.85,1,a);
      if(ex){ const b=sm((t-t0-.7)/.35), ix=A.x+A.w*.74; x.save(); x.globalAlpha=b; if(it.image) drawEmoji(x,it.image,ix,A.y+A.h*(it.mot?.38:.48),Math.min(A.h*.5,A.w*.32)); if(it.mot){ x.fillStyle=CT.ink; const bk=fitBlock(x,it.mot,A.w*.42,A.h*.25,V?52:46,16,800,"kid"); x.font=fontOf(it.mot,800,bk.px,"kid"); drawBlock(x,bk,ix,A.y+A.h*.82); } x.restore(); } return; }
    const cols=n<=4?n:Math.ceil(n/2), rows=Math.ceil(n/cols), cw=A.w/cols, chh=A.h/rows;
    v.items.forEach((it,i)=>{ const c=i%cols, r=Math.floor(i/cols), cx=A.x+(c+.5)*cw, cy=A.y+(r+.5)*chh, a=eb((t-t0-.15-i*.28)/.4); if(a<=0) return; x.save(); x.translate(cx,cy); x.scale(a,a);
      rr(x,-cw*.45,-chh*.45,cw*.9,chh*.9,18); x.fillStyle="#FFFFFF"; x.shadowColor="rgba(20,30,60,.14)"; x.shadowBlur=10; x.fill(); x.shadowColor="transparent"; x.lineWidth=3; x.strokeStyle=hex(CT.acc,.5); x.stroke();
      const has=it.image||it.mot; cpRelief(x,it.cle,0,has?-chh*.13:0,cw*.8,chh*(has?.5:.75),i); if(it.image) drawEmoji(x,it.image,it.mot?-cw*.22:0,chh*.25,Math.min(chh*.26,cw*.3)); if(it.mot){ x.fillStyle=CT.ink; x.textAlign=it.image?"left":"center"; x.textBaseline="middle"; fitText(x,it.mot,it.image?-cw*.08:0,chh*.26,cw*(it.image?.48:.8),Math.min(30,chh*.16),800,"kid",11); }
      x.restore(); }); }
  function cpFusion(x,v,t,t0,A){ const n=v.parts.length, p=sm((t-t0-.6)/1), merged=t-t0>1.7, cy=A.y+A.h*(v.mot||v.image?.38:.5), sh=A.h*(v.mot||v.image?.6:.8);
    if(!merged){ v.parts.forEach((s,i)=>{ const from=A.x+A.w*((i+.5)/n), to=A.x+A.w/2+(i-(n-1)/2)*A.w*.17, a=eb((t-t0-.1-i*.2)/.4); cpRelief(x,s,lerp(from,to,p),cy,A.w*.4,sh,i,a); });
      if(p>0&&p<1){ x.save(); x.strokeStyle=hex(CT.acc2,.6); x.lineWidth=5; x.setLineDash([10,10]); x.beginPath(); x.moveTo(A.x+A.w*.2,cy+sh*.42); x.lineTo(A.x+A.w*.8,cy+sh*.42); x.stroke(); x.restore(); } }
    else { cpRelief(x,v.resultat,A.x+A.w/2,cy,A.w*.8,sh,3,eb((t-t0-1.7)/.45)); burst(x,t,t0+1.7,A.x+A.w/2,cy,A.h*.35,CT.acc2,8); }
    if(v.mot||v.image){ const b=sm((t-t0-2.3)/.35); if(b>0){ x.save(); x.globalAlpha=b; if(v.image) drawEmoji(x,v.image,A.x+A.w*(v.mot?.3:.5),A.y+A.h*.84,A.h*.24); if(v.mot){ x.fillStyle=CT.ink; x.textAlign="center"; x.textBaseline="middle"; fitText(x,v.mot,A.x+A.w*(v.image?.6:.5),A.y+A.h*.84,A.w*.55,V?48:42,800,"kid",14); } x.restore(); } } }
  function cpTableau(x,v,t,t0,A){ const nc=Math.max(v.entetes.length,...v.lignes.map(r=>r.length)), hd=v.entetes.length>0, top=v.titre?A.h*.16:0, nr=v.lignes.length+(hd?1:0); let px=V?40:36, cw=[];
    for(;;px-=2){ x.font=fontOf("Aa",800,px,"kid"); cw=[]; for(let c=0;c<nc;c++){ cw[c]=Math.max(...[v.entetes[c]||"",...v.lignes.map(r=>r[c]||"")].map(s=>x.measureText(s.replace(/\|/g,"")).width))+px*1.2; } if((cw.reduce((a,b)=>a+b,0)<=A.w&&nr*px*1.75<=A.h-top)||px<=14) break; }
    const tw=Math.min(A.w,Math.max(cw.reduce((a,b)=>a+b,0),A.w*.6)), sc=tw/cw.reduce((a,b)=>a+b,0); cw=cw.map(w=>w*sc); const rh=Math.min(px*1.75,(A.h-top)/nr), X0=A.x+(A.w-tw)/2, Y0=A.y+top+(A.h-top-nr*rh)/2;
    if(v.titre){ x.save(); x.globalAlpha=sm((t-t0)/.3); x.fillStyle=CT.acc; x.textAlign="center"; x.textBaseline="middle"; fitText(x,v.titre,A.x+A.w/2,A.y+top*.45,A.w,px*1.05,800,"kid",13); x.restore(); }
    const rowsAll=(hd?[v.entetes]:[]).concat(v.lignes); rowsAll.forEach((r,ri)=>{ const a=sm((t-t0-.15-ri*.3)/.3); if(a<=0) return; const y=Y0+ri*rh, head=hd&&ri===0, li=ri-(hd?1:0), hl=!head&&v.surligne.includes(li); x.save(); x.globalAlpha=a;
      rr(x,X0,y+2,tw,rh-4,12); x.fillStyle=head?CT.acc:hl?hex(CT.acc2,.16):li%2?"#F4F6FB":"#FFFFFF"; x.fill(); if(hl){ x.fillStyle=CT.acc2; rr(x,X0,y+2,7,rh-4,3); x.fill(); }
      let cx=X0; r.forEach((cell,c)=>{ if(cell) cpWord(x,cell,cx+cw[c]/2,y+rh/2+1,px*(head?.9:1),head?"#FFFFFF":CT.ink,CAP_ROLES.terminaison[0]); cx+=cw[c]; }); x.restore(); }); }
  function cpChoix(x,v,t,t0,A,rev){ const n=v.choix.length, long=Math.max(...v.choix.map(c=>c.length))>14, qh=v.question?A.h*.24:0, cols=long?(n===4&&!V?2:1):n===3?3:2, rows=Math.ceil(n/cols), gw=A.w/cols, gh=(A.h-qh)/rows;
    if(v.question){ x.save(); x.globalAlpha=sm((t-t0)/.3); x.fillStyle=CT.ink; const b=fitBlock(x,v.question,A.w*.96,qh*.92,V?44:40,15,800,"kid"); x.font=fontOf(v.question,800,b.px,"kid"); drawBlock(x,b,A.x+A.w/2,A.y+qh*.45); x.restore(); }
    v.choix.forEach((c,i)=>{ const col=i%cols, r=Math.floor(i/cols), cx=A.x+(col+.5)*gw, cy=A.y+qh+(r+.5)*gh, a=eb((t-t0-.25-i*.18)/.35), ok=i===v.bonne, rv=rev==null?0:sm((t-rev)/.35); if(a<=0) return;
      const w=gw*.92, h=gh*.84, L0=Math.min(h*.62,w*.18); x.save(); x.translate(cx,cy); x.scale(a*(rv&&ok?1+.05*Math.sin(cl(t-rev)*Math.PI):1),a); x.globalAlpha=rv&&!ok?1-.6*rv:1;
      rr(x,-w/2,-h/2,w,h,18); x.fillStyle=rv&&ok?mix("#FFFFFF","#12A150",.12*rv):"#FFFFFF"; x.shadowColor=rv&&ok?hex("#12A150",.6):"rgba(20,30,60,.14)"; x.shadowBlur=rv&&ok?24:10; x.fill(); x.shadowColor="transparent"; x.lineWidth=rv&&ok?6:3; x.strokeStyle=rv&&ok?"#12A150":hex(CT.acc,.45); x.stroke();
      const lx=-w/2+L0*.5+12; x.fillStyle=rv&&ok?"#12A150":CT.acc; x.beginPath(); x.arc(lx,0,L0*.5,0,7); x.fill(); x.fillStyle="#fff"; x.font=`900 ${Math.round(L0*.55)}px ${F.kid}`; x.textAlign="center"; x.textBaseline="middle"; x.direction="ltr"; x.fillText(rv&&ok?"✓":"ABCD"[i],lx,2);
      x.fillStyle=CT.ink; const tw2=w-L0-34, b=fitBlock(x,c,tw2,h*.86,V?40:34,13,800,"kid"); x.font=fontOf(c,800,b.px,"kid"); drawBlock(x,b,lx+L0*.5+12+tw2/2,1); x.restore(); }); }
  function cpRegle(x,v,t,t0,A){ const a=eb((t-t0-.15)/.45); if(a<=0) return; x.save(); x.translate(A.x+A.w/2,A.y+A.h/2); x.scale(a,a); const w=A.w, h=A.h*.94;
    rr(x,-w/2,-h/2,w,h,22); const gg=x.createLinearGradient(-w/2,-h/2,w/2,h/2); gg.addColorStop(0,mix("#FFFFFF",CT.acc,.13)); gg.addColorStop(1,mix("#FFFFFF",CT.acc2,.13)); x.fillStyle=gg; x.fill(); x.lineWidth=5; x.strokeStyle=CT.acc; x.stroke();
    const ih=Math.min(h*.24,72); drawEmoji(x,v.icone,0,-h/2+ih*.75,ih); x.fillStyle=CT.ink; const b=fitBlock(x,v.texte,w*.88,h-ih*1.7,V?48:44,15,800,"kid"); x.font=fontOf(v.texte,800,b.px,"kid"); drawBlock(x,b,0,ih*.45); x.restore(); burst(x,t,t0+.35,A.x+A.w/2,A.y+A.h*.2,A.h*.5,CT.acc2,8); }
  function cpListe(x,v,t,t0,A){ const n=v.items.length, rh=A.h/Math.max(n,3), y0=A.y+(A.h-n*rh)/2;
    v.items.forEach((s,i)=>{ const a=sm((t-t0-.2-i*.45)/.35); if(a<=0) return; const y=y0+i*rh, ic=v.icones[i]||["✏️","🗣️","🧺","📏","🎨"][i%5], r=Math.min(rh*.36,30); x.save(); x.globalAlpha=a; x.translate((1-a)*30,0);
      rr(x,A.x,y+rh*.08,A.w,rh*.84,16); x.fillStyle=i%2?"#F5F7FC":"#FFFFFF"; x.fill(); x.lineWidth=2; x.strokeStyle=hex(CT.acc,.3); x.stroke(); x.fillStyle=hex(CT.acc,.15); x.beginPath(); x.arc(A.x+r+14,y+rh/2,r,0,7); x.fill(); drawEmoji(x,ic,A.x+r+14,y+rh/2,r*1.3);
      x.fillStyle=CT.ink; const tw=A.w-r*2-40, b=fitBlock(x,s,tw,rh*.74,V?34:30,13,700,"kid"); x.font=fontOf(s,700,b.px,"kid"); drawBlock(x,b,A.x+r*2+28,y+rh/2,"left"); x.restore(); }); }
  function cpObjets(x,v,t,t0,A){ const G=v.groupes, ns=G.length+(v.resultat?1:0), sw=A.w*.07, gw=(A.w-sw*(ns-1))/ns; let X=A.x;
    G.forEach((g,gi)=>{ const cols=Math.min(g.n,g.n>6?4:3), rows=Math.ceil(g.n/cols), s=Math.min(gw/cols,A.h*.86/rows)*.8, cs=s*1.22, rs=s*1.12, oy=A.y+A.h/2-(rows-1)*rs/2;
      for(let k=0;k<g.n;k++){ const c=k%cols, r=Math.floor(k/cols), a=eb((t-t0-.15-gi*.5-k*.08)/.3); if(a<=0) continue; const cx=X+gw/2+(c-(cols-1)/2)*cs, cy=oy+r*rs, gone=k>=g.n-g.barre&&t-t0>1.6;
        x.save(); x.globalAlpha=gone?.35:1; drawEmoji(x,g.emoji,cx,cy,s*a); x.restore(); if(gone){ x.save(); x.strokeStyle="#E23B4A"; x.lineWidth=5; x.lineCap="round"; const q=s*.35*sm((t-t0-1.6)/.25); x.beginPath(); x.moveTo(cx-q,cy-q); x.lineTo(cx+q,cy+q); x.moveTo(cx+q,cy-q); x.lineTo(cx-q,cy+q); x.stroke(); x.restore(); } }
      X+=gw; const sg=gi<G.length-1?v.signes[gi]||"+":v.resultat?"=":""; if(sg){ const a=sm((t-t0-.4-gi*.5)/.3); x.save(); x.globalAlpha=a; x.fillStyle=CT.acc2; x.font=`900 ${Math.round(Math.min(sw*1.1,64))}px ${F.kid}`; x.textAlign="center"; x.textBaseline="middle"; x.direction="ltr"; x.fillText(sg,X+sw/2,A.y+A.h/2); x.restore(); X+=sw; } });
    if(v.resultat) cpRelief(x,v.resultat,X+gw/2,A.y+A.h/2,gw,A.h*.7,3,eb((t-t0-2.4)/.4)); }
  function cpTexte(x,v,t,t0,A){ const a=sm((t-t0-.1)/.35); x.save(); x.globalAlpha=a; x.fillStyle=CT.ink; const b=fitBlock(x,v.texte,A.w*.94,A.h*.94,V?50:46,14,700,"kid"); x.font=fontOf(v.texte,700,b.px,"kid");
    const keys=v.surligne.map(w=>normW(w)), hl=sm((t-t0-1)/.4), y0=A.y+A.h/2-(b.lines.length-1)*b.lh/2; x.textAlign="left"; x.textBaseline="middle"; x.direction="ltr";
    b.lines.forEach((l,i)=>{ const lw=x.measureText(l).width; let cx=A.x+(A.w-lw)/2; const y=y0+i*b.lh; l.split(" ").forEach((w,k,arr)=>{ const ww=x.measureText(w).width; if(hl>0&&keys.includes(normW(w))){ x.save(); x.globalAlpha=a*hl; x.fillStyle=hex(CT.acc2,.3); rr(x,cx-4,y-b.px*.55,(ww+8)*hl,b.px*1.1,6); x.fill(); x.restore(); }
      x.fillText(w,cx,y); cx+=ww+x.measureText(" ").width; }); }); x.restore(); }
  /* étape sans visuel : la phrase clé dans une bulle, avec le nom de celui qui parle */
  function cpBulle(x,e,t,t0,A){ const l=e.lignes[0]; if(!l) return; const a=eb((t-t0-.15)/.4); if(a<=0) return; x.save(); x.translate(A.x+A.w/2,A.y+A.h/2); x.scale(a,a); const w=A.w*.94, h=A.h*.8, col=cpColor(l.qui);
    rr(x,-w/2,-h/2,w,h,28); x.fillStyle="#FFFFFF"; x.shadowColor="rgba(20,30,60,.16)"; x.shadowBlur=16; x.fill(); x.shadowColor="transparent"; x.lineWidth=5; x.strokeStyle=col; x.stroke(); x.fillStyle="#FFFFFF"; x.beginPath(); x.moveTo(-w*.3,h/2-2); x.lineTo(-w*.36,h/2+28); x.lineTo(-w*.2,h/2-2); x.closePath(); x.fill(); x.strokeStyle=col; x.beginPath(); x.moveTo(-w*.3,h/2+1); x.lineTo(-w*.36,h/2+28); x.lineTo(-w*.2,h/2+1); x.stroke();
    const nm=cpName(l.qui), nh=nm?Math.min(36,h*.16):0; if(nm){ x.font=`800 ${Math.round(nh*.62)}px ${F.kid}`; const nw=x.measureText(nm).width+nh; rr(x,-w/2+18,-h/2-nh*.5,nw,nh,nh/2); x.fillStyle=col; x.fill(); x.fillStyle="#fff"; x.textAlign="center"; x.textBaseline="middle"; x.direction="ltr"; x.fillText(nm,-w/2+18+nw/2,-h/2+1); }
    x.fillStyle=CT.ink; const b=fitBlock(x,l.texte,w*.88,h*.8,V?46:40,15,800,"kid"); x.font=fontOf(l.texte,800,b.px,"kid"); drawBlock(x,b,0,nh*.2); x.restore(); }
  function cpVisual(x,v,t,t0,A,pv,e,rev){ if(!v){ cpBulle(x,e,t,t0,A); return; } if(v.type==="mots") cpMots(x,v,t,t0,A,pv); else if(v.type==="sons") cpSons(x,v,t,t0,A); else if(v.type==="fusion") cpFusion(x,v,t,t0,A); else if(v.type==="tableau") cpTableau(x,v,t,t0,A);
    else if(v.type==="choix") cpChoix(x,v,t,t0,A,rev); else if(v.type==="regle") cpRegle(x,v,t,t0,A); else if(v.type==="liste") cpListe(x,v,t,t0,A); else if(v.type==="objets") cpObjets(x,v,t,t0,A); else if(v.type==="texte") cpTexte(x,v,t,t0,A); }
  /* titre de l'épisode, dans le tableau */
  function cpTitle(x,t){ const A={x:CB.x+CB.w*.06,y:CB.y+CB.h*.08,w:CB.w*.88,h:CB.h*.84}, a=sm((t-.5)/.4), chip=[CAPL.classe,CAPL.episode].filter(Boolean).join(" · ");
    x.save(); x.globalAlpha=a; if(chip){ const cp=V?30:26; x.font=`800 ${cp}px ${F.kid}`; const cw=x.measureText(chip).width+cp*1.6, ch=cp*1.7; rr(x,A.x+A.w/2-cw/2,A.y+A.h*.06,cw,ch,ch/2); x.fillStyle=CT.acc; x.fill(); x.fillStyle="#fff"; x.textAlign="center"; x.textBaseline="middle"; x.direction="ltr"; x.fillText(chip,A.x+A.w/2,A.y+A.h*.06+ch/2+1); }
    const s=eb((t-.8)/.55); x.translate(A.x+A.w/2,A.y+A.h*.5); x.scale(s,s); const b=fitBlock(x,L.titre,A.w*.96,A.h*.42,V?78:70,22,900,"kid"); x.font=fontOf(L.titre,900,b.px,"kid"); const tg=x.createLinearGradient(0,-A.h*.2,0,A.h*.2); tg.addColorStop(0,CT.acc); tg.addColorStop(1,CT.acc2); x.fillStyle=tg; x.shadowColor="rgba(0,0,0,.12)"; x.shadowBlur=8; x.shadowOffsetY=3; drawBlock(x,b,0,0); x.restore();
    const sub=L.sous_titre||CAPL.serie; if(sub){ x.save(); x.globalAlpha=sm((t-1.3)/.4); x.fillStyle=hex(CT.ink,.75); x.textAlign="center"; x.textBaseline="middle"; fitText(x,sub,A.x+A.w/2,A.y+A.h*.86,A.w*.9,V?32:28,700,"kid",13); x.restore(); }
    confetti(x,t,1.1,CB.x+CB.w/2,CB.y+CB.h*.5,40,[CT.acc,CT.acc2,"#FFC93C","#3BB273","#fff"],.9,3); }
  /* fin : bravo, et la phrase à retenir une dernière fois */
  function cpEnd(x,t,pt){ const A=cpArea(), rg=[...CAPL.etapes].reverse().find(e=>e.type==="retenir"), txt=rg?(rg.visuel&&rg.visuel.type==="regle"?rg.visuel.texte:(rg.lignes[0]||{}).texte):"";
    cpRelief(x,T.bravo,CB.x+CB.w/2,CB.y+CB.h*(txt?.3:.5),CB.w*.7,CB.h*(txt?.38:.55),0,eb((t-pt.a-.2)/.5));
    if(txt){ x.save(); x.globalAlpha=sm((t-pt.a-1)/.4); x.fillStyle=CT.ink; const b=fitBlock(x,txt,A.w*.92,A.h*.42,V?38:34,14,800,"kid"); x.font=fontOf(txt,800,b.px,"kid"); drawBlock(x,b,A.x+A.w/2,CB.y+CB.h*.72); x.restore(); }
    confetti(x,t,pt.a+.3,CB.x+CB.w*.3,CB.y+CB.h*.6,60,[CT.acc,CT.acc2,"#FFC93C","#3BB273","#fff"],1.1,7); confetti(x,t,pt.a+.6,CB.x+CB.w*.7,CB.y+CB.h*.6,60,[CT.acc,CT.acc2,"#FFC93C","#3BB273","#fff"],1.1,9); }
  /* défi : compte à rebours pour réfléchir (ou mettre pause) */
  function cpCount(x,t,pt){ const [c0,c1]=pt.count; if(t<c0-.2||t>c1+.4) return; const f=cl((t-c0)/(c1-c0)), a=sm((t-c0+.2)/.25)*sm((c1+.4-t)/.25), R=V?33:28, cx=CB.x+CB.w-R-24, cy=CB.y+CB.h*.045+(V?27:23)*.9;
    x.save(); x.globalAlpha=a; x.fillStyle="#FFFFFF"; x.shadowColor="rgba(0,0,0,.18)"; x.shadowBlur=12; x.beginPath(); x.arc(cx,cy,R+8,0,7); x.fill(); x.shadowBlur=0; ring(x,cx,cy,R,1-f,CT.acc2,8,"rgba(0,0,0,.08)");
    x.fillStyle=CT.ink; x.font=`900 ${Math.round(R*1.05)}px ${F.kid}`; x.textAlign="center"; x.textBaseline="middle"; x.direction="ltr"; x.fillText(String(Math.max(1,Math.ceil(c1-t))),cx,cy+2);
    x.font=`800 ${V?24:20}px ${F.kid}`; x.fillStyle=CT.acc2; x.textAlign="right"; x.fillText(T.pause||"Mets pause !",cx-R-16,cy+1); x.restore(); }
  /* la classe en 3D : qui parle bouge les lèvres ; les autres le regardent ; l'enseignant montre le tableau quand il explique */
  function cpClass(x,t,pt){ if(!L.personnage||!AV||!AV.ready()) return; const cur=(P.say.find(z=>t>=z.t&&t<z.t+z.d+.08)||{}).qui||null, ln=pt.k==="cap"?pt.lines.find(l=>l.qui==="prof"&&t>=l.t&&t<l.t+l.d):null, teach=pt.k==="cap"&&["decouverte","demo","reponse","retenir"].includes(pt.type);
    const point=teach&&ln?cl((t-ln.t-.15)/.35)*cl((ln.t+Math.min(ln.d,2.8)-t)/.4):0, sp=cpLast("prof",t), ci=CAST.findIndex(g=>g.id===cur);
    const pP={mouth:cpTalk("prof",t), speak:cur==="prof", since:sp?t-sp.t:9, point, up:V?1:.3, side:1, rock:false, open:pt.k==="fin"?1:0}; if(ci>=0&&!point) pP.look={x:{gauche:-.55,droite:.55,robot:-.75}[cpSide[ci]]||0,y:.1};
    const cheer=pt.k==="fin"||(pt.k==="cap"&&pt.type==="reponse"&&t-pt.a<1.8);
    const cast=CAST.map((g,i)=>{ const s2=cpLast(g.id,t), me=cur===g.id, sd=cpSide[i]; let look; if(me) look={x:0,y:0}; else if(!cur||cur==="prof") look={x:{gauche:.7,droite:-.7,robot:.75}[sd],y:.2}; else look={x:cpSide[ci]===sd?0:sd==="gauche"?.9:sd==="droite"?-.9:.6,y:.05};
      return {mouth:cpTalk(g.id,t), speak:me, since:s2?t-s2.t:9, look, listen:!!cur&&!me, open:cheer?1:0, point:g.kind==="robot"&&me?.5:0, side:sd==="droite"?-1:1, rock:false}; });
    const q=AV.profiles&&AV.profiles[L.avatar], c=AV.render(CC.w*K,CC.h*K,t,{prof:pP,cast},{scene:"classe",profile:L.avatar,cast:CAST.map((g,i)=>({kind:g.kind,style:g.style,skin:g.skin,seed:i*7+3,coiffe:g.coiffe,couleur:g.couleur})),style:(o.avatar||{}).style||(q&&q.style),skin:(o.avatar||{}).skin||(q&&q.skin)});
    if(c) x.drawImage(c,CC.x,CC.y,CC.w,CC.h); }
  function cpChips(x,t,pt){ const lab=[CAPL.classe,CAPL.episode].filter(Boolean).join(" · "), ph=V?40:34, Y=V?H*.026:14;
    if(lab&&pt.k!=="intro"){ x.save(); x.font=`800 ${V?23:20}px ${F.kid}`; const w=Math.min(x.measureText(lab).width+30,W*.55), X=V?W*.04:20; rr(x,X,Y,w,ph,ph/2); x.fillStyle=CT.acc; x.shadowColor="rgba(0,0,0,.15)"; x.shadowBlur=8; x.fill(); x.shadowBlur=0; x.fillStyle="#fff"; x.textAlign="center"; x.textBaseline="middle"; fitText(x,lab,X+w/2,Y+ph/2+1,w-20,V?23:20,800,"kid",11); x.restore(); }
    if(pt.k==="cap"){ const txt=`${pt.s+1} / ${CAPL.etapes.length}`; x.save(); x.font=`800 ${V?24:21}px ${F.kid}`; const w=x.measureText(txt).width+30, X=W-w-(V?W*.04:20); rr(x,X,Y,w,ph,ph/2); x.fillStyle="rgba(255,255,255,.9)"; x.fill(); x.strokeStyle=CT.acc; x.lineWidth=2.5; x.stroke(); x.fillStyle=CT.ink; x.textAlign="center"; x.textBaseline="middle"; x.direction="ltr"; x.fillText(txt,X+w/2,Y+ph/2+1); x.restore(); } }
  function capsule(x,t,pt){ x.drawImage(layer("cap",cpBack),0,0,W,H);
    x.save(); x.globalCompositeOperation="lighter"; for(let k=0;k<26;k++){ const px=(rnd(k)*W+t*(6+rnd(k+3)*10))%W, py=rnd(k+9)*H*.8+Math.sin(t*.6+k)*16; x.globalAlpha=.1+.18*Math.max(0,Math.sin(t*1.3+k)); x.fillStyle="#FFFFFF"; x.beginPath(); x.arc(px,py,1.4+rnd(k+5)*2,0,7); x.fill(); } x.restore();
    cpClass(x,t,pt);
    if(pt.k==="intro"){ const a=sm((t-.15)/.45), s=lerp(.9,1,eo((t-.15)/.6)); x.save(); x.globalAlpha=a; x.translate(CB.x+CB.w/2,CB.y+CB.h/2); x.scale(s,s); x.translate(-(CB.x+CB.w/2),-(CB.y+CB.h/2)); cpBoard(x); cpTitle(x,t); x.restore(); }
    else if(pt.k==="cap"){ cpBoard(x); const e=CAPL.etapes[pt.s], v=CVIS[pt.s], pv=pt.s>0?CVIS[pt.s-1]:null, kept=!!v&&v===pv, rev=v&&v.type==="choix"&&e.type!=="defi"&&(kept||e.type==="reponse")?pt.a+.45:null;
      cpHeader(x,e,t,pt.a); cpVisual(x,v,t,kept?-1e9:pt.a,cpArea(),kept?null:pv,e,rev); if(pt.count) cpCount(x,t,pt); }
    else if(pt.k==="song"){ cpBoard(x); songContent(x,t,pt,cpArea()); }
    else if(pt.k==="fin"){ cpBoard(x); cpEnd(x,t,pt); }
    if(!POSTER) cpChips(x,t,pt); }

  /* ---------------- une image ---------------- */
  /* ---------------- effets de la bibliothèque commune (studio-fx.js) : transitions entre les moments, couleurs de cinéma, ambiances ---------------- */
  const FXL=()=>typeof window!=="undefined"&&window.SP_FX, EF=Object.assign({transition:"auto",look:"naturel",ambiance:"aucune"},L.effets||{});
  const off={}, offc=k=>{ if(!off[k]){ const c=document.createElement("canvas"); c.width=cv.width; c.height=cv.height; off[k]=c; } return off[k]; };
  /* « automatique » : des transitions choisies pour chaque modèle, variées d'un moment à l'autre (dans le sens de lecture) */
  const AUTO_TR={capsule:["fondu"], theatre:["rideau","iris","flash_blanc","zoom_entree","etoile","lumiere"], daara:["page","encre","fondu","lumiere","iris",T.dir==="rtl"?"volet_doux_d":"volet_doux_g"], aventure:[T.dir==="rtl"?"glisse_d":"glisse_g","zoom_traverse",T.dir==="rtl"?"cube_d":"cube_g","cercles","fondu_morph",T.dir==="rtl"?"pousse_d":"pousse_g"]};
  const trOf=pt=>{ const i=parts.indexOf(pt), F=FXL(); if(i<=0||!F) return null; let id=EF.transition; if(id==="auto"){ const l=AUTO_TR[M]; id=l[i%l.length]; } return !id||id==="coupe"?null:F.transition(id); };
  const vigLayer=()=>layer("vig",x=>{ const v=x.createRadialGradient(W/2,H/2,Math.min(W,H)*.42,W/2,H/2,Math.hypot(W,H)*.62); v.addColorStop(0,"rgba(0,0,0,0)"); v.addColorStop(1,`rgba(0,0,0,${M==="daara"?.28:M==="capsule"?.14:.38})`); x.fillStyle=v; x.fillRect(0,0,W,H); });
  /* une image du décor et de la leçon (sans les textes du dessus) */
  function scene(x,t,pt){ x.setTransform(K,0,0,K,0,0); x.globalAlpha=1; x.globalCompositeOperation="source-over"; x.filter="none";
    /* caméra : rapprochement lent dans chaque partie, petite secousse quand la lettre touche la scène */
    const cam=1+.035*sm((t-pt.a)/Math.max(1,pt.b-pt.a)), shake=M==="theatre"&&pt.k==="item"&&t-pt.a>.72&&t-pt.a<.95?Math.sin((t-pt.a)*90)*4*(1-(t-pt.a-.72)/.23):0;
    x.save(); x.translate(W/2,H/2+shake); x.scale(cam,cam); x.translate(-W/2,-H/2); x.__T=x.getTransform();
    if(M==="theatre") theatre(x,t,pt); else if(M==="daara") daara(x,t,pt); else if(M==="capsule") capsule(x,t,pt); else aventure(x,t,pt);
    x.restore(); x.setTransform(K,0,0,K,0,0); x.__T=x.getTransform();
    const F=FXL(); if(F&&EF.ambiance&&EF.ambiance!=="aucune") F.ambiance(x,EF.ambiance,{W,H,L:Math.min(W,H)/720,t,acc:ACC,acc2:"#14213D",V});
    x.setTransform(1,0,0,1,0,0); x.globalAlpha=1; x.globalCompositeOperation="source-over"; x.drawImage(vigLayer(),0,0); }
  function draw(t){ t=Math.max(0,Math.min(P.total-.001,t)); const pt=partAt(t), F=FXL(), TR=trOf(pt), D=TR?Math.min(TR.d,(pt.b-pt.a)*.3):0, inTr=!!(TR&&D>0&&t-pt.a<D), LOOK=F&&EF.look&&EF.look!=="naturel"&&F.looks[EF.look]?EF.look:null, fxo={W:cv.width,H:cv.height,acc:ACC,t};
    if(!inTr&&!LOOK) scene(g,t,pt);
    else { const cB=offc("B"); scene(cB.getContext("2d"),t,pt); const out=LOOK?offc("L").getContext("2d"):g; out.setTransform(1,0,0,1,0,0); out.globalAlpha=1; out.globalCompositeOperation="source-over"; out.filter="none";
      if(inTr){ const prev=parts[parts.indexOf(pt)-1], cA=offc("A"); scene(cA.getContext("2d"),Math.max(prev.a,pt.a-.02),prev); out.fillStyle="#000"; out.fillRect(0,0,cv.width,cv.height); try{ TR.f(out,cA,cB,F.E[TR.e](cl((t-pt.a)/D)),fxo); }catch(e){ out.drawImage(cB,0,0); } out.setTransform(1,0,0,1,0,0); out.globalAlpha=1; out.globalCompositeOperation="source-over"; out.filter="none"; out.imageSmoothingEnabled=true; }
      else out.drawImage(cB,0,0);
      if(LOOK) F.look(g,offc("L"),LOOK,fxo); }
    /* textes par-dessus, toujours nets et dans leurs vraies couleurs */
    g.setTransform(K,0,0,K,0,0); g.globalAlpha=1; g.globalCompositeOperation="source-over"; g.filter="none"; g.__T=g.getTransform(); captions(g,t,pt); progress(g,t,pt); }
  /* miniature : le décor, la première unité en grand, le titre */
  /* miniature d'une capsule : la classe au tableau, puis 2 à 4 mots en très gros (lisibles même en petit), la classe et l'épisode */
  let POSTER=false;   /* miniature : ni sous-titres, ni barre, ni petites étiquettes */
  function capPoster(txt){ const cap=parts.filter(p=>p.k==="cap"), pick=cap.find(p=>p.type==="demo")||cap.find(p=>p.type==="decouverte")||cap[0]||parts[0], tt=pick.k==="cap"?Math.min(pick.b-.1,pick.a+3.4):1.6; POSTER=true; try{ scene(g,tt,partAt(tt)); }finally{ POSTER=false; }
    g.setTransform(K,0,0,K,0,0); const lab=String(txt||L.titre).trim().toUpperCase(), bh=V?H*.3:H*.36, by=H-bh, sh=g.createLinearGradient(0,by-H*.08,0,H); sh.addColorStop(0,"rgba(0,0,0,0)"); sh.addColorStop(.35,hex(CT.ink,.55)); sh.addColorStop(1,hex(CT.ink,.88)); g.fillStyle=sh; g.fillRect(0,by-H*.08,W,bh+H*.08);
    g.save(); g.textAlign="center"; g.textBaseline="middle"; const b=fitBlock(g,lab,W*.9,bh*.82,V?120:112,30,900,"kid"); g.font=fontOf(lab,900,b.px,"kid"); g.lineJoin="round"; g.lineWidth=Math.max(6,b.px*.16); g.strokeStyle=CT.acc2;
    const y0=by+bh*.52-(b.lines.length-1)*b.lh/2; b.lines.forEach((l,i)=>{ g.strokeText(l,W/2,y0+i*b.lh); }); g.fillStyle="#FFFFFF"; b.lines.forEach((l,i)=>{ g.fillText(l,W/2,y0+i*b.lh); }); g.restore();
    const chip=[CAPL.classe,CAPL.episode].filter(Boolean).join(" · "); if(chip){ g.save(); const cp=V?44:38; g.font=`900 ${cp}px ${F.kid}`; const cw=g.measureText(chip).width+cp*1.4, ch=cp*1.6, X=V?W*.05:26, Y=V?H*.03:22; rr(g,X,Y,cw,ch,ch/2); g.fillStyle=CT.acc; g.shadowColor="rgba(0,0,0,.3)"; g.shadowBlur=14; g.fill(); g.shadowBlur=0; g.lineWidth=4; g.strokeStyle="#FFFFFF"; g.stroke(); g.fillStyle="#FFFFFF"; g.textAlign="center"; g.textBaseline="middle"; g.direction="ltr"; g.fillText(chip,X+cw/2,Y+ch/2+2); g.restore(); }
    return cv; }
  function poster(txt){ if(CAPL) return capPoster(txt); const it=items[0]; const fake=Object.assign({},parts.find(p=>p.k==="item")||parts[0]); draw(fake.k==="item"?fake.a+2.4:1.5);
    g.setTransform(K,0,0,K,0,0); const sh=g.createLinearGradient(0,H*.62,0,H); sh.addColorStop(0,"rgba(0,0,0,0)"); sh.addColorStop(1,"rgba(0,0,0,.72)"); g.fillStyle=sh; g.fillRect(0,H*.62,W,H*.38);
    g.textAlign="center"; g.textBaseline="middle"; g.fillStyle="#fff"; g.shadowColor="rgba(0,0,0,.8)"; g.shadowBlur=18; fitText(g,L.titre,W/2,H*(V?.86:.86),W*.9,V?78:70,900,isAr(L.titre)?"kid":"kid",20); g.shadowBlur=0; return cv; }
  return {W, H, canvas:cv, draw, poster, plan:P}; }

window.SP_LECON={version:2, models:MODELS, langs:LANGS, modelOf:MODEL_OF, songStyles:SONG_STYLES, norm, script, plan, quizIdx, stage, ready, loadEmoji, emojiUrl, est, songLines, songMap, songNorm,
  capTypes:CAP_TYPES, capThemes:CAP_THEMES, capRoles:CAP_ROLES, capVisTypes:CAP_VIS, capNorm, speakers};
})();
