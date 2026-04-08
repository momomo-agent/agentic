# M3: Storage Backends & Agent Tooling

## Goals
Implement missing storage backends, expose ShellFS as AI agent tool definitions, add directory tree API, and implement basic permissions.

## Scope
- Implement localStorage backend adapter
- Expose ShellFS commands (cat/head/tail/find) as AI agent tool definitions
- Provide a concrete EmbedBackend implementation
- Add formal recursive directory tree() API
- Implement basic file/directory permissions system

## Acceptance Criteria
- localStorage backend passes same tests as other backends
- ShellFS tool definitions exported and usable by AI agents
- At least one concrete EmbedBackend implementation provided
- tree() returns nested directory structure recursively
- Permissions enforced on get/set/delete operations

## Tasks
- Implement localStorage backend (P0, missing)
- Add ShellFS AI agent tool definitions (P1, partial)
- Implement concrete EmbedBackend (P1, partial)
- Implement directory tree API (P1, partial)
- Implement basic permissions system (P1, missing)
