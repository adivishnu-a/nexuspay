'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, History as HistoryIcon } from 'lucide-react';
import { BottomBar } from '@/components/bottom-bar';

interface Transaction {
  id: string;
  amount: string;
  direction: 'DEBIT' | 'CREDIT';
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  counterpartyVpa: string;
  counterpartyName: string;
  txnReference: string;
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
    return (
      <div className="min-h-screen bg-background p-6 pb-24">
        <div className="mb-8 flex items-center justify-between">
          <div className="h-10 w-10 animate-pulse rounded-full bg-secondary" />
          <div className="h-6 w-40 animate-pulse rounded-lg bg-secondary/50" />
          <div className="w-10" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-3xl bg-secondary/20" />
          ))}
        </div>
      </div>
    );
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
          <div key={txn.id || `txn-${index}`} className="flex items-center justify-between rounded-3xl bg-card/50 p-6 backdrop-blur-sm border border-border/50">
            <div className="flex items-center space-x-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                txn.direction === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'
              }`}>
                {txn.direction === 'CREDIT' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
              </div>
              <div className="min-w-0">
                <div className="font-bold truncate max-w-[150px]">{txn.counterpartyName || txn.counterpartyVpa}</div>
                <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{txn.counterpartyVpa}</div>
                <div className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 truncate max-w-[120px]">{txn.txnReference}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{new Date(txn.createdAt).toLocaleString()}</div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-lg font-bold tabular-nums ${
                txn.direction === 'CREDIT' ? 'text-emerald-600' : 'text-destructive'
              }`}>
                {txn.direction === 'CREDIT' ? '+' : '-'}₹{parseFloat(txn.amount).toLocaleString('en-IN')}
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-wider ${
                txn.status === 'SUCCESS' ? 'text-emerald-500' : txn.status === 'FAILED' ? 'text-destructive' : 'text-amber-500'
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
      <BottomBar />
    </div>
  );
}
