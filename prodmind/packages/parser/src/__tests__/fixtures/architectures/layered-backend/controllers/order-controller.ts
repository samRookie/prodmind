import { OrderService } from '../services/order-service';

const orderService = new OrderService();

export function handleCreateOrder(userId: string, productIds: string[]) {
  const order = orderService.createOrder(userId, productIds);
  return { status: 201, data: order };
}

export function handleListOrders(userId: string) {
  const orders = orderService.listOrders(userId);
  return { status: 200, data: orders };
}
