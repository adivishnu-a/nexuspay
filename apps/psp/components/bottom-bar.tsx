'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Wallet, History } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export function BottomBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center space-x-2 rounded-full bg-foreground/90 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in slide-in-from-bottom-4 duration-500">
      <Button 
        variant="ghost" 
        size="icon" 
        className={`h-12 w-12 rounded-full hover:bg-white/10 active:scale-90 transition-all ${pathname === '/' ? 'text-primary' : 'text-background'}`} 
        onClick={() => router.push('/')}
      >
        <Wallet size={24} />
      </Button>
      <Button 
        className="h-12 rounded-full bg-primary px-8 font-bold text-white shadow-lg shadow-primary/40 active:scale-95 transition-all" 
        onClick={() => router.push('/pay')}
      >
        Pay Now
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        className={`h-12 w-12 rounded-full hover:bg-white/10 active:scale-90 transition-all ${pathname === '/history' ? 'text-primary' : 'text-background'}`} 
        onClick={() => router.push('/history')}
      >
        <History size={24} />
      </Button>
    </div>
  );
}
