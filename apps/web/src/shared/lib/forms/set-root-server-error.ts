import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';

import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';
import { toastError } from '@/shared/lib/ui/toast';

type SetRootServerErrorOptions = {
  fallbackMessage: string;
  showToast?: boolean;
};

export const setRootServerError = <TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  error: unknown,
  options: SetRootServerErrorOptions,
) => {
  const message = toUserErrorMessage(error, options.fallbackMessage);

  form.setError('root' as Path<TFieldValues>, {
    type: 'server',
    message,
  });

  if (options.showToast !== false) {
    toastError(message);
  }
};
