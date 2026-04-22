# Token Efficiency Guide — SRTPL Horizon

## Rules for every Claude session

### 1. One task per chat session
Never mix tasks. Each chat = one job:
- BAD: "fix fonts + fix n8n + build gallery page"
- GOOD: "fix fonts on RecFromMillPage" → finish → new chat for next task

### 2. CLAUDE.md is your memory — don't re-explain
Never paste background context. Just say:
- "Fix the S3 sales 400 error" — not the full error history
- "Build RecFromMillPage" — not what it should contain
CLAUDE.md already has all project context.

### 3. Prompt format that saves tokens
SHORT prompts work better:
- BAD: "I have a problem with the sync where sales bills are giving 400 error 
  and I think it might be related to the RLS policy we set up last week..."
- GOOD: "S3 sales 400 error — fix RLS on sales_bills table"

### 4. Never upload JSON files unless asked
n8n workflow JSONs = 15,000–25,000 tokens each.
Only upload when Claude specifically asks for it.

### 5. Never paste full sync logs
Only paste the failing line:
- BAD: paste all 200 lines of sync output
- GOOD: "S3_sales:FAIL status=500 — fix it"

### 6. Screenshots — use sparingly
Each image = 1,500–3,000 tokens.
Only share when showing a visual bug Claude cannot check via code.

### 7. Batch Supabase checks into one query
- BAD: 5 separate SQL queries one by one
- GOOD: one query with multiple SELECT subqueries

### 8. Run /compact in Claude Code when warned
When Claude Code says context is getting long, run /compact immediately.
This summarizes history and frees ~50% of context.

### 9. Use Claude Code for code tasks, Claude.ai chat for planning
- Claude Code: writing files, fixing bugs, committing
- Claude.ai chat: diagnosing problems, planning, reviewing data
Don't mix them — each has different token budgets.

### 10. End each session with a commit + CLAUDE.md update
Always finish with:
git add -A && git commit -m "..." && git push
This means next session starts clean with all work saved.

## Session starter template
Paste this at the start of each new Claude Code session:
"Working on SRTPL Horizon. Project context in CLAUDE.md.
Task: [ONE specific task]"

## What NOT to do
- Don't upload credentials files
- Don't paste entire error logs
- Don't share n8n JSONs unless asked
- Don't ask multiple unrelated questions in one message
- Don't let a session go >2 hours without /compact

## Token cost reference (approximate)
| Action | Tokens used |
|---|---|
| Loading CLAUDE.md | ~31,000 |
| Each SQL query + result | ~2,000–4,000 |
| Each screenshot | ~2,000 |
| Each n8n JSON upload | ~20,000 |
| Each sync log paste | ~5,000 |
| Each .jsx file read | ~3,000–8,000 |
| New fresh chat start | 0 (just CLAUDE.md) |
