'use client';

import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Scan, 
  Send, 
  History, 
  User as UserIcon,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface VpaDetails {
  vpa: string;
  bankAccountNumber: string;
}

interface BalanceResponse {
  balance: string;
}

interface Transaction {
  id: string;
  amount: string;
  direction: 'DEBIT' | 'CREDIT';
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  counterpartyVpa: string;
  timestamp: string;
}

export default function PspHome() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleSuccess = async (credentialResponse: any) => {
    const idToken = credentialResponse.credential;
    const response = await apiFetch<{ accessToken: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    localStorage.setItem('nexus_access_token', response.accessToken);
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const { data: vpaData } = useQuery<VpaDetails>({
    queryKey: ['vpa'],
    queryFn: () => apiFetch<VpaDetails>('/vpa'),
    enabled: isAuthenticated,
  });

  const { data: balanceData } = useQuery<BalanceResponse>({
    queryKey: ['balance'],
    queryFn: () => apiFetch<BalanceResponse>('/transfer/balance'),
    enabled: isAuthenticated,
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['psp-transactions'],
    queryFn: () => apiFetch<Transaction[]>('/transfer/history'),
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="mb-12 flex flex-col items-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2.5rem] bg-primary text-primary-foreground shadow-2xl shadow-primary/20">
            <Zap size={40} fill="currentColor" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">NexusPay</h1>
          <p className="mt-2 text-muted-foreground">The future of instant payments.</p>
        </div>

        <Card className="w-full max-w-sm border-none bg-card/50 shadow-2xl backdrop-blur-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Use your Google account to get started.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6 pb-10">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => console.log('Login Failed')}
              useOneTap
              shape="circle"
              width="100%"
            />
            <div className="flex items-center space-x-2 text-[10px] text-muted-foreground/50 uppercase tracking-widest">
              <ShieldCheck size={12} />
              <span>Bank-grade security</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between bg-background/80 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 overflow-hidden rounded-full bg-secondary">
            <UserIcon className="h-full w-full p-2 text-muted-foreground" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Welcome back,</div>
            <div className="text-sm font-semibold">{user?.fullName}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
          <History size={20} />
        </Button>
      </div>

      <div className="space-y-8 px-6 pt-6">
        {/* Hero Balance Card */}
        <div className="relative overflow-hidden rounded-[2rem] bg-primary p-8 text-primary-foreground shadow-2xl shadow-primary/30">
          <div className="relative z-10">
            <div className="text-sm font-medium opacity-80">Total Balance</div>
            <div className="mt-1 text-5xl font-bold tracking-tighter tabular-nums">
              ₹{parseFloat(balanceData?.balance || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-6 flex items-center space-x-2 text-sm">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <Zap size={12} />
              </div>
              <span className="font-mono opacity-90">{vpaData?.vpa || 'creating vpa...'}</span>
            </div>
          </div>
          {/* Decorative background circle */}
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            className="h-28 flex-col rounded-[2rem] bg-secondary text-secondary-foreground hover:bg-secondary/80"
            onClick={() => router.push('/pay')}
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Send size={20} />
            </div>
            <span className="text-sm font-semibold">Send Money</span>
          </Button>
          <Button 
            className="h-28 flex-col rounded-[2rem] bg-secondary text-secondary-foreground hover:bg-secondary/80"
            onClick={() => {}}
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <Scan size={20} />
            </div>
            <span className="text-sm font-semibold">Scan QR</span>
          </Button>
        </div>

        {/* Transactions Section */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Activity</h2>
            <Button variant="link" className="text-primary p-0">See All</Button>
          </div>
          <div className="space-y-4">
            {transactions?.slice(0, 5).map((txn) => (
              <div key={txn.id} className="flex items-center justify-between rounded-2xl bg-card/50 p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    txn.direction === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {txn.direction === 'CREDIT' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <div className="font-semibold">{txn.counterpartyVpa}</div>
                    <div className="text-xs text-muted-foreground">{new Date(txn.timestamp).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className={`text-lg font-bold tabular-nums ${
                  txn.direction === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {txn.direction === 'CREDIT' ? '+' : '-'}₹{parseFloat(txn.amount).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
            {!transactions?.length && (
              <div className="flex h-32 flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-border text-muted-foreground">
                <History size={32} className="mb-2 opacity-20" />
                <span className="text-sm">No transactions yet</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Bar (Bottom) */}
      <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center space-x-2 rounded-full bg-black/90 p-2 shadow-2xl backdrop-blur-xl">
        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full text-white hover:bg-white/10">
          <Wallet size={24} />
        </Button>
        <Button className="h-12 rounded-full bg-primary px-8 font-bold text-white shadow-lg shadow-primary/40">
          Pay Now
        </Button>
        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full text-white hover:bg-white/10">
          <UserIcon size={24} />
        </Button>
      </div>
    </div>
  );
}
