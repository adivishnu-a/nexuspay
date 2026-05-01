'use client';

import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Send, 
  History, 
  User as UserIcon,
  ChevronRight,
  LogOut,
  Zap,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { BottomBar } from '@/components/bottom-bar';
import { useState } from 'react';

interface VpaDetails {
  address: string;
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
  counterpartyName: string;
  createdAt: string;
}

interface PagedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

interface BankAccount {
  id: string;
  ifsc: string;
  balance: string;
  status: string;
  pinSet: boolean;
}

export default function PspHome() {
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  const handleSuccess = async (credentialResponse: { credential?: string }) => {
    const idToken = credentialResponse.credential;
    const response = await apiFetch<{ accessToken: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    localStorage.setItem('nexus_access_token', response.accessToken);
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const { data: vpaData, error: vpaError } = useQuery<VpaDetails>({
    queryKey: ['vpa'],
    queryFn: () => apiFetch<VpaDetails>('/psp/vpas/me'),
    enabled: isAuthenticated,
    retry: false,
  });

  const bootstrapVpaMutation = useMutation({
    mutationFn: () => apiFetch<VpaDetails>('/psp/onboarding/bootstrap-vpa', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vpa'] });
      setShowWelcome(true);
    },
  });

  useEffect(() => {
    if (vpaError instanceof ApiError && vpaError.status === 404 && isAuthenticated) {
      bootstrapVpaMutation.mutate();
    }
  }, [vpaError, isAuthenticated, bootstrapVpaMutation]);

  const { data: balanceData } = useQuery<BalanceResponse>({
    queryKey: ['balance'],
    queryFn: () => apiFetch<BalanceResponse>('/psp/balance'),
    enabled: isAuthenticated,
  });

  const { data: bankAccount } = useQuery<BankAccount>({
    queryKey: ['bank-account'],
    queryFn: () => apiFetch<BankAccount>('/bank/accounts'),
    enabled: isAuthenticated,
  });

  const { data: transactions } = useQuery<PagedResponse<Transaction>>({
    queryKey: ['psp-transactions'],
    queryFn: () => apiFetch<PagedResponse<Transaction>>('/psp/transactions'),
    enabled: isAuthenticated,
  });

  const transactionList: Transaction[] = transactions?.content || [];

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

          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Welcome Onboarding Overlay */}
      {showWelcome && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-6 backdrop-blur-2xl animate-in fade-in duration-500">
          <Card className="relative w-full max-w-sm border-none bg-primary p-8 text-primary-foreground shadow-[0_0_100px_rgba(var(--primary),0.3)] rounded-[3rem] overflow-hidden">
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-6 rounded-full bg-white/20 p-4 animate-bounce">
                <Sparkles size={40} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Your Identity is Ready</h2>
              <p className="mt-2 opacity-80">We've reserved your unique payment address:</p>
              
              <div className="my-8 rounded-2xl bg-white/10 px-6 py-4 font-mono text-xl backdrop-blur-md border border-white/10">
                {vpaData?.address}
              </div>

              <Button 
                className="w-full h-16 rounded-2xl bg-white text-primary hover:bg-white/90 font-bold text-lg"
                onClick={() => setShowWelcome(false)}
              >
                Let's Go
              </Button>
            </div>
            {/* Animated bg elements */}
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl animate-pulse delay-700" />
          </Card>
        </div>
      )}

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
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push('/history')}>
            <History size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-rose-500 hover:bg-rose-500/10" onClick={() => logout()}>
            <LogOut size={20} />
          </Button>
        </div>
      </div>

      <div className="space-y-8 px-6 pt-6">
        {bankAccount && !bankAccount.pinSet && (
          <div 
            className="rounded-[2rem] bg-rose-500 p-6 text-white shadow-2xl shadow-rose-500/20 animate-in slide-in-from-top-4 duration-500 cursor-pointer active:scale-95 transition-transform"
            onClick={() => router.push('/settings')}
          >
            <div className="flex items-center space-x-4">
              <div className="rounded-2xl bg-white/20 p-3">
                <ShieldAlert size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">Security PIN Required</h3>
                <p className="text-xs text-white/80">You must set a PIN before making any payments.</p>
              </div>
              <ChevronRight size={20} className="opacity-50" />
            </div>
          </div>
        )}

        {/* Hero Balance Card */}
        <div 
          className="relative overflow-hidden rounded-[2rem] bg-primary p-8 text-primary-foreground shadow-2xl shadow-primary/30 cursor-pointer group active:scale-[0.98] transition-all duration-300"
          onClick={() => setIsBalanceHidden(!isBalanceHidden)}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium opacity-80">Total Balance</div>
              <div className="rounded-full bg-white/10 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {isBalanceHidden ? <Eye size={14} /> : <EyeOff size={14} />}
              </div>
            </div>
            <div className={`mt-1 text-5xl font-bold tracking-tighter tabular-nums transition-all duration-500 ${isBalanceHidden ? 'blur-xl opacity-20 scale-95' : 'blur-0 opacity-100 scale-100'}`}>
              ₹{parseFloat(balanceData?.balance || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-6 flex items-center space-x-2 text-sm">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <Zap size={12} />
              </div>
              <span className="font-mono opacity-90">{vpaData?.address || (bootstrapVpaMutation.isPending ? 'creating...' : 'no vpa')}</span>
            </div>
          </div>
          {/* Decorative background circle */}
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-colors" />
        </div>

        {/* Action Grid */}
        <Button 
          className="h-28 flex-col rounded-[2rem] bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full active:scale-95 transition-all shadow-lg hover:shadow-xl border-none"
          onClick={() => router.push('/pay')}
        >
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Send size={20} />
          </div>
          <span className="text-sm font-semibold tracking-tight">Send Money</span>
        </Button>

        {/* Transactions Section */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Activity</h2>
            <Button variant="link" className="text-primary p-0" onClick={() => router.push('/history')}>See All</Button>
          </div>
          <div className="space-y-4">
            {transactionList.slice(0, 5).map((txn, index) => (
              <div key={txn.id || `txn-${index}`} className="flex items-center justify-between rounded-2xl bg-card/50 p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    txn.direction === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {txn.direction === 'CREDIT' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <div className="font-semibold">{txn.counterpartyName || txn.counterpartyVpa}</div>
                    <div className="flex flex-col text-[10px] text-muted-foreground leading-tight">
                      <span>{txn.counterpartyVpa}</span>
                      <span className="opacity-60">{new Date(txn.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold tabular-nums ${
                    txn.direction === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {txn.direction === 'CREDIT' ? '+' : '-'}₹{parseFloat(txn.amount).toLocaleString('en-IN')}
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-tighter ${
                    txn.status === 'SUCCESS' ? 'text-emerald-500' : txn.status === 'FAILED' ? 'text-rose-500' : 'text-amber-500'
                  }`}>
                    {txn.status}
                  </div>
                </div>
              </div>
            ))}
            {!transactionList.length && (
              <div className="flex h-64 flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-primary/20 bg-primary/5 p-8 text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
                  <Zap size={32} />
                </div>
                <h3 className="font-bold text-lg text-foreground">Your wallet is empty</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  Get some test credits from our faucet to start making payments.
                </p>
                <Button 
                  onClick={() => window.open('https://nexus-bank.vercel.app/faucet', '_blank')}
                  className="rounded-full bg-primary px-6 font-bold text-white shadow-lg shadow-primary/20 group"
                >
                  Go to Faucet
                  <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomBar />
    </div>
  );
}
