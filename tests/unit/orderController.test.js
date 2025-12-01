import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/models/Order.js', () => ({
  default: {
    find: jest.fn(),
    findById: jest.fn(),
  }
}));

jest.unstable_mockModule('../../src/models/Cart.js', () => ({
  default: {
    findOne: jest.fn(),
    findOneAndDelete: jest.fn(),
  }
}));

jest.unstable_mockModule('../../src/models/Product.js', () => ({
  default: {
    findById: jest.fn(),
    find: jest.fn(),
  }
}));

const Order = (await import('../../src/models/Order.js')).default;
const Cart = (await import('../../src/models/Cart.js')).default;

const { checkout, listOrders } = await import('../../src/controllers/orderController.js');

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('orderController - checkout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deve retornar 400 se carrinho estiver vazio', async () => {
    const req = { user: { id: 'user1' } };
    const res = mockRes();

    Cart.findOne.mockResolvedValue(null);

    await checkout(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Carrinho vazio.' });
  });
});

describe('orderController - listOrders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deve listar pedidos do cliente quando role = cliente', async () => {
    const req = { user: { id: 'cli1', role: 'cliente' } };
    const res = mockRes();

    Order.find.mockResolvedValue([{ _id: 'o1', buyerId: 'cli1' }]);

    await listOrders(req, res);

    expect(res.json).toHaveBeenCalledWith({
      orders: [{ _id: 'o1', buyerId: 'cli1' }]
    });
  });
});
