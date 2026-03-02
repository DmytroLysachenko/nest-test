import { Textarea as BaseTextarea } from '@repo/ui/components/textarea';
import { cn } from '@repo/ui/lib/utils';

import type * as React from 'react';

type TextareaProps = React.ComponentProps<typeof BaseTextarea>;

export const Textarea = ({ className, ...props }: TextareaProps) => {
  return (
    <BaseTextarea
      className={cn(
        'border-border bg-input shadow-xs placeholder:text-muted-foreground focus-visible:ring-ring/30 rounded-xl text-sm transition-colors focus-visible:ring-2',
        className,
      )}
      {...props}
    />
  );
};
