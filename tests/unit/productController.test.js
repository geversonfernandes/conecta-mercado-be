import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/models/Product.js', () => ({
  default: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  }
}));

const Product = (await import('../../src/models/Product.js')).default;
const { listProducts } = await import('../../src/controllers/productController.js');

const mockReqRes = (query = {}) => ({
  req: { query },
  res: {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
});

describe('productController - listProducts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deve filtrar apenas produtos anunciados para clientes', async () => {
    const mockDocs = [{ _id: '1', title: 'Banana', status: 'anunciado' }];

    Product.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockDocs)
        })
      })
    });

    Product.countDocuments.mockResolvedValue(1);

    const { req, res } = mockReqRes({ page: "1", limit: "10" });

    await listProducts(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ items: mockDocs })
    );
  });
});
