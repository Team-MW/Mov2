/**
 * Contenu éditorial « Au rayon » pour les rayons qui n'ont pas de
 * section dédiée (Frais, Surgelés, Crémerie).
 * Uniquement du texte : aucune image vide possible.
 */
import type { RayonSlug } from "@/lib/site";

export interface RayonVitrine {
  tag: string;
  titre: string;
  intro: string;
  familles: { nom: string; texte: string; exemples?: string[] }[];
  conseil: { titre: string; texte: string };
}

export const RAYON_VITRINES: Partial<Record<RayonSlug, RayonVitrine>> = {
  surgeles: {
    tag: "Au rayon Surgelés",
    titre: "Le monde au congélateur",
    intro:
      "Des produits prêts en quelques minutes, pour un apéro, un repas du soir ou un ramadan bien organisé. Tout est rangé par famille dans nos vitrines.",
    familles: [
      { nom: "Apéritifs", texte: "À frire ou au four, pour recevoir sans y passer la journée.", exemples: ["Samoussas", "Bricks", "Nems", "Bouchées"] },
      { nom: "Viandes halal", texte: "Pièces et préparations halal, surgelées pour garder toute leur qualité.", exemples: ["Volaille", "Viande hachée", "Brochettes"] },
      { nom: "Plats préparés halal", texte: "Des plats complets, prêts à réchauffer.", exemples: ["Plats mijotés", "Couscous", "Lasagnes"] },
      { nom: "Légumes du monde", texte: "Les légumes difficiles à trouver frais, disponibles toute l'année.", exemples: ["Gombo", "Feuilles de manioc", "Épinards", "Petits pois"] },
      { nom: "Poissons", texte: "Filets, poissons panés et fruits de mer pour la semaine.", exemples: ["Filets", "Poissons panés", "Crevettes"] },
      { nom: "Desserts", texte: "Glaces et pâtisseries pour finir le repas.", exemples: ["Glaces", "Pâtisseries"] },
    ],
    conseil: {
      titre: "Le bon réflexe",
      texte: "Prenez les surgelés en dernier et rangez-les ensemble dans un sac isotherme : la chaîne du froid est respectée jusqu'à chez vous.",
    },
  },

  "produits-courants": {
    tag: "Au rayon Frais",
    titre: "Tout le quotidien, au même endroit",
    intro:
      "L'épicerie de tous les jours, les boissons et l'entretien de la maison, à petits prix. De quoi faire toutes vos courses en un seul passage.",
    familles: [
      { nom: "Épicerie salée", texte: "Les basiques du placard pour cuisiner toute la semaine.", exemples: ["Pâtes", "Riz", "Conserves", "Sauces"] },
      { nom: "Épicerie sucrée", texte: "Pour le petit-déjeuner et le goûter.", exemples: ["Biscuits", "Confitures", "Fruits secs", "Céréales"] },
      { nom: "Boissons", texte: "Eaux, jus, sodas et boissons du monde.", exemples: ["Eaux", "Jus", "Sodas", "Thés"] },
      { nom: "Hygiène & entretien", texte: "Les marques connues pour la maison et la salle de bain.", exemples: ["Lessive", "Vaisselle", "Soins"] },
    ],
    conseil: {
      titre: "Petits prix",
      texte: "Les prix sont affichés en rayon, à l'euro près. Pensez à regarder les promos de la semaine avant de venir.",
    },
  },

  cremerie: {
    tag: "Au rayon Crémerie",
    titre: "Les essentiels, toujours frais",
    intro:
      "Fromages, beurres, yaourts, crèmes, laits et œufs : tout le frais laitier du quotidien, avec des spécialités venues d'ailleurs.",
    familles: [
      { nom: "Fromages affinés", texte: "Les grands classiques et quelques spécialités.", exemples: ["Camembert", "Comté", "Roquefort"] },
      { nom: "Fromages du monde", texte: "Pour les salades, le four ou la poêle.", exemples: ["Feta", "Halloumi", "Mozzarella"] },
      { nom: "Beurres & crèmes", texte: "Doux, demi-sel, crème épaisse ou liquide.", exemples: ["Beurre doux", "Demi-sel", "Crème fraîche"] },
      { nom: "Yaourts & desserts", texte: "Nature, aux fruits, et crèmes desserts.", exemples: ["Yaourts", "Fromage blanc", "Faisselle"] },
      { nom: "Laits", texte: "Entier, demi-écrémé et laits végétaux.", exemples: ["Lait frais", "Lait ribot", "Laits végétaux"] },
      { nom: "Œufs", texte: "Plein air et bio, en boîte de 6 ou de 12.", exemples: ["Plein air", "Bio"] },
    ],
    conseil: {
      titre: "Fraîcheur",
      texte: "Nos vitrines sont réapprovisionnées régulièrement. Vérifiez la date limite et rangez vos produits laitiers au frais dès votre retour.",
    },
  },
};
