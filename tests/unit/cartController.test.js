import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/models/Cart.js', () => ({
  default: {
    findOne: jest.fn(),
    findOneAndDelete: jest.fn(),
  }
}));

jest.unstable_mockModule('../../src/models/Product.js', () => ({
  default: {
    findById: jest.fn(),
  }
}));

jest.unstable_mockModule('express-validator', () => ({
  validationResult: jest.fn(),
}));

const Cart = (await import('../../src/models/Cart.js')).default;
const Product = (await import('../../src/models/Product.js')).default;
const { validationResult } = await import('express-validator');

const { addToCart, clearCart } = await import('../../src/controllers/cartController.js');

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('cartController - addToCart', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deve retornar 400 se houver erro de validação', async () => {
    const req = { user: { id: 'u1' }, body: { productId: 'p1', qty: 1 } };
    const res = mockRes();

    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Erro de validação' }]
    });

    await addToCart(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errors: [{ msg: 'Erro de validação' }]
    });
  });
});

describe('cartController - clearCart', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deve esvaziar o carrinho do usuário logado', async () => {
    const req = { user: { id: 'u1' } };
    const res = mockRes();

    Cart.findOneAndDelete.mockResolvedValue(null);

    await clearCart(req, res);

    expect(Cart.findOneAndDelete).toHaveBeenCalledWith({ userId: 'u1' });
    expect(res.json).toHaveBeenCalledWith({ message: 'Carrinho esvaziado.' });
  });
});
