const { z } = require('zod');

const authValidator = z.object({
  username: z.string().trim().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

module.exports = { authValidator };