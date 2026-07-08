'use strict';

const { validationResult } = require('express-validator');

/**
 * validate — Express middleware to check express-validator results.
 *
 * Place this after your validator chains in a route definition:
 *
 *   router.post('/', [body('name').notEmpty()], validate, createSession);
 *
 * Returns 400 with a structured errors array if any validator failed,
 * otherwise calls next() to continue to the controller.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

module.exports = validate;
