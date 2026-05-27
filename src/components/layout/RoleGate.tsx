'use client'

import { ReactNode } from 'react'

interface RoleGateProps {
  userRole: string
  allowedRoles: string[]
  children: ReactNode
  fallback?: ReactNode
}

export function RoleGate({ userRole, allowedRoles, children, fallback }: RoleGateProps) {
  if (!allowedRoles.includes(userRole)) {
    return fallback ? <>{fallback}</> : null
  }
  return <>{children}</>
}
