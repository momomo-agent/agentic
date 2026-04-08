# M28 DBB - VAD + HTTPS + CDN缓存 + Docker验收 + setup.sh

## DBB-001: VAD 自动检测语音开始
- Given: Web UI 加载，用户开始说话
- Expect: VAD 自动触发录音开始，无需手动按键
- Verify: speechstart 事件触发，录音状态变为 recording

## DBB-002: VAD 自动检测语音结束并提交
- Given: 用户停止说话超过静音阈值（500ms）
- Expect: VAD 自动停止录音并触发 STT 转写
- Verify: speechend 事件触发，transcribe() 被调用

## DBB-003: HTTPS 服务启动
- Given: 启动 agentic-service
- Expect: https://localhost:3000 可访问，返回 200
- Verify: curl -k https://localhost:3000 响应正常

## DBB-004: HTTP 重定向到 HTTPS
- Given: 访问 http://localhost:3000
- Expect: 301/302 重定向到 https://localhost:3000
- Verify: curl -v http://localhost:3000 显示 Location: https://...

## DBB-005: CDN profiles 缓存超 7 天自动刷新
- Given: 缓存文件 timestamp 超过 7 天
- Expect: loadProfiles() 触发远程拉取并更新缓存
- Verify: 缓存文件 timestamp 更新为当前时间

## DBB-006: CDN profiles 缓存未过期时不重新拉取
- Given: 缓存文件 timestamp 在 7 天内
- Expect: 直接使用缓存，不发起网络请求
- Verify: fetch 未被调用

## DBB-007: Docker 镜像构建成功
- Given: docker build . 在项目根目录执行
- Expect: exit code 0，无 fatal error
- Verify: docker images 列出新镜像

## DBB-008: Docker 容器 /api/health 返回 200
- Given: docker run -p 3000:3000 <image>
- Expect: curl http://localhost:3000/api/health → { status: 'ok' }
- Verify: HTTP 200

## DBB-009: setup.sh 幂等性 — 重复执行无副作用
- Given: 已安装环境，再次执行 bash setup.sh
- Expect: exit code 0，不重复安装已存在依赖
- Verify: 第二次执行输出 "already installed" 或跳过安装步骤
