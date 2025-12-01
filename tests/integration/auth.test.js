import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';

jest.setTimeout(30000);

let mongod;

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

describe('Auth API', () => {
    it('deve registrar um usuário cliente com sucesso', async () => {
        const res = await request(app)
            .post('/api/v1/user/register')
            .send({
                name: 'João Teste',
                email: 'joao@example.com',
                password: '123456',
                role: 'cliente'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.user.email).toBe('joao@example.com');
    });

    it('não deve permitir login com senha errada', async () => {
        await request(app)
            .post('/api/v1/user/register')
            .send({
                name: 'Maria Teste',
                email: 'maria@example.com',
                password: '123456',
                role: 'cliente'
            });

        const res = await request(app)
            .post('/api/v1/user/login')
            .send({
                email: 'maria@example.com',
                password: 'errada'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('Senha incorreta!');
    });
});
