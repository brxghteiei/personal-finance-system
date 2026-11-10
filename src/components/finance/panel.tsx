import { cn } from '@/lib/utils'

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn('rounded-xl border border-border bg-card p-6', className)}>{children}</section>
}
