# Test Result: hub.js广播wakeword事件

## Status: PASS

## Tests Run
- m15-hub-wakeword.test.js

## Results
- PASS: hub.js broadcastWakeword sends to all registry devices (DBB-005)

## Total: 1/1 passed

## Notes
broadcastWakeword() iterates registry and sends {type:'wakeword',deviceId}. Handler calls it on wakeword message.
