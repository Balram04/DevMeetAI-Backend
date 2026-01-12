const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;
let model;
const chatSessions = new Map();

if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    apiVersion: 'v1'
  });
}

const getChatSession = (userId) => {
  if (!chatSessions.has(userId)) {
    const chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 2048,
      },
    });
    chatSessions.set(userId, chat);
  }
  return chatSessions.get(userId);
};

const resetChatSession = (userId) => {
  chatSessions.delete(userId);
};

const chatWithAIStream = async function* (userId, userMessage, context = {}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const chat = getChatSession(userId);
    
    const message = `You are a helpful, witty, and concise AI assistant for DevMeet. You use Markdown to format your responses effectively. You help students and developers with programming questions, learning resources, and career guidance.

IMPORTANT: Never prefix your responses with "DevMeet AI:" or any similar greeting. Start directly with your answer.

ABOUT DEVMEET PROJECT:
DevMeet is a peer-to-peer learning platform that connects students and developers based on their learning interests and teaching capabilities.

ABOUT THE  DEVELOPER:
The DevMeet platform was developed by ${process.env.DEVELOPER_NAME || 'BALRAM PRAJAPATI'} as a personal project to facilitate collaborative learning among developers and students. The backend is built with Node.js and Express, while the frontend uses React.js and TailwindCSS. The AI assistant is powered by Google Gemini.  
KEY FEATURES:
1. **Email Verification & Authentication**: OTP verification via SendGrid, JWT-based sessions with HTTP-only cookies
2. **Smart Matching Algorithm**: MongoDB aggregation-based matching that finds peers where your wantsToLearn intersects with their canTeach and vice versa
3. **Alumni Explorer**: Browse successful alumni from top companies (Google, Microsoft, Amazon), filter by company/year/expertise
4. **AI Learning Assistant**: Powered by Google Gemini AI for programming help, learning recommendations, and icebreaker generation
5. **Enhanced User Profiles**: Include wantsToLearn, canTeach, college, year, bio, social links
6. **Admin Features**: Protected by admin secret, manage alumni records (CRUD operations)
7. **Real-time Chat**: Socket.IO for peer-to-peer messaging
8. **Connection Requests**: Send/accept/reject connection requests with peers

TECH STACK:
- Backend: Node.js, Express.js, MongoDB, Mongoose, JWT, SendGrid, Socket.IO, Cloudinary
- Frontend: React.js, Vite, Redux, React Router, TailwindCSS, React-Toastify
- AI: Google Gemini API
- Database: MongoDB with aggregation pipelines for matching

MAIN ROUTES:
- /signup - Create account with OTP verification
- /verify-otp - Verify email with OTP code
- /login - JWT authentication with HTTP-only cookies
- /matches - Get smart-matched peers based on learning interests
- /alumni - Browse and manage alumni directory (admin only for CRUD)
- /ai-aassistant - Chat with AI assistant (you!)
- /connections - Manage peer connection requests

MATCHING ALGORITHM:
Finds peers where intersection(your wantsToLearn, their canTeach) is non-empty AND intersection(your canTeach, their wantsToLearn) is non-empty. Results are sorted by match score (sum of both intersection sizes).

When users ask about DevMeet features, functionality, or how something works, provide accurate information based on this context.

User Context:
- Name: ${context.userName || 'Student'}
- Wants to Learn: ${context.wantsToLearn?.join(', ') || 'Not specified'}
- Can Teach: ${context.canTeach?.join(', ') || 'Not specified'}
- College: ${context.college || 'Not specified'}

User Message: ${userMessage}`;

    const result = await chat.sendMessageStream(message);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) yield chunkText;
    }
  } catch (error) {
    if (error.message?.includes('API key')) {
      throw new Error('AI service configuration error. Please contact support.');
    } else if (error.message?.includes('quota')) {
      throw new Error('API quota exceeded. Please wait a moment and try again.');
    } else if (error.message?.includes('safety')) {
      throw new Error('Your question could not be processed. Please rephrase and try again.');
    }
    throw new Error('Unable to get AI response. Please try again.');
  }
};



const getRecommendations = async (wantsToLearn, canTeach, skills) => {
  if (!process.env.GEMINI_API_KEY) {
    return { message: 'AI recommendations are currently unavailable.' };
  }

  try {
    const prompt = `As a learning advisor for DevMeet, provide personalized learning recommendations.

User Profile:
- Wants to Learn: ${wantsToLearn?.join(', ') || 'Not specified'}
- Can Teach: ${canTeach?.join(', ') || 'Not specified'}
- Current Skills: ${skills?.join(', ') || 'Not specified'}

Provide:
1. Top 3 learning paths based on their interests
2. Recommended resources (courses, documentation, tutorials)
3. Project ideas to practice
4. Tips for effective learning

Format as a friendly, actionable response.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return {
      message: response.text(),
      timestamp: new Date(),
    };
  } catch (error) {
    return { message: 'Unable to generate recommendations at this time.' };
  }
};

const generateIcebreaker = async (peerName, commonInterests) => {
  if (!process.env.GEMINI_API_KEY) {
    return `Hey! I saw we both are interested in ${commonInterests[0]}. Would love to connect!`;
  }

  try {
    const prompt = `Generate a friendly, casual icebreaker message for starting a conversation on DevMeet.

Context:
- Peer's Name: ${peerName}
- Common Interests: ${commonInterests.join(', ')}

Create a brief, friendly opening message (2-3 sentences) that:
1. Mentions the common interest naturally
2. Is warm and approachable
3. Invites collaboration or discussion

Just provide the message, no extra formatting.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text().trim();
  } catch (error) {
    return `Hi ${peerName}! I noticed we share an interest in ${commonInterests[0]}. Would love to connect and learn together!`;
  }
};

module.exports = {
  chatWithAIStream,
  resetChatSession,
  getRecommendations,
  generateIcebreaker,
};
