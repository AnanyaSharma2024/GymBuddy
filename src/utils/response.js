// Consistent API envelope so the frontend always knows what shape to expect.
function success(res, { status = 200, message = 'OK', data = null, meta } = {}) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

function fail(res, { status = 400, message = 'Something went wrong', errors = [] } = {}) {
  return res.status(status).json({ success: false, message, errors });
}

module.exports = { success, fail };
