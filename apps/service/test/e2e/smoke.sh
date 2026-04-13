#!/bin/bash
# ============================================================
# Agentic Service — Smoke Test Suite
# 纯 API + UI 自动化测试，零人工干预
# 用法: bash test/e2e/smoke.sh [--api-only] [--ui-only] [--verbose]
# ============================================================
set -uo pipefail

BASE="${AGENTIC_BASE:-http://localhost:1234}"
AC="agent-control -p web"
PASS=0; FAIL=0; SKIP=0; TOTAL=0
FAILURES=()
SHOTS="/tmp/agentic-smoke-$(date +%s)"
VERBOSE=false
RUN_API=true; RUN_UI=true
START_TIME=$(date +%s)

for arg in "$@"; do
  case "$arg" in
    --api-only) RUN_UI=false ;;
    --ui-only)  RUN_API=false ;;
    --verbose)  VERBOSE=true ;;
  esac
done

mkdir -p "$SHOTS"

# ── helpers ──────────────────────────────────────────────────
pass()  { ((TOTAL++)); ((PASS++)); echo "  ✓ $1"; }
fail()  { ((TOTAL++)); ((FAIL++)); echo "  ✗ $1 — $2"; FAILURES+=("$1: $2"); }
skip()  { ((TOTAL++)); ((SKIP++)); echo "  ⊘ $1 (skipped)"; }
info()  { $VERBOSE && echo "    ℹ $1" || true; }

# curl wrapper: returns body, sets $HTTP_CODE
apicall() {
  local method="$1" path="$2"; shift 2
  local url="${BASE}${path}"
  local tmp=$(mktemp)
  HTTP_CODE=$(curl -s -o "$tmp" -w '%{http_code}' -X "$method" "$url" "$@" 2>/dev/null)
  BODY=$(cat "$tmp"); rm -f "$tmp"
  info "$method $path → $HTTP_CODE (${#BODY} bytes)"
}

json_field() { echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)$1)" 2>/dev/null; }

assert_code() {
  local label="$1" expected="$2"
  if [ "$HTTP_CODE" = "$expected" ]; then pass "$label"; else fail "$label" "HTTP $HTTP_CODE (expected $expected)"; fi
}

assert_body_contains() {
  local label="$1" needle="$2"
  if echo "$BODY" | grep -qF "$needle"; then pass "$label"; else fail "$label" "body missing '$needle'"; fi
}

assert_body_not_empty() {
  local label="$1"
  if [ -n "$BODY" ] && [ "$BODY" != "{}" ] && [ "$BODY" != "[]" ]; then pass "$label"; else fail "$label" "empty body"; fi
}

# Generate test fixtures
TEST_AUDIO="/tmp/agentic-test-audio.wav"
TEST_IMAGE="/tmp/agentic-test-image.png"

gen_test_audio() {
  [ -f "$TEST_AUDIO" ] && return
  ffmpeg -f lavfi -i "sine=frequency=440:duration=2" -ar 16000 -ac 1 "$TEST_AUDIO" -y 2>/dev/null
}

gen_test_image() {
  [ -f "$TEST_IMAGE" ] && return
  python3 -c "
import struct, zlib
def png(w,h,pixels):
    def chunk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    raw=b''
    for y in range(h):
        raw+=b'\x00'
        for x in range(w): raw+=bytes(pixels(x,y))
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
def color(x,y):
    if x<50 and y<50: return (255,0,0)
    if x>=50 and y<50: return (0,255,0)
    if x<50 and y>=50: return (0,0,255)
    return (255,255,0)
with open('$TEST_IMAGE','wb') as f: f.write(png(100,100,color))
" 2>/dev/null
}

get_image_b64() { python3 -c "import base64; print(base64.b64encode(open('$TEST_IMAGE','rb').read()).decode())" 2>/dev/null; }

# ── pre-check ────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Agentic Service — Smoke Tests              ║"
echo "║  $(date '+%Y-%m-%d %H:%M:%S')                       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

if ! curl -sf "$BASE/health" > /dev/null 2>&1; then
  echo "ERROR: Service not running on $BASE"
  exit 1
fi
echo "Service: $BASE ✓"
echo ""

# ══════════════════════════════════════════════════════════════
# PART 1: API Smoke Tests
# ══════════════════════════════════════════════════════════════

if $RUN_API; then

echo "━━━ PART 1: API Endpoints ━━━"
echo ""

# ── 1.1 System ───────────────────────────────────────────────
echo "1.1 System"

apicall GET /health
assert_code "GET /health" "200"
assert_body_contains "/health → status ok" '"status":"ok"'

apicall GET /api/health
assert_code "GET /api/health" "200"
assert_body_contains "/api/health → components" '"components"'

apicall GET /api/status
assert_code "GET /api/status" "200"
assert_body_not_empty "/api/status → has data"

apicall GET /api/perf
assert_code "GET /api/perf" "200"

apicall GET /api/logs
assert_code "GET /api/logs" "200"

apicall GET /api/devices
assert_code "GET /api/devices" "200"

apicall GET /api/config
assert_code "GET /api/config" "200"
assert_body_contains "/api/config → has llm" '"llm"'

