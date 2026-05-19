export interface ProductRecord {
  id: string;
  name: string;
  price: number;
}

const products: ProductRecord[] = [
  { id: 'p1', name: 'Widget', price: 9.99 },
  { id: 'p2', name: 'Gadget', price: 24.99 },
  { id: 'p3', name: 'Doohickey', price: 4.99 },
];

export class ProductRepository {
  findAll(): ProductRecord[] {
    return [...products];
  }

  findById(id: string): ProductRecord | null {
    return products.find((p) => p.id === id) ?? null;
  }
}
