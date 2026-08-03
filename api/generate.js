// Inside your api/generate.js (or equivalent file)
const prompt = `Based on the following text, generate 6 to 8 unique, high-quality flashcards. 
Cover different aspects (definitions, locations, processes, and products) so the questions are varied and do not repeat. 
Return ONLY a valid JSON array of objects with keys "question" and "answer". 

Text: ${inputText}`;