import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AlertProps {
  children: ReactNode
  className?: string
}

interface AlertTitleProps {
  children: ReactNode
  className?: string
}

interface AlertDescriptionProps {
  children: ReactNode
  className?: string
}

export function Alert({ children, className }: AlertProps) {
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      {children}
    </div>
  )
}

export function AlertTitle({ children, className }: AlertTitleProps) {
  return (
    <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)}>
      {children}
    </h5>
  )
}

export function AlertDescription({ children, className }: AlertDescriptionProps) {
  return (
    <div className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </div>
  )
}