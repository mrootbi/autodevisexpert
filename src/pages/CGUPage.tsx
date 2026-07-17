import { Link } from 'react-router-dom';
import LegalLayout from '../components/LegalLayout';

export default function CGUPage() {
  return (
    <LegalLayout
      title="Conditions Générales d'Utilisation (CGU)"
      description="Conditions générales d'utilisation d'AutoDevis Expert : estimations IA, limites de responsabilité et règles d'usage."
      canonicalPath="/cgu"
      lastUpdate="16 juillet 2026"
    >
      <p>
        Les présentes Conditions Générales d&apos;Utilisation (ci-après les « CGU ») ont pour objet de
        définir les modalités et conditions dans lesquelles les utilisateurs (ci-après
        l&apos;« Utilisateur ») peuvent accéder et utiliser le site{' '}
        <strong>autodevisexpert.com</strong> et les services associés édités par AutoDevis Expert
        (ci-après l&apos;« Éditeur »).
      </p>
      <p>
        L&apos;accès et l&apos;utilisation du Site impliquent l&apos;acceptation pleine et entière des
        présentes CGU. Si vous n&apos;acceptez pas ces conditions, veuillez ne pas utiliser le Site.
      </p>

      <h2>1. Objet du service</h2>
      <p>
        AutoDevis Expert met à disposition un outil en ligne permettant d&apos;obtenir une{' '}
        <strong>estimation comparative</strong> de prix de réparation automobile à partir
        d&apos;informations fournies par l&apos;Utilisateur (caractéristiques du véhicule, symptômes,
        éléments de devis, etc.).
      </p>
      <p>
        Le Site peut également proposer des contenus éditoriaux (blog) à caractère informatif et
        pédagogique relatifs à la mécanique automobile.
      </p>

      <h2>2. Définitions</h2>
      <ul>
        <li>
          <strong>Site :</strong> l&apos;ensemble des pages et services accessibles à l&apos;adresse
          autodevisexpert.com.
        </li>
        <li>
          <strong>Comparateur / Outil :</strong> le module d&apos;analyse et d&apos;estimation de devis.
        </li>
        <li>
          <strong>Utilisateur :</strong> toute personne physique naviguant sur le Site ou utilisant
          l&apos;Outil.
        </li>
        <li>
          <strong>Estimation :</strong> résultat indicatif généré par l&apos;Outil, y compris à l&apos;aide
          de technologies d&apos;intelligence artificielle.
        </li>
      </ul>

      <h2>3. Accès au service</h2>
      <p>
        L&apos;accès au Site et à l&apos;Outil est, sauf mention contraire, gratuit. L&apos;Utilisateur
        prend à sa charge les frais de connexion internet nécessaires.
      </p>
      <p>
        L&apos;Éditeur se réserve le droit de modifier, suspendre ou interrompre tout ou partie du
        service, temporairement ou définitivement, notamment pour maintenance, mise à jour, cas de
        force majeure ou raisons de sécurité, sans que cela n&apos;ouvre droit à une quelconque
        indemnité.
      </p>

      <h2>4. Intelligence artificielle et caractère estimatif des résultats</h2>
      <p>
        AutoDevis Expert peut recourir à des <strong>technologies d&apos;intelligence artificielle (IA)</strong>{' '}
        et à des bases de données de prix afin d&apos;analyser les informations saisies et de produire
        un comparatif ou des recommandations.
      </p>
      <p>
        <strong>
          Les résultats fournis constituent uniquement des estimations à titre informatif.
        </strong>{' '}
        Ils :
      </p>
      <ul>
        <li>ne remplacent pas le diagnostic d&apos;un mécanicien ou d&apos;un professionnel habilité ;</li>
        <li>ne constituent pas un devis ferme, une offre commerciale ni un engagement contractuel ;</li>
        <li>ne garantissent pas le prix final pratiqué par un garage, une concession ou un réparateur ;</li>
        <li>
          peuvent comporter des approximations, omissions ou erreurs liées à la qualité des données
          fournies, à l&apos;évolution des tarifs, à l&apos;état réel du véhicule ou aux limites
          techniques de l&apos;IA.
        </li>
      </ul>
      <p>
        Avant toute intervention sur un véhicule, l&apos;Utilisateur doit faire réaliser un
        diagnostic et obtenir un devis écrit auprès d&apos;un professionnel de l&apos;automobile.
      </p>

      <h2>5. Obligations de l&apos;Utilisateur</h2>
      <p>L&apos;Utilisateur s&apos;engage à :</p>
      <ul>
        <li>fournir des informations exactes et non trompeuses lorsqu&apos;il utilise l&apos;Outil ;</li>
        <li>utiliser le Site conformément aux lois en vigueur et aux présentes CGU ;</li>
        <li>
          ne pas tenter d&apos;altérer le fonctionnement du Site, d&apos;accéder de manière non
          autorisée aux systèmes, ni de procéder à du scraping, reverse engineering ou extraction
          automatisée massive de contenus ;
        </li>
        <li>
          ne pas utiliser le Site à des fins commerciales, publicitaires ou concurrentielles sans
          autorisation écrite préalable de l&apos;Éditeur.
        </li>
      </ul>

      <h2>6. Limitation de responsabilité — réparations automobiles</h2>
      <p>
        Dans les limites autorisées par la loi, l&apos;Éditeur décline toute responsabilité au titre :
      </p>
      <ul>
        <li>
          des décisions d&apos;entretien, de réparation, d&apos;achat de pièces ou de recours à un
          garage prises par l&apos;Utilisateur sur la base des estimations ou contenus du Site ;
        </li>
        <li>
          des dommages matériels, immatériels, directs ou indirects résultant d&apos;une intervention
          sur un véhicule (panne, accident, immobilisation, coûts supplémentaires, etc.) ;
        </li>
        <li>
          de l&apos;inexactitude, de l&apos;incomplétude ou de l&apos;obsolescence des estimations de
          prix ou des conseils généraux diffusés sur le Site ;
        </li>
        <li>
          des interruptions, erreurs techniques, virus ou indisponibilités du Site, malgré les
          efforts raisonnables de l&apos;Éditeur.
        </li>
      </ul>
      <p>
        L&apos;Utilisateur demeure seul responsable de la maintenance et de la sécurité de son
        véhicule, ainsi que du choix du professionnel intervenant.
      </p>

      <h2>7. Propriété intellectuelle</h2>
      <p>
        Les contenus du Site restent la propriété exclusive de l&apos;Éditeur ou de ses partenaires.
        Toute reproduction non autorisée est interdite. Les marques de constructeurs cités
        appartiennent à leurs titulaires respectifs.
      </p>

      <h2>8. Données personnelles et cookies</h2>
      <p>
        Le traitement des données personnelles et l&apos;usage des cookies, y compris dans le cadre
        de Google AdSense le cas échéant, sont décrits dans la{' '}
        <Link to="/politique-de-confidentialite" className="text-trust-700 underline">
          Politique de Confidentialité
        </Link>
        .
      </p>

      <h2>9. Publicité</h2>
      <p>
        Le Site peut afficher des publicités, notamment via Google AdSense. L&apos;Éditeur n&apos;est
        pas responsable du contenu des annonces diffusées par des tiers ni des sites vers lesquels
        ces annonces peuvent renvoyer.
      </p>

      <h2>10. Modification des CGU</h2>
      <p>
        L&apos;Éditeur peut modifier les présentes CGU à tout moment. La version applicable est celle
        publiée sur le Site à la date d&apos;utilisation. La date de dernière mise à jour figure en
        tête de page.
      </p>

      <h2>11. Droit applicable et litiges</h2>
      <p>
        Les présentes CGU sont soumises au droit français. En cas de litige relatif à leur
        interprétation ou à leur exécution, et à défaut d&apos;accord amiable, compétence est
        attribuée aux tribunaux français compétents.
      </p>

      <h2>12. Contact</h2>
      <p>
        Pour toute question relative aux présentes CGU :{' '}
        <a href="mailto:contact@autodevisexpert.com" className="text-trust-700 underline">
          contact@autodevisexpert.com
        </a>{' '}
        — page <Link to="/contact" className="text-trust-700 underline">Contact</Link>.
      </p>
    </LegalLayout>
  );
}