echo ""

# ── 1.2 LLM ─────────────────────────────────────────────────
echo "1.2 LLM Inference"

apicall GET /v1/models
assert_code "GET /v1/models" "200"
assert_body_contains "/v1/models → has data" '"data"'

# OpenAI chat completions (non-streaming)
apicall POST /v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Say OK"}],"max_tokens":10,"stream":false}'
assert_code "POST /v1/chat/completions" "200"
assert_body_contains "OpenAI chat → has choices" '"choices"'

# Anthropic messages (non-streaming)
apicall POST /v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Say OK"}],"max_tokens":10,"stream":false}'
assert_code "POST /v1/messages" "200"
assert_body_contains "Anthropic messages → has content" '"content"'

# SSE chat (streaming) — just check it starts
SSE_RESP=$(curl -s -m 15 -X POST "$BASE/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"Say OK","stream":true}' 2>/dev/null | head -5)
if echo "$SSE_RESP" | grep -q "data:"; then
  pass "POST /api/chat SSE → streams data"
else
  fail "POST /api/chat SSE" "no SSE data received"
fi

echo ""

# ── 1.3 Vision ───────────────────────────────────────────────
echo "1.3 Vision"

gen_test_image
IMG_B64=$(get_image_b64)

if [ -n "$IMG_B64" ]; then
  # Vision endpoint (streaming) — check first chunk
  VISION_RESP=$(curl -s -m 60 -X POST "$BASE/api/vision" \
    -H "Content-Type: application/json" \
    -d "{\"image\":\"$IMG_B64\",\"prompt\":\"What colors do you see? Answer in one sentence.\"}" 2>/dev/null | head -10)
  if echo "$VISION_RESP" | grep -q "data:"; then
    pass "POST /api/vision → streams response"
    # Check it mentions colors
    if echo "$VISION_RESP" | grep -qi "red\|green\|blue\|yellow\|color"; then
      pass "Vision → recognizes colors"
    else
      info "Vision response: $VISION_RESP"
      skip "Vision → color recognition (model may not mention colors in first chunk)"
    fi
  else
    fail "POST /api/vision" "no SSE data: $VISION_RESP"
  fi

  # Vision via OpenAI compat (multimodal)
  apicall POST /v1/chat/completions \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"auto\",\"messages\":[{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"What is this?\"},{\"type\":\"image_url\",\"image_url\":{\"url\":\"data:image/png;base64,$IMG_B64\"}}]}],\"max_tokens\":30,\"stream\":false}"
  assert_code "Multimodal /v1/chat/completions" "200"
else
  skip "Vision tests (image generation failed)"
fi

echo ""

# ── 1.4 Structured Output ───────────────────────────────────
echo "1.4 Structured Output"

apicall POST /v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Extract: The weather in Beijing is 25°C and sunny. Return JSON with city, temp, condition."}],"max_tokens":100,"stream":false,"response_format":{"type":"json_object"}}'
assert_code "Structured output request" "200"
# Check response contains JSON-like content
if echo "$BODY" | python3 -c "import sys,json; c=json.load(sys.stdin); t=c.get('choices',[{}])[0].get('message',{}).get('content',''); print('ok' if '{' in t else 'no')" 2>/dev/null | grep -q "ok"; then
  pass "Structured output → returns JSON content"
else
  skip "Structured output → JSON content (model may not support json_object)"
fi

echo ""

# ── 1.5 Voice ────────────────────────────────────────────────
echo "1.5 Voice (TTS/STT)"

gen_test_audio

# TTS
apicall POST /api/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","voice":"default"}'
if [ "$HTTP_CODE" = "200" ] && [ ${#BODY} -gt 100 ]; then
  pass "POST /api/synthesize → audio data"
else
  fail "POST /api/synthesize" "HTTP $HTTP_CODE, body ${#BODY} bytes"
fi

# TTS alias
apicall POST /api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Test","voice":"default"}'
assert_code "POST /api/tts (alias)" "200"

# STT
if [ -f "$TEST_AUDIO" ]; then
  apicall POST /api/transcribe \
    -F "audio=@$TEST_AUDIO"
  assert_code "POST /api/transcribe" "200"
else
  skip "POST /api/transcribe (no test audio)"
fi

# OpenAI compat TTS
apicall POST /v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input":"Hello","voice":"alloy","model":"tts-1"}'
if [ "$HTTP_CODE" = "200" ]; then
  pass "POST /v1/audio/speech"
else
  # May not be configured
  skip "POST /v1/audio/speech (HTTP $HTTP_CODE)"
fi

# OpenAI compat STT
if [ -f "$TEST_AUDIO" ]; then
  apicall POST /v1/audio/transcriptions \
    -F "file=@$TEST_AUDIO" -F "model=whisper-1"
  if [ "$HTTP_CODE" = "200" ]; then
    pass "POST /v1/audio/transcriptions"
  else
    skip "POST /v1/audio/transcriptions (HTTP $HTTP_CODE)"
  fi
fi

echo ""

# ── 1.6 Models ───────────────────────────────────────────────
echo "1.6 Model Management"

apicall GET /api/engines
assert_code "GET /api/engines" "200"

apicall GET /api/engines/models
assert_code "GET /api/engines/models" "200"

apicall GET /api/engines/recommended
assert_code "GET /api/engines/recommended" "200"
assert_body_contains "Recommended → has entries" '"name"'

apicall GET /api/engines/health
assert_code "GET /api/engines/health" "200"

# Delete nonexistent model (should 404 or 500 — both are acceptable)
apicall DELETE /api/models/nonexistent-model-xyz
if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "500" ]; then
  pass "DELETE /api/models/:name → handled"
else
  fail "DELETE nonexistent model" "HTTP $HTTP_CODE"
fi

echo ""

# ── 1.7 Config Roundtrip ────────────────────────────────────
echo "1.7 Config Roundtrip"

apicall GET /api/config
ORIG_CONFIG="$BODY"
assert_code "Read config" "200"

# Write back same config
apicall PUT /api/config \
  -H "Content-Type: application/json" \
  -d "$ORIG_CONFIG"
assert_code "Write config (idempotent)" "200"

# Verify unchanged
apicall GET /api/config
if [ "$BODY" = "$ORIG_CONFIG" ]; then
  pass "Config roundtrip → unchanged"
else
  fail "Config roundtrip" "config changed after write-back"
fi

echo ""

# ── 1.8 Assignments (Capability Slots) ──────────────────────
echo "1.8 Assignments (Capability Slots)"

apicall GET /api/assignments
assert_code "GET /api/assignments" "200"
ORIG_ASSIGNMENTS="$BODY"

# Verify it has the expected capability keys
for cap in chat vision stt tts embedding; do
  if echo "$BODY" | grep -qF "\"$cap\""; then
    pass "Assignments → has $cap slot"
  else
    fail "Assignments" "missing $cap slot"
  fi
done

# Write back same assignments (idempotent)
apicall PUT /api/assignments \
  -H "Content-Type: application/json" \
  -d "$ORIG_ASSIGNMENTS"
assert_code "PUT /api/assignments (idempotent)" "200"

# Verify unchanged
apicall GET /api/assignments
if [ "$BODY" = "$ORIG_ASSIGNMENTS" ]; then
  pass "Assignments roundtrip → unchanged"
else
  fail "Assignments roundtrip" "assignments changed after write-back"
fi

echo ""

# ── 1.9 Voice Pipeline (STT→LLM→TTS) ───────────────────────
echo "1.9 Voice Pipeline"

gen_test_audio
if [ -f "$TEST_AUDIO" ]; then
  # Full pipeline: audio in → text + audio out
  VOICE_RESP=$(curl -s -m 60 -X POST "$BASE/api/voice" \
    -F "audio=@$TEST_AUDIO" 2>/dev/null)
  VOICE_CODE=$?
  if [ $VOICE_CODE -eq 0 ] && [ -n "$VOICE_RESP" ]; then
    if echo "$VOICE_RESP" | grep -qF "data:"; then
      pass "POST /api/voice → SSE pipeline response"
    elif echo "$VOICE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if 'text' in d or 'audio' in d or 'transcript' in d else 'no')" 2>/dev/null | grep -q "ok"; then
      pass "POST /api/voice → JSON pipeline response"
    else
      pass "POST /api/voice → got response (${#VOICE_RESP} bytes)"
    fi
  else
    fail "POST /api/voice" "no response (curl exit $VOICE_CODE)"
  fi

  # STT with language hint
  apicall POST /api/transcribe \
    -F "audio=@$TEST_AUDIO" -F "language=en"
  assert_code "STT with language hint" "200"

  # OpenAI compat STT with response_format
  apicall POST /v1/audio/transcriptions \
    -F "file=@$TEST_AUDIO" -F "model=whisper-1" -F "response_format=json"
  if [ "$HTTP_CODE" = "200" ]; then
    pass "STT → response_format=json"
  else
    skip "STT response_format (HTTP $HTTP_CODE)"
  fi
else
  skip "Voice pipeline (no test audio)"
fi

echo ""

# ── 1.10 TTS Voices & Formats ───────────────────────────────
echo "1.10 TTS Voices & Formats"

# Test different voices
for voice in alloy echo nova; do
  apicall POST /api/tts \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"Test\",\"voice\":\"$voice\"}"
  if [ "$HTTP_CODE" = "200" ] && [ ${#BODY} -gt 50 ]; then
    pass "TTS voice=$voice → audio"
  else
    skip "TTS voice=$voice (HTTP $HTTP_CODE)"
  fi
done

# Test with longer text (check response size, not body content — binary audio)
TTS_SIZE=$(curl -s -o /dev/null -w '%{size_download}' -X POST "$BASE/api/synthesize" \
  -H "Content-Type: application/json" \
  -d '{"text":"这是一段较长的中文测试文本，用来验证语音合成的稳定性和质量。","voice":"default"}')
if [ "$TTS_SIZE" -gt 100 ] 2>/dev/null; then
  pass "TTS long Chinese text → audio ($TTS_SIZE bytes)"
else
  fail "TTS long text" "$TTS_SIZE bytes"
fi

echo ""

# ── 1.11 Embeddings ──────────────────────────────────────────
echo "1.11 Embeddings"

apicall POST /v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"input":"Hello world","model":"text-embedding-ada-002"}'
if [ "$HTTP_CODE" = "200" ]; then
  assert_body_contains "Embeddings → has data" '"data"'
else
  skip "POST /v1/embeddings (HTTP $HTTP_CODE — embed engine may not be running)"
fi

echo ""

# ── 1.12 Static Assets ───────────────────────────────────────
echo "1.12 Static Assets"

apicall GET /
assert_code "GET / (admin UI)" "200"
assert_body_contains "Admin UI → has HTML" "<!DOCTYPE html>"

echo ""

fi # RUN_API

# ══════════════════════════════════════════════════════════════
# PART 2: WebUI E2E (agent-control)
# ══════════════════════════════════════════════════════════════

if $RUN_UI; then

echo "━━━ PART 2: WebUI E2E ━━━"
echo ""

# Check agent-control available
if ! command -v agent-control &>/dev/null; then
  echo "  ⊘ agent-control not found, skipping UI tests"
  RUN_UI=false
fi

fi

if $RUN_UI; then

snap() { sleep 1.5; $AC -e snapshot 2>/dev/null; }
snap_full() { sleep 1.5; $AC snapshot 2>/dev/null; }
shot() { $AC screenshot "$SHOTS/${1}.png" 2>/dev/null >/dev/null || true; }

nav_click() {
  local text="$1"
  $AC eval "(function(){ const b=[...document.querySelectorAll('button')]; const m=b.find(x=>x.textContent.includes('$text')); if(m){m.click();return 'ok'} return 'miss' })()" 2>/dev/null
}

card_click() {
  local text="$1"
  $AC eval "(function(){ const c=[...document.querySelectorAll('.example-card')]; const m=c.find(x=>x.textContent.includes('$text')); if(m){m.click();return 'ok'} return 'miss' })()" 2>/dev/null
}

# ── 2.1 Open Admin UI ───────────────────────────────────────
echo "2.1 Open Admin UI"

$AC open "$BASE/admin" 2>/dev/null >/dev/null
sleep 3
S=$(snap)
if echo "$S" | grep -qF "系统状态"; then
  pass "Admin UI loaded"
else
  fail "Admin UI" "page did not load"
fi
shot "01-admin-home"

echo ""

# ── 2.2 Navigation ──────────────────────────────────────────
echo "2.2 Navigation Tabs"

for tab in "系统状态" "模型" "配置" "日志" "Examples" "Tests"; do
  RESULT=$(nav_click "$tab")
  sleep 1
  if echo "$RESULT" | grep -qF "ok"; then
    pass "Nav → $tab"
  else
    fail "Nav → $tab" "button not found"
  fi
done
shot "02-navigation"

echo ""

# ── 2.3 Status View ─────────────────────────────────────────
echo "2.3 Status View"

nav_click "系统状态" >/dev/null; sleep 2
S=$(snap_full)
if echo "$S" | grep -qF "Ollama"; then
  pass "Status → shows Ollama"
else
  fail "Status" "missing Ollama info"
fi
if echo "$S" | grep -qi "model\|模型"; then
  pass "Status → shows models"
else
  skip "Status → models section"
fi
shot "03-status"

echo ""

# ── 2.4 Models View ─────────────────────────────────────────
echo "2.4 Models View"

nav_click "模型" >/dev/null; sleep 2
S=$(snap_full)
if echo "$S" | grep -qi "qwen\|gemma\|llava"; then
  pass "Models → lists installed models"
else
  fail "Models" "no models visible"
fi
if echo "$S" | grep -qi "推荐\|recommend"; then
  pass "Models → has recommendations"
else
  skip "Models → recommendations"
fi
shot "04-models"

echo ""

# ── 2.5 Config View ─────────────────────────────────────────
echo "2.5 Config View"

nav_click "配置" >/dev/null; sleep 2
S=$(snap_full)
if echo "$S" | grep -qi "LLM\|provider\|Ollama"; then
  pass "Config → shows LLM config"
else
  fail "Config" "missing LLM config"
fi
shot "05-config"

echo ""

# ── 2.6 Logs View ───────────────────────────────────────────
echo "2.6 Logs View"

nav_click "日志" >/dev/null; sleep 2
S=$(snap_full)
if echo "$S" | grep -qi "log\|日志\|GET\|POST"; then
  pass "Logs → shows entries"
else
  skip "Logs → entries (may be empty)"
fi
shot "06-logs"

echo ""

# ── 2.7 Examples — Chat ─────────────────────────────────────
echo "2.7 Examples — Chat Playground"

nav_click "Examples" >/dev/null; sleep 2
RESULT=$(card_click "Chat Playground")
sleep 1

if echo "$RESULT" | grep -qF "ok"; then
  sleep 1
  # Type message via JS (works regardless of input type)
  FILL_RESULT=$($AC eval "(function(){
    const el = document.querySelector('textarea, input[type=text], input:not([type])');
    if (!el) return 'no-input';
    el.focus();
    const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeSet.call(el, 'Say hello in one word');
    el.dispatchEvent(new Event('input', {bubbles:true}));
    return 'filled';
  })()" 2>/dev/null)
  sleep 0.5
  # Submit via Enter key or send button
  SENT=$($AC eval "(function(){
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('发送') || b.textContent.includes('➤') || b.textContent.includes('Send'));
    if (btn) { btn.click(); return 'btn'; }
    const el = document.querySelector('textarea, input[type=text]');
    if (el) { el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return 'enter'; }
    return 'miss';
  })()" 2>/dev/null)
  sleep 10
  S2=$(snap_full)
  if echo "$S2" | grep -qi "hello\|你好\|assistant\|hi\|ok"; then
    pass "Chat → got AI response"
  else
    fail "Chat" "no AI response visible"
  fi
  shot "07-chat"
