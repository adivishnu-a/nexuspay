'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';

interface BankAccount {
  id: string;
  ifsc: string;
  balance: string;
  status: string;
  pinSet: boolean;
}

export default function SettingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  const { data: bankAccount } = useQuery<BankAccount>({
    queryKey: ['bank-account'],
    queryFn: () => apiFetch<BankAccount>('/bank/accounts'),
    enabled: isAuthenticated,
  });

  const setPinMutation = useMutation({
    mutationFn: (newPin: string) => apiFetch(`/bank/accounts/${bankAccount?.id}/pin`, {
      method: 'PUT',
      body: JSON.stringify({ pin: newPin }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-account'] });
      setSuccess(true);
      setTimeout(() => router.push('/'), 2000);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setErrorMsg(err.envelope.message);
      } else {
        setErrorMsg('Failed to set PIN');
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (pin.length !== 4) {
      setErrorMsg('PIN must be 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      setErrorMsg('PINs do not match');
      return;
    }
    setPinMutation.mutate(pin);
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background p-6 pb-24">
      <div className="mb-8 flex items-center space-x-4">
        <Button variant="ghost" size="icon" className="rounded-full bg-secondary/50" onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <Card className="border-none bg-card/50 shadow-xl backdrop-blur-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck size={24} />
              </div>
              <div>
                <CardTitle>Transaction PIN</CardTitle>
                <CardDescription>
                  {bankAccount?.pinSet ? 'Update your security PIN' : 'Set a PIN to secure your payments'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            {success ? (
              <div className="flex flex-col items-center py-8 text-center space-y-4 animate-in zoom-in-95">
                <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 size={40} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">PIN Set Successfully</h3>
                  <p className="text-sm text-muted-foreground">Redirecting you home...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium ml-1">New 4-Digit PIN</label>
                  <Input 
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="h-16 text-center text-2xl tracking-[1rem] rounded-2xl border-none bg-secondary/50 focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium ml-1">Confirm PIN</label>
                  <Input 
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    className="h-16 text-center text-2xl tracking-[1rem] rounded-2xl border-none bg-secondary/50 focus-visible:ring-primary/20"
                  />
                </div>

                {errorMsg && (
                  <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-600 text-sm font-medium text-center">
                    {errorMsg}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={setPinMutation.isPending || pin.length < 4}
                  className="w-full h-16 rounded-2xl bg-primary text-lg font-bold text-white shadow-xl shadow-primary/20"
                >
                  {setPinMutation.isPending ? <Loader2 className="animate-spin" /> : 'Save PIN'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
