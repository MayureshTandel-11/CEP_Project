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

/**
 * Allow only users whose account email is listed in ADMIN_EMAILS.
 * Fails closed: with no admin configured, nobody is an admin.
 */
async function requireAdmin(req, _res, next) {
  try {
    const userId = currentUserId(req);
    if (!userId) {
      return next(new AuthError('You need to sign in to access this resource.'));
    }
    const { env } = require('../config/env');
    if (!env.adminEmails.length) {
      return next(new ForbiddenError('Administrator access is not configured.'));
    }
    const { User } = require('../models');
    const user = await User.findById(userId);
    if (!user) {
      return next(new AuthError('You need to sign in to access this resource.'));
    }
    if (!env.adminEmails.includes(String(user.email || '').toLowerCase())) {
      return next(new ForbiddenError('Administrator access is required.'));
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  SESSION_USER_KEY,
  requireAdmin,
  hashPassword,
  verifyPassword,
  loginUser,
  logoutUser,
  currentUserId,
  requireOwnership,
  requireAuth,
};
