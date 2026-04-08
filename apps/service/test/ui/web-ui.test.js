import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const UI_CLIENT_PATH = 'src/ui/client';
const DIST_PATH = 'dist/ui';

describe('Web UI - Build Output', () => {
  it('should generate dist/ui directory with built files', () => {
    expect(existsSync(DIST_PATH)).toBe(true);
    expect(existsSync(join(DIST_PATH, 'index.html'))).toBe(true);
  });

  it('should include Vue runtime in built assets', () => {
    const html = readFileSync(join(DIST_PATH, 'index.html'), 'utf-8');
    expect(html).toContain('<script');
    expect(html).toContain('<link');
  });
});

describe('Web UI - Component Structure', () => {
  it('should have App.vue as root component', () => {
    const appPath = join(UI_CLIENT_PATH, 'src/App.vue');
    expect(existsSync(appPath)).toBe(true);

    const content = readFileSync(appPath, 'utf-8');
    expect(content).toContain('<ChatBox');
    expect(content).toContain('import ChatBox');
  });

  it('should have ChatBox component with MessageList and InputBox', () => {
    const chatBoxPath = join(UI_CLIENT_PATH, 'src/components/ChatBox.vue');
    expect(existsSync(chatBoxPath)).toBe(true);

    const content = readFileSync(chatBoxPath, 'utf-8');
    expect(content).toContain('<MessageList');
    expect(content).toContain('<InputBox');
    expect(content).toContain('import MessageList');
    expect(content).toContain('import InputBox');
  });

  it('should have MessageList component with message rendering', () => {
    const msgListPath = join(UI_CLIENT_PATH, 'src/components/MessageList.vue');
    expect(existsSync(msgListPath)).toBe(true);

    const content = readFileSync(msgListPath, 'utf-8');
    expect(content).toContain('v-for');
    expect(content).toContain('messages');
    expect(content).toContain('msg.role');
    expect(content).toContain('msg.content');
  });

  it('should have InputBox component with send functionality', () => {
    const inputBoxPath = join(UI_CLIENT_PATH, 'src/components/InputBox.vue');
    expect(existsSync(inputBoxPath)).toBe(true);

    const content = readFileSync(inputBoxPath, 'utf-8');
    expect(content).toContain('textarea');
    expect(content).toContain('v-model="text"');
    expect(content).toContain('@click="handleSend"');
    expect(content).toContain('emit(\'send\'');
  });
});

describe('Web UI - API Integration', () => {
  it('should implement SSE streaming in ChatBox', () => {
    const chatBoxPath = join(UI_CLIENT_PATH, 'src/components/ChatBox.vue');
    const content = readFileSync(chatBoxPath, 'utf-8');

    // Check for fetch to /api/chat
    expect(content).toContain('/api/chat');
    expect(content).toContain('POST');

    // Check for SSE parsing
    expect(content).toContain('response.body.getReader()');
    expect(content).toContain('TextDecoder');
    expect(content).toContain('data: ');
  });

  it('should send message and history in request body', () => {
    const chatBoxPath = join(UI_CLIENT_PATH, 'src/components/ChatBox.vue');
    const content = readFileSync(chatBoxPath, 'utf-8');

    expect(content).toContain('message: text');
    expect(content).toContain('history:');
  });

  it('should handle streaming chunks correctly', () => {
    const chatBoxPath = join(UI_CLIENT_PATH, 'src/components/ChatBox.vue');
    const content = readFileSync(chatBoxPath, 'utf-8');

    // Check for chunk accumulation
    expect(content).toContain('data.chunk');
    expect(content).toContain('aiMessage.content');
  });
});

describe('Web UI - User Interactions', () => {
  it('should support Enter key to send message', () => {
    const inputBoxPath = join(UI_CLIENT_PATH, 'src/components/InputBox.vue');
    const content = readFileSync(inputBoxPath, 'utf-8');

    expect(content).toContain('@keydown.enter');
    expect(content).toContain('.prevent');
  });

  it('should disable input when loading', () => {
    const inputBoxPath = join(UI_CLIENT_PATH, 'src/components/InputBox.vue');
    const content = readFileSync(inputBoxPath, 'utf-8');

    expect(content).toContain(':disabled');

    const chatBoxPath = join(UI_CLIENT_PATH, 'src/components/ChatBox.vue');
    const chatContent = readFileSync(chatBoxPath, 'utf-8');
    expect(chatContent).toContain('loading');
  });

  it('should clear input after sending', () => {
    const inputBoxPath = join(UI_CLIENT_PATH, 'src/components/InputBox.vue');
    const content = readFileSync(inputBoxPath, 'utf-8');

    expect(content).toContain("text.value = ''");
  });

  it('should disable send button for empty messages', () => {
    const inputBoxPath = join(UI_CLIENT_PATH, 'src/components/InputBox.vue');
    const content = readFileSync(inputBoxPath, 'utf-8');

    expect(content).toContain('!text.trim()');
  });
});

