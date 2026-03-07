import { cn } from '@repo/ui/lib/utils';

type StepProgressProps = {
  currentStep: number;
  steps: Array<{
    id: number;
    label: string;
  }>;
  className?: string;
};

export const StepProgress = ({ currentStep, steps, className }: StepProgressProps) => (
  <div className={cn('grid gap-2 md:grid-cols-3', className)}>
    {steps.map((step) => (
      <div
        key={step.id}
        className={cn(
          'rounded-2xl border p-4 text-sm transition-colors',
          currentStep === step.id && 'border-primary bg-primary text-primary-foreground',
          currentStep > step.id && 'border-app-success-border bg-app-success-soft text-app-success',
          currentStep < step.id && 'border-border bg-surface-muted/70 text-text-soft',
        )}
      >
        <p className="font-semibold">{step.label}</p>
      </div>
    ))}
  </div>
);
