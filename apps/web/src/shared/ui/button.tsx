import { Button as BaseButton } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';

import type * as React from 'react';

type ButtonProps = React.ComponentProps<typeof BaseButton>;

export const Button = ({ className, variant, ...props }: ButtonProps) => {
  return (
    <BaseButton
      variant={variant}
      className={cn(
        'shadow-xs h-10 rounded-xl font-semibold transition-transform duration-150 hover:-translate-y-0.5',
        variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'secondary' && 'border-border bg-card text-foreground hover:bg-muted border',
        variant === 'outline' && 'border-border hover:bg-muted/70 border bg-transparent',
        variant === 'ghost' && 'hover:bg-muted',
        variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        className,
      )}
      {...props}
    />
  );
};
