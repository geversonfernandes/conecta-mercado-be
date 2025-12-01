import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';

jest.setTimeout(30000);

let mongod;

// helper para criar e logar
async function createAndLoginUser(role, email) {
  const password = '123456';

  await request(app)
    .post('/api/v1/user/register')
    .send({
      name: 'Teste',
      email,
      password,
      role
    });

  const resLogin = await request(app)
    .post('/api/v1/user/login')
    .send({ email, password });

  return resLogin.headers['set-cookie'];
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

describe('Fluxo de pedidos', () => {
  it('cliente deve conseguir criar pedido a partir do carrinho', async () => {
    const vendCookie = await createAndLoginUser(
      'vendedor',
      'vend@example.com'
    );

    const resProduct = await request(app)
      .post('/api/v1/products')
      .set('Cookie', vendCookie)
      .send({
        title: 'Produto Teste',
        price: 10,
        stock: 5,
        description: 'teste',
        category: 'geral',
        status: 'anunciado'
      });

    const productId = resProduct.body.product?._id;

    const cliCookie = await createAndLoginUser(
      'cliente',
      'cli@example.com'
    );

    await request(app)
      .post('/api/v1/cart')
      .set('Cookie', cliCookie)
      .send({
        productId,
        qty: 2
      });

    const resCheckout = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Cookie', cliCookie)
      .send();

    expect(resCheckout.statusCode).toBe(201);
    expect(resCheckout.body.order.total).toBe(20);
  });
});
