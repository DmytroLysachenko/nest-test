import { toast } from 'sonner';

export const toastSuccess = (message: string) => {
  toast.success(message);
};

export const toastSuccessWithAction = (message: string, actionLabel: string, onAction: () => void) => {
  toast.success(message, {
    action: {
      label: actionLabel,
      onClick: onAction,
    },
  });
};

export const toastError = (message: string) => {
  toast.error(message);
};

export const toastInfo = (message: string) => {
  toast(message);
};
