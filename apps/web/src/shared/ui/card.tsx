import { type ReactNode } from 'react';
import { Card as ShadcnCard, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/card';

type CardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export const Card = ({ title, description, children }: CardProps) => {
  return (
    <ShadcnCard className="border-slate-200 bg-white/90 backdrop-blur">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </ShadcnCard>
  );
};
