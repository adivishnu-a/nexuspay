'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

export default function PayPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [vpa, setVpa] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'DETAILS' | 'PIN' | 'STATUS'>('DETAILS');
  const [status, setStatus] = useState<'SUCCESS' | 'FAILED' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  const transferMutation = useMutation({
    mutationFn: () => apiFetch('/transfer', {
      method: 'POST',
      body: JSON.stringify({
        targetVpa: vpa,
        amount: parseFloat(amount),
        pin: pin,
      }),
    }),
    onSuccess: () => {
      setStatus('SUCCESS');
      setStep('STATUS');
      queryClient.invalidateQueries({ queryKey: ['balance', 'psp-transactions'] });
    },
    onError: (error: any) => {
      setStatus('FAILED');
      setStep('STATUS');
      setErrorMsg(error.envelope?.message || 'Transaction failed');
    },
  });

  const handleNext = () => {
    if (step === 'DETAILS') {
      if (vpa && amount) setStep('PIN');
    } else if (step === 'PIN') {
      if (pin.length === 4) transferMutation.mutate();
    }
  };

  if (step === 'STATUS') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className={`mb-6 flex h-24 w-24 items-center justify-center rounded-full ${
          status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
        }`}>
          {status === 'SUCCESS' ? <CheckCircle2 size={64} /> : <XCircle size={64} />}
        </div>
        <h2 className="text-3xl font-bold tracking-tight">
          {status === 'SUCCESS' ? 'Payment Sent' : 'Payment Failed'}
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          {status === 'SUCCESS' ? `Successfully sent ₹${amount} to ${vpa}` : errorMsg}
        </p>
        <Button 
          className="mt-12 w-full max-w-xs rounded-2xl bg-primary py-6 font-bold"
          onClick={() => router.push('/')}
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-md">
        <Button variant="ghost" size="icon" className="mb-6 rounded-full" onClick={() => router.back()}>
          <ArrowLeft size={24} />
        </Button>

        <h1 className="mb-8 text-3xl font-bold tracking-tight">
          {step === 'DETAILS' ? 'Send Money' : 'Enter PIN'}
        </h1>

        <div className="space-y-6">
          {step === 'DETAILS' ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground ml-1">Recipient VPA</label>
                <Input 
                  placeholder="name@nexuspay" 
                  value={vpa} 
                  onChange={(e) => setVpa(e.target.value)}
                  className="h-14 rounded-2xl border-none bg-secondary px-6 text-lg placeholder:text-muted-foreground/30 focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground ml-1">Amount (₹)</label>
                <Input 
                  type="number"
                  placeholder="0.00" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-14 rounded-2xl border-none bg-secondary px-6 text-2xl font-bold placeholder:text-muted-foreground/30 focus-visible:ring-primary"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-8">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Paying {vpa}</div>
                <div className="text-3xl font-bold">₹{amount}</div>
              </div>
              <Input 
                type="password"
                maxLength={4}
                placeholder="••••" 
                value={pin} 
                onChange={(e) => setPin(e.target.value)}
                className="h-20 w-48 rounded-2xl border-none bg-secondary px-6 text-center text-4xl tracking-[1rem] placeholder:text-muted-foreground/20 focus-visible:ring-primary"
              />
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <ShieldCheck size={14} />
                <span>Encrypted Transaction PIN</span>
              </div>
            </div>
          )}

          <Button 
            className="mt-8 w-full rounded-2xl bg-primary py-8 text-lg font-bold shadow-xl shadow-primary/20 disabled:opacity-50"
            disabled={step === 'DETAILS' ? (!vpa || !amount) : pin.length < 4 || transferMutation.isPending}
            onClick={handleNext}
          >
            {transferMutation.isPending ? 'Processing...' : step === 'DETAILS' ? 'Continue' : 'Pay Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}
