const { generateResponse } = require('../services/chatService');

// @desc    Chat with GovGuard AI Assistant
// @route   POST /api/chat
// @access  Private
const chatWithAssistant = async (req, res, next) => {
  const { message } = req.body;

  if (!message) {
    res.status(400);
    return next(new Error('Please provide a message'));
  }

  try {
    const answer = await generateResponse(message);
    res.status(200).json({ answer });
  } catch (error) {
    console.error('[Chat Controller] Error in AI Assistant chat:', error);
    res.status(500).json({ answer: 'AI Assistant is temporarily unavailable.' });
  }
};

module.exports = {
  chatWithAssistant,
};
