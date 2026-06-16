'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTestById } from '@/lib/db';
import { Test } from '@/types/test';
import TestBuilder from '@/components/admin/TestBuilder';
import { toast } from 'sonner';

export default function EditTestPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [test, setTest] = useState<Test | null>(null);

  useEffect(() => {
    const found = getTestById(id);
    if (found) {
      setTest(found);
    } else {
      toast.error('Tahrirlanadigan test topilmadi.');
      router.push('/admin/tests');
    }
  }, [id, router]);

  if (!test) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return <TestBuilder initialTest={test} />;
}
