export function parseCliArguments(argv: string[]) {
  const parsedArguments: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      continue;
    }

    const key = item.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      parsedArguments[key] = 'true';
      continue;
    }

    parsedArguments[key] = value;
    index += 1;
  }

  return parsedArguments;
}