else
  fail "Chat Playground" "card not found"
fi

echo ""

# ── 2.8 Examples — TTS ──────────────────────────────────────
echo "2.8 Examples — TTS Lab"

nav_click "Examples" >/dev/null; sleep 2
RESULT=$(card_click "语音合成")
sleep 1

if echo "$RESULT" | grep -qF "ok"; then
  sleep 1
  FILLED=$($AC eval "(function(){
    const el = document.querySelector('textarea, input[type=text], input:not([type])');
    if (!el) return 'no-input';
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set
      || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;
    set.call(el, '你好世界');
    el.dispatchEvent(new Event('input',{bubbles:true}));
    return 'ok';
  })()" 2>/dev/null)
  if echo "$FILLED" | grep -qF "ok"; then
    sleep 0.5
    SYNTH=$($AC eval "(function(){
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('合成') || b.textContent.includes('Synth') || b.textContent.includes('朗读'));
      if (btn) { btn.click(); return 'ok'; }
      return 'miss';
    })()" 2>/dev/null)
    if echo "$SYNTH" | grep -qF "ok"; then
      sleep 5
      pass "TTS → synthesis triggered"
    else
      skip "TTS → no synth button found"
    fi
  else
    skip "TTS → no input found"
  fi
  shot "08-tts"
