const https = require('https');
const WebSocket = require('ws');
const express = require('express');
const fs = require('fs');

// === Configuration ===
const PORT = 8080; // HTTPS + WSS port
const TARGET_ID = "page-1"; // ID for our fake page
const BROWSER_VERSION = "Chrome/126.0.6478.266"; // Match real version

// === HTTPS Server with Express ===
const app = express();

// Handle /json endpoint
app.get('/json', (req, res) => {
  res.json([
    {
      id: TARGET_ID,
      type: "page",
      title: "RigTools Lab",
      url: "https://example.com",
      webSocketDebuggerUrl: `wss://${req.headers.host}/devtools/page/${TARGET_ID}`
    }
  ]);
});

// Handle /json/version endpoint
app.get('/json/version', (req, res) => {
  res.json({
    "Browser": BROWSER_VERSION,
    "Protocol-Version": "1.3",
    "User-Agent": BROWSER_VERSION,
    "V8-Version": "9.0",
    "WebKit-Version": "537.36",
    "webSocketDebuggerUrl": `wss://${req.headers.host}/devtools/browser`
  });
});

// Default page handler (fixed for express@5+)
app.use((req, res) => {
  res.send(`<h1>RigTools v2 Fake DevTools Server Running</h1>`);
});

// Create HTTPS server with local certs
const server = https.createServer({
  cert: fs.readFileSync('localhost.pem'),
  key: fs.readFileSync('localhost-key.pem')
}, app);

// Create WebSocket Server (WSS)
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  console.log(`[*] WSS client connected: ${req.url}`);

  ws.on('message', (message) => {
    const msg = JSON.parse(message);
    console.log('[*] Received message:', msg);

    if (msg.method === 'Runtime.evaluate') {
      console.log('[*] Trying to evaluate JS:', msg.params.expression);

      // Fake successful evaluation response
      ws.send(JSON.stringify({
        id: msg.id,
        result: {
          result: {
            type: "string",
            value: "Evaluated by RigTools v2"
          }
        }
      }));

    } else if (msg.method.endsWith('.enable')) {
      console.log('[*] Enabling domain:', msg.method);

      // Fake success for enable commands
      ws.send(JSON.stringify({
        id: msg.id,
        result: {}
      }));

    } else {
      console.log('[*] Unknown method, faking success:', msg.method);

      // For unknown methods, still fake success
      ws.send(JSON.stringify({
        id: msg.id,
        result: {}
      }));
    }
  });

  ws.on('close', () => {
    console.log('[*] WSS connection closed');
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`[*] HTTPS + WSS server running on https://localhost:${PORT}`);
});
