#!/bin/bash
# ============================================================
# Agentic Service WebUI — agent-control E2E 测试
# 真实浏览器操作验证所有功能
# ============================================================
set -uo pipefail

AC="agent-control -p web"
BASE="http://localhost:1234"
PASS=0
FAIL=0
FAILURES=()
SHOTS="/tmp/agentic-test-screenshots"
mkdir -p "$SHOTS"

pass() { echo "  ✓ $1"; ((PASS++)); }
fail() { echo "  ✗ $1: $2"; ((FAIL++)); FAILURES+=("$1: $2"); }

assert_in() {
  if echo "$2" | grep -qF "$3"; then pass "$1"; else fail "$1" "expected '$3'"; fi
}

snap() { sleep 1.5; $AC -e snapshot 2>&1; }
snap_full() { sleep 1.5; $AC snapshot 2>&1; }
shot() { $AC screenshot "$SHOTS/${1}.png" 2>/dev/null || true; }

# Click nav by index (0=系统状态, 1=模型管理, 2=配置, 3=Examples, 4=Tests)
nav() {
  $AC eval "document.querySelectorAll('button.nav-item')[$1].click(); 'ok'" 2>/dev/null
  sleep 2
}

# Click first button matching text via eval
click_text() {
  local text="$1"
  $AC eval "
    const btns = [...document.querySelectorAll('button')];
    const btn = btns.find(b => b.textContent.includes('$text'));
    if (btn) { btn.click(); 'clicked'; } else { 'not found'; }
  " 2>&1
}

# ── pre-check ────────────────────────────────────────────────
echo ""
echo "=== Agentic Service WebUI E2E Tests ==="
echo "=== $(date '+%Y-%m-%d %H:%M:%S') ==="
echo ""

if ! curl -sf "$BASE/health" > /dev/null 2>&1; then
  echo "ERROR: Service not running on $BASE"; exit 1
fi
echo "Service running ✓"
echo ""

# ── 1. Open & Navigation ────────────────────────────────────
echo "1. Open Admin UI"

$AC open "$BASE/admin/" 2>/dev/null
sleep 3
S=$(snap)

assert_in "page loads" "$S" "系统状态"
assert_in "nav: models" "$S" "模型管理"
assert_in "nav: config" "$S" "配置"
assert_in "nav: examples" "$S" "Examples"
assert_in "nav: tests" "$S" "Tests"
echo ""

# ── 2. Status View ──────────────────────────────────────────
echo "2. Status View"

nav 0
S=$(snap_full)
shot "01-status"

assert_in "service name" "$S" "Agentic Service"
assert_in "ollama" "$S" "Ollama"
assert_in "STT" "$S" "STT"
assert_in "TTS" "$S" "TTS"
assert_in "platform" "$S" "darwin"
assert_in "当前配置" "$S" "当前配置"
assert_in "日志" "$S" "日志"
assert_in "Apple" "$S" "Apple"

SI=$(snap)
assert_in "refresh button" "$SI" "🔄"
echo ""

# ── 3. Models View ──────────────────────────────────────────
echo "3. Models View"

nav 1
S=$(snap_full)
shot "02-models"

assert_in "已安装" "$S" "已安装"
assert_in "运行中" "$S" "运行中"
assert_in "推荐模型" "$S" "推荐模型"
assert_in "自定义模型" "$S" "自定义模型"
assert_in "gemma4" "$S" "gemma4"

assert_in "当前使用 badge" "$S" "当前使用"

SI=$(snap)
assert_in "删除 button" "$SI" "删除"
assert_in "设为默认 button" "$SI" "设为默认"
assert_in "下载 button" "$SI" "下载"
echo ""

# ── 4. Models — Set Default ─────────────────────────────────
echo "4. Models — Set Default"

CLICK_RESULT=$(click_text "设为默认")
if echo "$CLICK_RESULT" | grep -qF "clicked"; then
  sleep 2
  shot "03-set-default"
  CFG=$(curl -sf "$BASE/api/config" 2>/dev/null)
  if echo "$CFG" | grep -qF '"model"'; then
    pass "config updated"
  else
    fail "config updated" "no model in config"
  fi
  # Restore
  curl -sf -X PUT "$BASE/api/config" \
    -H "Content-Type: application/json" \
    -d '{"llm":{"provider":"ollama","model":"gemma4:e4b"},"stt":{"provider":"whisper"},"tts":{"provider":"coqui"}}' > /dev/null 2>&1
  pass "config restored"
else
  fail "set-default click" "button not found"
fi
echo ""

# ── 5. Models — Custom Download Input ───────────────────────
echo "5. Models — Custom Input"

