export interface OrderRecord {
  id: string;
  userId: string;
  productIds: string[];
  total: number;
  status: 'pending' | 'completed';
}

const orders: OrderRecord[] = [];

export class OrderRepository {
  create(data: Omit<OrderRecord, 'id'>): OrderRecord {
    const order = { id: crypto.randomUUID(), ...data };
    orders.push(order);
    return order;
  }

  findById(id: string): OrderRecord | null {
    return orders.find((o) => o.id === id) ?? null;
  }

  findByUserId(userId: string): OrderRecord[] {
    return orders.filter((o) => o.userId === userId);
  }
}
