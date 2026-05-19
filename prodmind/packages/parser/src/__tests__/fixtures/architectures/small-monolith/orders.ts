import { calculateTotal } from './pricing';

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed';
}

export function createOrder(items: OrderItem[]): Order {
  const prices = items.map((i) => i.price * i.quantity);
  const { total } = calculateTotal(prices, 0.08);
  return { id: crypto.randomUUID(), items, total, status: 'pending' };
}
