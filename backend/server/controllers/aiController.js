const mlService = require('../services/mlService');

// Stub: echo back combined context; integrate Gemini/OpenAI upstream as needed
async function aiPrompt(req, res) {
  try {
    const userId = req.user?._id;
    const { messages = [], routeIds = [], extra = {} } = req.body || {};

    const lastUser = messages.filter(m => m.role === 'user').pop();
    const text = lastUser?.content || '';

    // TODO: enrich routes summary by pulling GPX/statistics if stored
    const context = {
      userId: String(userId || ''),
      routeIds,
      note: 'Demo response without external LLM integration',
    };

    const reply = `Принял: ${text || '(пусто)'}\nМаршрутов прикреплено: ${routeIds.length}`;
    res.json({ answer: reply, context });
  } catch (e) {
    console.error('[AI] prompt error:', e.message || e);
    res.status(500).json({ error: 'AI prompt failed' });
  }
}

module.exports = { aiPrompt };


