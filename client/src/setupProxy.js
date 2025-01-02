// src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://api.sraws.com:4000',
      changeOrigin: true,
      secure: false, // Disable SSL verification (development only)
      onError: function (err, req, res) {
        res.writeHead(500, {
          'Content-Type': 'text/plain',
        });
        res.end('Something went wrong with the proxy server.');
      },
    })
  );
};