import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
  }
}));

const User = (await import('../../src/models/User.js')).default;
const { createUser } = await import('../../src/controllers/userController.js');

const mockReqRes = (body = {}) => ({
  req: { body },
  res: {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  }
});

describe('userController - createUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deve retornar 400 se email já estiver cadastrado', async () => {
    User.findOne.mockResolvedValue({ _id: '123', email: 'exemplo@teste.com' });

    const { req, res } = mockReqRes({
      name: 'João',
      email: 'exemplo@teste.com',
      password: '123456',
      role: 'cliente'
    });

    await createUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Usuário já existe!'
    });
  });
});
