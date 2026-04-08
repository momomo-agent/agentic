import { AgenticSense } from 'agentic-sense';

export function createPipeline(options = {}) {
  const instance = new AgenticSense(null, options);
  if (typeof instance.init === 'function') instance.init();
  return instance;
}
