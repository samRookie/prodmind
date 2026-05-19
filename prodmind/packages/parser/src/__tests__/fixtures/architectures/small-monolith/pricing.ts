export interface PriceResult {
  subtotal: number;
  tax: number;
  total: number;
}

export function calculateTotal(items: number[], taxRate: number): PriceResult {
  const subtotal = items.reduce((sum, price) => sum + price, 0);
  const tax = subtotal * taxRate;
  return { subtotal, tax, total: subtotal + tax };
}
