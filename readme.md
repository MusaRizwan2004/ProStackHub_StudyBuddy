# StudyBuddy

An AI-powered, spaced-repetition flashcard web application built with a modern UI, Firebase backend, and Vercel Serverless Functions.

## Features
* **AI Generation:** Automatically parse study notes into front/back flashcards using a Serverless function.
* **SM-2 Algorithm Setup:** Architecture prepared for calculated review intervals.
* **Firebase Integration:** Ready for Cloud Firestore to handle real-time sync across devices.
* **Modern UI:** Sleek, responsive, and animated user interface built with vanilla HTML/CSS.

## Local Development
1. Clone the repository.
2. Add your Firebase keys to `firebase.js`.
3. Run `npm install -g vercel` if you don't have the Vercel CLI.
4. Run `vercel dev` to start the local server with working API routes.