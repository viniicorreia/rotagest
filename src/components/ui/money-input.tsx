import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

/** Campo de valor em reais: teclado numérico no celular, prefixo R$, aceita "1.234,56". */
export const MoneyInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>>(({ className, ...props }, ref) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
    <Input ref={ref} inputMode="decimal" autoComplete="off" placeholder="0,00" className={cn('pl-10 tabular-nums', className)} {...props} />
  </div>
));
MoneyInput.displayName = 'MoneyInput';
