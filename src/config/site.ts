export const site = {
  url: import.meta.env.VITE_SITE_URL ?? 'http://localhost:5173',
  currency: 'USD',
  defaultShippingEstimate: '6–10 business days',
} as const;
