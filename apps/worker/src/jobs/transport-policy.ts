export type WorkerTransportPolicy = 'http-only' | 'http-first' | 'browser-first' | 'hybrid';

export const resolveTransportPolicy = (source: string): WorkerTransportPolicy => {
  switch (source) {
    case 'pracuj-pl':
    case 'pracuj-pl-it':
    case 'pracuj-pl-general':
      return 'hybrid';
    default:
      return 'http-first';
  }
};
