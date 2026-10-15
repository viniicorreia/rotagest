import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Botão flutuante de ação principal no celular (acima da bottom navigation). */
export function Fab({ icon: Icon, label, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button
      aria-label={label}
      className={cn(
        'fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:hidden',
        className,
      )}
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      {...props}
    >
      <Icon className="size-6" aria-hidden />
    </button>
  );
}
