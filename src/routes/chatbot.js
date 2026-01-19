const express = require('express');
const { authMiddleware } = require('../middlewares/auth');
const { chatWithAIStream, resetChatSession, getRecommendations, generateIcebreaker } = require('../services/aiService');
const User = require('../models/user');
const { normalizeSkillKeyList } = require('../utils/skillNormalization');

const chatbotRouter = express.Router();

chatbotRouter.post('/api/ai/chat/stream', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const user = await User.findById(req.user._id);
    
    const context = {
      userName: `${user.firstname} ${user.lastname}`,
      wantsToLearn: user.wantsToLearn || [],
      canTeach: user.canTeach || [],
      college: user.college || 'Not specified',
      skills: user.skills || []
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of chatWithAIStream(req.user._id.toString(), message, context)) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (streamError) {
      res.write(`data: ${JSON.stringify({ error: streamError.message })}\n\n`);
      res.end();
    }
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get AI response'
      });
    }
  }
});

chatbotRouter.post('/api/ai/reset', authMiddleware, async (req, res) => {
  try {
    resetChatSession(req.user._id.toString());
    res.status(200).json({
      success: true,
      message: 'Chat session reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset chat session'
    });
  }
});



chatbotRouter.post('/api/ai/recommendations', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    const response = await getRecommendations(
      user.wantsToLearn || [],
      user.canTeach || [],
      user.skills || []
    );

    res.status(200).json({
      success: true,
      data: {
        message: response.message,
        timestamp: response.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations'
    });
  }
});

chatbotRouter.post('/api/ai/icebreaker', authMiddleware, async (req, res) => {
  try {
    const { peerId } = req.body;

    if (!peerId) {
      return res.status(400).json({
        success: false,
        message: 'Peer ID is required'
      });
    }

    const currentUser = await User.findById(req.user._id);
    const peer = await User.findById(peerId);

    if (!peer) {
      return res.status(404).json({
        success: false,
        message: 'Peer not found'
      });
    }

    const currentWantsToLearnKeys = new Set(normalizeSkillKeyList(currentUser.wantsToLearn || []));
    const currentCanTeachKeys = new Set(normalizeSkillKeyList(currentUser.canTeach || []));

    const commonInterests = [
      ...(peer.canTeach || []).filter((skill) =>
        currentWantsToLearnKeys.has(String(skill || '').trim().toLowerCase())
      ),
      ...(peer.wantsToLearn || []).filter((skill) =>
        currentCanTeachKeys.has(String(skill || '').trim().toLowerCase())
      )
    ];

    if (commonInterests.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          message: `Hi ${peer.firstname}! I came across your profile and would love to connect!`
        }
      });
    }

    const icebreaker = await generateIcebreaker(peer.firstname, commonInterests);

    res.status(200).json({
      success: true,
      data: { message: icebreaker }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate icebreaker'
    });
  }
});

chatbotRouter.get('/api/ai/status', (req, res) => {
  const isAvailable = !!process.env.GEMINI_API_KEY;
  
  res.status(200).json({
    success: true,
    data: {
      available: isAvailable,
      provider: 'Google Gemini AI',
      model: 'gemini-2.5-flash',
      message: isAvailable ? 'AI Assistant is ready' : 'AI Assistant is currently unavailable'
    }
  });
});

module.exports = chatbotRouter;
