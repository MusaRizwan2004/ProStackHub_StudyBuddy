import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  maxDuration: 30,
};

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
    const inputText = body?.inputText || body?.text;

    if (!inputText) {
      return res.status(400).json({ error: 'Input text is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing in Vercel environment variables.' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Based on the following text, generate 6 to 8 unique, high-quality flashcards. 
Return a JSON array of objects where each object has keys "front" and "back".

Text: ${inputText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text().trim();

    let flashcards;
    try {
      flashcards = JSON.parse(rawText);
    } catch (e) {
      console.error('Failed to parse Gemini output:', rawText);
      return res.status(500).json({ error: 'AI returned malformed data. Please try again.' });
    }

    return res.status(200).json({ cards: flashcards });

  } catch (error) {
    console.error('Generation error details:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}