describe('Web UI - Message Display', () => {
  it('should differentiate user and assistant messages with CSS classes', () => {
    const msgListPath = join(UI_CLIENT_PATH, 'src/components/MessageList.vue');
    const content = readFileSync(msgListPath, 'utf-8');

    expect(content).toContain('msg.role');
    expect(content).toContain('.user');
    expect(content).toContain('.assistant');
  });

  it('should implement auto-scroll to bottom', () => {
    const msgListPath = join(UI_CLIENT_PATH, 'src/components/MessageList.vue');
    const content = readFileSync(msgListPath, 'utf-8');

    expect(content).toContain('watch');
    expect(content).toContain('scrollTop');
    expect(content).toContain('scrollHeight');
  });

  it('should support message content wrapping', () => {
    const msgListPath = join(UI_CLIENT_PATH, 'src/components/MessageList.vue');
    const content = readFileSync(msgListPath, 'utf-8');

    expect(content).toContain('word-wrap');
    expect(content).toContain('white-space');
  });
});

describe('Web UI - Error Handling', () => {
  it('should handle HTTP errors', () => {
    const chatBoxPath = join(UI_CLIENT_PATH, 'src/components/ChatBox.vue');
    const content = readFileSync(chatBoxPath, 'utf-8');

    expect(content).toContain('if (!response.ok)');
    expect(content).toContain('throw new Error');
  });

  it('should display error messages', () => {
    const chatBoxPath = join(UI_CLIENT_PATH, 'src/components/ChatBox.vue');
    const content = readFileSync(chatBoxPath, 'utf-8');

    expect(content).toContain('catch');
    expect(content).toContain('Error:');
    expect(content).toContain('data.error');
  });

  it('should reset loading state in finally block', () => {
    const chatBoxPath = join(UI_CLIENT_PATH, 'src/components/ChatBox.vue');
    const content = readFileSync(chatBoxPath, 'utf-8');

    expect(content).toContain('finally');
    expect(content).toContain('loading.value = false');
  });
});

describe('Web UI - Responsive Design', () => {
  it('should use viewport-relative sizing', () => {
    const chatBoxPath = join(UI_CLIENT_PATH, 'src/components/ChatBox.vue');
    const content = readFileSync(chatBoxPath, 'utf-8');

    expect(content).toContain('90vw');
    expect(content).toContain('90vh');
  });

  it('should have max-width constraints', () => {
    const chatBoxPath = join(UI_CLIENT_PATH, 'src/components/ChatBox.vue');
    const content = readFileSync(chatBoxPath, 'utf-8');

    expect(content).toContain('max-width');
    expect(content).toContain('max-height');
  });

  it('should use flexbox for layout', () => {
    const appPath = join(UI_CLIENT_PATH, 'src/App.vue');
    const content = readFileSync(appPath, 'utf-8');

    expect(content).toContain('display: flex');
    expect(content).toContain('justify-content: center');
    expect(content).toContain('align-items: center');
  });
});

describe('Web UI - Configuration', () => {
  it('should have vite.config.js with API proxy', () => {
    const vitePath = join(UI_CLIENT_PATH, 'vite.config.js');
    expect(existsSync(vitePath)).toBe(true);

    const content = readFileSync(vitePath, 'utf-8');
    expect(content).toContain('proxy');
    expect(content).toContain('/api');
    expect(content).toContain('localhost:3000');
  });

  it('should configure build output to dist/ui', () => {
    const vitePath = join(UI_CLIENT_PATH, 'vite.config.js');
    const content = readFileSync(vitePath, 'utf-8');

    expect(content).toContain('outDir');
    expect(content).toContain('dist/ui');
  });

  it('should have package.json with Vue 3 dependencies', () => {
    const pkgPath = join(UI_CLIENT_PATH, 'package.json');
    expect(existsSync(pkgPath)).toBe(true);

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    expect(pkg.dependencies.vue).toBeDefined();
    expect(pkg.devDependencies['@vitejs/plugin-vue']).toBeDefined();
    expect(pkg.devDependencies.vite).toBeDefined();
  });
});

describe('Web UI - Edge Cases', () => {
  it('should handle empty message submission', () => {
    const inputBoxPath = join(UI_CLIENT_PATH, 'src/components/InputBox.vue');
    const content = readFileSync(inputBoxPath, 'utf-8');

    // Check for trim() validation
    expect(content).toContain('text.value.trim()');
    expect(content).toContain('if (message && !props.disabled)');
  });

  it('should prevent sending while loading', () => {
    const chatBoxPath = join(UI_CLIENT_PATH, 'src/components/ChatBox.vue');
    const content = readFileSync(chatBoxPath, 'utf-8');

    expect(content).toContain('loading.value = true');

    const inputBoxPath = join(UI_CLIENT_PATH, 'src/components/InputBox.vue');
    const inputContent = readFileSync(inputBoxPath, 'utf-8');
    expect(inputContent).toContain(':disabled="disabled');
  });

  it('should handle textarea auto-resize', () => {
    const inputBoxPath = join(UI_CLIENT_PATH, 'src/components/InputBox.vue');
    const content = readFileSync(inputBoxPath, 'utf-8');

    expect(content).toContain('watch(text');
    expect(content).toContain('style.height');
    expect(content).toContain('scrollHeight');
  });

  it('should limit textarea max height', () => {
    const inputBoxPath = join(UI_CLIENT_PATH, 'src/components/InputBox.vue');
    const content = readFileSync(inputBoxPath, 'utf-8');

    expect(content).toContain('max-height: 120px');
  });
});
