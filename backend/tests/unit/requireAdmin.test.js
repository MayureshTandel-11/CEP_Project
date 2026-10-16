jest.mock('../../src/models', () => ({ User: { findById: jest.fn() } }));

const { User } = require('../../src/models');
const { env } = require('../../src/config/env');
const { requireAdmin } = require('../../src/utils/security');
const { AuthError, ForbiddenError } = require('../../src/utils/errors');

const run = async (req) => {
  const next = jest.fn();
  await requireAdmin(req, {}, next);
  expect(next).toHaveBeenCalledTimes(1);
  return next.mock.calls[0][0]; // the error, or undefined when allowed
};
const sessionReq = (userId) => ({ session: userId === undefined ? {} : { userId } });

let savedAdmins;
beforeEach(() => {
  savedAdmins = env.adminEmails;
  env.adminEmails = ['admin@example.com'];
  User.findById.mockReset();
});
afterEach(() => {
  env.adminEmails = savedAdmins;
});

describe('requireAdmin', () => {
  test('401 when not signed in', async () => {
    const err = await run(sessionReq());
    expect(err).toBeInstanceOf(AuthError);
    expect(err.statusCode).toBe(401);
    expect(User.findById).not.toHaveBeenCalled();
  });

  test('401 when there is no session object at all', async () => {
    const err = await run({});
    expect(err).toBeInstanceOf(AuthError);
  });

  test('403 for a signed-in user who is not an admin', async () => {
    User.findById.mockResolvedValue({ email: 'someone@example.com' });
    const err = await run(sessionReq('u1'));
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(err.statusCode).toBe(403);
  });

  test('allowed for an admin email', async () => {
    User.findById.mockResolvedValue({ email: 'admin@example.com' });
    expect(await run(sessionReq('u1'))).toBeUndefined();
    expect(User.findById).toHaveBeenCalledWith('u1');
  });

  test('admin email comparison is case-insensitive', async () => {
    User.findById.mockResolvedValue({ email: 'Admin@Example.COM' });
    expect(await run(sessionReq('u1'))).toBeUndefined();
  });

  test('ADMIN_EMAILS entries are matched exactly, not by substring', async () => {
    for (const email of ['admin@example.com.evil.io', 'xadmin@example.com', 'admin@example.co']) {
      User.findById.mockResolvedValue({ email });
      expect(await run(sessionReq('u1'))).toBeInstanceOf(ForbiddenError);
    }
  });

  test('fails closed: nobody is admin when ADMIN_EMAILS is empty', async () => {
    env.adminEmails = [];
    User.findById.mockResolvedValue({ email: 'admin@example.com' });
    const err = await run(sessionReq('u1'));
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(User.findById).not.toHaveBeenCalled();
  });

  test('401 when the session user no longer exists', async () => {
    User.findById.mockResolvedValue(null);
    expect(await run(sessionReq('gone'))).toBeInstanceOf(AuthError);
  });

  test('a user without an email is not an admin', async () => {
    User.findById.mockResolvedValue({});
    expect(await run(sessionReq('u1'))).toBeInstanceOf(ForbiddenError);
  });

  test('database errors are passed to next, not swallowed as success', async () => {
    const boom = new Error('db down');
    User.findById.mockRejectedValue(boom);
    expect(await run(sessionReq('u1'))).toBe(boom);
  });
});