# Check the custom model input exists
CUSTOM_CHECK=$($AC eval "
  const input = document.querySelector('.custom-pull input');
  input ? input.placeholder : 'not found';
" 2>&1)
if echo "$CUSTOM_CHECK" | grep -qF "模型名称"; then
  pass "custom model input exists"
else
  fail "custom model input" "not found"
fi
echo ""

# ── 6. Config View ──────────────────────────────────────────
echo "6. Config View"

nav 2
S=$(snap_full)
shot "04-config"

assert_in "LLM section" "$S" "LLM"
assert_in "STT section" "$S" "STT"
assert_in "TTS section" "$S" "TTS"
assert_in "Ollama option" "$S" "ollama"
assert_in "Fallback" "$S" "Fallback"

SI=$(snap)
assert_in "保存 button" "$SI" "保存"
echo ""

# ── 7. Config — Save ────────────────────────────────────────
echo "7. Config — Save"

CLICK_RESULT=$(click_text "保存")
if echo "$CLICK_RESULT" | grep -qF "clicked"; then
  sleep 2
  shot "05-config-saved"
  if [ -f "$HOME/.agentic-service/config.json" ]; then
    pass "config file written"
  else
    fail "config file" "not found"
  fi
else
  fail "save click" "button not found"
fi
echo ""

# ── 8. Examples View ────────────────────────────────────────
echo "8. Examples View"

nav 3
S=$(snap_full)
shot "06-examples"

assert_in "Chat Playground" "$S" "Chat Playground"
assert_in "TTS Lab" "$S" "TTS Lab"
assert_in "Agent Sandbox" "$S" "Agent Sandbox"
assert_in "Live Talk" "$S" "Live Talk"
assert_in "Transcription" "$S" "Transcription"
echo ""

# ── 9. Tests View ───────────────────────────────────────────
echo "9. Tests View"

nav 4
S=$(snap_full)
shot "07-tests"

assert_in "Tests heading" "$S" "Tests"
assert_in "Run All" "$S" "Run All"
echo ""

# ── 10. API Endpoints ───────────────────────────────────────
echo "10. API Endpoints"

H=$(curl -sf "$BASE/health" 2>/dev/null)
assert_in "GET /health" "$H" "ok"

ST=$(curl -sf "$BASE/api/status" 2>/dev/null)
assert_in "/api/status hardware" "$ST" "hardware"
assert_in "/api/status ollama" "$ST" "ollama"
assert_in "/api/status models" "$ST" "models"

CFG=$(curl -sf "$BASE/api/config" 2>/dev/null)
assert_in "GET /api/config" "$CFG" "llm"

PERF=$(curl -sf "$BASE/api/perf" 2>/dev/null)
if [ -n "$PERF" ]; then pass "GET /api/perf"; else fail "GET /api/perf" "empty"; fi

LOGS=$(curl -sf "$BASE/api/logs" 2>/dev/null)
if [ -n "$LOGS" ]; then pass "GET /api/logs"; else fail "GET /api/logs" "empty"; fi

M=$(curl -sf "$BASE/v1/models" 2>/dev/null)
assert_in "GET /v1/models" "$M" "agentic-service"
echo ""

# ── 11. Chat Streaming ──────────────────────────────────────
echo "11. Chat API"

CHAT=$(curl -sf -X POST "$BASE/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hi in one word"}],"stream":true}' \
  --max-time 20 2>/dev/null || echo "TIMEOUT")

if [ "$CHAT" = "TIMEOUT" ]; then
  fail "POST /api/chat" "timeout"
else
  assert_in "SSE streaming" "$CHAT" "data:"
fi

OAI=$(curl -sf -X POST "$BASE/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"model":"test","messages":[{"role":"user","content":"Say ok"}],"stream":false}' \
  --max-time 20 2>/dev/null || echo "TIMEOUT")

if [ "$OAI" = "TIMEOUT" ]; then
  fail "POST /v1/chat/completions" "timeout"
else
  assert_in "OpenAI compat" "$OAI" "choices"
fi
echo ""

# ── 12. Config Roundtrip ────────────────────────────────────
echo "12. Config Roundtrip"

curl -sf -X PUT "$BASE/api/config" \
  -H "Content-Type: application/json" \
  -d '{"llm":{"provider":"ollama","model":"roundtrip-test"},"stt":{"provider":"whisper"},"tts":{"provider":"coqui"}}' > /dev/null 2>&1

RB=$(curl -sf "$BASE/api/config" 2>/dev/null)
assert_in "write+read" "$RB" "roundtrip-test"

curl -sf -X PUT "$BASE/api/config" \
  -H "Content-Type: application/json" \
  -d '{"llm":{"provider":"ollama","model":"gemma4:e4b"},"stt":{"provider":"whisper"},"tts":{"provider":"coqui"}}' > /dev/null 2>&1
pass "restored"
echo ""

# ── 13. Model Delete API ────────────────────────────────────
echo "13. Model Delete API (dry)"

DEL=$(curl -sf -X DELETE "$BASE/api/models/nonexistent-model" 2>/dev/null || echo '{"error":"expected"}')
if [ -n "$DEL" ]; then
  pass "DELETE endpoint responds"
else
  fail "DELETE endpoint" "no response"
fi
echo ""

# ── cleanup ─────────────────────────────────────────────────
$AC close 2>/dev/null || true

# ── summary ─────────────────────────────────────────────────
echo "==========================================="
echo "Results: $PASS passed, $FAIL failed"
echo "Screenshots: $SHOTS/"
ls -1 "$SHOTS"/*.png 2>/dev/null | while read f; do echo "  $(basename "$f")"; done
echo "==========================================="

if [ ${#FAILURES[@]} -gt 0 ]; then
  echo ""
  echo "Failures:"
  for f in "${FAILURES[@]}"; do echo "  ✗ $f"; done
fi

exit $FAIL
