'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, ArrowUpRight, ArrowDownLeft, Lock, RefreshCw, LogOut, Eye, EyeOff } from 'lucide-react';

interface BankAccount {
  id: string;
  ifsc: string;
  balance: string;
  status: 'ACTIVE' | 'LOCKED';
  pinSet: boolean;
}

interface Transaction {
  id: string;
  amount: string;
  direction: 'DEBIT' | 'CREDIT';
  status: 'SUCCESS' | 'FAILED';
  counterpartyName: string;
  txnType: string;
  createdAt: string;
  txnReference: string;
  balanceAfter: string;
}

interface PagedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export default function AccountPage() {
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [newPin, setNewPin] = useState('');
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  const { data: account, isLoading: accountLoading } = useQuery<BankAccount>({
    queryKey: ['bank-account'],
    queryFn: () => apiFetch<BankAccount>('/bank/accounts'),
    enabled: isAuthenticated,
  });

  const { data: transactionsData } = useQuery<PagedResponse<Transaction>>({
    queryKey: ['bank-transactions', account?.id],
    queryFn: () => apiFetch<PagedResponse<Transaction>>(`/bank/accounts/${account?.id}/transactions`),
    enabled: !!account,
  });

  const transactions: Transaction[] = transactionsData?.content || [];

  const openAccountMutation = useMutation({
    mutationFn: () => apiFetch('/bank/accounts', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bank-account'] }),
  });

  const faucetMutation = useMutation({
    mutationFn: () => apiFetch(`/bank/accounts/${account?.id}/deposit`, { 
      method: 'POST',
      body: JSON.stringify({ amount: 1000.00 })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-account'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.refetchQueries({ queryKey: ['bank-account'] });
    },
  });

  const setPinMutation = useMutation({
    mutationFn: (pin: string) => apiFetch(`/bank/accounts/${account?.id}/pin`, { 
      method: 'PUT',
      body: JSON.stringify({ pin }),
    }),
    onSuccess: () => {
      setNewPin('');
      queryClient.invalidateQueries({ queryKey: ['bank-account'] });
    },
  });

  if (authLoading || accountLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center">
            <div className="space-y-2">
              <div className="h-8 w-48 animate-pulse rounded-lg bg-secondary" />
              <div className="h-4 w-64 animate-pulse rounded-lg bg-secondary/50" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-3xl bg-secondary/30" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-3xl bg-secondary/20" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-none bg-card/50 shadow-2xl backdrop-blur-xl rounded-[2.5rem]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[2.5rem] bg-primary/10 text-primary shadow-inner">
              <Plus size={40} />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight">Welcome, {user?.fullName}</CardTitle>
            <CardDescription className="text-base">You don&apos;t have a sandbox bank account yet.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-12">
            <Button 
              size="lg" 
              className="w-full rounded-[2rem] py-8 text-xl font-bold bg-primary text-primary-foreground shadow-2xl shadow-primary/20 active:scale-95 transition-all"
              onClick={() => openAccountMutation.mutate()}
              disabled={openAccountMutation.isPending}
            >
              {openAccountMutation.isPending ? 'Opening...' : 'Open Sandbox Account'}
            </Button>
            <p className="mt-6 text-sm text-muted-foreground text-center max-w-[280px]">
              This will create a virtual account with zero balance. Use the faucet to add funds.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 animate-in fade-in duration-1000">
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Header */}
        <div className="flex flex-col justify-between space-y-8 md:flex-row md:items-end md:space-y-0 animate-in fade-in slide-in-from-top-4 duration-700 delay-100 fill-mode-backwards">
          <div className="space-y-1">
            <h1 className="text-sm font-bold uppercase tracking-[0.2em] opacity-40">Sandbox Banking</h1>
            <p className="text-3xl font-black tracking-tight">Core Ledger</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              className="flex-1 md:flex-none rounded-full px-6 border-border/50 bg-card/50 font-semibold" 
              onClick={() => queryClient.invalidateQueries()} 
              disabled={accountLoading || faucetMutation.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${accountLoading || faucetMutation.isPending ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <Button 
              className={`flex-1 md:flex-none rounded-full px-8 bg-primary font-bold transition-all duration-700 ${!accountLoading && parseFloat(account.balance) === 0 ? 'animate-pulse shadow-[0_0_20px_rgba(var(--primary),0.4)] scale-105' : ''}`} 
              onClick={() => faucetMutation.mutate()} 
              disabled={faucetMutation.isPending}
            >
              {faucetMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Faucet
            </Button>
            <Button variant="ghost" className="rounded-full px-6 font-semibold text-destructive hover:bg-destructive/10" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Account Overview Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-backwards">
          <Card 
            className="border-none bg-card/50 shadow-sm backdrop-blur-xl rounded-[2.5rem] cursor-pointer group active:scale-[0.98] transition-all"
            onClick={() => setIsPrivacyMode(!isPrivacyMode)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-8">
              <CardTitle className="text-sm font-bold uppercase tracking-[0.1em] opacity-40">Available Balance</CardTitle>
              <div className="text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity">
                {isPrivacyMode ? <Eye size={14} /> : <EyeOff size={14} />}
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="text-4xl font-black tracking-tighter tabular-nums truncate transition-all duration-500">
                {isPrivacyMode ? (
                  <span className="opacity-20 tracking-[0.3em] text-3xl">••••••</span>
                ) : (
                  `₹${parseFloat(account.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Real-time sandbox funds</p>
            </CardContent>
          </Card>

          <Card 
            className="border-none bg-card/50 shadow-sm backdrop-blur-xl rounded-[2.5rem] cursor-pointer group active:scale-[0.98] transition-all"
            onClick={() => setIsPrivacyMode(!isPrivacyMode)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-8">
              <CardTitle className="text-sm font-bold uppercase tracking-[0.1em] opacity-40">Account Details</CardTitle>
              <Badge variant={account.status === 'ACTIVE' ? 'default' : 'destructive'} className="rounded-full px-4 py-1 font-bold text-[10px]">
                {account.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-1 p-8 pt-0">
              <div className="text-xl font-bold tracking-tight tabular-nums truncate transition-all duration-500">
                {isPrivacyMode ? (
                  <span className="opacity-20 tracking-[0.2em]">••••••••</span>
                ) : (
                  account.id
                )}
              </div>
              <div className="text-xs text-muted-foreground opacity-60">IFSC: {account.ifsc}</div>
            </CardContent>
          </Card>

          <Card className="border-none bg-card/50 shadow-sm backdrop-blur-xl rounded-[2.5rem]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-8">
              <CardTitle className="text-sm font-bold uppercase tracking-[0.1em] opacity-40">Security</CardTitle>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3 p-8 pt-0">
              <Dialog>
                <DialogTrigger render={
                  <Button variant="outline" size="sm" className="w-full rounded-xl text-xs border-border/50 hover:bg-secondary/50">
                    Reset Transaction PIN
                  </Button>
                } />
                <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none bg-background/90 backdrop-blur-2xl">
                  <DialogHeader>
                    <DialogTitle>Set Transaction PIN</DialogTitle>
                    <DialogDescription>
                      This 4-digit PIN is required for all UPI-style transfers.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col items-center space-y-4 py-4">
                    <Input
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      className="h-16 w-48 text-center text-4xl tracking-widest rounded-2xl bg-secondary border-none"
                      onChange={(e) => setNewPin(e.target.value)}
                    />
                    <Button 
                      className="w-full rounded-xl" 
                      onClick={() => setPinMutation.mutate(newPin)}
                      disabled={setPinMutation.isPending || newPin.length !== 4}
                    >
                      Update Secure PIN
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <p className="text-[10px] text-muted-foreground text-center">PIN is required for all outbound transfers.</p>
            </CardContent>
          </Card>
        </div>

        {/* Ledger */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-backwards">
          <Card className="border-none bg-card/50 shadow-2xl backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] opacity-40 mb-1">Audit Trail</h2>
              <CardTitle className="text-2xl font-black tracking-tight">Core Ledger</CardTitle>
              <CardDescription className="text-base">Raw view of all ACID-compliant transactions in the bank.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-8 md:pt-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[600px] md:min-w-full">
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Post-Txn Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.map((txn, index) => (
                      <TableRow key={txn.id || `bank-txn-${index}`} className="border-border/50">
                        <TableCell>
                          {txn.direction === 'CREDIT' ? (
                            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="max-w-[150px]">
                          <div className="font-medium truncate">
                            {txn.txnType === 'CASH_DEPOSIT' ? 'Cash Deposit' : txn.counterpartyName}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{new Date(txn.createdAt).toLocaleString()}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate">{txn.txnReference}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${txn.status === 'SUCCESS' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600' : 'border-rose-500/30 bg-rose-500/5 text-rose-600'}`}>
                            {txn.status}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-black tabular-nums tracking-tight ${txn.direction === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {txn.direction === 'CREDIT' ? '+' : '-'}₹{parseFloat(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums opacity-60">
                          ₹{parseFloat(txn.balanceAfter || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!transactions?.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="p-0">
                          <div className="flex h-64 flex-col items-center justify-center p-8 text-center bg-primary/5 rounded-b-3xl border-t border-dashed border-primary/20">
                            <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
                              <RefreshCw size={32} />
                            </div>
                            <h3 className="font-bold text-lg text-foreground">Ledger is empty</h3>
                            <p className="mb-6 text-sm text-muted-foreground max-w-[280px]">
                              Your sandbox bank ledger is currently blank. Tap the Faucet button above to simulate a deposit.
                            </p>
                            <Button 
                              onClick={() => faucetMutation.mutate()}
                              disabled={faucetMutation.isPending}
                              className="rounded-full bg-primary px-6 font-bold text-white shadow-lg shadow-primary/20 group active:scale-95 transition-all"
                            >
                              {faucetMutation.isPending ? 'Processing...' : 'Try Faucet Now'}
                              <Plus size={16} className="ml-2 transition-transform group-hover:rotate-90" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
