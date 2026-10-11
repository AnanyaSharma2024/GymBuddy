// Generic Zod-based request validator.
// Usage: router.post('/x', validate({ body: mySchema }), handler)
const ApiError = require('../utils/apiError');

function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      const errors = err.errors
        ? err.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
        : [err.message];
      next(ApiError.unprocessable('Validation failed', errors));
    }
  };
}

module.exports = validate;
