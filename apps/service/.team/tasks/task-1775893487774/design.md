# Task Design: ARCHITECTURE.md 清理 — 删除已移除文件引用

**Task:** task-1775893487774
**Module:** Documentation (cross-cutting)
**DBB Criteria:** DBB-010

## Overview

ARCHITECTURE.md contains stale references to files/components that no longer exist in the codebase. This task removes those references to bring documentation in sync with reality.

## Stale References to Remove (verified from architecture gap analysis)

1. **`runtime/memory.js`** — File was removed. ARCHITECTURE.md still lists it in:
   - Directory structure section (目录结构)
   - Runtime module API documentation (§2 Runtime)

2. **`ConfigPanel`** — Component removed from admin UI. ARCHITECTURE.md still lists it in:
   - Admin components list under `src/ui/admin/src/components/`

3. **`LocalModelsView` / `CloudModelsView`** — Replaced by unified `ModelsView.vue`. ARCHITECTURE.md still lists both in:
   - Admin views list under `src/ui/admin/src/views/`

## Implementation Plan

### Step 1: Remove `memory.js` from directory structure

In the 目录结构 section, delete the line:
```
    memory.js                  # 语义记忆 — add(text) + search(query, topK) 基于 store + embed
```

### Step 2: Remove `memory.js` API documentation

In the Runtime module section, remove the Memory subsection and its API docs.

### Step 3: Remove `ConfigPanel` from admin components

In the admin components list, remove:
```
        ConfigPanel.vue       (30 lines)  LLM/STT/TTS config editor
```

### Step 4: Replace `LocalModelsView` / `CloudModelsView` with `ModelsView`

In the admin views list, remove:
```
        LocalModelsView.vue   (308 lines) Local model browser
        CloudModelsView.vue   (276 lines) Cloud model browser
```

These are already replaced by `ModelsView.vue` which should already be listed.

## Verification

After changes, search ARCHITECTURE.md for: `memory.js`, `ConfigPanel`, `LocalModels`, `CloudModels` — none should be found.

## ⚠️ Notes

- This task is assigned to `architect` since ARCHITECTURE.md is architect-owned
- Tech lead cannot write to ARCHITECTURE.md directly
- No code changes needed — documentation only
