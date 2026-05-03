import React, { useState } from 'react';
import { ChevronLeft, Shield, Lock, Scale, Info, Building2, Gavel, FileText, Database, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from '../common/Logo';
import { SupportForm } from '../common/SupportForm';

interface LegalTermsProps {
  type: 'mentions' | 'confidentialite';
  onClose: () => void;
}

export function LegalTerms({ type, onClose }: LegalTermsProps) {
  const [showSupport, setShowSupport] = useState(false);
  const content = {
    mentions: {
      title: "Mentions Légales & Conditions",
      subtitle: "Cadre contractuel et identification de l'éditeur KONTROL",
      icon: Scale,
      sections: [
        {
          title: "1. Identification de l'Éditeur",
          icon: Building2,
          content: `Le site KONTROL.app et l'application afférente sont édités par l'entreprise INNOV'KORP, Société à Responsabilité Limitée au capital de 1 000 000 FCFA.
          
          • Siège Social : Abidjan, Cocody Riviera, Côte d'Ivoire.
          • Immatriculation : RCCM CI-ABJ-03-202X-B12-XXXXX.
          • Directeur de la publication : Équipe de Direction INNOV'KORP.
          • Contact Direction : direction@innovkorp.com`
        },
        {
          title: "2. Hébergement et Infrastructure",
          icon: Database,
          content: `L'infrastructure technique de KONTROL est propulsée par Google Cloud Platform (GCP).
          
          • Prestataire : Google Cloud EMEA Limited.
          • Localisation : Région Europe (Benelux/France) pour une latence optimisée et une conformité RGPD.
          • Disponibilité : Architecture redondante offrant un taux de disponibilité cible de 99.9%.`
        },
        {
          title: "3. Propriété Intellectuelle & Algorithmes",
          icon: Gavel,
          content: `L'intégralité de l'écosystème KONTROL (Code source, algorithmes propriétaires Blue AI, designs UI/UX, logos, charte graphique) est protégée par les lois nationales et internationales sur le droit d'auteur.
          
          L'utilisation de KONTROL ne confère aucun droit de propriété sur les technologies sous-jacentes. Toute extraction de données, reverse-engineering ou reproduction, même partielle, est constitutive d'une contrefaçon sanctionnée par le Code de la Propriété Intellectuelle.`
        },
        {
          title: "4. Conditions de Service (SLA)",
          icon: Shield,
          content: `KONTROL s'engage à fournir un accès continu au service. Toutefois, nous nous réservons le droit d'interrompre l'accès pour des opérations de maintenance technique.
          
          En cas d'incident majeur indépendant de notre volonté (force majeure, panne réseau globale), INNOV'KORP mettra en œuvre tous les moyens raisonnables pour rétablir le service dans les plus brefs délais.`
        },
        {
          title: "5. Droit Applicable & Litiges",
          icon: Scale,
          content: `Les présentes conditions sont régies par le droit ivoirien. En cas de contestation sur l'interprétation ou l'exécution de ces termes, et après une tentative de résolution à l'amiable, les tribunaux d'Abidjan seront seuls compétents.`
        }
      ]
    },
    confidentialite: {
      title: "Politique de Confidentialité",
      subtitle: "Garantir la souveraineté et la sécurité de vos données métier",
      icon: Lock,
      sections: [
        {
          title: "1. Nature des Données Collectées",
          icon: FileText,
          content: `Dans le cadre de l'utilisation de nos services, nous collectons :
          
          • Données d'identité : Nom, prénom, fonction, email, numéro de téléphone.
          • Données Entreprise : Logo, registre de commerce, adresse fiscale.
          • Données Métier : Factures, dépenses, inventaires, notes de frais.
          • Données Techniques : Adresses IP, logs de connexion pour l'audit de sécurité et la prévention des fraudes.`
        },
        {
          title: "2. Blue AI et Souveraineté des Données",
          icon: ShieldCheck,
          content: `Notre Intelligence Artificielle Blue AI analyse vos données pour générer des insights financiers (MRR, tendances de dépenses, etc.). 
          
          ÉTHIQUE IA : Vos données sont traitées de manière isolée au sein de votre instance. Elles ne sont JAMAIS utilisées pour entraîner des modèles globaux qui pourraient bénéficier à vos concurrents. Vos secrets commerciaux restent strictement privés.`
        },
        {
          title: "3. Durée de Conservation",
          icon: Info,
          content: `Nous conservons vos données tant que votre compte est actif. 
          
          En cas de résiliation, vos données métier sont conservées pendant une période de 90 jours pour permettre une éventuelle réactivation ou exportation, avant d'être définitivement supprimées de nos serveurs de production, sauf obligation légale de conservation comptable.`
        },
        {
          title: "4. Sécurité et Sous-traitants",
          icon: Shield,
          content: `Nous appliquons des standards de sécurité de niveau bancaire :
          
          • Chiffrement : AES-256 au repos et TLS 1.3 en transit.
          • Sous-traitants : Google (Stockage), Paystack (Paiements). Ces partenaires respectent les normes PCI-DSS et RGPD.
          • Accès : Aucun employé d'INNOV'KORP n'accède à vos données métier sans votre autorisation explicite via un ticket support.`
        },
        {
          title: "5. Vos Droits (RGPD / Loi Ivoirienne)",
          icon: Scale,
          content: `Vous disposez d'un droit d'accès, de rectification, de portabilité et de suppression. Pour toute demande liée à vos données privées, contactez : privacy@innovkorp.com.`
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
                Révision : 30 Avril 2026 • v2.1
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
                <h3 className="text-2xl font-black tracking-tighter">Une question juridique ?</h3>
                <p className="text-kontrol-ink-muted text-sm font-medium opacity-80">Notre département légal et conformité est à votre disposition pour toute demande de clarification.</p>
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