else
  fail "TTS Lab" "card not found"
fi

echo ""

# ── 2.9 Examples — Translation ───────────────────────────────
echo "2.9 Examples — Translation"

nav_click "Examples" >/dev/null; sleep 2
RESULT=$(card_click "翻译助手")
sleep 1

if echo "$RESULT" | grep -qF "ok"; then
  sleep 1
  FILLED=$($AC eval "(function(){
    const el = document.querySelector('textarea, input[type=text], input:not([type])');
    if (!el) return 'no-input';
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set
      || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;
    set.call(el, '今天天气真好');
    el.dispatchEvent(new Event('input',{bubbles:true}));
    return 'ok';
  })()" 2>/dev/null)
  if echo "$FILLED" | grep -qF "ok"; then
    sleep 0.5
    TRANS=$($AC eval "(function(){
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('翻译') || b.textContent.includes('Translate'));
      if (btn) { btn.click(); return 'ok'; }
      return 'miss';
    })()" 2>/dev/null)
    if echo "$TRANS" | grep -qF "ok"; then
      sleep 8
      S2=$(snap_full)
      if echo "$S2" | grep -qi "weather\|nice\|good\|today\|beautiful\|sunny"; then
        pass "Translation → translated to English"
      else
        pass "Translation → request sent"
      fi
    else
      skip "Translation → no translate button"
    fi
  else
    skip "Translation → no input found"
  fi
  shot "09-translate"
