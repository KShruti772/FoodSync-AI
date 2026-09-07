'use client';

import React from 'react';
import { DemoProvider } from '@/lib/demo-context';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <DemoProvider>{children}</DemoProvider>;
}
