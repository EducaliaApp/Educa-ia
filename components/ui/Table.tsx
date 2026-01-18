import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface TableProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Si true, permite scroll horizontal en móvil
   */
  scrollable?: boolean
}

/**
 * Wrapper para tablas con scroll horizontal en móvil
 */
export function TableContainer({ 
  scrollable = true, 
  className, 
  children, 
  ...props 
}: TableProps) {
  if (!scrollable) {
    return <div className={className} {...props}>{children}</div>
  }

  return (
    <div className={cn('w-full', className)} {...props}>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export interface ResponsiveTableProps extends HTMLAttributes<HTMLTableElement> {
  /**
   * Si true, oculta columnas menos importantes en móvil
   * Las columnas deben tener clase 'hidden sm:table-cell' o similar
   */
  responsive?: boolean
}

/**
 * Tabla base con estilos consistentes
 */
export function Table({ 
  responsive = true,
  className, 
  ...props 
}: ResponsiveTableProps) {
  return (
    <table
      className={cn(
        'min-w-full divide-y divide-gray-300',
        className
      )}
      {...props}
    />
  )
}

export function TableHead({ 
  className, 
  ...props 
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn('bg-gray-50', className)}
      {...props}
    />
  )
}

export function TableBody({ 
  className, 
  ...props 
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn(
        'divide-y divide-gray-200 bg-white',
        className
      )}
      {...props}
    />
  )
}

export function TableRow({ 
  className, 
  ...props 
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'hover:bg-gray-50 transition-colors',
        className
      )}
      {...props}
    />
  )
}

export interface TableHeaderProps extends HTMLAttributes<HTMLTableCellElement> {
  /**
   * Si true, esta columna se oculta en móvil
   */
  hideOnMobile?: boolean
  
  /**
   * Si true, esta columna se oculta en tablet
   */
  hideOnTablet?: boolean
}

export function TableHeader({ 
  hideOnMobile = false,
  hideOnTablet = false,
  className, 
  ...props 
}: TableHeaderProps) {
  return (
    <th
      scope="col"
      className={cn(
        'px-3 py-3.5 text-left text-sm font-semibold text-gray-900',
        hideOnMobile && 'hidden sm:table-cell',
        hideOnTablet && 'hidden lg:table-cell',
        className
      )}
      {...props}
    />
  )
}

export interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {
  /**
   * Si true, esta celda se oculta en móvil
   */
  hideOnMobile?: boolean
  
  /**
   * Si true, esta celda se oculta en tablet
   */
  hideOnTablet?: boolean
}

export function TableCell({ 
  hideOnMobile = false,
  hideOnTablet = false,
  className, 
  ...props 
}: TableCellProps) {
  return (
    <td
      className={cn(
        'whitespace-nowrap px-3 py-4 text-sm text-gray-500',
        hideOnMobile && 'hidden sm:table-cell',
        hideOnTablet && 'hidden lg:table-cell',
        className
      )}
      {...props}
    />
  )
}

/**
 * Celda principal (primera columna, siempre visible)
 */
export function TableCellPrimary({ 
  className, 
  ...props 
}: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6',
        className
      )}
      {...props}
    />
  )
}
