/* FAQs — une banque par page.
   Chaque page passe sa liste à <Layout faqItems={...}> pour injecter
   automatiquement le JSON-LD FAQPage dans le <head>.                 */

export interface FAQItem {
  q: string;
  r: string;
}

export const FAQ_HOME: FAQItem[] = [
  {
    q: "Qu'est-ce que Marché de Mo' ?",
    r: "Le plus grand supermarché ethnique d'Occitanie. 20 000+ références, boucherie halal, fruits et légumes exotiques, épices du monde, produits laitiers, crémerie, saveurs d'Asie, de Méditerranée et bien plus. Ouvert 7j/7 à Toulouse.",
  },
  {
    q: "Où se trouve le magasin Marché de Mo' ?",
    r: "Notre magasin se trouve à Toulouse Sud Cépière (5 rue Joachim du Bellay, sortie 27).",
  },
  {
    q: "Le magasin est-il ouvert le dimanche ?",
    r: "Oui, notre magasin est ouvert 7 jours sur 7 dont le dimanche de 8h30 à 13h.",
  },
  {
    q: "Quels moyens de paiement acceptez-vous ?",
    r: "Visa, Mastercard, Maestro, American Express, Apple Pay, Google Pay, PayPal et Tickets Restaurant.",
  },
  {
    q: "Peut-on s'inscrire à un programme de fidélité ?",
    r: "Oui, Marché de Mo' propose un programme de fidélité avec des offres exclusives. Voir la page Programme de fidélité pour s'inscrire.",
  },
];

export const FAQ_BOUCHERIE: FAQItem[] = [
  {
    q: "La boucherie est-elle certifiée halal ?",
    r: "Oui. Toutes nos viandes sont halal certifiées, abattues sans électronarcose.",
  },
  {
    q: "La viande est-elle fraîche quotidiennement ?",
    r: "Oui, arrivage quotidien. Nous travaillons directement les carcasses.",
  },
  {
    q: "Où trouver de la viande halal à Toulouse ?",
    r: "Marché de Mo' propose la boucherie halal la plus complète de Toulouse, dans notre magasin de Toulouse Sud Cépière.",
  },
  {
    q: "Vendez-vous de l'agneau halal sans électronarcose ?",
    r: "Oui, l'intégralité de nos viandes est certifiée halal et abattue selon les préceptes islamiques, sans électronarcose.",
  },
];

export const FAQ_POISSONNERIE: FAQItem[] = [
  {
    q: "Quels jours arrive le poisson ?",
    r: "Le poisson arrive uniquement le vendredi, le samedi et le dimanche. C'est le concept de la poissonnerie Mo' : trois jours d'arrivage pour un poisson ultra frais.",
  },
  {
    q: "Pourquoi seulement le week-end ?",
    r: "Parce qu'on préfère concentrer les arrivages sur les jours où vous faites vos courses. Le poisson est choisi pour être vendu rapidement, au meilleur de sa fraîcheur.",
  },
  {
    q: "Comment conserver mon poisson frais ?",
    r: "Rangez-le dès votre retour dans la partie la plus froide du réfrigérateur (entre 0 et 4 °C), dans un récipient fermé, et cuisinez-le de préférence dans les 24 heures.",
  },
  {
    q: "Où se trouve la poissonnerie ?",
    r: "Dans notre magasin Marché de Mo' Toulouse Sud — Cépière, 5 rue Joachim du Bellay, 31100 Toulouse.",
  },
];

export const FAQ_RAYONS_GENERAL: FAQItem[] = [
  {
    q: "Combien de références propose Marché de Mo' ?",
    r: "Plus de 20 000 références sur 12 rayons thématiques.",
  },
  {
    q: "Trouve-t-on des produits exotiques rares ?",
    r: "Oui, 120+ références exotiques en fruits et légumes et une épicerie ethnique complète pour les cuisines africaine, asiatique, créole et méditerranéenne.",
  },
  {
    q: "Proposez-vous des produits laitiers et de la crémerie ?",
    r: "Oui, notre rayon Crémerie propose un grand choix de fromages, beurres, crèmes et yaourts.",
  },
];

export const FAQ_MAGASINS: FAQItem[] = [
  {
    q: "Y a-t-il un parking ?",
    r: "Oui, un grand parking gratuit de 600 places est à votre disposition.",
  },
  {
    q: "Le magasin est-il accessible PMR ?",
    r: "Oui, notre magasin est entièrement adapté aux personnes à mobilité réduite.",
  },
  {
    q: "Comment venir au magasin de Toulouse Sud ?",
    r: "Sortie 27 de la rocade, direction Cépière. 5 rue Joachim du Bellay, 31100 Toulouse. Parking gratuit de 600 places sur place.",
  },
];

