import { ProductRepository } from '../repositories/product-repository';

export interface Product {
  id: string;
  name: string;
  price: number;
}

const repo = new ProductRepository();

export class ProductService {
  listAll(): Product[] {
    return repo.findAll();
  }

  findById(id: string): Product | null {
    return repo.findById(id);
  }
}
