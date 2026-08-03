import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,GET');
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
    const inputText = body?.inputText;

    if (!inputText) {
      return res.status(400).json({ error: 'Input text is required' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Based on the following text, generate 6 to 8 unique, high-quality flashcards. 
Cover different aspects (definitions, locations, processes, and products) so the questions are varied and do not repeat. 
You MUST return ONLY a valid JSON array of objects with keys "question" and "answer". No extra text, markdown wrappers, or explanations.

Text: ${inputText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let rawText = response.text().trim();

    // Extract JSON array using regex in case model adds extra text
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Model did not return a valid JSON array format.');
    }

    const flashcards = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ flashcards });

  } catch (error) {
    console.error('Generation error details:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}