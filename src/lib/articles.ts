import { BlogArticle } from './types';

export const ARTICLES: BlogArticle[] = [
  {
    slug: 'arnaques-pieces-gonflees',
    title: 'Arnaque garagiste : les pièces où les marges sont gonflées',
    excerpt:
      "Sur certaines pièces, le garagiste multiplie le prix d'achat sans que vous y voyiez que du feu. On liste les postes à surveiller et la méthode pour vérifier.",
    category: 'Argent & mécanique',
    readingTime: '7 min',
    date: '2026-06-10',
    author: 'Régis M., ex-garagiste',
    cover: 'from-trust-700 to-trust-500',
    content: `
<p class="lead">Je fais ce métier depuis vingt-cinq ans, et je vai vous le dire cash : il y a des postes où, par habitude, on gonfle. Pas tous les garages, pas tout le temps, mais assez pour que ça vaille le coup de connaître la liste. Si vous voyez un devis avec l'une de ces lignes, baissez le prix ou demandez un autre garage.</p>

<h2>1. Les plaquettes et disques de frein — la marge reine</h2>
<p>C'est l'exemple typique. Un kit de plaquettes avant OEM equivalente coûte entre 35 et 65 €. Beaucoup de devis le présentent à 150 ou 180 €. Pourquoi ? Parce qu'on sait que le freinage, ça fait peur, que le client accepte sans discuter. Le chiffre qui devrait vous alerter : un devis à plus de 200 € pour des plaquettes seules. C'est trop.</p>

<p>Sur les disques, c'est pire. Un disque OEM equiv vaut 40 à 60 € pièce. On le voit souvent à 120 € « le disque monté ». Multipliez par les quatre roues, et vous arrivez à 480 € pour un kit complet là où la pièce aurait coûté 200 € tout compris.</p>

<h3>Votre recette pour vérifier</h3>
<ul>
<li>Demandez la <strong>marque exacte</strong> de la pièce posée (Bosch, Brembo, Textar, TRW sont des marques sérieuses équivalentes à l'origine).</li>
<li>Demandez aussi le <strong>délai de fabrication</strong> — une pièce commandée en matinée arrive le soir même, donc aucune raison de vous facturer un délai.</li>
<li>Puis comparez cette marque sur un site de pièces en ligne (Oscaro, Yakarouler) au même titre exact.</li>
</ul>

<h2>2. Le kit distribution — la peur qui paie</h2>
<p>Le mot « distribution » fait peur. On l'associe à « casse moteur ». C'est vrai que sur un moteur à courroie, si elle lâche, c'est souvent 3 000 € de réparations. Mais le kit complet (courroie + galets + pompe à eau) en pièce OEM equivalente coûte 180 à 350 € selon le moteur. Beaucoup de devis le présentent à 700 voire 900 €.</p>

<p>Sur les moteurs à <strong>chaîne</strong> (beaucoup de BMW récents, certaines Toyota, certains Essence PSA), on la change en général jamais, sauf pb de bruit. Si un devis propose une distribution à chaîne alors que le carnet d'entretien constructeur ne la mentionne pas avant un kilométrage énorme, posez la question.</p>

<h2>3. Les filtres — l'overdose systématique</h2>
<p>Un filtre à air coûte 12 à 20 € en pièce. Vous le verrez à 35 € ou 45 € sur le devis. C'est la ligne la plus facile à gratter. Idem pour le filtre habitacle : 15 € en pièce, 40 € en devis. Sur une vidange classique, si on vous ajoute systématiquement « filtre à air + habitacle », posez la question de la fréquence recommandée par le constructeur — souvent, ces filtres se changent tous les 30 à 60 k km, pas à chaque vidange.</p>

<h2>4. Les liquides — le G13, le Adblue, le DOT 4</h2>
<p>Le liquide de refroidissement est un terrain de jeu classique. VW a sorti le G13 avec une formulation à base de glycérol (plus « écologique »). Beaucoup de devis le mentionnent à 60 € pour 5 litres, alors que du G12+ vaut 22 € le bidon et est <strong>compatibilité totale</strong> avec l'aluminium du moteur. Pire encore, sur les moteurs qui chauffent (2.0 TDI en tête), le G12+ résiste mieux au long terme.</p>

<p>Idem pour l'Adblue : le bidon constructeur 5L vaut 12 à 18 €. On le voit parfois à 35 € « remplissage ». Pour un réservoir complet de 17L (réservoir arrière sur 1.6 BlueHDi), ça peut représenter 80 € de marge pure.</p>

<h2>5. La main d'œuvre — le coefficient caché</h2>
<p>Le barème horaire constructeur (le temps « théorique » pour une opération) est public : on le trouve dans le <strong>RTA</strong> (Revue Technique Automobile) ou sur des bases comme Autodata. Sur un devis, le temps de main d'œuvre annoncé ne doit pas dépasser ce barème + 10 %. Si votre devis mentionne 2 h de MO pour une vidange alors que le barème constructeur est de 0,4 h, c'est que le coefficient atelier fait le gros du travail.</p>

<h2>Conclusion — la règle des trois devis</h2>
<p>Sur une intervention supérieure à 300 €, la règle est simple : <strong>obtenez trois devis</strong> détaillés, ligne par ligne, marque de pièce incluse. Vous serez surpris de l'écart entre le concessionnaire, le garage de réseau et le mécano indépendant. Et si un garage refuse de détailler sa pièce, c'est un signal clair : allez ailleurs.</p>

<p>Notre comparateur AutoDevis Expert vous aide à faire ce travail en deux minutes. Mais c'est la démarche qui compte — ne signez pas un devis que vous n'avez pas lu.</p>
`,
  },
  {
    slug: 'g12-plus-vs-g13-tdi',
    title: 'Refroidissement : pourquoi remplacer le G13 par du G12+ (Exemple 2.0 TDI)',
    excerpt:
      "VW préconise du G13 sur beaucoup de 2.0 TDI. Pourtant, en atelier, on remet souvent du G12+. Pourquoi ? Explication d'un choix de terrain qui s'appuie sur la chimie.",
    category: 'Refroidissement',
    readingTime: '6 min',
    date: '2026-06-08',
    author: 'Régis M., ex-garagiste',
    cover: 'from-trust-700 to-action-green',
    content: `
<p class="lead">La question revient souvent : le G13 est-il vraiment supérieur au G12+ ? La réponse courte : ça dépend du moteur. La réponse longue : sur un 2.0 TDI, je remettrais du G12+, et je vais vous expliquer pourquoi.</p>

<h2>Les bases — à quoi sert un liquide de refroidissement ?</h2>
<p>Le liquide de refroidissement n'est pas juste de « l'antigel ». Il porte trois fonctions critiques :</p>
<ul>
<li><strong>Antigel</strong> (mono-propylène ou éthylène glycol) — pour que le circuit ne gèle pas l'hiver.</li>
<li><strong>Anti-corrosion</strong> (inhibiteurs organiques) — pour protéger l'aluminium du radiateur, de la pompe à eau et des chemises.</li>
<li><strong>Anti-cavitation</strong> — la pompe à eau tourne vite, et sans protection, des bulles de vapeur microscopiques érodent les ailettes de la pompe.</li>
</ul>

<p>Les normes VW TL774 définissent ces liquides : G11, G12, G12+, G13. Le G12+ (norme TL774-F) et le G13 (norme TL774-J) sont compatibles entre eux. Mais ils ne sont pas identiques chimiquement.</p>

<h2>G12+ vs G13 — la vraie différence</h2>
<p>Le <strong>G12+</strong> est un liquide à base d'éthylène glycol avec un pack d'inhibiteurs organiques silicate-free, formulés pour la stabilité thermique. Il est rouge/violet.</p>

<p>Le <strong>G13</strong>, introduit par VW en 2008, est un mélange éthylène glycol + glycérol. Le glycérol est un sous-produit de la production de biodiesel — donc « plus vert ». Le G13 est violet/jaune selon le lot.</p>

<p>Le problème : le glycérol du G13 est <strong>plus sensible à la dégradation thermique</strong> quand le moteur travaille dur. Sur un moteur essence de ville qui chauffe peu, ça ne se voit pas. Sur un 2.0 TDI en charge (remorque, autoroute en côte, climat chaud), la dégradation est plus rapide — on constate une chute de pH après 3 ans là où le G12+ tient 4-5 ans.</p>

<h2>Le cas spécifique du 2.0 TDI</h2>
<p>Le 2.0 TDI (codes CFFB, CBAB, CGLC… utilisé sur Golf, A3, Octavia, Leon, A4) a un circuit de refroidissement assez sollicité. La pompe à eau est entrainée par la distribution, elle tourne haut. VW préconise du G13, mais en atelier, on constate :</p>
<ul>
<li>Une usure prématurée des ailettes de pompe à eau sur certains moteurs traités au G13 non-renouvelé.</li>
<li>Un noircissement du liquide après 40 k km là où le G12+ reste limpide plus longtemps.</li>
<li>Surtout sur les moteurs ayant subi un stage (reprog) ou tirant en charge.</li>
</ul>

<h3>Le point chimie : la cavitation</h3>
<p>La pompe à eau du 2.0 TDI tourne vite. À haute vitesse, la dépression derrière les ailettes crée des bulles de vapeur qui implosent en surface de l'aluminium — c'est la cavitation. Les inhibiteurs du G12+ déposent un film organique protecteur très stable thermiquement. Ceux du G13, à cause du glycérol, ont une <strong>tenue en température légèrement dégradée</strong>. Sur la pompe neuve d'un 2.0 TDI, je préfère donc remettre du G12+.</p>

<h2>Comment faire la transition proprement</h2>
<p>Le mélange G12+ et G13 est <strong>chimiquement compatible</strong> (les normes VW le précisent explicitement). Mais mélanger les deux dilue les avantages de chacun. Donc la procédure correcte :</p>

<ol class="list-decimal ml-6 space-y-2 mb-4 text-slate-700">
<li>Purge complète du vase expansif au radiateur (au minimum 5-6L pour un 2.0 TDI).</li>
<li>Rinçage à l'eau distillée si le circuit est encrassé.</li>
<li>Remplissage avec un G12+ <strong>concentration 50/50</strong> (eau distillée + liquide concentré). Le tout-prêt à 33 % n'est pas optimal en montagne ou climats chauds.</li>
<li>Purge de l'air via les vis de purge (souvent deux : une sur le radiateur, une sur le boîtier thermostat).</li>
<li>Chauffage moteur + thermostat ouvert, vérification du vase au ralenti pendant 10 minutes.</li>
</ol>

<p>Et surtout : ne remplissez jamais un circuit tiède avec du liquide froid. Attendez que tout refroidisse.</p>

<h2>Et pour les autres moteurs ?</h2>
<p>Le G12+ reste un excellent choix sur la plupart des moteurs modernes, y compris PSA 1.6 HDI, Renault 1.5 dCi, BMW N47. Privilégiez le G12+ quand :</p>
<ul>
<li>Le moteur travail en charge (remorque, montagne, ville dense).</li>
<li>Vous souhaitez espacer les vidanges à 5 ans / 100 k km.</li>
<li>La pompe à eau a déjà été remplacée — la protéger avec un liquide stable thermiquement prolonge sa vie.</li>
</ul>

<p>Le G13, lui, est correct sur un moteur essence de ville, faible charge, et surtout : si vous le renouvelez tous les 3 ans. Pour les autres usages, le G12+, plus âgé sur le papier, reste supérieur sur le terrain.</p>

<hr class="my-8 border-slate-200" />

<p class="text-sm text-slate-500">Références : norme VW TL774-F (G12+) et TL774-J (G13), carnets d'entretien constructeur VAG, retour d'atelier de l'auteur.</p>
`,
  },
  {
    slug: 'devis-concession-vs-petit-garage',
    title: 'Devis concessionnaires vs petits garages : la vérité',
    excerpt:
      "Le concessionnaire est-il plus cher pour la même intervention ? Oui, mais pas toujours sur ce qu'on croit. On compare poste par poste avec des chiffres réels.",
    category: 'Argent & mécanique',
    readingTime: '8 min',
    date: '2026-06-04',
    author: 'Régis M., ex-garagiste',
    cover: 'from-trust-700 to-trust-900',
    content: `
<p class="lead">Toute la vie, on vous dit « le concessionnaire, c'est cher ». C'est vrai. Mais « cher » ne veut pas dire « arnaque ». Dans certains cas, le concessionnaire est plus cher pour de bonnes raisons. Dans d'autres, c'est pure marge. Voyons poste par poste.</p>

<h2>Ce qui justifie (un peu) le surcoût concessionnaire</h2>
<p>Les concessions facturent des taux horaires plus élevés (entre 80 et 120 € selon la marque, contre 50 à 70 € chez un indépendant). Ce taux finance :</p>
<ul>
<li>La qualification continue des techniciens.</li>
<li>L'outil diag constructeur (valise officielle — elle coûte très cher en abonnement).</li>
<li>La garantie des pièces posées (souvent 2 ans pièces + MO vs 1 an chez un indépendant).</li>
<li>La traçabilité : tout est tracé dans le carnet d'entretien numérique, ce qui valorise votre voiture à la revente.</li>
</ul>

<p>Donc sur un véhicule encore sous garantie constructeur, ou sur une intervention complexe nécessitant la valise (reprog, recalibration ADAS, codage de boîtier), le concessionnaire a sa place.</p>

<h2>Là où le concessionnaire vous prend trop</h2>
<p>Maintenant, sur les opérations « ordinaires » — vidange, plaquettes, distribution, filtres — le surcoût n'est plus justifié. Exemple chiffré sur une Golf 7 2.0 TDI à 120 k km :</p>

<table class="mb-6 w-full border-collapse overflow-hidden rounded-lg text-sm">
<thead class="bg-slate-100"><tr><th class="border border-slate-200 px-3 py-2 text-left">Intervention</th><th class="border border-slate-200 px-3 py-2 text-right">Concession</th><th class="border border-slate-200 px-3 py-2 text-right">Indépendant</th></tr></thead>
<tbody>
<tr><td class="border border-slate-200 px-3 py-2">Vidange + filtres</td><td class="border border-slate-200 px-3 py-2 text-right">220 €</td><td class="border border-slate-200 px-3 py-2 text-right">110 €</td></tr>
<tr><td class="border border-slate-200 px-3 py-2">Plaquettes avant</td><td class="border border-slate-200 px-3 py-2 text-right">280 €</td><td class="border border-slate-200 px-3 py-2 text-right">160 €</td></tr>
<tr><td class="border border-slate-200 px-3 py-2">Kit distribution + pompe à eau</td><td class="border border-slate-200 px-3 py-2 text-right">780 €</td><td class="border border-slate-200 px-3 py-2 text-right">420 €</td></tr>
<tr><td class="border border-slate-200 px-3 py-2">Amortisseurs arrière</td><td class="border border-slate-200 px-3 py-2 text-right">540 €</td><td class="border border-slate-200 px-3 py-2 text-right">320 €</td></tr>
</tbody>
</table>

<p>L'écart moyen : <strong>+60 à +90 %</strong>. Pour la même pièce, la même main d'œuvre, le même temps.</p>

<h2>Le piège des « forfaits entretien »</h2>
<p>Le concessionnaire pousse souvent des « forfaits » très marketés : « Pack été », « Pack freinage », « Pack hiver ». Ces forfaits sont des assemblages de lignes simples à forte marge. Le Pack freinage à 380 € cache souvent 2 plaquettes à 50 € + une main d'œuvre gonflée. Si le concessionnaire vous propose un forfait, demandez systématiquement le <strong>détail ligne par ligne</strong> et comparez le détail pièce par pièce à un indépendant.</p>

<h2>Le petit garage indépendant — ses forces, ses failles</h2>
<p>Le mécanicien indépendant gagne sur le taux horaire et sur la pièce (souvent OEM equivalente plutôt que constructeur). Mais son point faible est la transparence de la pièce : un indépendant peut vous poser une sous-marque à 15 € et vous la facturer 45 €. Demandez <strong>la marque et la référence avant signature</strong>. Un bon indépendant ne rechigne pas — il a souvent une marque préférée (Bosch, TRW, SNR, SKF) qu'il connaît bien.</p>

<h3>Les sous-marques à éviter absolument</h3>
<p>Sur les pièces de sécurité (freinage, direction, suspension), évitez les marques sans nom ou importées chinoises sans traçabilité. Sur les pièces de confort (filtrerie), une marque tierce est acceptable — c'est le même filtre média.</p>

<h2>Le garage « de réseau » — le compromis</h2>
<p>Entre le concessionnaire et l'indépendant, il existe les garages affiliés à un réseau (Norauto, Feu Vert, Speedy, Euromaster). Leur taux horaire est moyen, leurs pièces sont des marques sérieuses. Leur limite : la rotation des techniciens, et le respect strict du barème constructeur (parfois au détriment du diagnostic personnalisé).</p>

<p>Sur une vidange simple ou un freinage standard, c'est un bon compromis. Sur une intervention complexe (distribution, culasse, électronique), privilégiez le concessionnaire ou un indépendant spécialiste de la marque.</p>

<h2>Comment répartir vos interventions</h2>
<p>Voici la grille que je recommande à mes clients :</p>
<ul>
<li><strong>Gros interventions électroniques</strong> (codage, recalibration, ADAS) → concessionnaire.</li>
<li><strong>Interventions sous garantie</strong> → concessionnaire.</li>
<li><strong>Distribution + pompe à eau</strong> → indépendant spécialiste / réseau avec pièce OEM.</li>
<li><strong>Vidange + filtres</strong> → indépendant ou réseau.</li>
<li><strong>Freinage</strong> → indépendant, en demandant une marque sérieuse (Brembo, Textar, Bosch).</li>
<li><strong>Diagnostic d'un bruit</strong> → indépendant spécialiste de la marque.</li>
</ul>

<h2>Punaiser le devis — la clé</h2>
<p>Quelle que soit la porte où vous frappez, le devis est votre protection. Exigez :</p>
<ul>
<li>Le détail <strong>pièce par pièce</strong> et la <strong>marque</strong> de chaque pièce.</li>
<li>Le temps de main d'œuvre annoncé (en heures).</li>
<li>Le taux horaire appliqué.</li>
<li>La date de livraison prévue.</li>
</ul>

<p>Si l'un de ces points manque, c'est un signal. Et bien sûr, comparez avec AutoDevis Expert — le comparatif met en lumière les écarts injustifiés en deux minutes.</p>
`,
  },
];

export const articlesBySlug = Object.fromEntries(ARTICLES.map((a) => [a.slug, a]));