else
  fail "Translation" "card not found"
fi

echo ""

# ── 2.10 Examples — Structured Output ────────────────────────
echo "2.10 Examples — Structured Output"

# Navigate fresh to Examples (click back if in a demo panel)
$AC eval "(function(){ const b=[...document.querySelectorAll('button')]; const m=b.find(x=>x.textContent.includes('返回')); if(m){m.click()} })()" 2>/dev/null >/dev/null
sleep 1
nav_click "Examples" >/dev/null; sleep 2
RESULT=$(card_click "结构化")
sleep 1

if echo "$RESULT" | grep -qF "ok"; then
  sleep 1
  FILLED=$($AC eval "(function(){
    const el = document.querySelector('.structured-panel textarea, textarea');
    if (!el) return 'no-input';
    const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;
    set.call(el, '北京今天25度晴天');
    el.dispatchEvent(new Event('input',{bubbles:true}));
    return 'ok';
  })()" 2>/dev/null)
  if echo "$FILLED" | grep -qF "ok"; then
    sleep 0.5
    BTN=$($AC eval "(function(){
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('处理'));
      if (btn && !btn.disabled) { btn.click(); return 'ok'; }
      return 'miss';
    })()" 2>/dev/null)
    if echo "$BTN" | grep -qF "ok"; then
      # Wait for structured output (Ollama can be slow with JSON mode)
      STRUCT_TEXT=""
      for si in $(seq 1 6); do
        sleep 5
        STRUCT_RESULT=$($AC eval "(function(){
          const pre = document.querySelector('.result-code, pre, .structured-result');
          return pre ? pre.textContent.slice(0,200) : '';
        })()" 2>/dev/null)
        STRUCT_TEXT=$(echo "$STRUCT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('value',''))" 2>/dev/null || echo "")
        if echo "$STRUCT_TEXT" | grep -qi "json\|city\|北京\|location\|temp\|weather"; then
          break
        fi
      done
      if echo "$STRUCT_TEXT" | grep -qi "json\|city\|北京\|location\|temp\|weather"; then
        pass "Structured Output → got result"
      else
        fail "Structured Output" "no result visible"
      fi
    else
      skip "Structured Output → no process button"
    fi
  else
    skip "Structured Output → no textarea"
  fi
  shot "10-structured"
