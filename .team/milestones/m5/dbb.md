# M5 DBB - 感知运行时 + 记忆模块 + Docker 打包

## DBB-001: sense.detect 返回人脸检测结果
- Requirement: sense.js — 封装 agentic-sense 人脸检测
- Given: 调用 `sense.detect(frame)`，frame 包含人脸图像数据
- Expect: 返回对象包含 `faces` 数组，每项含位置/置信度信息
- Verify: 结果非空，faces.length >= 1

## DBB-002: sense.detect 返回手势检测结果
- Requirement: sense.js — 封装 agentic-sense 手势检测
- Given: 调用 `sense.detect(frame)`，frame 包含手势图像数据
- Expect: 返回对象包含 `gestures` 数组
- Verify: 结果非空，gestures.length >= 1

## DBB-003: sense.detect 返回物体检测结果
- Requirement: sense.js — 封装 agentic-sense 物体检测
- Given: 调用 `sense.detect(frame)`，frame 包含物体图像数据
- Expect: 返回对象包含 `objects` 数组
- Verify: 结果非空，objects.length >= 1

## DBB-004: sense.detect 空帧处理
- Requirement: sense.js — 边缘用例
- Given: 调用 `sense.detect(null)` 或 `sense.detect(undefined)`
- Expect: 抛出错误或返回空结果，不崩溃
- Verify: 进程不退出，错误信息可读

## DBB-005: memory.search 返回相关记忆片段
- Requirement: memory.js — 基于 agentic-store + agentic-embed 的向量记忆检索
- Given: 已存入若干记忆片段，调用 `memory.search("query")`
- Expect: 返回数组，包含与 query 语义相关的片段
- Verify: 结果数组长度 >= 1，每项含内容字段

## DBB-006: memory.search 无匹配时返回空数组
- Requirement: memory.js — 边缘用例
- Given: 记忆库为空或 query 无相关内容
- Expect: 返回空数组 `[]`，不报错
- Verify: 返回值为数组，length === 0

## DBB-007: memory.search 空字符串输入
- Requirement: memory.js — 边缘用例
- Given: 调用 `memory.search("")`
- Expect: 返回空数组或抛出可读错误，不崩溃
- Verify: 进程不退出

## DBB-008: memory 并发写入不丢数据
- Requirement: memory.js — 并发写边缘用例
- Given: 同时并发写入 N 条记忆片段
- Expect: 所有 N 条均可被后续 search 检索到
- Verify: `memory.search` 能找回全部写入内容

## DBB-009: Docker 镜像构建成功
- Requirement: install/Dockerfile — Docker 打包
- Given: 在项目根目录执行 `docker build -t agentic-service .`
- Expect: 构建退出码为 0，无错误
- Verify: `docker images` 列表中存在 agentic-service 镜像

## DBB-010: Docker 容器启动后服务可访问
- Requirement: install/docker-compose.yml — Docker 运行
- Given: 执行 `docker run -p 3000:3000 agentic-service`
- Expect: 容器启动后 `http://localhost:3000` 返回 HTTP 200
- Verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` 输出 200

## DBB-011: docker-compose 一键启动
- Requirement: install/docker-compose.yml
- Given: 执行 `docker-compose up`
- Expect: 服务正常启动，端口 3000 可访问
- Verify: `curl http://localhost:3000` 返回有效响应

## DBB-012: SIGINT 优雅退出
- Requirement: 边缘用例 — SIGINT 处理
- Given: 服务运行中，发送 SIGINT 信号（Ctrl+C）
- Expect: 进程在 5 秒内干净退出，无 unhandled rejection
- Verify: 退出码为 0 或 130，无错误堆栈输出

## DBB-013: 测试覆盖率 ≥ 98%
- Requirement: 边缘用例测试覆盖
- Given: 运行测试套件
- Expect: 覆盖率报告显示 >= 98%
- Verify: 测试命令输出覆盖率数值 >= 98%
