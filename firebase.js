import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBEJJIaD1cmhLj2bkMviEU0cbTXJlJMAWI",
  authDomain: "studybuddy-f1ebd.firebaseapp.com",
  projectId: "studybuddy-f1ebd",
  storageBucket: "studybuddy-f1ebd.firebasestorage.app",
  messagingSenderId: "230989950090",
  appId: "1:230989950090:web:5a5a663a205ff6ba885173",
  measurementId: "G-VC3ZGPP3TT"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Silently sign this browser in anonymously — no login UI, ever.
signInAnonymously(auth).catch((err) => {
  console.error("Anonymous sign-in failed:", err);
});

// Resolves with this device's unique anonymous UID once ready.
// Any Firestore call should `await getCurrentUserId()` first.
let resolveUid;
const uidReady = new Promise((resolve) => { resolveUid = resolve; });
onAuthStateChanged(auth, (user) => {
  if (user) resolveUid(user.uid);
});
function getCurrentUserId() {
  return uidReady;
}

export { db, auth, getCurrentUserId };