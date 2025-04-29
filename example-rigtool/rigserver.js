const http = require('http');
const WebSocket = require('ws');
const url = require('url');

// Config
const PORT = 8080;

// UI HTML page
const htmlPage = `
<!DOCTYPE html>
<html>
<head>
  <title>RigTools JS Injector</title>
  <style>
    body { background: #111; color: #0f0; font-family: monospace; padding: 20px; }
    textarea { width: 100%; height: 160px; background: #222; color: #0f0; border: 1px solid #555; padding: 10px; }
    button { margin-top: 10px; padding: 10px 20px; font-weight: bold; }
  </style>
</head>
<body>
  <h1>RigTools JS Injector</h1>
  <textarea id="code">console.log("RigTools injected this!")</textarea><br>
  <button onclick="send()">Send to DevTools</button>
  <div id="status">Connecting...</div>
  <script>
    const ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/");
    ws.onopen = () => document.getElementById("status").textContent = "Connected to injector";
    function send() {
      const code = document.getElementById("code").value;
      ws.send(JSON.stringify({
        id: Date.now(),
        method: "Runtime.evaluate",
        params: { expression: code }
      }));
    }
  </script>
</body>
</html>
`;

let devtoolsSocket = null;

// HTTP server
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const host = req.headers.host;

  if (parsed.pathname === '/json') {
    const targets = [{
      id: "1",
      type: "page",
      title: "RigTools UI",
      url: `https://${host}`,
      webSocketDebuggerUrl: `wss://${host}/devtools/page/1`
    }];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(targets));
  } else if (parsed.pathname === '/json/version') {
    const version = {
      "Browser": "RigTools/1.0",
      "Protocol-Version": "1.3",
      "User-Agent": "RigTools",
      "V8-Version": "9.0",
      "WebKit-Version": "537.36",
      "webSocketDebuggerUrl": `wss://${host}/devtools/browser/1`
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(version));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlPage);
  }
});

// WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  const route = req.url || '';
  console.log(`[*] WebSocket connected from ${ip} via ${route}`);

  if (route.includes('/devtools')) {
    console.log('[*] DevTools is now connected');
    devtoolsSocket = ws;
  } else {
    console.log('[*] UI connected');
    ws.on('message', (msg) => {
      console.log('[*] Payload from UI:', msg.toString());
      if (devtoolsSocket) {
        devtoolsSocket.send(msg.toString());
        console.log('[*] Sent to DevTools');
      } else {
        console.log('[!] No DevTools connected yet');
      }
    });
  }
});

server.listen(PORT, () => {
  console.log(`[*] RigTools clone live at http://localhost:${PORT}`);
});
