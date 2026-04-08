# Task Design: Final Gap Re-evaluation for Vision/PRD/DBB

## Goal
Run fresh evaluation of all gap files after Tasks 1-3 complete. Report Vision, PRD, DBB, and Architecture match scores. Target: Vision ≥90%, PRD ≥90%.

## Files to Read

- `.team/gaps/vision.json` — Vision feature completeness gaps
- `.team/gaps/prd.json` — PRD requirement coverage gaps
- `.team/gaps/dbb.json` — DBB compliance gaps
- `.team/gaps/architecture.json` — Architecture spec coverage gaps

## Algorithm

1. **Pre-condition check:** Verify tasks 1775612739548, 1775612739625, 1775612739836 are completed
   - If not, output blocked status with reason

2. **Read gap files:** Parse all 4 JSON files, extract `match` score and `gaps` array

3. **Calculate scores:**
   - For each gap file: `match = (count(status == "implemented") / total) * 100`
   - Round to nearest integer

4. **Report output:**

```markdown
## Gap Re-evaluation Results (post-M97)

Evaluated at: <ISO timestamp>
HEAD: <git commit hash>

| Metric       | Score | Target | Status |
|-------------|-------|--------|--------|
| Vision      | XX%   | ≥90%   | ✅/❌  |
| PRD         | XX%   | ≥90%   | ✅/❌  |
| Architecture| XX%   | ≥90%   | ✅/❌  |
| DBB         | XX%   | ≥90%   | ✅/❌  |

### Vision Gaps (if score <90%)
- [description] — [status]

### PRD Gaps (if score <90%)
- [description] — [status]
```

5. **If scores below target:** List each gap item that is NOT "implemented", with:
   - Gap description
   - Current status (partial/missing)
   - What's needed to close it (specific file or feature)

6. **Update gap files:** Update `match` scores in each JSON file to reflect current counts
   - Update `timestamp` to current ISO time
   - Do NOT change gap item statuses (Task 3 handles that)

## Output

Write results to task progress and output structured summary. If Vision <90% or PRD <90%, escalate remaining gaps as new tasks.

## Error Handling

- If gap file is malformed JSON: report error, skip that metric
- If blocking tasks not completed: output "blocked" status, list incomplete blockers
- If gap file missing: report error for that metric, continue with others

## Edge Cases

- All gaps already "implemented" → report 100% for all metrics
- Gap file has no gaps array → report 0%, flag as error
- Duplicate gap descriptions → count once, report warning