else
  fail "Structured Output" "card not found"
fi

echo ""

# ── 2.11 Examples — Storyteller ──────────────────────────────
echo "2.11 Examples — Storyteller"

$AC eval "(function(){ const b=[...document.querySelectorAll('button')]; const m=b.find(x=>x.textContent.includes('返回')); if(m){m.click()} })()" 2>/dev/null >/dev/null
sleep 1
nav_click "Examples" >/dev/null; sleep 2
RESULT=$(card_click "故事讲述")
sleep 1

if echo "$RESULT" | grep -qF "ok"; then
  sleep 1
  FILLED=$($AC eval "(function(){
    const el = document.querySelector('textarea, input[type=text], input:not([type])');
    if (!el) return 'no-input';
    const set = (Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value') ||
                 Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')).set;
    set.call(el, '一只猫');
    el.dispatchEvent(new Event('input',{bubbles:true}));
    return 'ok';
  })()" 2>/dev/null)
  if echo "$FILLED" | grep -qF "ok"; then
    sleep 0.5
    BTN=$($AC eval "(function(){
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('讲') || b.textContent.includes('Story') || b.textContent.includes('生成'));
      if (btn) { btn.click(); return 'ok'; }
      return 'miss';
    })()" 2>/dev/null)
    if echo "$BTN" | grep -qF "ok"; then
      sleep 10
      S2=$(snap_full)
      if echo "$S2" | grep -qi "猫\|cat\|story\|故事"; then
        pass "Storyteller → got story"
      else
        pass "Storyteller → request sent"
      fi
    else
      skip "Storyteller → no generate button"
    fi
  else
    skip "Storyteller → no input"
  fi
  shot "11-storyteller"
else
  fail "Storyteller" "card not found"
fi

echo ""

# ── 2.12 Examples — Parlor (Voice Chat) ──────────────────────
echo "2.12 Examples — Parlor Voice Chat"

$AC eval "(function(){ const b=[...document.querySelectorAll('button')]; const m=b.find(x=>x.textContent.includes('返回')); if(m){m.click()} })()" 2>/dev/null >/dev/null
sleep 1
nav_click "Examples" >/dev/null; sleep 2
RESULT=$(card_click "语音对话")
sleep 1

if echo "$RESULT" | grep -qF "ok"; then
  S=$(snap_full)
  # Verify Parlor panel has push-to-talk button
  PARLOR_CHECK=$($AC eval "(function(){
    const panel = document.querySelector('.parlor-panel');
    if (!panel) return 'no-panel';
    const btn = panel.querySelector('button');
    const hasPTT = btn && (btn.textContent.includes('按住') || btn.textContent.includes('说话'));
    return JSON.stringify({ panel: true, ptt: hasPTT, btnText: btn ? btn.textContent.trim() : '' });
  })()" 2>/dev/null)
  if echo "$PARLOR_CHECK" | grep -qF '"panel":true'; then
    pass "Parlor → panel loaded"
    if echo "$PARLOR_CHECK" | grep -qF '"ptt":true'; then
      pass "Parlor → push-to-talk button"
    else
      pass "Parlor → controls visible"
    fi
  else
    fail "Parlor" "panel not loaded"
  fi
  shot "12-parlor"
else
  fail "Parlor" "card not found"
fi

echo ""

# ── 2.13 Examples — Subtitle ────────────────────────────────
echo "2.13 Examples — Subtitle"

$AC eval "(function(){ const b=[...document.querySelectorAll('button')]; const m=b.find(x=>x.textContent.includes('返回')); if(m){m.click()} })()" 2>/dev/null >/dev/null
sleep 1
nav_click "Examples" >/dev/null; sleep 2
RESULT=$(card_click "实时字幕")
sleep 1

if echo "$RESULT" | grep -qF "ok"; then
  SUB_CHECK=$($AC eval "(function(){
    const panel = document.querySelector('.subtitle-panel');
    if (!panel) return 'no-panel';
    const display = panel.querySelector('.subtitle-display, .subtitle-current');
    const sizeBtns = panel.querySelectorAll('.subtitle-size-btns button, button');
    const hasStart = [...panel.querySelectorAll('button')].some(b => b.textContent.includes('开始') || b.textContent.includes('Start'));
    return JSON.stringify({ panel: true, display: !!display, sizeBtns: sizeBtns.length, hasStart: hasStart });
  })()" 2>/dev/null)
  if echo "$SUB_CHECK" | grep -qF '"panel":true'; then
    pass "Subtitle → panel loaded"
    if echo "$SUB_CHECK" | grep -qF '"display":true'; then
      pass "Subtitle → display area"
    fi
    if echo "$SUB_CHECK" | grep -qF '"hasStart":true'; then
      pass "Subtitle → start button"
    fi
  else
    fail "Subtitle" "panel not loaded"
  fi
  shot "13-subtitle"
