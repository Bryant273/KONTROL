import React, { useState } from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface SupportFormProps {
  onSuccess?: () => void;
  className?: string;
  compact?: boolean;
}

export function SupportForm({ onSuccess, className, compact = false }: SupportFormProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      subject: formData.get('subject'),
      message: formData.get('message'),
      status: 'NEW',
      priority: 'MEDIUM',
      createdAt: Date.now(),
      type: 'SUPPORT_REQUEST'
    };
    
    try {
      const { db, collection, addDoc, handleFirestoreError, OperationType, auth } = await import('../../../api/firebase');
      await addDoc(collection(db, 'tickets'), data);
      setIsSuccess(true);
      form.reset();
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err) {
      const { handleFirestoreError, OperationType, auth } = await import('../../../api/firebase');
      handleFirestoreError(err, OperationType.WRITE, 'tickets', auth.currentUser, false);
      alert('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-12 text-center space-y-4 min-h-[300px]"
      >
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-xl font-extrabold text-kontrol-dark">{t('landing.support.success_title')}</h3>
        <p className="text-sm text-kontrol-ink-soft max-w-xs mx-auto font-medium">
          {t('landing.support.success_desc')}
        </p>
      </motion.div>
    );
  }

  return (
    <form className={`space-y-5 ${className}`} onSubmit={handleSubmit}>
      <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-4`}>
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">{t('landing.support.name_label')}</label>
          <input 
            name="name" 
            type="text" 
            required 
            className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue transition-colors font-bold text-[13px]" 
            placeholder={t('landing.support.name_placeholder')} 
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">{t('landing.support.email_label')}</label>
          <input 
            name="email" 
            type="email" 
            required 
            className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue transition-colors font-bold text-[13px]" 
            placeholder={t('landing.support.email_placeholder')} 
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">{t('landing.support.subject_label')}</label>
        <input 
          name="subject" 
          type="text" 
          required 
          className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue transition-colors font-bold text-[13px]" 
          placeholder={t('landing.support.subject_placeholder')} 
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">{t('landing.support.message_label')}</label>
        <textarea 
          name="message" 
          required 
          rows={compact ? 4 : 5} 
          className="w-full px-4 py-3 bg-kontrol-bg border border-kontrol-border rounded-xl focus:outline-none focus:border-kontrol-blue transition-colors font-bold text-[13px] resize-none" 
          placeholder={t('landing.support.message_placeholder')} 
        />
      </div>
      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full py-4 bg-kontrol-dark text-white font-extrabold rounded-xl hover:bg-kontrol-blue transition-all flex items-center justify-center gap-2 group text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {t('landing.support.submitting')}
          </>
        ) : (
          <>
            {t('landing.support.submit')}
            <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </>
        )}
      </button>
    </form>
  );
}
