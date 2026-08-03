import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBEJJIaD1cmhLj2bkMviEU0cbTXJlJMAWI",
  authDomain: "studybuddy-f1ebd.firebaseapp.com",
  projectId: "studybuddy-f1ebd",
  storageBucket: "studybuddy-f1ebd.firebasestorage.app",
  messagingSenderId: "230989950090",
  appId: "1:230989950090:web:5a5a663a205ff6ba885173",
  measurementId: "G-VC3ZGPP3TT"
};

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };