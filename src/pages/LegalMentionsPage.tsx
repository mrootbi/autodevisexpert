import { Link } from 'react-router-dom';
import LegalLayout from '../components/LegalLayout';

export default function LegalMentionsPage() {
  return (
    <LegalLayout
      title="Mentions Légales"
      description="Mentions légales du site AutoDevis Expert : éditeur, directeur de la publication, hébergeur et responsabilité."
      canonicalPath="/mentions-legales"
      lastUpdate="16 juillet 2026"
    >
      <p>
        Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans
        l&apos;économie numérique (LCEN), les présentes mentions légales informent les utilisateurs du
        site <strong>autodevisexpert.com</strong> (ci-après le « Site ») sur l&apos;identité des
        intervenants dans le cadre de sa réalisation et de son suivi.
      </p>

      <h2>1. Éditeur du site</h2>
      <p>Le Site est édité par :</p>
      <ul>
        <li><strong>Dénomination / Raison sociale :</strong> AutoDevis Expert</li>
        <li><strong>Forme juridique :</strong> [À compléter — ex. : SAS / Association loi 1901 / Entrepreneur individuel]</li>
        <li><strong>Capital social :</strong> [À compléter, le cas échéant]</li>
        <li><strong>Siège social :</strong> [À compléter — adresse complète, France]</li>
        <li><strong>SIRET / RCS :</strong> [À compléter]</li>
        <li><strong>Numéro de TVA intracommunautaire :</strong> [À compléter, le cas échéant]</li>
        <li>
          <strong>Adresse e-mail :</strong>{' '}
          <a href="mailto:contact@autodevisexpert.com" className="text-trust-700 underline">
            contact@autodevisexpert.com
          </a>
        </li>
        <li>
          <strong>Site web :</strong>{' '}
          <a href="https://www.autodevisexpert.com" className="text-trust-700 underline">
            https://www.autodevisexpert.com
          </a>
        </li>
      </ul>
      <p className="text-sm text-slate-500">
        Les mentions entre crochets sont des placeholders à remplacer par les informations
        juridiques définitives de l&apos;éditeur avant mise en production.
      </p>

      <h2>2. Directeur de la publication</h2>
      <p>
        Le directeur de la publication est :{' '}
        <strong>[À compléter — Nom et prénom du directeur de la publication]</strong>, en qualité de
        [président / gérant / responsable de la publication] de AutoDevis Expert.
      </p>
      <p>
        Contact du directeur de la publication :{' '}
        <a href="mailto:contact@autodevisexpert.com" className="text-trust-700 underline">
          contact@autodevisexpert.com
        </a>
        .
      </p>

      <h2>3. Hébergeur</h2>
      <p>Le Site est hébergé par :</p>
      <ul>
        <li><strong>Hébergeur :</strong> Hostinger International Ltd.</li>
        <li><strong>Adresse :</strong> 61 Lordou Vironos Street, 6023 Larnaca, Chypre</li>
        <li>
          <strong>Site web :</strong>{' '}
          <a
            href="https://www.hostinger.fr"
            className="text-trust-700 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://www.hostinger.fr
          </a>
        </li>
        <li><strong>Support :</strong> via l&apos;espace client Hostinger</li>
      </ul>
      <p>
        Les serveurs utilisés pour l&apos;hébergement peuvent être situés dans l&apos;Union européenne
        ou dans d&apos;autres régions selon l&apos;offre souscrite ; l&apos;éditeur veille, dans la
        mesure du possible, au respect du cadre RGPD applicable.
      </p>

      <h2>4. Nature du service</h2>
      <p>
        AutoDevis Expert propose un service en ligne de <strong>comparaison estimative de prix de
        réparation automobile</strong> à partir d&apos;informations saisies par l&apos;utilisateur
        (véhicule, symptômes, éléments de devis).
      </p>
      <p>
        <strong>
          Les résultats fournis le sont exclusivement à titre informatif et indicatif.
        </strong>{' '}
        Ils ne constituent ni un devis commercial ferme, ni un diagnostic technique, ni une
        prescription d&apos;intervention. Ils ne remplacent en aucun cas l&apos;avis, le contrôle ou
        le devis écrit d&apos;un professionnel de l&apos;automobile habilité.
      </p>

      <h2>5. Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des éléments du Site (structure, textes, graphismes, logos, icônes, images,
        logiciels, bases de données, etc.) est protégé par le droit de la propriété intellectuelle.
        Toute reproduction, représentation, modification, publication ou adaptation, totale ou
        partielle, est interdite sans autorisation écrite préalable de l&apos;éditeur.
      </p>
      <p>
        Les marques, dénominations et logos de constructeurs automobiles ou d&apos;équipementiers
        éventuellement cités appartiennent à leurs propriétaires respectifs et sont mentionnés
        uniquement à des fins d&apos;information et d&apos;identification des véhicules ou pièces
        concernés.
      </p>

      <h2>6. Responsabilité</h2>
      <p>
        L&apos;éditeur s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des
        informations diffusées sur le Site. Toutefois, il ne peut garantir l&apos;exhaustivité, la
        précision ni l&apos;actualité permanente de ces informations, notamment s&apos;agissant des
        estimations de prix, qui dépendent de nombreux facteurs (région, garage, disponibilité des
        pièces, état réel du véhicule, etc.).
      </p>
      <p>
        L&apos;utilisateur demeure seul responsable des décisions qu&apos;il prend concernant
        l&apos;entretien ou la réparation de son véhicule. L&apos;éditeur ne saurait être tenu
        responsable des dommages directs ou indirects résultant de l&apos;utilisation du Site ou de
        la confiance accordée aux estimations fournies.
      </p>

      <h2>7. Liens hypertextes</h2>
      <p>
        Le Site peut contenir des liens vers des sites tiers. AutoDevis Expert n&apos;exerce aucun
        contrôle sur ces sites et décline toute responsabilité quant à leur contenu, leur
        disponibilité ou leurs pratiques en matière de données personnelles.
      </p>

      <h2>8. Droit applicable</h2>
      <p>
        Les présentes mentions légales sont régies par le droit français. En cas de litige, et à
        défaut de résolution amiable, les tribunaux français compétents seront seuls habilités à
        en connaître.
      </p>

      <h2>9. Contact</h2>
      <p>
        Pour toute question relative aux présentes mentions légales :{' '}
        <a href="mailto:contact@autodevisexpert.com" className="text-trust-700 underline">
          contact@autodevisexpert.com
        </a>{' '}
        ou via la page <Link to="/contact" className="text-trust-700 underline">Contact</Link>.
      </p>
    </LegalLayout>
  );
}
