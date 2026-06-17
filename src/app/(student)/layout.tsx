'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { checkStudentAuth } from '@/lib/auth';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!checkStudentAuth()) {
      router.push('/student-login');
    } else {
      setLoading(false);
    }
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