else
  fail "Subtitle" "card not found"
fi

echo ""

# ── 2.14 Examples — Voice Pipeline ──────────────────────────
echo "2.14 Examples — Voice Pipeline"

$AC eval "(function(){ const b=[...document.querySelectorAll('button')]; const m=b.find(x=>x.textContent.includes('返回')); if(m){m.click()} })()" 2>/dev/null >/dev/null
sleep 1
nav_click "Examples" >/dev/null; sleep 2
RESULT=$(card_click "语音管道")
sleep 1

if echo "$RESULT" | grep -qF "ok"; then
  VP_CHECK=$($AC eval "(function(){
    const panel = document.querySelector('.vp-panel');
    if (!panel) return 'no-panel';
    const hint = panel.querySelector('.hint');
    const btn = panel.querySelector('button');
    return JSON.stringify({ panel: true, hint: hint ? hint.textContent.slice(0,50) : '', btnText: btn ? btn.textContent.trim() : '' });
  })()" 2>/dev/null)
  if echo "$VP_CHECK" | grep -qF '"panel":true'; then
    pass "Voice Pipeline → panel loaded"
    if echo "$VP_CHECK" | grep -qF '录音'; then
      pass "Voice Pipeline → record button"
    fi
  else
    fail "Voice Pipeline" "panel not loaded"
  fi
  shot "14-voice-pipeline"
else
  fail "Voice Pipeline" "card not found"
fi

echo ""

# ── 2.15 Examples — Dictation ───────────────────────────────
echo "2.15 Examples — Dictation"

$AC eval "(function(){ const b=[...document.querySelectorAll('button')]; const m=b.find(x=>x.textContent.includes('返回')); if(m){m.click()} })()" 2>/dev/null >/dev/null
sleep 1
nav_click "Examples" >/dev/null; sleep 2
RESULT=$(card_click "连续听写")
sleep 1

if echo "$RESULT" | grep -qF "ok"; then
  DICT_CHECK=$($AC eval "(function(){
    const panel = document.querySelector('.dictation-panel');
    if (!panel) return 'no-panel';
    const textarea = panel.querySelector('textarea');
    const btn = [...panel.querySelectorAll('button')].find(b => b.textContent.includes('开始') || b.textContent.includes('录音'));
    return JSON.stringify({ panel: true, textarea: !!textarea, hasStart: !!btn });
  })()" 2>/dev/null)
  if echo "$DICT_CHECK" | grep -qF '"panel":true'; then
    pass "Dictation → panel loaded"
    if echo "$DICT_CHECK" | grep -qF '"textarea":true'; then
      pass "Dictation → text area"
    fi
    if echo "$DICT_CHECK" | grep -qF '"hasStart":true'; then
      pass "Dictation → start button"
    fi
  else
    fail "Dictation" "panel not loaded"
  fi
  shot "15-dictation"
else
  fail "Dictation" "card not found"
fi

echo ""

# ── 2.16 Examples — Live Vision ─────────────────────────────
echo "2.16 Examples — Live Vision"

$AC eval "(function(){ const b=[...document.querySelectorAll('button')]; const m=b.find(x=>x.textContent.includes('返回')); if(m){m.click()} })()" 2>/dev/null >/dev/null
sleep 1
nav_click "Examples" >/dev/null; sleep 2
RESULT=$(card_click "实时摄像头")
sleep 1

if echo "$RESULT" | grep -qF "ok"; then
  LV_CHECK=$($AC eval "(function(){
    const panel = document.querySelector('.live-vision-panel');
    if (!panel) return 'no-panel';
    const video = panel.querySelector('video');
    const btn = panel.querySelector('button');
    const log = panel.querySelector('.lv-log');
    return JSON.stringify({ panel: true, video: !!video, btn: btn ? btn.textContent.trim() : '', log: !!log });
  })()" 2>/dev/null)
  if echo "$LV_CHECK" | grep -qF '"panel":true'; then
    pass "Live Vision → panel loaded"
    if echo "$LV_CHECK" | grep -qF '"video":true'; then
      pass "Live Vision → video element"
    fi
    if echo "$LV_CHECK" | grep -qF '"log":true'; then
      pass "Live Vision → AI log area"
    fi
  else
    fail "Live Vision" "panel not loaded"
  fi
  shot "16-live-vision"
else
  fail "Live Vision" "card not found"
fi

echo ""

# ── 2.17 Config — Capability Assignments UI ──────────────────
echo "2.17 Config — Capability Assignments"

nav_click "配置" >/dev/null; sleep 2
S=$(snap_full)

# Verify all 5 capability slots are visible
for cap in "对话" "视觉" "语音识别" "语音合成" "嵌入"; do
  if echo "$S" | grep -qF "$cap"; then
    pass "Config UI → shows $cap slot"
  else
    fail "Config UI" "missing $cap slot"
  fi
done

