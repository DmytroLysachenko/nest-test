/** @satisfies {import("prettier").Config} */
const config = {
  trailingComma: 'all',
  singleQuote: true,
  endOfLine: 'auto',
  printWidth: 120,
  objectWrap: 'preserve',
  plugins: ['prettier-plugin-tailwindcss'],

  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  tailwindFunctions: ['clsx', 'cn', 'twMerge'],
};

export default config;
