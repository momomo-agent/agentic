# M14 DBB - Ollama自动安装 + 设备命令 + 硬件自适应 + README

## DBB-001: Ollama auto-install execution
- Requirement: setup.js auto-executes Ollama install
- Given: Ollama is not installed on the system
- Expect: setup.js prompts user for confirmation, then executes the install command (not just prints it)
- Verify: After setup.js completes, `ollama --version` returns successfully

## DBB-002: Ollama install skipped when present
- Requirement: setup.js auto-executes Ollama install
- Given: Ollama is already installed
- Expect: setup.js skips install step without error
- Verify: No install command is executed; setup proceeds normally

## DBB-003: Ollama install user prompt
- Requirement: setup.js auto-executes Ollama install with user prompt
- Given: Ollama is not installed, user declines the prompt
- Expect: setup.js exits gracefully with a message indicating Ollama is required
- Verify: Exit code non-zero, no install attempted

## DBB-004: hub.js speak command
- Requirement: hub.js sendCommand supports speak command type
- Given: A connected device receives a `speak` command with a text payload
- Expect: The command is routed to the target device without error
- Verify: Device receives the speak command; no "unsupported command" error in logs

## DBB-005: hub.js display command
- Requirement: hub.js sendCommand supports display command type
- Given: A connected device receives a `display` command with a content payload
- Expect: The command is routed to the target device without error
- Verify: Device receives the display command; no "unsupported command" error in logs

## DBB-006: hub.js capture command still works
- Requirement: hub.js sendCommand supports existing capture command type
- Given: A connected device receives a `capture` command
- Expect: Capture command is handled as before (no regression)
- Verify: Device receives the capture command successfully

## DBB-007: hub.js unknown command type
- Requirement: hub.js sendCommand handles invalid command types
- Given: sendCommand is called with an unknown command type (e.g., `fly`)
- Expect: Error is returned or logged; command is not silently dropped
- Verify: Error response or log entry indicates unsupported command type

## DBB-008: Hardware-adaptive model selection
- Requirement: llm.js uses optimizer output, not hardcoded model
- Given: System has detected hardware (e.g., Apple Silicon with 16GB RAM)
- Expect: llm.js selects a model based on optimizer profile, not a hardcoded value like `gemma4:26b`
- Verify: Different hardware profiles result in different model selections

## DBB-009: Optimizer profile drives model config
- Requirement: llm.js calls optimizer.getProfile(hardware)
- Given: optimizer returns a profile specifying a particular model
- Expect: llm.js uses that model for inference
- Verify: LLM requests use the model name from the optimizer profile

## DBB-010: README exists with install instructions
- Requirement: README.md at project root with install steps
- Given: User visits the project root
- Expect: README.md exists and contains npx, global install, and Docker install instructions
- Verify: File exists; contains `npx agentic-service`, `npm install -g`, and `docker` sections

## DBB-011: README contains REST API docs
- Requirement: README.md includes REST API endpoint documentation
- Given: README.md is read by a developer
- Expect: At least the primary API endpoints are documented (method, path, request/response format)
- Verify: README.md contains API endpoint section with at least one documented endpoint
