/**
 * Route-level authorization for /api/ml, using a tiny Express app with a fake session.
 * The controller and the user lookup are mocked, so no database is needed.
 */
jest.mock('../../src/models', () => ({ User: { findById: jest.fn() } }));
jest.mock('../../src/controllers/mlController', () => ({
  explanation: jest.fn((_req, res) => res.json({ success: true, handler: 'explanation' })),
  retrainFromFeedback: jest.fn((_req, res) => res.json({ success: true, handler: 'retrain' })),
}));

const express = require('express');
const request = require('supertest');
const { User } = require('../../src/models');
const controller = require('../../src/controllers/mlController');
const { env } = require('../../src/config/env');
const { errorHandler } = require('../../src/middleware/errorHandler');
const mlRoutes = require('../../src/routes/mlRoutes');

function appWithSession(session) {
  const app = express();
  app.use((req, _res, next) => { req.session = session; next(); });
  app.use('/api/ml', mlRoutes);
  app.use(errorHandler);
  return app;
}

let savedAdmins;
beforeEach(() => {
  savedAdmins = env.adminEmails;
  env.adminEmails = ['admin@example.com'];
  User.findById.mockReset();
  controller.retrainFromFeedback.mockClear();
  controller.explanation.mockClear();
});
afterEach(() => { env.adminEmails = savedAdmins; });

describe('POST /api/ml/retrain', () => {
  test('401 for anonymous callers, handler not reached', async () => {
    const res = await request(appWithSession({})).post('/api/ml/retrain');
    expect(res.status).toBe(401);
    expect(controller.retrainFromFeedback).not.toHaveBeenCalled();
  });

  test('403 for a normal signed-in user, handler not reached', async () => {
    User.findById.mockResolvedValue({ email: 'user@example.com' });
    const res = await request(appWithSession({ userId: 'u1' })).post('/api/ml/retrain');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(controller.retrainFromFeedback).not.toHaveBeenCalled();
  });

  test('200 for an admin', async () => {
    User.findById.mockResolvedValue({ email: 'admin@example.com' });
    const res = await request(appWithSession({ userId: 'u1' })).post('/api/ml/retrain');
    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('retrain');
  });

  test('403 for everyone when no admin is configured', async () => {
    env.adminEmails = [];
    User.findById.mockResolvedValue({ email: 'admin@example.com' });
    const res = await request(appWithSession({ userId: 'u1' })).post('/api/ml/retrain');
    expect(res.status).toBe(403);
  });
});

describe('GET /api/ml/explanation', () => {
  test('still open to any signed-in user', async () => {
    const res = await request(appWithSession({ userId: 'u1' })).get('/api/ml/explanation');
    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('explanation');
  });

  test('401 for anonymous callers', async () => {
    const res = await request(appWithSession({})).get('/api/ml/explanation');
    expect(res.status).toBe(401);
  });
});
