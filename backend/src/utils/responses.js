function success(res, data = null, message = 'OK', status = 200, extra = {}) {
  const body = { success: true, message, ...extra };
  if (data !== null && data !== undefined) body.data = data;
  return res.status(status).json(body);
}

function created(res, data = null, message = 'Created') {
  return success(res, data, message, 201);
}

module.exports = { success, created };
