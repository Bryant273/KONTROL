import React from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface KkiapayButtonProps {
  amount: number;
  onSuccess: (response: any) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
}

export function KkiapayButton({ amount, onSuccess, label = 'Payer avec Kkiapay', className, disabled }: KkiapayButtonProps) {
  const [loading, setLoading] = React.useState(false);

  const handlePayment = () => {
    setLoading(true);
    // Mock Kkiapay integration
    setTimeout(() => {
      setLoading(false);
      onSuccess({ transactionId: 'KKIAPAY_' + Date.now() });
    }, 2000);
  };

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || loading}
      className={cn(
        "btn-primary flex items-center justify-center gap-2",
        className
      )}
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
      {label}
    </button>
  );
}
