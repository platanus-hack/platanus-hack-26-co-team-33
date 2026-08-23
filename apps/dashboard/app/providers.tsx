'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{ loginMethods: ['email'], appearance: { theme: 'dark' } }}
    >
      {children}
    </PrivyProvider>
  )
}
