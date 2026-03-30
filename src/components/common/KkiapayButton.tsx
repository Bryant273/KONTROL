import * as React from 'react';
import { useState, useEffect } from 'react';
import { Smartphone, Loader2, CheckCircle2, AlertCircle, ArrowRight, ChevronRight, Globe, ChevronDown, QrCode, Key } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../../lib/utils';

interface KkiapayButtonProps {
  amount: number;
  callback?: string;
  onSuccess?: (response: any) => void;
  label?: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
}

type PaymentChannel = 'ORANGE' | 'MTN' | 'MOOV' | 'WAVE';

interface Country {
  code: string;
  name: string;
  prefix: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'BJ', name: 'Bénin', prefix: '229', flag: '🇧🇯' },
  { code: 'TG', name: 'Togo', prefix: '228', flag: '🇹🇬' },
  { code: 'CI', name: 'Côte d\'Ivoire', prefix: '225', flag: '🇨🇮' },
  { code: 'SN', name: 'Sénégal', prefix: '221', flag: '🇸🇳' },
  { code: 'ML', name: 'Mali', prefix: '223', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', prefix: '226', flag: '🇧🇫' },
  { code: 'CM', name: 'Cameroun', prefix: '237', flag: '🇨🇲' },
];

export function KkiapayButton({ 
  amount, 
  onSuccess, 
  label = "Payer par Mobile Money",
  email,
  firstname,
  lastname,
  phone: initialPhone
}: KkiapayButtonProps) {
  const [step, setStep] = useState<'CHANNEL' | 'PHONE' | 'OTP' | 'QR_CODE' | 'PENDING' | 'SUCCESS' | 'ERROR'>('CHANNEL');
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannel | null>(null);
  const [phoneNumber, setPhoneNumber] = useState(""); // Removed default phone number
  const [otp, setOtp] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const channels = [
    { id: 'ORANGE' as PaymentChannel, name: 'Orange Money', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg', color: 'bg-[#FF6600]' },
    { id: 'MTN' as PaymentChannel, name: 'MTN MoMo', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/af/MTN_Logo.svg', color: 'bg-[#FFCC00]' },
    { id: 'MOOV' as PaymentChannel, name: 'Moov Money', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Moov_Africa_logo.svg', color: 'bg-[#0066B3]' },
    { id: 'WAVE' as PaymentChannel, name: 'Wave', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Wave_Logo_Blue.svg', color: 'bg-[#1DA1F2]' }
  ];

  // Auto-detect country
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const country = COUNTRIES.find(c => c.code === data.country_code);
        if (country) {
          setSelectedCountry(country);
        }
      } catch (err) {
        console.error("Country detection failed:", err);
      }
    };
    detectCountry();
  }, []);

  // 1. Get Access Token
  const getAuthToken = async () => {
    const response = await fetch("/api/kkiapay/token", { method: "POST" });
    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error("Erreur serveur: Réponse invalide du serveur de paiement");
    }
    if (!response.ok) throw new Error(data.error || "Erreur d'authentification Kkiapay");
    return data.token;
  };

  // 2. Initiate Payment
  const initiatePayment = async (token: string, currentOtp?: string) => {
    const fullPhone = phoneNumber ? `${selectedCountry.prefix}${phoneNumber}` : "";
    const response = await fetch("/api/kkiapay/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        phoneNumber: fullPhone,
        channel: selectedChannel,
        token,
        firstname,
        lastname,
        email,
        otp: currentOtp
      })
    });
    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error("Erreur serveur: Réponse invalide lors de l'initiation du paiement");
    }
    if (!response.ok) throw new Error(data.error || "Échec de l'initiation du paiement");
    
    if (data.payment_url) {
      setPaymentUrl(data.payment_url);
      setStep('QR_CODE');
    } else {
      setStep('PENDING');
    }
    
    if (data.transactionId) {
      pollStatus(data.transactionId, token);
    }
    
    return data.transactionId;
  };

  // 3. Poll Status
  const pollStatus = async (id: string, token: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/kkiapay/status/${id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        let data;
        try {
          data = await response.json();
        } catch (e) {
          console.error("Invalid JSON from status check");
          return;
        }
        
        if (data.status === 'SUCCESS') {
          clearInterval(interval);
          setStep('SUCCESS');
          if (onSuccess) onSuccess(data);
        } else if (data.status === 'FAILED') {
          clearInterval(interval);
          setError("Le paiement a échoué ou a été annulé.");
          setStep('ERROR');
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    // Timeout after 5 minutes for QR codes
    setTimeout(() => {
      clearInterval(interval);
      if (step === 'PENDING' || step === 'QR_CODE') {
        setError("Délai d'attente dépassé. Veuillez réessayer.");
        setStep('ERROR');
      }
    }, 300000);
  };

  const handleStartPayment = async () => {
    if (!selectedChannel || (selectedChannel !== 'WAVE' && !phoneNumber)) return;
    
    // For Orange, if we don't have OTP yet, go to OTP step
    if (selectedChannel === 'ORANGE' && !otp && step !== 'OTP') {
      setStep('OTP');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      setAccessToken(token);
      const id = await initiatePayment(token, otp);
      setTransactionId(id);
      
      // The step is now set inside initiatePayment based on the response
    } catch (err: any) {
      setError(err.message);
      setStep('ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'QR_CODE' && paymentUrl) {
    return (
      <div className="p-6 bg-white border border-kontrol-border rounded-[2rem] text-center space-y-5 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-16 h-16 bg-kontrol-blue/10 text-kontrol-blue rounded-full flex items-center justify-center mx-auto">
          <QrCode size={32} />
        </div>
        <div>
          <h4 className="text-base font-black text-kontrol-dark uppercase tracking-tighter">Scannez pour payer</h4>
          <p className="text-[11px] text-kontrol-ink-muted mt-2 leading-relaxed">
            Ouvrez votre application de paiement et scannez ce code QR pour valider le paiement de <span className="font-bold text-kontrol-dark">{amount} F CFA</span>.
          </p>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-kontrol-blue/10 text-kontrol-blue text-[9px] font-black uppercase tracking-widest">
            Code QR disponible pour tous les opérateurs
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-2xl border border-kontrol-border inline-block mx-auto shadow-sm">
          <QRCodeSVG value={paymentUrl} size={180} />
        </div>

        <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-kontrol-blue uppercase tracking-widest animate-pulse">
          <Loader2 size={12} className="animate-spin" />
          En attente du scan...
        </div>
        
        <button 
          onClick={() => setStep('CHANNEL')}
          className="text-[9px] font-black text-kontrol-ink-muted uppercase tracking-widest hover:text-kontrol-blue transition-colors"
        >
          Annuler le paiement
        </button>
      </div>
    );
  }

  if (step === 'PENDING') {
    const ussdCodes: Record<string, string> = {
      'ORANGE': '#144*82#',
      'MTN': '*133#',
      'MOOV': '*155#'
    };
    const ussdCode = selectedChannel ? ussdCodes[selectedChannel] : null;

    return (
      <div className="p-6 bg-kontrol-bg/50 border border-kontrol-border rounded-[2rem] text-center space-y-5 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 border-4 border-kontrol-blue/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-kontrol-blue rounded-full border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-kontrol-blue">
            <Smartphone size={28} />
          </div>
        </div>
        <div>
          <h4 className="text-base font-black text-kontrol-dark uppercase tracking-tighter">Validation sur mobile</h4>
          <p className="text-[11px] text-kontrol-ink-muted mt-2 leading-relaxed">
            {selectedChannel === 'ORANGE' ? (
              <>
                Un message de confirmation a été envoyé au <span className="font-bold text-kontrol-dark">+{selectedCountry.prefix}{phoneNumber}</span>.<br />
                Si rien ne s'affiche, composez le <span className="font-bold text-kontrol-blue">{ussdCode}</span> pour valider.
              </>
            ) : ussdCode ? (
              <>
                Veuillez valider la transaction sur votre téléphone.<br />
                Si la notification ne s'affiche pas, composez le <span className="font-bold text-kontrol-blue">{ussdCode}</span>.
              </>
            ) : (
              <>
                Un message de confirmation a été envoyé.<br />
                Veuillez valider la transaction sur votre téléphone.
              </>
            )}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-kontrol-blue uppercase tracking-widest animate-pulse">
          <Loader2 size={12} className="animate-spin" />
          En attente de validation...
        </div>

        <div className="pt-4 border-t border-kontrol-border">
          <p className="text-[9px] font-black text-kontrol-ink-muted uppercase tracking-widest">Code QR disponible pour tous</p>
        </div>
      </div>
    );
  }

  if (step === 'SUCCESS') {
    return (
      <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-[2rem] text-center space-y-3 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <h4 className="text-base font-black text-emerald-900 uppercase tracking-tighter">Paiement Confirmé</h4>
          <p className="text-[11px] text-emerald-600 mt-1">Votre abonnement est maintenant actif.</p>
        </div>
      </div>
    );
  }

  if (step === 'ERROR') {
    return (
      <div className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] text-center space-y-5 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle size={24} />
        </div>
        <div>
          <h4 className="text-base font-black text-rose-900 uppercase tracking-tighter">Erreur de paiement</h4>
          <p className="text-[11px] text-rose-500 mt-2 leading-relaxed">{error}</p>
        </div>
        <button 
          onClick={() => setStep('CHANNEL')}
          className="w-full py-3 bg-rose-600 text-white rounded-xl font-black text-xs hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {step === 'CHANNEL' ? (
        <div className="space-y-4">
          <p className="text-[10px] font-black text-kontrol-ink-muted uppercase tracking-widest text-center">Choisissez votre mode de paiement</p>
          <div className="grid grid-cols-2 gap-2">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => {
                  setSelectedChannel(channel.id);
                  setStep('PHONE');
                }}
                className="group relative p-3 bg-white border border-kontrol-border rounded-2xl hover:border-kontrol-blue hover:shadow-lg hover:shadow-kontrol-blue/5 transition-all flex flex-col items-center gap-2"
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center p-2 shadow-sm group-hover:scale-110 transition-transform", channel.color)}>
                  <img src={channel.logo} alt={channel.name} className="w-full h-full object-contain brightness-0 invert" referrerPolicy="no-referrer" />
                </div>
                <span className="text-[10px] font-black text-kontrol-dark uppercase tracking-widest">{channel.name}</span>
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={12} className="text-kontrol-blue" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : step === 'OTP' ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setStep('PHONE')}
              className="text-[9px] font-black text-kontrol-ink-muted uppercase tracking-widest hover:text-kontrol-blue transition-colors flex items-center gap-1"
            >
              ← Retour
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-kontrol-ink-muted uppercase tracking-widest">Orange Money</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-2">
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest flex items-center gap-2">
                <Key size={12} /> Instructions Orange
              </p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Composez le <span className="font-bold">*144*77#</span> sur votre téléphone pour obtenir votre code de paiement temporaire.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-kontrol-ink-muted uppercase tracking-widest ml-1">Code de paiement (OTP)</label>
              <input 
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Entrez le code reçu"
                className="w-full px-4 h-12 bg-kontrol-bg border border-kontrol-border rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all"
              />
            </div>

            <button 
              onClick={handleStartPayment}
              disabled={otp.length < 4 || isLoading}
              className="w-full h-12 bg-kontrol-dark text-white rounded-xl font-black text-xs hover:bg-kontrol-blue transition-all shadow-xl flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Confirmer le paiement <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setStep('CHANNEL')}
              className="text-[9px] font-black text-kontrol-ink-muted uppercase tracking-widest hover:text-kontrol-blue transition-colors flex items-center gap-1"
            >
              ← Retour
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-kontrol-ink-muted uppercase tracking-widest">Canal:</span>
              <div className={cn("px-2.5 py-0.5 rounded-full flex items-center gap-1.5", channels.find(c => c.id === selectedChannel)?.color)}>
                <img src={channels.find(c => c.id === selectedChannel)?.logo} alt="" className="h-2.5 brightness-0 invert" />
                <span className="text-[8px] font-black text-white uppercase tracking-widest">{selectedChannel}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              {selectedChannel === 'WAVE' ? (
                <div className="p-4 bg-kontrol-blue/5 border border-kontrol-blue/10 rounded-xl text-center space-y-2">
                  <p className="text-[10px] font-black text-kontrol-blue uppercase tracking-widest">Paiement Wave</p>
                  <p className="text-[11px] text-kontrol-ink-muted leading-relaxed">
                    Cliquez sur le bouton ci-dessous pour générer votre code QR unique et payer avec l'application Wave.
                  </p>
                </div>
              ) : (
                <>
                  <label className="text-[10px] font-black text-kontrol-ink-muted uppercase tracking-widest ml-1">Numéro de téléphone</label>
                  <div className="flex gap-2">
                    {/* Country Selector */}
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                        className="h-12 px-3 bg-kontrol-bg border border-kontrol-border rounded-xl flex items-center gap-2 hover:border-kontrol-blue transition-all"
                      >
                        <span className="text-lg">{selectedCountry.flag}</span>
                        <span className="text-xs font-bold text-kontrol-dark">+{selectedCountry.prefix}</span>
                        <ChevronDown size={12} className="text-kontrol-ink-muted" />
                      </button>

                      {isCountryDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-[1300]" onClick={() => setIsCountryDropdownOpen(false)} />
                          <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-kontrol-border rounded-xl shadow-2xl z-[1301] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <div className="max-h-48 overflow-y-auto">
                              {COUNTRIES.map((country) => (
                                <button
                                  key={country.code}
                                  onClick={() => {
                                    setSelectedCountry(country);
                                    setIsCountryDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full px-4 py-2.5 flex items-center gap-3 hover:bg-kontrol-bg transition-colors text-left",
                                    selectedCountry.code === country.code && "bg-kontrol-blue/5"
                                  )}
                                >
                                  <span className="text-lg">{country.flag}</span>
                                  <div className="flex-1">
                                    <p className="text-[11px] font-bold text-kontrol-dark">{country.name}</p>
                                    <p className="text-[9px] text-kontrol-ink-muted">+{country.prefix}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="relative flex-1">
                      <input 
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Numéro Mobile Money"
                        className="w-full px-4 h-12 bg-kontrol-bg border border-kontrol-border rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-kontrol-blue/20 focus:border-kontrol-blue transition-all"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={handleStartPayment}
              disabled={(selectedChannel !== 'WAVE' && phoneNumber.length < 8) || isLoading}
              className="w-full h-12 bg-kontrol-dark text-white rounded-xl font-black text-xs hover:bg-kontrol-blue transition-all shadow-xl flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {selectedChannel === 'WAVE' ? 'Générer le QR Code' : selectedChannel === 'ORANGE' ? 'Suivant' : `Payer ${amount} F CFA`} 
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <p className="text-[9px] text-center text-kontrol-ink-muted uppercase font-black tracking-widest opacity-50">
        Paiement direct via KkiaPay API
      </p>
    </div>
  );
}
