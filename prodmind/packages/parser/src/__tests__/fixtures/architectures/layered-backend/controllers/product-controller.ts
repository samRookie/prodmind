import { ProductService } from '../services/product-service';

const productService = new ProductService();

export function handleListProducts() {
  const products = productService.listAll();
  return { status: 200, data: products };
}

export function handleGetProduct(id: string) {
  const product = productService.findById(id);
  if (!product) return { status: 404, error: 'Product not found' };
  return { status: 200, data: product };
}