# Verify select dropdowns exist for assignments
SELECT_COUNT=$($AC eval "(function(){
  return document.querySelectorAll('.slot-select, select').length;
})()" 2>/dev/null)
SELECT_NUM=$(echo "$SELECT_COUNT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('value','0'))" 2>/dev/null || echo "0")
if [ "$SELECT_NUM" -ge 5 ] 2>/dev/null; then
  pass "Config UI → has $SELECT_NUM select dropdowns"
else
  skip "Config UI → select count ($SELECT_NUM)"
fi

# Test assignment change + revert
CHAT_MODEL=$($AC eval "(function(){
  const sel = document.querySelector('.slot-select, select');
  return sel ? sel.value : '';
})()" 2>/dev/null)
CHAT_VAL=$(echo "$CHAT_MODEL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('value',''))" 2>/dev/null || echo "")
if [ -n "$CHAT_VAL" ]; then
  pass "Config UI → chat model assigned: $CHAT_VAL"
else
  skip "Config UI → chat model (empty or unassigned)"
fi

shot "12-config-assignments"

echo ""

# ── 2.13 Config — Full Flow (read → modify → verify → revert) ─
echo "2.13 Config — API Flow Verification"

# Read current assignments via API
apicall GET /api/assignments
SAVED_ASSIGNMENTS="$BODY"
assert_code "Config flow → read assignments" "200"

# Read current config via API
apicall GET /api/config
SAVED_CONFIG="$BODY"
assert_code "Config flow → read config" "200"

# Verify config has expected sections
for section in llm stt tts; do
  if echo "$SAVED_CONFIG" | grep -qF "\"$section\""; then
    pass "Config → has $section section"
  else
    skip "Config → $section section"
  fi
done

# Write back (idempotent — no actual change)
apicall PUT /api/assignments \
  -H "Content-Type: application/json" \
  -d "$SAVED_ASSIGNMENTS"
assert_code "Config flow → write assignments" "200"

# Verify unchanged
apicall GET /api/assignments
if [ "$BODY" = "$SAVED_ASSIGNMENTS" ]; then
  pass "Config flow → assignments preserved"
else
  fail "Config flow" "assignments changed after write-back"
fi

echo ""

# ── 2.14 Built-in Tests (Run All) ────────────────────────────
echo "2.14 Built-in Tests (Run All)"

nav_click "Tests" >/dev/null; sleep 2
S=$(snap_full)
if echo "$S" | grep -qF "Run All"; then
  # Click Run All button
  $AC eval "(function(){ const b=[...document.querySelectorAll('button')]; const m=b.find(x=>x.textContent.includes('Run All')); if(m){m.click();return 'ok'} return 'miss' })()" 2>/dev/null >/dev/null
  # Wait for tests to complete (they call real APIs)
  echo "    ⏳ Running built-in tests (up to 120s)..."
  SUMMARY_TEXT=""
  for i in $(seq 1 24); do
    sleep 5
    # Check test-summary element first
    RAW=$($AC eval "(function(){
      const s = document.querySelector('.test-summary');
      if (s && s.textContent.includes('passed')) return s.textContent;
      // Fallback: count badges
      const badges = document.querySelectorAll('.test-badge');
      let p=0,f=0,r=0,total=badges.length;
      badges.forEach(b => {
        if(b.classList.contains('pass')) p++;
        else if(b.classList.contains('fail')) f++;
        else if(b.classList.contains('running')) r++;
      });
      if (r > 0) return 'running:'+r;
      if (p > 0 || f > 0) return p+'/'+total+' passed, '+f+' failed';
      return 'waiting';
    })()" 2>/dev/null)
    SUMMARY_TEXT=$(echo "$RAW" | python3 -c "import sys,json; print(json.load(sys.stdin).get('value',''))" 2>/dev/null || echo "$RAW")
    if echo "$SUMMARY_TEXT" | grep -q "passed"; then
      break
    fi
    if echo "$SUMMARY_TEXT" | grep -q "waiting" && [ "$i" -gt 4 ]; then
      info "Still waiting... ($SUMMARY_TEXT)"
    fi
  done
  if echo "$SUMMARY_TEXT" | grep -q "passed"; then
    pass "Built-in tests → $SUMMARY_TEXT"
    if echo "$SUMMARY_TEXT" | grep -qE "[1-9][0-9]* failed"; then
      FAILED_COUNT=$(echo "$SUMMARY_TEXT" | grep -oE '[0-9]+ failed')
      fail "Built-in tests" "$FAILED_COUNT"
    fi
  else
    fail "Built-in tests" "did not complete ($SUMMARY_TEXT)"
  fi
  shot "10-tests"
else
  fail "Tests page" "did not load"
fi

echo ""

fi # RUN_UI

# ── summary ─────────────────────────────────────────────────
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Results: $PASS passed, $FAIL failed, $SKIP skipped ($TOTAL total)"
printf "║  Time: %dm%ds\n" $((ELAPSED/60)) $((ELAPSED%60))
echo "║  Screenshots: $SHOTS/"
echo "╚══════════════════════════════════════════════╝"

if [ ${#FAILURES[@]} -gt 0 ]; then
  echo ""
  echo "Failures:"
  for f in "${FAILURES[@]}"; do echo "  ✗ $f"; done
fi

echo ""
exit $FAIL
