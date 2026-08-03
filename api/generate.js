import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    // Accept either body.inputText or body.text to prevent 400 errors
    const inputText = body?.inputText || body?.text;

    if (!inputText) {
      return res.status(400).json({ error: 'Input text is required' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Based on the following text, generate 6 to 8 unique, high-quality flashcards. 
Cover different aspects (definitions, locations, processes, and products) so the questions are varied and do not repeat. 
Return a JSON array of objects where each object has keys "front" and "back".

Text: ${inputText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text().trim();

    const flashcards = JSON.parse(rawText);
    return res.status(200).json({ cards: flashcards });

  } catch (error) {
    console.error('Generation error details:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}