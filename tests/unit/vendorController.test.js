// tests/unit/vendorController.test.js
import { jest } from '@jest/globals';
import Product from '../../src/models/Product.js';
import Order from '../../src/models/Order.js';
import { getVendorDashboard } from '../../src/controllers/vendorController.js';

jest.mock('../../src/models/Product.js', () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('../../src/models/Order.js', () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn(),
  },
}));

const mockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return res;
};

describe('vendorController - getVendorDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 401 se não houver vendorId no req.user', async () => {
    const req = { user: null };
    const res = mockRes();

    await getVendorDashboard(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Não autenticado.' });
  });
});
