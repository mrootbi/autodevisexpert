import { Link } from 'react-router-dom';
import LegalLayout from '../components/LegalLayout';

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Politique de Confidentialité"
      description="Politique de confidentialité, cookies et publicité Google AdSense sur AutoDevis Expert — conforme au RGPD."
      canonicalPath="/politique-de-confidentialite"
      lastUpdate="16 juillet 2026"
    >
      <p>
        La présente Politique de Confidentialité décrit la manière dont <strong>AutoDevis Expert</strong>
        (« nous », « notre », « le Site ») collecte, utilise et protège les données personnelles des
        utilisateurs du site <strong>autodevisexpert.com</strong>, conformément au Règlement (UE) 2016/679
        (RGPD) et à la loi française « Informatique et Libertés ».
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement des données personnelles est :
      </p>
      <ul>
        <li><strong>Dénomination :</strong> AutoDevis Expert</li>
        <li><strong>Contact :</strong>{' '}
          <a href="mailto:contact@autodevisexpert.com" className="text-trust-700 underline">
            contact@autodevisexpert.com
          </a>
        </li>
        <li><strong>Adresse postale :</strong> [À compléter — siège social / adresse de l&apos;éditeur]</li>
      </ul>
      <p>
        Pour toute question relative à la protection des données, vous pouvez également utiliser la page{' '}
        <Link to="/contact" className="text-trust-700 underline">Contact</Link>.
      </p>

      <h2>2. Données collectées</h2>
      <p>Nous pouvons collecter les catégories de données suivantes :</p>
      <ul>
        <li>
          <strong>Données de navigation et techniques :</strong> adresse IP (éventuellement anonymisée),
          type et version de navigateur, système d&apos;exploitation, pages consultées, date et heure de
          visite, référent, identifiants de session et données de cookies nécessaires au fonctionnement
          du Site.
        </li>
        <li>
          <strong>Données d&apos;utilisation du comparateur :</strong> informations techniques du véhicule
          (marque, modèle, motorisation, kilométrage) et description des symptômes ou devis fournie par
          l&apos;utilisateur. Ces données permettent de générer une estimation et d&apos;améliorer le service.
        </li>
        <li>
          <strong>Données de contact :</strong> nom, adresse e-mail et contenu du message lorsque vous
          utilisez le formulaire de contact.
        </li>
      </ul>
      <p>
        L&apos;utilisation du comparateur ne nécessite pas la création d&apos;un compte. Aucune donnée
        sensible au sens du RGPD n&apos;est demandée de manière volontaire.
      </p>

      <h2>3. Finalités et bases légales</h2>
      <ul>
        <li>
          <strong>Fourniture du service</strong> (analyse / estimation de devis) — intérêt légitime
          (art. 6.1.f RGPD) et/ou exécution de mesures précontractuelles à la demande de l&apos;utilisateur.
        </li>
        <li>
          <strong>Fonctionnement technique du Site</strong> (cookies strictement nécessaires, sécurité,
          prévention des abus) — intérêt légitime.
        </li>
        <li>
          <strong>Mesure d&apos;audience et amélioration du service</strong> — intérêt légitime et, le cas
          échéant, consentement lorsque la réglementation l&apos;exige.
        </li>
        <li>
          <strong>Publicité (Google AdSense)</strong> — consentement lorsque requis, et/ou intérêt légitime
          pour la publicité non personnalisée selon la configuration et les choix de l&apos;utilisateur.
        </li>
        <li>
          <strong>Réponse aux demandes de contact</strong> — intérêt légitime et mesures précontractuelles.
        </li>
      </ul>

      <h2>4. Cookies et technologies similaires</h2>
      <p>
        Le Site utilise des cookies et technologies similaires pour assurer son bon fonctionnement,
        mémoriser certaines préférences, mesurer l&apos;audience de façon agrégée et, lorsque la
        publicité est activée, diffuser des annonces.
      </p>
      <p>Types de cookies susceptibles d&apos;être déposés :</p>
      <ul>
        <li><strong>Cookies essentiels :</strong> nécessaires à la navigation et à la sécurité.</li>
        <li><strong>Cookies de fonctionnalité :</strong> mémorisation de préférences techniques.</li>
        <li><strong>Cookies analytiques :</strong> statistiques de fréquentation anonymisées ou pseudonymisées.</li>
        <li><strong>Cookies publicitaires :</strong> notamment ceux de Google AdSense (voir ci-dessous).</li>
      </ul>
      <p>
        Vous pouvez configurer votre navigateur pour refuser ou supprimer les cookies. Le blocage de
        certains cookies peut toutefois dégrader l&apos;expérience d&apos;utilisation du Site.
      </p>

      <h2>5. Publicité Google AdSense et cookies tiers (DART)</h2>
      <p>
        AutoDevis Expert peut afficher des publicités servies par <strong>Google AdSense</strong>, un
        service de Google Ireland Limited / Google LLC.
      </p>
      <p>
        <strong>
          Google utilise des cookies, notamment le cookie DART (DoubleClick), pour diffuser des
          annonces aux utilisateurs en fonction de leurs visites sur notre Site ainsi que sur
          d&apos;autres sites Internet.
        </strong>{' '}
        Ces cookies permettent à Google et à ses partenaires de servir des annonces sur la base de
        l&apos;historique de navigation de l&apos;utilisateur (publicité personnalisée), sous réserve
        des choix exprimés par ce dernier.
      </p>
      <p>
        Les utilisateurs peuvent <strong>désactiver la publicité personnalisée</strong> en visitant les
        paramètres Google relatifs aux annonces :
      </p>
      <ul>
        <li>
          <a
            href="https://adssettings.google.com"
            className="text-trust-700 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Paramètres des annonces Google (Ads Settings)
          </a>
        </li>
        <li>
          Ou, pour davantage d&apos;informations sur les cookies publicitaires Google :{' '}
          <a
            href="https://policies.google.com/technologies/ads"
            className="text-trust-700 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            technologies publicitaires Google
          </a>
        </li>
      </ul>
      <p>
        Vous pouvez également consulter la politique de confidentialité de Google :{' '}
        <a
          href="https://policies.google.com/privacy"
          className="text-trust-700 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://policies.google.com/privacy
        </a>
        . AutoDevis Expert n&apos;exerce aucun contrôle sur le contenu des annonces diffusées par le
        réseau AdSense ni sur les traitements réalisés par Google en qualité de responsable de
        traitement distinct pour ses propres services publicitaires.
      </p>

      <h2>6. Destinataires et sous-traitants</h2>
      <p>Les données peuvent être traitées par :</p>
      <ul>
        <li>l&apos;éditeur du Site et ses prestataires techniques strictement nécessaires ;</li>
        <li>l&apos;hébergeur du Site (voir Mentions Légales) ;</li>
        <li>Google (AdSense / services associés), lorsque la publicité est activée ;</li>
        <li>les autorités compétentes, uniquement lorsque la loi l&apos;exige.</li>
      </ul>
      <p>
        Nous ne vendons pas vos données personnelles. Les transferts hors Union européenne, le cas
        échéant (notamment via des services Google), s&apos;effectuent selon les mécanismes prévus par
        le RGPD (clauses contractuelles types, décisions d&apos;adéquation, etc.).
      </p>

      <h2>7. Durées de conservation</h2>
      <ul>
        <li>
          <strong>Analyses de devis :</strong> conservation maximale de 12 mois, puis suppression ou
          anonymisation.
        </li>
        <li>
          <strong>Messages de contact :</strong> conservation le temps nécessaire au traitement de la
          demande, puis archivage limité (24 mois maximum) sauf obligation légale contraire.
        </li>
        <li>
          <strong>Cookies :</strong> selon leur finalité, dans les limites recommandées par la CNIL
          (en général 13 mois maximum pour les cookies de mesure d&apos;audience / publicité soumis au
          consentement).
        </li>
        <li>
          <strong>Statistiques agrégées anonymisées :</strong> peuvent être conservées sans limite de
          durée.
        </li>
      </ul>

      <h2>8. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures techniques et organisationnelles appropriées afin de protéger
        les données contre la perte, l&apos;accès non autorisé, la divulgation ou l&apos;altération.
        Aucun système n&apos;étant parfaitement sécurisé, nous ne pouvons toutefois garantir une
        sécurité absolue.
      </p>

      <h2>9. Vos droits (RGPD)</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li>droit d&apos;accès ;</li>
        <li>droit de rectification ;</li>
        <li>droit à l&apos;effacement (« droit à l&apos;oubli ») ;</li>
        <li>droit à la limitation du traitement ;</li>
        <li>droit d&apos;opposition ;</li>
        <li>droit à la portabilité, lorsque applicable ;</li>
        <li>droit de retirer votre consentement à tout moment, lorsque le traitement est fondé sur celui-ci.</li>
      </ul>
      <p>
        Pour exercer ces droits, contactez-nous à{' '}
        <a href="mailto:contact@autodevisexpert.com" className="text-trust-700 underline">
          contact@autodevisexpert.com
        </a>
        . Vous disposez également du droit d&apos;introduire une réclamation auprès de la{' '}
        <a
          href="https://www.cnil.fr"
          className="text-trust-700 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          CNIL
        </a>{' '}
        (www.cnil.fr).
      </p>

      <h2>10. Mineurs</h2>
      <p>
        Le Site s&apos;adresse à un public majeur. Nous ne collectons pas sciemment de données
        personnelles auprès de mineurs de moins de 15 ans. Si vous estimez qu&apos;un mineur nous a
        transmis des données, contactez-nous afin que nous puissions les supprimer.
      </p>

      <h2>11. Modifications</h2>
      <p>
        La présente politique peut être mise à jour pour refléter les évolutions légales, techniques
        ou organisationnelles. La date de « dernière mise à jour » figurant en tête de page fait foi.
        Nous vous invitons à la consulter régulièrement.
      </p>
    </LegalLayout>
  );
}
