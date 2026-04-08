# Design: Submit CR for ARCHITECTURE.md gaps

## Action
Write a CR JSON to `.team/change-requests/cr-{timestamp}.json`.

## CR Content
```json
{
  "id": "cr-{timestamp}",
  "from": "tech_lead",
  "fromLevel": "L3",
  "toLevel": "L1",
  "targetFile": "ARCHITECTURE.md",
  "reason": "Five modules are implemented but undocumented: tunnel.js, src/cli/, HTTPS/middleware, VAD, agentic-embed",
  "proposedChange": "Add sections: 5.Tunnel (startTunnel), 6.CLI Modules (setup.js/browser.js), 7.VAD (detectVoiceActivity), 8.HTTPS & Middleware (cert.js/httpsServer.js/middleware.js), update agentic-embed in dependency tree",
  "status": "pending",
  "createdAt": "<ISO>",
  "reviewedAt": null,
  "reviewedBy": null
}
```

## No source code changes needed.
