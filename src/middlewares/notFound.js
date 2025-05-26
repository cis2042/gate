const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: {
      auth: [
        'POST /api/v1/auth/register',
        'POST /api/v1/auth/login',
        'POST /api/v1/auth/refresh',
        'POST /api/v1/auth/logout',
        'POST /api/v1/auth/forgot-password',
        'POST /api/v1/auth/reset-password'
      ],
      users: [
        'GET /api/v1/users/profile',
        'PUT /api/v1/users/profile',
        'DELETE /api/v1/users/profile'
      ],
      verification: [
        'POST /api/v1/verification/start',
        'POST /api/v1/verification/submit',
        'GET /api/v1/verification/status'
      ],
      sbt: [
        'POST /api/v1/sbt/mint',
        'GET /api/v1/sbt/metadata/:tokenId',
        'GET /api/v1/sbt/user/:userId'
      ],
      admin: [
        'GET /api/v1/admin/users',
        'GET /api/v1/admin/verifications',
        'GET /api/v1/admin/stats'
      ]
    },
    documentation: '/api/v1/docs',
    health: '/health'
  });
};

module.exports = notFound;
