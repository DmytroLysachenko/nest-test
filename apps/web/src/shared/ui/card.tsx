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
    <ShadcnCard className={cn('app-surface', className)}>
      <CardHeader className="gap-2 px-5 pt-5 md:px-6 md:pt-6">
        <CardTitle className="text-text-strong text-[1.05rem] font-semibold tracking-[-0.025em]">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-text-soft max-w-3xl text-[0.92rem] leading-6">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className={cn('px-5 pb-5 md:px-6 md:pb-6', contentClassName)}>{children}</CardContent>
    </ShadcnCard>
  );
};
