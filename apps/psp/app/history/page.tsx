'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, History as HistoryIcon } from 'lucide-react';

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

export default function HistoryPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  const { data: transactions, isLoading } = useQuery<PagedResponse<Transaction>>({
    queryKey: ['psp-transactions'],
    queryFn: () => apiFetch<PagedResponse<Transaction>>('/psp/transactions'),
    enabled: isAuthenticated,
  });

  const transactionList: Transaction[] = transactions?.content || [];

  if (authLoading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6 pb-24">
      <div className="mb-8 flex items-center justify-between">
        <Button variant="ghost" size="icon" className="rounded-full bg-secondary/50" onClick={() => router.push('/')}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-bold">Transaction History</h1>
        <div className="w-10" />
      </div>

      <div className="space-y-4">
        {transactionList.map((txn, index) => (
          <div key={txn.id || `txn-${index}`} className="flex items-center justify-between rounded-[2rem] bg-card/50 p-6 backdrop-blur-sm border border-border/50">
            <div className="flex items-center space-x-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                txn.direction === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
              }`}>
                {txn.direction === 'CREDIT' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
              </div>
              <div>
                <div className="font-bold">{txn.counterpartyName || txn.counterpartyVpa}</div>
                <div className="text-[10px] text-muted-foreground">{txn.counterpartyVpa}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{new Date(txn.createdAt).toLocaleString()}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold tabular-nums ${
                txn.direction === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {txn.direction === 'CREDIT' ? '+' : '-'}₹{parseFloat(txn.amount).toLocaleString('en-IN')}
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-wider ${
                txn.status === 'SUCCESS' ? 'text-emerald-500' : txn.status === 'FAILED' ? 'text-rose-500' : 'text-amber-500'
              }`}>
                {txn.status}
              </div>
            </div>
          </div>
        ))}
        {!transactionList.length && (
          <div className="flex h-64 flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-border/50 text-muted-foreground">
            <HistoryIcon size={48} className="mb-4 opacity-10" />
            <p>No transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
