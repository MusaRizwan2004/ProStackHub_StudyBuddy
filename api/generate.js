import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  // Enable CORS if needed
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
    // Handle both parsed body or stringified body safely
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const inputText = body?.inputText;

    if (!inputText) {
      return res.status(400).json({ error: 'Input text is required' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Based on the following text, generate 6 to 8 unique, high-quality flashcards. 
Cover different aspects (definitions, locations, processes, and products) so the questions are varied and do not repeat. 
Return ONLY a valid JSON array of objects with keys "question" and "answer". 

Text: ${inputText}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let rawText = response.text ? response.text.trim() : '';
    
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const flashcards = JSON.parse(rawText);
    return res.status(200).json({ flashcards });

  } catch (error) {
    console.error('Generation error details:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}