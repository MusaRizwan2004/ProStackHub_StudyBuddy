export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text payload is required' });
    }

    // TODO: Replace this mock data with a real API call to an LLM provider
    // Example: fetch('https://api.openai.com/...', { headers: { Authorization: `Bearer ${process.env.API_KEY}` }})
    
    const mockGeneratedCards = [
      { front: "What is Spaced Repetition?", back: "A learning technique that incorporates increasing intervals of time between subsequent review of previously learned material." },
      { front: "What is the SM-2 algorithm?", back: "A popular spaced repetition algorithm originally created for SuperMemo." }
    ];

    return res.status(200).json({ cards: mockGeneratedCards });
    
  } catch (error) {
    console.error('Error generating cards:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}