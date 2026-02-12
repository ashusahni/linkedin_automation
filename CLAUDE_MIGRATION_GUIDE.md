# Migration Guide: OpenAI to Claude API

## Current Situation
Your `.env` file shows `OPENAI_API_KEY=sk-ant-api03-...` which is actually a **Claude API key** (Anthropic), not an OpenAI key. The code is currently trying to use this Claude key with the OpenAI SDK, which won't work.

## Changes Required

### 1. Install Anthropic SDK
```bash
cd backend
npm install @anthropic-ai/sdk
```

### 2. Update Environment Variables
Your `.env` already has the Claude key, but we need to rename it:

**Current (line 39):**
```env
ANTHROPIC_API_KEY=sk-ant-api03-placeholder-key
```

**Change to:**
```env
# AI Configuration
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-api03-placeholder-key
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

### 3. Update ai.service.js
The main file that needs changes is `backend/src/services/ai.service.js`

**Key Differences:**
- OpenAI uses `openai.chat.completions.create()`
- Claude uses `anthropic.messages.create()`
- Different message format and response structure
- Claude requires `max_tokens` (required parameter)
- Claude uses `system` parameter instead of system messages

### 4. API Comparison

#### OpenAI Format:
```javascript
const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 300
});
const message = response.choices[0].message.content;
```

#### Claude Format:
```javascript
const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8
});
const message = response.content[0].text;
```

### 5. Model Recommendations

**Claude Models (from best to most cost-effective):**
- `claude-3-5-sonnet-20241022` - Best performance, great for complex tasks (Recommended)
- `claude-3-haiku-20240307` - Fast and cost-effective, good for simple tasks
- `claude-3-opus-20240229` - Most capable, but expensive

**Comparison with OpenAI:**
- `gpt-4o-mini` (your current) ≈ `claude-3-haiku-20240307` (cost-effective)
- `gpt-4o` ≈ `claude-3-5-sonnet-20241022` (balanced)
- `gpt-4` ≈ `claude-3-opus-20240229` (premium)

### 6. Benefits of Claude
✅ Better at following instructions precisely
✅ Longer context window (200K tokens vs OpenAI's 128K)
✅ Better at structured output
✅ More natural, human-like responses
✅ Strong safety features
✅ Competitive pricing

### 7. Potential Issues to Watch
⚠️ Claude requires `max_tokens` (OpenAI makes it optional)
⚠️ Different error handling structure
⚠️ Rate limits may differ from OpenAI
⚠️ Response format is different (content array vs direct message)

## Next Steps
1. I'll update the code to support both OpenAI and Claude
2. You can switch between them using the `AI_PROVIDER` environment variable
3. Test with a few messages to ensure quality
4. Monitor API costs and adjust model as needed

Would you like me to proceed with implementing these changes?
