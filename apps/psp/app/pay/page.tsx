'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { v4 as uuidv4 } from 'uuid';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Loader2, 
  Smartphone,
  ChevronRight
} from 'lucide-react';

interface TransferResponse {
  transactionId: string;
  txnReference: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  failureCode?: string;
  message?: string;
}

export default function PayPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [vpa, setVpa] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'DETAILS' | 'PIN' | 'PROCESSING' | 'STATUS'>('DETAILS');
  const [status, setStatus] = useState<'SUCCESS' | 'FAILED' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [txnRef, setTxnRef] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  const pollStatus = useCallback(async (reference: string, attempts = 0) => {
    try {
      const response = await apiFetch<TransferResponse>(`/psp/transfer/status/${reference}`);
      if (response.status === 'PENDING' && attempts < 5) {
        setTimeout(() => pollStatus(reference, attempts + 1), 2000);
      } else {
        setStatus(response.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED');
        setErrorMsg(response.failureCode || 'Transaction failed');
        setStep('STATUS');
        queryClient.invalidateQueries({ queryKey: ['balance', 'psp-transactions'] });
      }
    } catch (e) {
      setStatus('FAILED');
      setErrorMsg('Failed to verify status');
      setStep('STATUS');
    }
  }, [queryClient]);

  const transferMutation = useMutation({
    mutationFn: (reference: string) => apiFetch<TransferResponse>('/psp/transfer/vpa', {
      method: 'POST',
      body: JSON.stringify({
        receiverVpa: vpa,
        amount: parseFloat(amount),
        pin: pin,
        txnReference: reference,
      }),
    }),
    onSuccess: (data) => {
      if (data.status === 'PENDING') {
        pollStatus(data.txnReference);
      } else {
        // Artificial delay for smooth Apple-style transitions
        setTimeout(() => {
          setStatus(data.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED');
          setErrorMsg(data.failureCode || 'Transaction failed');
          setStep('STATUS');
          queryClient.invalidateQueries({ queryKey: ['balance', 'psp-transactions'] });
        }, 1500);
      }
    },
    onError: (error: any) => {
      setStatus('FAILED');
      setErrorMsg(error.envelope?.message || 'Transaction failed');
      setStep('STATUS');
    },
  });

  const handleNext = () => {
    if (step === 'DETAILS') {
      if (vpa && amount) setStep('PIN');
    } else if (step === 'PIN') {
      if (pin.length === 4) {
        const ref = uuidv4();
        setTxnRef(ref);
        setStep('PROCESSING');
        transferMutation.mutate(ref);
      }
    }
  };

  if (step === 'PROCESSING') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="relative mb-12 flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 size={48} className="animate-spin" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Securing Payment</h2>
        <p className="mt-2 text-center text-muted-foreground">
          Encrypted transfer to <span className="font-semibold text-foreground">{vpa}</span>
        </p>
        <div className="mt-12 flex items-center space-x-2 text-xs text-muted-foreground/40 uppercase tracking-widest">
          <ShieldCheck size={14} />
          <span>PCI-DSS Compliant</span>
        </div>
      </div>
    );
  }

  if (step === 'STATUS') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className={`mb-8 flex h-28 w-28 items-center justify-center rounded-full ${
          status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
        }`}>
          {status === 'SUCCESS' ? <CheckCircle2 size={72} /> : <XCircle size={72} />}
        </div>
        <h2 className="text-4xl font-extrabold tracking-tight">
          {status === 'SUCCESS' ? 'Sent' : 'Failed'}
        </h2>
        <div className="mt-4 text-center">
          <div className="text-2xl font-bold">₹{parseFloat(amount).toLocaleString('en-IN')}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {status === 'SUCCESS' ? `to ${vpa}` : errorMsg}
          </div>
        </div>
        
        <Card className="mt-12 w-full border-none bg-secondary/30 p-4 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Reference ID</span>
            <span className="font-mono">{txnRef.substring(0, 18).toUpperCase()}...</span>
          </div>
        </Card>

        <Button 
          className="mt-12 w-full rounded-2xl bg-black py-8 text-lg font-bold text-white shadow-2xl"
          onClick={() => router.push('/')}
        >
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Precision Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <Button variant="ghost" size="icon" className="rounded-full bg-secondary/50" onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </Button>
        <div className="text-sm font-semibold opacity-40 uppercase tracking-widest">NexusPay</div>
        <div className="w-10" />
      </div>

      <div className="px-6 pt-4 pb-12">
        <h1 className="text-4xl font-extrabold tracking-tight">
          {step === 'DETAILS' ? 'Payment' : 'PIN'}
        </h1>

        <div className="mt-12 space-y-8">
          {step === 'DETAILS' ? (
            <>
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">
                    <Smartphone size={20} />
                  </div>
                  <Input 
                    placeholder="VPA (e.g. user@nexuspay)" 
                    value={vpa} 
                    onChange={(e) => setVpa(e.target.value)}
                    className="h-16 rounded-3xl border-none bg-secondary/50 pl-14 pr-6 text-lg focus-visible:ring-primary/20 focus-visible:bg-secondary/80 transition-all"
                  />
                </div>
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground transition-colors group-focus-within:text-primary">
                    ₹
                  </div>
                  <Input 
                    type="number"
                    placeholder="0.00" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-24 rounded-3xl border-none bg-secondary/50 pl-14 pr-6 text-4xl font-bold tabular-nums focus-visible:ring-primary/20 focus-visible:bg-secondary/80 transition-all"
                  />
                </div>
              </div>

              <div className="rounded-3xl bg-emerald-500/5 p-4 flex items-center space-x-3 text-emerald-700">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium">Instant transfer enabled</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <Card className="w-full border-none bg-secondary/30 p-6 rounded-[2rem] text-center mb-12">
                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Paying</div>
                <div className="text-xl font-bold">{vpa}</div>
                <div className="text-3xl font-extrabold mt-2 tracking-tighter">₹{amount}</div>
              </Card>
              
              <div className="relative">
                <Input 
                  type="password"
                  maxLength={4}
                  autoFocus
                  placeholder="••••" 
                  value={pin} 
                  onChange={(e) => setPin(e.target.value)}
                  className="h-24 w-64 rounded-3xl border-none bg-secondary px-6 text-center text-5xl tracking-[1.5rem] placeholder:text-muted-foreground/10 focus-visible:ring-primary transition-all shadow-inner"
                />
              </div>

              <div className="mt-8 flex items-center space-x-2 text-xs text-muted-foreground">
                <ShieldCheck size={14} className="text-primary" />
                <span>Encrypted on-device PIN</span>
              </div>
            </div>
          )}

          <Button 
            className="w-full rounded-[2rem] bg-primary h-20 text-xl font-bold text-white shadow-2xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
            disabled={step === 'DETAILS' ? (!vpa || !amount) : pin.length < 4 || transferMutation.isPending}
            onClick={handleNext}
          >
            {step === 'DETAILS' ? 'Continue' : 'Pay Now'}
            <ChevronRight className="ml-2 h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
