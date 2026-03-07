import { Button as BaseButton } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';

import type * as React from 'react';

type ButtonProps = React.ComponentProps<typeof BaseButton>;

export const Button = ({ className, variant, ...props }: ButtonProps) => {
  return (
    <BaseButton
      variant={variant}
      className={cn(
        'shadow-xs focus-visible:ring-ring/30 h-10 rounded-xl font-semibold transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm disabled:hover:translate-y-0 disabled:hover:shadow-none',
        variant === 'default' &&
          'bg-primary text-primary-foreground shadow-[0_12px_24px_-14px_color-mix(in_oklab,var(--primary)_72%,black)] hover:bg-primary/92',
        variant === 'secondary' &&
          'border-border bg-card text-foreground hover:bg-muted/80 hover:border-border/90 border shadow-[0_10px_24px_-20px_color-mix(in_oklab,var(--text-strong)_24%,transparent)]',
        variant === 'outline' && 'border-border hover:bg-muted/70 border bg-transparent',
        variant === 'ghost' && 'hover:bg-muted/85 shadow-none hover:shadow-none',
        variant === 'destructive' &&
          'bg-destructive text-destructive-foreground shadow-[0_12px_24px_-16px_color-mix(in_oklab,var(--destructive)_70%,black)] hover:bg-destructive/92',
        className,
      )}
      {...props}
    />
  );
};
