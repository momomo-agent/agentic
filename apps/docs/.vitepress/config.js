import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Agentic',
  description: '给 AI 造身体的零件箱',
  lang: 'zh-CN',
  
  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: '首页', link: '/' },
      { text: '快速开始', link: '/guide/getting-started' },
      { text: '器官手册', link: '/packages/' },
      { text: '食谱', link: '/examples/' },
      { text: 'GitHub', link: 'https://github.com/momomo-agent/agentic' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '核心概念', link: '/guide/concepts' },
            { text: '安装', link: '/guide/installation' }
          ]
        }
      ],
      
      '/packages/': [
        {
          text: '核心器官',
          items: [
            { text: 'core - 大脑', link: '/packages/core' },
            { text: 'sense - 眼睛', link: '/packages/sense' },
            { text: 'act - 意志', link: '/packages/act' },
            { text: 'voice - 声音', link: '/packages/voice' },
            { text: 'memory - 记忆', link: '/packages/memory' },
            { text: 'store - 骨骼', link: '/packages/store' },
            { text: 'render - 表达', link: '/packages/render' }
          ]
        },
        {
          text: '扩展器官',
          items: [
            { text: 'embed - 嵌入', link: '/packages/embed' },
            { text: 'filesystem - 文件系统', link: '/packages/filesystem' },
            { text: 'shell - 命令执行', link: '/packages/shell' },
            { text: 'spatial - 空间推理', link: '/packages/spatial' }
          ]
        },
        {
          text: '完整身体',
          items: [
            { text: 'claw - Agent 运行时', link: '/packages/claw' }
          ]
        }
      ],
      
      '/examples/': [
        {
          text: '示例',
          items: [
            { text: 'Hello Agent', link: '/examples/hello-agent' },
            { text: '语音交互', link: '/examples/voice-agent' },
            { text: '带记忆的 Agent', link: '/examples/memory-agent' },
            { text: '完整 Agent', link: '/examples/full-agent' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/momomo-agent/agentic' }
    ],

    footer: {
      message: 'MIT Licensed',
      copyright: 'Copyright © 2026 Momo Agent'
    }
  }
})
