import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/models/PaymentRecord.js', () => ({
  default: {
    create: jest.fn(),
    findOne: jest.fn(),
  }
}));

jest.unstable_mockModule('../../src/models/Order.js', () => ({
  default: {
    findById: jest.fn(),
  }
}));

const PaymentRecord = (await import('../../src/models/PaymentRecord.js')).default;
const Order = (await import('../../src/models/Order.js')).default;
const { createPix } = await import('../../src/controllers/paymentController.js');

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn()
});

describe('paymentController - createPix', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deve retornar 404 se o pedido não for encontrado', async () => {
    const req = { body: { orderId: '123' } };
    const res = mockRes();

    Order.findById.mockResolvedValue(null);

    await createPix(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Pedido não encontrado.'
    });
  });
});
