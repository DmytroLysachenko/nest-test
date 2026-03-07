import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const EmptyState = ({ title, description, actionLabel, onAction }: EmptyStateProps) => (
  <Card
    title={title}
    description={description}
    className="border-border/80 bg-surface-muted/70 border-dashed"
    contentClassName="space-y-4"
  >
    {actionLabel && onAction ? (
      <Button type="button" variant="secondary" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null}
  </Card>
);
