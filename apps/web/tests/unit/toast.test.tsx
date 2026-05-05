import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  TOAST_UNDO_ARIA_LABEL,
  toastError,
  toastInfo,
  toastSuccess,
  toastSuccessWithAction,
} from '@/shared/lib/ui/toast';

const { dismissMock, successMock, errorMock, baseToastMock, customMock } = vi.hoisted(() => ({
  dismissMock: vi.fn(),
  successMock: vi.fn(),
  errorMock: vi.fn(),
  baseToastMock: vi.fn(),
  customMock: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(baseToastMock, {
    success: successMock,
    error: errorMock,
    custom: customMock,
    dismiss: dismissMock,
  }),
}));

describe('toast helpers', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('delegates plain success, error, and info to sonner', () => {
    toastSuccess('Saved');
    toastError('Broken');
    toastInfo('Heads up');

    expect(successMock).toHaveBeenCalledWith('Saved');
    expect(errorMock).toHaveBeenCalledWith('Broken');
    expect(baseToastMock).toHaveBeenCalledWith('Heads up');
  });

  it('renders icon-led undo content for action toasts', () => {
    const onAction = vi.fn();
    customMock.mockImplementation((renderer: (toastId: string) => React.ReactNode) => renderer('toast-1'));

    const node = toastSuccessWithAction('Status updated to SAVED', 'Undo', onAction);
    expect(node).toBeUndefined();

    const renderer = customMock.mock.calls[0]?.[0] as (toastId: string) => React.ReactNode;
    render(<>{renderer('toast-1')}</>);

    const undoButton = screen.getByLabelText(TOAST_UNDO_ARIA_LABEL);
    expect(screen.getByText('Status updated to SAVED')).toBeInTheDocument();
    expect(screen.getByText('Use undo if this status change should be reverted immediately.')).toBeInTheDocument();

    fireEvent.click(undoButton);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(dismissMock).toHaveBeenCalledWith('toast-1');
  });
});
