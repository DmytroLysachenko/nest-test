import { type ReactNode } from 'react';
import { Card as ShadcnCard, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/card';
import { cn } from '@repo/ui/lib/utils';

type CardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export const Card = ({ title, description, children, className, contentClassName }: CardProps) => {
  return (
    <ShadcnCard className={cn('border-border/80 bg-card/90 rounded-2xl shadow-sm backdrop-blur-sm', className)}>
      <CardHeader className="gap-2 px-5 pt-5">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-muted-foreground text-sm">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className={cn('px-5 pb-5', contentClassName)}>{children}</CardContent>
    </ShadcnCard>
  );
};
