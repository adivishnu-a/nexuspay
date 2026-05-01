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
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Lock, Unlock, RefreshCw } from 'lucide-react';

interface BankAccount {
  accountNumber: string;
  ifsc: string;
  balance: string;
  status: 'ACTIVE' | 'LOCKED';
}

interface Transaction {
  id: string;
  amount: string;
  direction: 'DEBIT' | 'CREDIT';
  status: 'SUCCESS' | 'FAILED';
  description: string;
  timestamp: string;
  txnReference: string;
}

export default function AccountPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

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

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['bank-transactions'],
    queryFn: () => apiFetch<Transaction[]>('/bank/transactions'),
    enabled: !!account,
  });

  const openAccountMutation = useMutation({
    mutationFn: () => apiFetch('/bank/accounts', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bank-account'] }),
  });

  const faucetMutation = useMutation({
    mutationFn: () => apiFetch('/bank/faucet', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bank-account'] }),
  });

  if (authLoading || accountLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!account) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-none bg-card/50 shadow-2xl backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Plus size={32} />
            </div>
            <CardTitle>Welcome, {user?.fullName}</CardTitle>
            <CardDescription>You don't have a sandbox bank account yet.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-10">
            <Button 
              size="lg" 
              className="w-full rounded-2xl py-6 text-lg font-semibold"
              onClick={() => openAccountMutation.mutate()}
              disabled={openAccountMutation.isPending}
            >
              {openAccountMutation.isPending ? 'Opening...' : 'Open Sandbox Account'}
            </Button>
            <p className="mt-4 text-xs text-muted-foreground text-center">
              This will create a virtual account with zero balance. Use the faucet to add funds.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bank Dashboard</h1>
            <p className="text-muted-foreground">Manage your sandbox core banking account.</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" className="rounded-xl border-border bg-card/50" onClick={() => queryClient.invalidateQueries()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button className="rounded-xl bg-primary" onClick={() => faucetMutation.mutate()} disabled={faucetMutation.isPending}>
              <ArrowDownLeft className="mr-2 h-4 w-4" />
              Faucet (+₹1000)
            </Button>
          </div>
        </div>

        {/* Account Overview Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-none bg-card/50 shadow-sm backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">₹{parseFloat(account.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">Real-time sandbox funds</p>
            </CardContent>
          </Card>

          <Card className="border-none bg-card/50 shadow-sm backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Details</CardTitle>
              <Badge variant={account.status === 'ACTIVE' ? 'default' : 'destructive'} className="rounded-full">
                {account.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-lg font-semibold tracking-tight tabular-nums">{account.accountNumber}</div>
              <div className="text-xs text-muted-foreground">IFSC: {account.ifsc}</div>
            </CardContent>
          </Card>

          <Card className="border-none bg-card/50 shadow-sm backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security</CardTitle>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" size="sm" className="w-full rounded-lg text-xs" onClick={() => {}}>
                Reset Transaction PIN
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">PIN is required for all outbound transfers.</p>
            </CardContent>
          </Card>
        </div>

        {/* Ledger */}
        <Card className="border-none bg-card/50 shadow-sm backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Core Ledger</CardTitle>
            <CardDescription>Raw view of all ACID-compliant transactions in the bank.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((txn) => (
                  <TableRow key={txn.id} className="border-border/50">
                    <TableCell>
                      {txn.direction === 'CREDIT' ? (
                        <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-rose-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{txn.description}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(txn.timestamp).toLocaleString()}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{txn.txnReference.substring(0, 12)}...</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`rounded-full text-[10px] ${txn.status === 'SUCCESS' ? 'border-emerald-500/50 text-emerald-600' : 'border-rose-500/50 text-rose-600'}`}>
                        {txn.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-semibold tabular-nums ${txn.direction === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {txn.direction === 'CREDIT' ? '+' : '-'}₹{parseFloat(txn.amount).toLocaleString('en-IN')}
                    </TableCell>
                  </TableRow>
                ))}
                {!transactions?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No transactions yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
