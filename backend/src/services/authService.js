const { User } = require('../models');
const { AuthError, ConflictError } = require('../utils/errors');
const { hashPassword, verifyPassword } = require('../utils/security');
const { validateEmail, validateName, validatePassword } = require('../utils/validators');

const GENERIC_LOGIN_ERROR = 'Incorrect email or password.';

async function registerUser(name, email, password) {
  name = validateName(name);
  email = validateEmail(email);
  validatePassword(password);

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ConflictError('An account with this email already exists.', 'EMAIL_EXISTS');
  }

  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
  });
  return user;
}

async function authenticate(email, password) {
  email = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ email });
  if (!user || !(await verifyPassword(user.passwordHash, password || ''))) {
    throw new AuthError(GENERIC_LOGIN_ERROR, 'INVALID_CREDENTIALS');
  }
  return user;
}

module.exports = { GENERIC_LOGIN_ERROR, registerUser, authenticate };
