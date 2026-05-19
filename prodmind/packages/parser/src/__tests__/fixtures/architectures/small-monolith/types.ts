export interface User {
  id: string;
  name: string;
  email: string;
}

export type OrderStatus = 'pending' | 'shipped' | 'delivered' | 'cancelled';

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PAYPAL = 'PAYPAL',
}
