const bcrypt = require('bcryptjs');
const { AuthError, ForbiddenError } = require('./errors');

const SESSION_USER_KEY = 'userId';

async function hashPassword(raw) {
  return bcrypt.hash(raw, 10);
}

async function verifyPassword(passwordHash, raw) {
  return bcrypt.compare(raw || '', passwordHash);
}

function loginUser(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session[SESSION_USER_KEY] = String(userId);
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

function logoutUser(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
}

function currentUserId(req) {
  return req.session ? req.session[SESSION_USER_KEY] : undefined;
}

function requireOwnership(ownerId, userId) {
  if (String(ownerId) !== String(userId)) {
    throw new ForbiddenError('You do not have access to this resource.');
  }
}

function requireAuth(req, _res, next) {
  if (!currentUserId(req)) {
    return next(new AuthError('You need to sign in to access this resource.'));
  }
  return next();
}

module.exports = {
  SESSION_USER_KEY,
  hashPassword,
  verifyPassword,
  loginUser,
  logoutUser,
  currentUserId,
  requireOwnership,
  requireAuth,
};
