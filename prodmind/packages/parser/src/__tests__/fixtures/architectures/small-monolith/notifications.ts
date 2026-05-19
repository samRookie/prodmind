import type { Order } from './orders';

export type NotificationChannel = 'email' | 'sms';

export function notifyUser(order: Order, channel: NotificationChannel): string {
  const message = `Order ${order.id} created for $${order.total}`;
  return `${channel}: ${message}`;
}
