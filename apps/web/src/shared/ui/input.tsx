import { Input as BaseInput } from '@repo/ui/components/input';
import { cn } from '@repo/ui/lib/utils';

import type * as React from 'react';

type InputProps = React.ComponentProps<typeof BaseInput>;

export const Input = ({ className, ...props }: InputProps) => {
  return (
    <BaseInput
      className={cn(
        'border-border bg-input shadow-xs placeholder:text-muted-foreground focus-visible:ring-ring/30 h-11 rounded-xl text-sm transition-[border-color,box-shadow,background-color] focus-visible:ring-2',
        className,
      )}
      {...props}
    />
  );
};
