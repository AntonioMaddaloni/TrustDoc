const { body, validationResult } = require('express-validator');

const userRegistrationValidator = [
  body('name')
    .exists().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

  body('surname')
    .exists().withMessage('Surname is required')
    .isLength({ min: 2, max: 50 }).withMessage('Surname must be between 2 and 50 characters'),

  body('email')
    .exists().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .exists().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = userRegistrationValidator;