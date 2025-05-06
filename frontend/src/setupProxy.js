const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // Rewrite '/api/albums' to '/albums'
      },
    })
  );
};