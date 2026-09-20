const request = require('supertest');
const { User } = require('../src/models');

const getApp = () => global.getApp();
const register = (...args) => global.register(...args);

describe('auth', () => {
  test('registration succeeds', async () => {
    const res = await register(request.agent(getApp()), 'a@test.com');
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('a@test.com');
  });

  test('password is hashed not stored plaintext', async () => {
    await register(request.agent(getApp()), 'hash@test.com');
    const user = await User.findOne({ email: 'hash@test.com' });
    expect(user.passwordHash).not.toBe('Passw0rd1');
    expect(user.passwordHash).not.toContain('Passw0rd1');
    expect(user.toPublic()).not.toHaveProperty('password');
    expect(user.toPublic()).not.toHaveProperty('passwordHash');
  });

  test('duplicate email rejected', async () => {
    const agent = request.agent(getApp());
    await register(agent, 'dup@test.com');
    const res = await register(request.agent(getApp()), 'dup@test.com');
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('EMAIL_EXISTS');
  });

  test('weak password rejected', async () => {
    const res = await register(request.agent(getApp()), 'weak@test.com', 'short');
    expect(res.status).toBe(422);
  });

  test('password without digit rejected', async () => {
    const res = await register(request.agent(getApp()), 'weak2@test.com', 'alphabetsonly');
    expect(res.status).toBe(422);
  });

  test('invalid email rejected', async () => {
    const res = await register(request.agent(getApp()), 'not-an-email');
    expect(res.status).toBe(422);
  });

  test('login succeeds and generic failures match', async () => {
    const agent = request.agent(getApp());
    await register(agent, 'login@test.com');
    await agent.post('/api/auth/logout');
    const ok = await agent.post('/api/auth/login').send({ email: 'login@test.com', password: 'Passw0rd1' });
    expect(ok.status).toBe(200);
    await agent.post('/api/auth/logout');
    const unknown = await agent.post('/api/auth/login').send({ email: 'nobody@test.com', password: 'Passw0rd1' });
    const wrong = await agent.post('/api/auth/login').send({ email: 'login@test.com', password: 'Wrong1234' });
    expect(unknown.body.message).toBe(wrong.body.message);
    expect(unknown.body.message).toBe('Incorrect email or password.');
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
  });

  test('protected routes require login', async () => {
    const client = request(getApp());
    expect((await client.get('/api/auth/me')).status).toBe(401);
    expect((await client.get('/api/dashboard')).status).toBe(401);
    expect((await client.get('/api/logs')).status).toBe(401);
  });

  test('logout invalidates session', async () => {
    const agent = request.agent(getApp());
    await register(agent, 'out@test.com');
    expect((await agent.get('/api/auth/me')).status).toBe(200);
    await agent.post('/api/auth/logout');
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
});