export const FAQ_PROMOS: FAQItem[] = [
  {
    q: "Comment sont choisies les promotions ?",
    r: "Nos équipes mettent à jour les offres chaque semaine selon les rayons. Consultez /catalogue pour le prospectus en ligne, ou /promos pour toutes les offres actives.",
  },
  {
    q: "Les promos sont-elles valables en magasin ?",
    r: "Oui, toutes nos promotions sont applicables directement en caisse dans notre magasin de Toulouse Sud Cépière.",
  },
];

export const FAQ_RECRUTEMENT: FAQItem[] = [
  {
    q: "Qui peut postuler chez Marché de Mo' ?",
    r: "Tout le monde. Nous recrutons avec ou sans diplôme, avec ou sans expérience. 90% de notre équipe actuelle n'avait pas d'emploi avant de rejoindre le Marché de Mo'.",
  },
  {
    q: "Quel âge pour travailler chez vous ?",
    r: "Notre équipe actuelle a entre 19 et 56 ans. Nous croyons fondamentalement à la diversité intergénérationnelle.",
  },
  {
    q: "Quel type de contrat proposez-vous ?",
    r: "CDI, CDD, apprentissage et alternance. Toutes nos offres ouvertes sont listées sur cette page /recrutement.",
  },
];

export const FAQ_ENGAGEMENTS: FAQItem[] = [
  {
    q: "Avec quelles associations travaillez-vous ?",
    r: "Nous sommes partenaires de plusieurs banques alimentaires de Haute-Garonne et d'associations de soutien aux personnes âgées de l'agglomération toulousaine.",
  },
  {
    q: "Comment l'inclusion se traduit concrètement ?",
    r: "90% de notre équipe n'avait pas d'emploi avant d'être embauchée chez nous. Nous travaillons avec France Travail et des associations de réinsertion pour recruter et former sur le terrain.",
  },
];

/* Helper : FAQ spécifique à un rayon — on combine la FAQ rayon général
   avec la FAQ boucherie si c'est le rayon boucherie.                  */
export const FAQ_SURGELES: FAQItem[] = [
  { q: "Avez-vous de la viande halal surgelée ?", r: "Oui. Le rayon Surgelés propose des viandes et des plats préparés halal, en plus de la viande fraîche de notre boucherie halal." },
  { q: "Quels apéritifs surgelés trouve-t-on chez Mo' ?", r: "Samoussas, bricks, nems et bouchées, à frire ou à cuire au four. Idéal pour recevoir ou pour le ramadan." },
  { q: "Comment garder mes surgelés au froid jusqu'à chez moi ?", r: "Prenez-les en fin de courses et regroupez-les dans un sac isotherme. Rangez-les au congélateur dès votre retour." },
];

export const FAQ_FRAIS: FAQItem[] = [
  { q: "Que trouve-t-on au rayon Frais ?", r: "L'épicerie du quotidien (salée et sucrée), les boissons et les produits d'hygiène et d'entretien, à petits prix." },
  { q: "Les prix sont-ils affichés en ligne ?", r: "Les prix sont affichés en rayon, à l'euro près. Les offres du moment sont visibles sur la page Promos." },
  { q: "Le magasin est-il ouvert le dimanche ?", r: "Oui, le magasin est ouvert 7 jours sur 7. Les horaires sont indiqués en bas de cette page." },
];

export const FAQ_CREMERIE: FAQItem[] = [
  { q: "Proposez-vous des fromages du monde ?", r: "Oui : feta, halloumi, mozzarella et d'autres spécialités, à côté des grands fromages affinés." },
  { q: "Avez-vous des laits végétaux ?", r: "Oui, le rayon Crémerie propose des laits végétaux en plus des laits frais entier et demi-écrémé." },
  { q: "Où se trouve le rayon Crémerie en magasin ?", r: "Dans l'espace des produits frais, dans nos vitrines réfrigérées. N'hésitez pas à demander à nos équipes." },
];

export function faqsForRayon(slug: string): FAQItem[] {
  if (slug === "boucherie-halal") return FAQ_BOUCHERIE.concat(FAQ_RAYONS_GENERAL.slice(0, 1));
  if (slug === "poissonnerie") return FAQ_POISSONNERIE;
  if (slug === "surgeles") return FAQ_SURGELES;
  if (slug === "produits-courants") return FAQ_FRAIS;
  if (slug === "cremerie") return FAQ_CREMERIE;
  return FAQ_RAYONS_GENERAL;
}
