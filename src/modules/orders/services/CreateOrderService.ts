import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Product from '@modules/products/infra/typeorm/entities/Product';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer doest not exist.');
    }

    const productList = await this.productsRepository.findAllById(products);

    if (productList.length !== products.length) {
      throw new AppError('One or more products does not exist.');
    }

    const producsToSave = products.map(product => {
      const findProduct = productList.find(
        item => item.id === product.id,
      ) as Product;

      const { price } = findProduct;

      if (findProduct.quantity < product.quantity) {
        throw new AppError(
          `Insufficient quantity for the product: ${findProduct.name}`,
        );
      }

      return {
        product_id: product.id,
        quantity: product.quantity,
        price,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: producsToSave,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
