# Milestone 1: Core Agentic Loop & Correctness

## Goal
Fix the broken multi-round tool loop, patch silent data loss in images return, and add system prompt support — making agentic-lite functionally correct per the vision spec.

## Scope
- Multi-round tool loop (up to MAX_TOOL_ROUNDS)
- images field returned correctly from tool-round path
- system prompt support in ask()
- Browser-compatible file and code tools

## Acceptance Criteria
- ask() continues tool rounds until stopReason !== tool_use
- AgenticResult.images is populated when tools return images
- ask() accepts optional systemPrompt parameter
- file tool uses agentic-filesystem (browser-compatible)
- code tool uses AsyncFunction (no Node-only deps)

## Tasks
- task-1775525637055: Fix multi-round agent loop
- task-1775525637091: Replace file tool with agentic-filesystem
- task-1775525637125: Replace code tool with browser-compatible impl
- task-1775525744093: Fix images field silent loss
- task-1775525748440: Add system prompt support
- task-1775525816399: Implement custom provider support (P0)
