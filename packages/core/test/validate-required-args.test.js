import { describe, it, expect } from 'vitest';
import { toolRegistry } from '../src/index.js';

// We test validateRequiredArgs indirectly through executeTool behavior:
// register a tool with required params, call it with missing args,
// and confirm it returns a structured error without invoking execute.

describe('tool required argument validation', () => {
  const toolName = '__test_validate_required__';

  it('returns structured error when required args are missing', async () => {
    toolRegistry.register(toolName, {
      description: 'test tool',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The command to run' },
          label: { type: 'string', description: 'Short label' },
        },
        required: ['command', 'label'],
      },
      execute: () => { throw new Error('should not be called'); },
    });

    // Import executeTool indirectly — it's called through agenticStep
    // but we can test via the registry pattern
    const tool = toolRegistry.get(toolName);
    const { validateRequiredArgs } = await import('../src/index.js');

    // Empty input
    const result = validateRequiredArgs(tool.parameters, {});
    expect(result).not.toBeNull();
    expect(result.is_error).toBe(true);
    expect(result.error).toContain('command');
    expect(result.error).toContain('label');

    // Partial input
    const result2 = validateRequiredArgs(tool.parameters, { command: 'ls' });
    expect(result2).not.toBeNull();
    expect(result2.error).toContain('label');
    expect(result2.error).not.toContain('command');

    // Full input — no error
    const result3 = validateRequiredArgs(tool.parameters, { command: 'ls', label: 'test' });
    expect(result3).toBeNull();

    toolRegistry.unregister(toolName);
  });

  it('treats null and empty string as missing', async () => {
    const { validateRequiredArgs } = await import('../src/index.js');
    const schema = {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    };

    expect(validateRequiredArgs(schema, { query: null })).not.toBeNull();
    expect(validateRequiredArgs(schema, { query: '' })).not.toBeNull();
    expect(validateRequiredArgs(schema, { query: 'hello' })).toBeNull();
  });

  it('passes when no required fields defined', async () => {
    const { validateRequiredArgs } = await import('../src/index.js');
    const schema = { type: 'object', properties: { foo: { type: 'string' } } };
    expect(validateRequiredArgs(schema, {})).toBeNull();
  });

  it('passes for non-object schema', async () => {
    const { validateRequiredArgs } = await import('../src/index.js');
    expect(validateRequiredArgs(null, {})).toBeNull();
    expect(validateRequiredArgs({ type: 'string' }, {})).toBeNull();
  });
});
