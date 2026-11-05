export const animalsData = [
  {
    id: 'agneau',
    name: 'Agneau',
    image: '/images/lamb-silhouette.jpg',
    cuts: [
      { id: 'collier', name: 'Collier', top: '35%', left: '38%', availableMeats: ['Collier avec os', 'Collier désossé'], cookingMethods: ['Mijoter', 'Braiser'], description: "Morceau charnu et économique, situé dans le cou. Parfait pour vos ragoûts et navarins." },
      { id: 'cote-decouverte', name: 'Côte découverte', top: '34%', left: '43.5%', availableMeats: ['Côtelettes découvertes'], cookingMethods: ['Griller', 'Poêler'], description: "Situées après le collier, des côtelettes persillées et très savoureuses." },
      { id: 'epaule', name: 'Épaule', top: '47%', left: '41%', availableMeats: ['Épaule entière', 'Épaule roulée', "Sauté d'agneau"], cookingMethods: ['Rôtir', 'Mijoter'], description: "L'épaule est un morceau exceptionnellement tendre, idéal pour les repas en famille." },
      { id: 'cote-seconde-premiere', name: 'Côte seconde et Côte première', top: '34%', left: '50%', availableMeats: ['Côtelettes', "Carré d'agneau"], cookingMethods: ['Griller', 'Poêler', 'Rôtir'], description: "Les morceaux les plus nobles du dos. Une chair très tendre et finement persillée." },
      { id: 'haut-de-cotes', name: 'Haut de côtes', top: '47%', left: '51%', availableMeats: ['Haut de côtes'], cookingMethods: ['Mijoter', 'Braiser'], description: "Morceau riche souvent marié au collier pour de délicieux plats en sauce." },
      { id: 'poitrine', name: 'Poitrine', top: '53%', left: '44%', availableMeats: ['Poitrine entière', 'Tendrons'], cookingMethods: ['Mijoter', 'Griller'], description: "Un morceau entrelardé, idéal pour les tajines ou grillé au barbecue." },
      { id: 'filet-cote-filet', name: 'Filet et Côte filet', top: '35%', left: '59%', availableMeats: ['Côtes filet', 'Filet mignon'], cookingMethods: ['Poêler', 'Griller'], description: "Partie extrêmement tendre du bas du dos, ne comportant pas de manche osseux." },
      { id: 'selle', name: 'Selle', top: '36%', left: '66%', availableMeats: ['Selle entière', 'Noisettes'], cookingMethods: ['Rôtir'], description: "Partie charnue à la base de la queue, souvent rôtie entière." },
      { id: 'gigot-entier', name: 'Gigot entier', top: '47%', left: '69%', availableMeats: ['Gigot entier'], cookingMethods: ['Rôtir'], description: "Le grand classique du dimanche. Viande fondante, à servir de préférence rosée." },
      { id: 'gigot-raccourci', name: 'Gigot raccourci', top: '62%', left: '70%', availableMeats: ['Gigot raccourci', 'Tranches de gigot'], cookingMethods: ['Rôtir', 'Griller'], description: "La base de la patte arrière, viande maigre excellente en tranches." }
    ]
  },
  {
    id: 'boeuf',
    name: 'Bœuf',
    image: '/images/boeuf-silhouette.jpg',
    cuts: [
      { id: 'collier', name: 'Collier / Basses côtes', top: '27%', left: '30%', availableMeats: ['Basses côtes', 'Collier'], cookingMethods: ['Mijoter', 'Braiser'], description: "Morceaux persillés nécessitant une cuisson lente (Bourguignon, pot-au-feu)." },
      { id: 'entrecote', name: 'Côte & Entrecôte', top: '24%', left: '42%', availableMeats: ['Côte de bœuf', 'Entrecôte'], cookingMethods: ['Griller', 'Poêler', 'Rôtir'], description: "Le morceau roi des amateurs de viande. Persillé, fondant et riche en goût." },
      { id: 'faux-filet', name: 'Faux-filet', top: '24%', left: '57%', availableMeats: ['Faux-filet', 'Aloyau'], cookingMethods: ['Griller', 'Poêler'], description: "Moins gras que l'entrecôte mais tout aussi tendre. Parfait en steak." },
      { id: 'rumsteak', name: 'Rumsteak', top: '24%', left: '73%', availableMeats: ['Rumsteak', 'Aiguillette'], cookingMethods: ['Griller', 'Poêler', 'Fondue'], description: "Une viande maigre à fibres courtes, extrêmement tendre et goûteuse." },
      { id: 'gite', name: 'Gîte & Cuissot', top: '50%', left: '80%', availableMeats: ['Gîte', 'Gîte à la noix', 'Macreuse'], cookingMethods: ['Mijoter', 'Bouillir'], description: "Morceaux riches en collagène, idéals pour le pot-au-feu ou les daubes." },
      { id: 'bavette', name: 'Bavette & Onglet', top: '52%', left: '60%', availableMeats: ['Bavette d\'aloyau', 'Onglet'], cookingMethods: ['Poêler', 'Griller'], description: "Des morceaux à fibres longues, réputés pour leur mâche et leur saveur intense." },
      { id: 'poitrine', name: 'Poitrine & Plat de côtes', top: '55%', left: '42%', availableMeats: ['Plat de côtes', 'Tendron', 'Flanchet'], cookingMethods: ['Bouillir', 'Mijoter'], description: "Indispensables pour un bon pot-au-feu ou braisés lentement." },
      { id: 'paleron', name: 'Paleron / Macreuse', top: '42%', left: '32%', availableMeats: ['Paleron', 'Macreuse', 'Jumeau'], cookingMethods: ['Mijoter', 'Braiser'], description: "Traversé par un nerf gélatineux qui fond à la cuisson, rendant la viande moelleuse." }
    ]
  },
  {
    id: 'veau',
    name: 'Veau',
    image: '/images/veau-silhouette.jpg',
    cuts: [
      { id: 'collier', name: 'Collier', top: '34%', left: '36%', availableMeats: ['Collier avec os', 'Collier sans os'], cookingMethods: ['Mijoter (Blanquette)'], description: "Morceau gélatineux et moelleux, la star incontestée de la blanquette de veau." },
      { id: 'epaule', name: 'Épaule', top: '43%', left: '42%', availableMeats: ['Épaule roulée', 'Sauté de veau', 'Marengo'], cookingMethods: ['Rôtir', 'Mijoter'], description: "Un classique tendre, parfait pour les sautés ou rôti au four." },
      { id: 'cotes', name: 'Côtes', top: '30%', left: '48%', availableMeats: ['Côtes premières', 'Côtes secondes', 'Côtes découvertes'], cookingMethods: ['Griller', 'Poêler'], description: "Une viande rosée, délicate et raffinée pour des repas élégants." },
      { id: 'longe', name: 'Longe & Filet', top: '29%', left: '60%', availableMeats: ['Filet mignon', 'Longe', 'Médaillons'], cookingMethods: ['Poêler', 'Rôtir'], description: "La partie la plus noble du veau. D'une tendreté incomparable." },
      { id: 'quasi', name: 'Quasi & Noix', top: '32%', left: '70%', availableMeats: ['Escalopes', 'Quasi', 'Noix pâtissière'], cookingMethods: ['Poêler', 'Paner'], description: "Des morceaux maigres idéals pour des escalopes milanaises ou des rôtis de choix." },
      { id: 'cuissot', name: 'Jarret & Osso Buco', top: '62%', left: '71%', availableMeats: ['Jarret', 'Osso Buco', 'Rouelle'], cookingMethods: ['Braiser', 'Mijoter'], description: "Morceau osseux et gélatineux célèbre pour le fameux plat italien Osso Buco." },
      { id: 'poitrine', name: 'Poitrine & Tendron', top: '47%', left: '51%', availableMeats: ['Poitrine farcie', 'Tendrons'], cookingMethods: ['Mijoter', 'Braiser'], description: "Parfaits pour apporter du moelleux à vos blanquettes et plats mijotés." }
    ]
  },
  {
    id: 'poulet',
    name: 'Poulet',
    image: '/images/poulet-silhouette.jpg',
    cuts: [
      { id: 'blanc', name: 'Blanc & Filet', top: '48%', left: '39%', availableMeats: ['Filets purs', 'Suprêmes', 'Émincés'], cookingMethods: ['Poêler', 'Griller', 'Vapeur'], description: "La partie la plus maigre. Idéale en escalope, en curry ou panée." },
      { id: 'aiguillette', name: 'Aiguillette', top: '60%', left: '42%', availableMeats: ['Aiguillettes'], cookingMethods: ['Poêler rapide', 'Frire'], description: "Petite bande de chair située sous le filet, extrêmement tendre." },
      { id: 'aile', name: 'Aile', top: '53%', left: '52%', availableMeats: ['Ailes entières', 'Manchons'], cookingMethods: ['Griller', 'Frire', 'Rôtir'], description: "Parfaites marinées pour l'apéritif, les barbecues ou des buffalo wings." },
      { id: 'cuisse', name: 'Cuisse entière', top: '67%', left: '55%', availableMeats: ['Cuisse entière'], cookingMethods: ['Rôtir', 'Mijoter', 'Griller'], description: "Une viande plus foncée, juteuse et très goûtue." },
      { id: 'haut-cuisse', name: 'Haut de cuisse', top: '53%', left: '61%', availableMeats: ['Haut de cuisse désossé', 'Haut avec os'], cookingMethods: ['Mijoter', 'Griller'], description: "Le meilleur compromis: tendre comme le filet, savoureux comme la cuisse." },
      { id: 'pilon', name: 'Pilon', top: '74%', left: '51%', availableMeats: ['Pilons'], cookingMethods: ['Rôtir', 'Frire', 'Griller'], description: "La partie inférieure de la cuisse, adorée des enfants et pratique à manger." },
      { id: 'sot-ly-laisse', name: 'Sot-l\'y-laisse', top: '42%', left: '55%', availableMeats: ['Sot-l\'y-laisse (sur commande)'], cookingMethods: ['Poêler'], description: "Deux petits morceaux très fins de chaque côté de la colonne vertébrale. Le 'caviar' du poulet." }
    ]
  },
  {
    id: 'dinde',
    name: 'Dinde',
    image: '/images/dinde-silhouette.jpg',
    cuts: [
      { id: 'blanc', name: 'Blanc & Filet', top: '52%', left: '37%', availableMeats: ['Filets', 'Escalopes', 'Rôti de dinde'], cookingMethods: ['Poêler', 'Rôtir'], description: "Viande très maigre et économique, parfaite pour des escalopes de tous les jours." },
      { id: 'cuisse', name: 'Cuisse & Pilon', top: '70%', left: '42%', availableMeats: ['Cuisse entière', 'Osso Buco de dinde'], cookingMethods: ['Rôtir', 'Mijoter'], description: "De gros morceaux savoureux qui supportent très bien les cuissons longues en cocotte." },
      { id: 'aile', name: 'Aile', top: '66%', left: '54%', availableMeats: ['Ailerons', 'Ailes'], cookingMethods: ['Mijoter', 'Bouillon'], description: "Souvent utilisés pour réaliser de formidables bouillons ou des ragoûts économiques." },
      { id: 'sot-ly-laisse', name: 'Sot-l\'y-laisse', top: '35%', left: '50%', availableMeats: ['Sot-l\'y-laisse'], cookingMethods: ['Poêler', 'Mijoter en crème'], description: "Des morceaux nobles, ronds et tendres, très prisés par les gourmets." }
    ]
  },
  {
    id: 'lapin',
    name: 'Lapin',
    image: '/images/lapin-silhouette.jpg',
    cuts: [
      { id: 'rable', name: 'Râble', top: '50%', left: '56%', availableMeats: ['Râbles', 'Filet de lapin'], cookingMethods: ['Rôtir', 'Poêler (moutarde)'], description: "Le dos du lapin. C'est le morceau le plus charnu, d'une grande finesse." },
      { id: 'cuisse', name: 'Cuisse', top: '66%', left: '61%', availableMeats: ['Cuisses'], cookingMethods: ['Mijoter', 'Braiser', 'Rôtir'], description: "Parfaite pour un lapin à la moutarde ou aux pruneaux, viande fondante." },
      { id: 'epaule', name: 'Épaule & Patte avant', top: '68%', left: '40%', availableMeats: ['Épaules (gigolettes)'], cookingMethods: ['Mijoter', 'Sauté'], description: "Petits morceaux savoureux (souvent appelés gigolettes) parfaits en sauce." },
      { id: 'avant', name: 'Avant & Côtes', top: '55%', left: '45%', availableMeats: ['Coffre', 'Avant'], cookingMethods: ['Mijoter', 'Bouillon'], description: "Idéal pour les terrines, les rillettes de lapin ou pour parfumer un fond." },
      { id: 'abats', name: 'Foie & Rognons', top: '64%', left: '50%', availableMeats: ['Foie', 'Rognons'], cookingMethods: ['Poêler rapidement'], description: "Des abats délicats, parfaits juste poêlés avec une persillade." }
    ]
  },
  {
    id: 'chevre',
    name: 'Chèvre / Chevreau',
    image: '/images/chevre-silhouette.jpg',
    cuts: [
      { id: 'collier', name: 'Collier & Épaule', top: '44%', left: '38%', availableMeats: ['Collier', 'Épaule (Cabri)'], cookingMethods: ['Mijoter', 'Ragoût (Colombo)'], description: "Des morceaux qui demandent à mijoter longtemps. Très populaires dans la cuisine antillaise." },
      { id: 'cotes', name: 'Côtes & Filet', top: '42%', left: '55%', availableMeats: ['Côtelettes'], cookingMethods: ['Griller', 'Poêler'], description: "Une chair au goût affirmé, excellente juste grillée aux herbes." },
      { id: 'gigot', name: 'Gigot', top: '48%', left: '68%', availableMeats: ['Gigot de chevreau'], cookingMethods: ['Rôtir (four/broche)'], description: "Traditionnellement rôti entier à Pâques, sa chair est délicate (chevreau) ou corsée (chèvre)." },
      { id: 'poitrine', name: 'Poitrine', top: '55%', left: '50%', availableMeats: ['Poitrine', 'Tendrons'], cookingMethods: ['Mijoter', 'Curry'], description: "Idéale pour les plats mijotés épicés, les currys et les colombos." }
    ]
  }
];
