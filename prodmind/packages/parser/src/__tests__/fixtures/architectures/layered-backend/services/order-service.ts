import { OrderRepository } from '../repositories/order-repository';
import { UserService } from './user-service';
import { ProductService } from './product-service';

export interface Order {
  id: string;
  userId: string;
  productIds: string[];
  total: number;
  status: 'pending' | 'completed';
}

const orderRepo = new OrderRepository();
const userService = new UserService();
const productService = new ProductService();

export class OrderService {
  createOrder(userId: string, productIds: string[]): Order {
    const user = userService.getUser(userId);
    if (!user) throw new Error('User not found');
    const products = productIds.map((id) => productService.findById(id)).filter(Boolean);
    const total = products.reduce((sum, p) => sum + (p?.price ?? 0), 0);
    return orderRepo.create({ userId, productIds, total, status: 'pending' });
  }

  listOrders(userId: string): Order[] {
    return orderRepo.findByUserId(userId);
  }
}
