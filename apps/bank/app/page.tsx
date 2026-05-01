'use client';

import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';

export default function LoginPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/account');
    }
  }, [isAuthenticated, router]);

  const handleSuccess = async (credentialResponse: any) => {
    const idToken = credentialResponse.credential;
    const response = await apiFetch<{ accessToken: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    localStorage.setItem('nexus_access_token', response.accessToken);
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Warming up...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-none bg-card/50 shadow-2xl backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 size={32} />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">NexusPay Bank</CardTitle>
          <CardDescription className="text-base">
            Sandbox Core Banking System
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-8 pb-10">
          <div className="text-center text-sm text-muted-foreground">
            <p>Access your sandbox account, manage PINs,</p>
            <p>and inspect the real-time ledger.</p>
          </div>
          
          <div className="flex w-full justify-center">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => console.log('Login Failed')}
              useOneTap
              shape="pill"
              theme="outline"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs text-muted-foreground/60">
            <ShieldCheck size={14} />
            <span>Bank-grade Encryption • Secure Sandbox</span>
          </div>
        </CardContent>
      </Card>
      
      <footer className="mt-8 text-xs text-muted-foreground/40">
        © 2026 NexusPay • SDE Portfolio Project
      </footer>
    </div>
  );
}
