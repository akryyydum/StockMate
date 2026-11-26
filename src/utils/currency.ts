export const CURRENCY_OPTIONS = [
  { code: 'PHP', label: 'Philippine peso', locale: 'en-PH' },
  { code: 'USD', label: 'US dollar', locale: 'en-US' },
  { code: 'EUR', label: 'Euro', locale: 'en-IE' },
  { code: 'GBP', label: 'British pound', locale: 'en-GB' },
  { code: 'JPY', label: 'Japanese yen', locale: 'ja-JP' },
  { code: 'CAD', label: 'Canadian dollar', locale: 'en-CA' },
  { code: 'AUD', label: 'Australian dollar', locale: 'en-AU' },
  { code: 'SGD', label: 'Singapore dollar', locale: 'en-SG' },
] as const;

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]['code'];

const currencyLocales: Record<CurrencyCode, string> = {
  PHP: 'en-PH',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  CAD: 'en-CA',
  AUD: 'en-AU',
  SGD: 'en-SG',
};

export function createCurrencyFormatter(currency: CurrencyCode) {
  return new Intl.NumberFormat(currencyLocales[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  });
}
