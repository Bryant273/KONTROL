import React, { useState } from 'react';
import { ChevronLeft, Shield, Lock, Scale, Info, Building2, Gavel, FileText, Database, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from '../common/Logo';
import { SupportForm } from '../common/SupportForm';
import { useTranslation } from 'react-i18next';

interface LegalTermsProps {
  type: 'mentions' | 'confidentialite';
  onClose: () => void;
}

export function LegalTerms({ type, onClose }: LegalTermsProps) {
  const { t } = useTranslation();
  const [showSupport, setShowSupport] = useState(false);
  const content = {
    mentions: {
      title: "Mentions Légales & Conditions Générales",
      subtitle: "Cadre contractuel, identification de l'éditeur KONTROL et conditions d'exploitation",
      icon: Scale,
      sections: [
        {
          title: "1. Identification de l'Éditeur",
          icon: Building2,
          content: `Le site KONTROL.app, l'application KONTROL et l'ensemble de leurs déclinaisons sont édités et exploités à titre exclusif par la société INNOV'KORP.
          
          • Directeurs de la Publication : Le Comité de Direction Générale d'INNOV'KORP.
          • Contact Direction : Innov.korp@gmail.com.
          • Numéro de téléphone de contact : +225 01 50 97 91 23.`
        },
        {
          title: "2. Chiffrement & Sécurité des Données",
          icon: Database,
          content: `Les bases d'hébergement logiques de KONTROL garantissent un cloisonnement cryptographique de premier ordre pour votre sérénité professionnelle.
          
          • Chiffrement à 100% : Toutes les connexions, fiches produits, transactions comptables et journaux de caisse subissent un cryptage fort (en transit avec TLS 1.3 et au repos via AES-256 bits).
          • Stockage Hautement Sécurisé : Les données résident dans des partitions hautement résilientes possédant un contrôle d'accès strict (multi-tenant isolation), isolant à 100% chaque espace d'entreprise.`
        },
        {
          title: "3. Propriété Intellectuelle, Algorithmes et Protection des Systèmes",
          icon: Gavel,
          content: `L'intégralité de la plateforme KONTROL, ce qui inclut sans limitation le code source, l'interfaçage graphique (UI/UX), les chartes visuelles, les bases de données SQL/NoSQL, ainsi que les modèles et connectifs exclusifs développés par le moteur d'intelligence artificielle "Blue AI", sont protégés par le droit international de la propriété intellectuelle et les traités sur les droits d'auteur.
          
          Toute copie, extraction, décompilation, ingénierie inverse (reverse-engineering), aspiration automatisée de données (scraping), distribution publique ou reproduction partielle ou totale des technologies constitutives de KONTROL est strictement interdite sans le consentement écrit, explicite et préalable de la direction d'INNOV'KORP. Toute infraction constatée fera l'objet de poursuites judiciaires directes devant les juridictions civiles et répressives compétentes.`
        },
        {
          title: "4. Conditions d'Accès, Force Majeure et Responsabilités",
          icon: Shield,
          content: `KONTROL met en œuvre tous les moyens diligents à sa disposition pour garantir une expérience logicielle continue. Toutefois, notre responsabilité ne saurait être recherchée ni engagée dans les circonstances suivantes :
          
          • Interruption momentanée de service pour mise à niveau technique ou correctifs majeurs de sécurité (annoncés par courriel avec un préavis d'au moins 24 heures).
          • Ralentissements, perturbations ou déconnexions découlant d'une défaillance des infrastructures réseau de télécommunication locales ou internationales de l'utilisateur final.
          • Événements qualifiés de force majeure ou cas fortuits, tels que définis par les codes de droit civil applicables (paralysie générale du réseau électrique, interruptions des serveurs d'authentification tiers, ou sinistres physiques).
          • Utilisation non conforme de l'application, détournement d'authentifiants ou pertes financières liées à des négligences internes de gestion de l'entreprise cliente.`
        },
        {
          title: "5. Droit Applicable, Juridiction et Résolution des Litiges",
          icon: Scale,
          content: `Les présentes mentions légales, les conditions générales d'utilisation et d'exploitation du service KONTROL sont intégralement et exclusivement régies par le droit de la République de Côte d'Ivoire.
          
          En cas de contestation, de litige ou d'interprétation complexe portant sur l'exécution des présentes clauses, les parties s'engagent fermement à entamer une procédure de résolution à l'amiable sous 30 jours, impliquant l'échange officiel de courriers recommandés.
          
          À défaut d'un accord mutuel à l'issue de cette période de médiation, compétence exclusive et souveraine est attribuée au Tribunal de Commerce d'Abidjan Côte d'Ivoire.`
        }
      ]
    },
    confidentialite: {
      title: "Charte de Confidentialité & RGPD",
      subtitle: "Notre engagement inaliénable pour la protection absolue de vos données d'entreprise",
      icon: Lock,
      sections: [
        {
          title: "1. Nature Détaillée des Données Collectées",
          icon: FileText,
          content: `Dans le cadre de l'exécution de nos engagements contractuels et pour vous fournir une expérience optimale sur KONTROL, nous collectons les types d'informations suivants :
          
          • Données d'identité de l'utilisateur : Nom complet, prénom, adresse e-mail professionnelle, numéro de téléphone, rôle administratif et historique de connexion.
          • Données structurelles de l'entreprise : Dénomination sociale, logo de marque, immatriculation fiscale (NCC, RCCM), adresse fiscale et coordonnées de facturation de la structure.
          • Données opérationnelles et comptables : Journaux de ventes, écritures comptables réelles, transactions bancaires simulées ou réelles, stocks en rayon, fiches fournisseurs et informations clients.
          • Télémétrie de connexion : Adresses IP d'accès au service, profils d'appareils de connexion, jetons d'accès chiffrés et journaux de sécurité internes pour la traçabilité continue des écritures.`
        },
        {
          title: "2. Moteur Blue AI, Isolation Totale et Non-Partage pour Entraînement",
          icon: ShieldCheck,
          content: `Notre module d'Intelligence Artificielle cognitif, dénommé "Blue AI", a été conçu sous un paradigme d'isolation totale et de souveraineté absolue.
          
          • Éthique IA & Non-utilisation stratégique : Vos écritures comptables, vos chiffres d'affaires et vos inventaires sont strictement confinés à votre espace d'entreprise. Contrairement aux services grand public d'IA, INNOV'KORP garantit formellement que vos données métier ne sont JAMAIS utilisées, transmises ou analysées pour entraîner des modèles globaux ou être partagées avec d'autres clients ou concurrents stratégiques.
          • Traitement en Sandbox Isolée : Les requêtes soumises au moteur "Blue AI" sont traitées via des API cloud server-side chiffrées sans mémorisation permanente de contexte orphelin.`
        },
        {
          title: "3. Durée de Conservation et Effacement Cryptographique (Cryptoshredding)",
          icon: Info,
          content: `Nous conservons vos données d'exploitation de manière sécurisée tant que votre abonnement ou votre compte utilisateur KONTROL demeure actif.
          
          En cas de résiliation définitive ou de clôture spontanée de votre compte d'affaires :
          • Toutes vos fiches et données d'exploitation sont protégées et isolées pour une période tampon de 90 jours civils, vous permettant de procéder à des exportations d'urgence (formats tableur ou PDF).
          • Passé ce délai légal de 90 jours, INNOV'KORP procède au hachage et à la destruction définitive (cryptoshredding) de toutes vos informations d'exploitation de nos serveurs de production physiques et cloud, sous réserve des seules obligations réglementaires de conservation fiscale des pièces justificatives de vente.`
        },
        {
          title: "4. Sécurité de Niveau Bancaire et Gestion des Tiers",
          icon: Shield,
          content: `Nous déployons des mesures techniques et organisationnelles renforcées, comparables aux exigences des institutions de crédit :
          
          • Chiffrement de bout en bout : Toutes les communications transitant entre votre navigateur et nos clusters Google Cloud utilisent le protocole TLS 1.3 avec hachage fort. Les données au repos sont chiffrées en AES-256 bits.
          • Isolation Tenant Logicielle : Les contrôles d'accès au niveau des bases de données Firestore excluent physiquement toute possibilité pour un utilisateur externe ou malveillant d'écouter ou de falsifier vos tables d'écriture.
          • Intermédiaires certifiés : Tous nos sous-traitants technologiques (Wave pour les transferts monétaires, Google pour la logistique cloud) adhèrent à des normes et législations de premier plan comme PCI-DSS et le règlement général sur la protection des données.`
        },
        {
          title: "5. Droits d'Accès, de Rectification et de Suppression Légale (ARTCI / RGPD)",
          icon: Scale,
          content: `Conformément aux directives de la loi ivoirienne sur la protection des données personnelles (régulé par l'ARTCI) et aux principes du RGPD, vous disposez d'un contrôle absolu sur votre patrimoine informationnel :
          
          • Droit de rectification et consultation : Vous pouvez visualiser et corriger directement en ligne la totalité de vos écritures, stocks et tiers de confiance.
          • Droits d'extraction : Vous disposez à tout instant d'un droit de portabilité pour télécharger une copie brute et lisible de vos tables de données.
          • Procédure de demande d'obli : Pour toute requête relative à vos droits individuels de suppression globale de vos identités sur nos systèmes, vous pouvez formuler une mise en demeure officielle à : Innov.korp@gmail.com. Nous traitons et validons votre demande sous un délai maximal garanti de 48 heures ouvrées.`
        }
      ]
    }
  };

  const activeContent = content[type];
  const Icon = activeContent.icon;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-white flex flex-col overflow-y-auto"
    >
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-kontrol-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-kontrol-bg rounded-full transition-colors group flex items-center gap-2 text-kontrol-ink-soft"
            >
              <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Retour</span>
            </button>
            <div className="h-8 w-px bg-kontrol-border mx-2" />
            <Logo size="sm" />
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-[9px] font-black text-kontrol-ink-muted uppercase tracking-widest">KONTROL Assurance</p>
              <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center justify-end gap-1">
                <ShieldCheck size={12} /> Système Sécurisé
              </p>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-kontrol-bg/50 border-b border-kontrol-border py-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-kontrol-blue shadow-xl border border-kontrol-border mx-auto">
            <Icon size={40} />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-kontrol-dark leading-none">
              {activeContent.title}
            </h1>
            <p className="text-lg text-kontrol-ink-soft font-medium max-w-2xl mx-auto leading-relaxed italic">
              « {activeContent.subtitle} »
            </p>
          </div>
          <div className="pt-4">
             <span className="px-4 py-2 bg-white border border-kontrol-border rounded-full text-[10px] font-black text-kontrol-ink-muted uppercase tracking-[0.2em] shadow-sm">
                Révision : 7 Août 2026 • v2.2 (Mise à jour intégrale)
             </span>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <main className="flex-1 py-20 px-6">
        <div className="max-w-3xl mx-auto space-y-20">
          {activeContent.sections.map((section, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="flex items-start gap-8">
                <div className="hidden sm:flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-white border-2 border-kontrol-border flex items-center justify-center text-kontrol-ink-soft group-hover:border-kontrol-blue group-hover:text-kontrol-blue transition-all duration-500 shadow-sm">
                    <section.icon size={22} />
                  </div>
                  <div className="w-0.5 h-full bg-kontrol-border/50 mt-4 rounded-full" />
                </div>
                <div className="flex-1 space-y-6">
                  <h2 className="text-2xl font-extrabold text-kontrol-dark tracking-tight leading-none group-hover:text-kontrol-blue transition-colors">
                    {section.title}
                  </h2>
                  <div className="text-[15px] text-kontrol-ink-soft leading-[1.8] font-medium whitespace-pre-line space-y-4 pr-4">
                    {section.content}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Contact Banner */}
          <div className="p-10 bg-kontrol-dark rounded-[40px] text-white relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-kontrol-blue/20 blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:justify-between text-center md:text-left">
              <div className="space-y-3">
                <h3 className="text-2xl font-black tracking-tighter">Une question ?</h3>
                <p className="text-kontrol-ink-muted text-sm font-medium opacity-80">Notre équipe de conseillers d'intégration est à votre disposition pour toute demande de clarification.</p>
              </div>
              <button 
                onClick={() => setShowSupport(true)}
                className="px-8 py-4 bg-kontrol-blue text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-white hover:text-kontrol-dark transition-all shadow-xl active:scale-95"
              >
                Nous Contacter
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-kontrol-border py-12 px-6 bg-kontrol-bg/30">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-6">
          <Logo size="sm" />
          <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-[0.3em]">
            © 2026 INNOV'KORP • TOUS DROITS RÉSERVÉS
          </p>
        </div>
      </footer>

      {/* Support Form Sidebar Overlay */}
      <AnimatePresence>
        {showSupport && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSupport(false)}
              className="fixed inset-0 bg-kontrol-dark/60 backdrop-blur-sm z-[300]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-white z-[310] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-kontrol-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-kontrol-blue/10 text-kontrol-blue rounded-2xl flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tighter text-kontrol-dark uppercase">Support KONTROL</h2>
                    <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Nous traitons votre demande sous 2h</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSupport(false)}
                  className="w-10 h-10 rounded-full hover:bg-kontrol-bg flex items-center justify-center transition-colors text-kontrol-ink-soft"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <div className="mb-8 p-6 bg-kontrol-bg rounded-[32px] border border-kontrol-border space-y-3">
                  <h3 className="text-sm font-black text-kontrol-dark uppercase tracking-wider">Comment pouvons-nous aider ?</h3>
                  <p className="text-xs text-kontrol-ink-soft font-medium leading-relaxed">
                    Utilisez ce formulaire pour toute question relative à nos mentions légales, votre confidentialité ou pour demander une assistance technique directe.
                  </p>
                </div>
                <SupportForm compact />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
