import { db } from './firebase.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// 0. PURGE LEGACY LOCAL STORAGE
// ==========================================
if (localStorage.getItem('studybuddy_cards')) {
  localStorage.removeItem('studybuddy_cards');
  console.log("Legacy local storage data wiped successfully.");
}

// ==========================================
// 1. FIRESTORE DATA MANAGER
// ==========================================
const CARDS_COLLECTION = "cards";

const FirestoreStore = {
  async addGeneratedCards(rawCards) {
    const batchPromises = rawCards.map(async (c) => {
      const cardData = {
        front: c.front,
        back: c.back,
        repetition: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: Timestamp.now(),
        createdAt: Timestamp.now() // NEW: lets us sort newest-first
      };
      return await addDoc(collection(db, CARDS_COLLECTION), cardData);
    });
    await Promise.all(batchPromises);
  },

  // Fetch all cards, newest first
  async getAllCards() {
    try {
      const q = query(collection(db, CARDS_COLLECTION), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const cards = [];
      querySnapshot.forEach((docSnap) => {
        cards.push({ id: docSnap.id, ...docSnap.data() });
      });
      return cards;
    } catch (error) {
      console.error("Error fetching all cards:", error);
      return [];
    }
  },

  async getDueCards() {
    try {
      const now = Timestamp.now();
      const q = query(
        collection(db, CARDS_COLLECTION), 
        where("nextReviewDate", "<=", now)
      );
      const querySnapshot = await getDocs(q);
      const dueCards = [];
      querySnapshot.forEach((docSnap) => {
        dueCards.push({ id: docSnap.id, ...docSnap.data() });
      });
      return dueCards;
    } catch (error) {
      console.error("Error fetching due cards:", error);
      return [];
    }
  },

  async updateCardStats(cardId, newStats) {
    try {
      const cardRef = doc(db, CARDS_COLLECTION, cardId);
      await updateDoc(cardRef, {
        repetition: newStats.repetition,
        interval: newStats.interval,
        easeFactor: newStats.easeFactor,
        nextReviewDate: Timestamp.fromDate(newStats.nextReviewDate)
      });
    } catch (error) {
      console.error("Error updating card stats:", error);
    }
  },

  async updateCardContent(cardId, newFront, newBack) {
    try {
      const cardRef = doc(db, CARDS_COLLECTION, cardId);
      await updateDoc(cardRef, { front: newFront, back: newBack });
    } catch (error) {
      console.error("Error updating card content:", error);
    }
  },

  async deleteCard(cardId) {
    try {
      await deleteDoc(doc(db, CARDS_COLLECTION, cardId));
    } catch (error) {
      console.error("Error deleting card:", error);
    }
  }
};

// ==========================================
// 2. SM-2 ALGORITHM
// ==========================================
function calculateSM2(grade, repetition, interval, easeFactor) {
  let newInterval;
  let newRepetition;

  if (grade >= 3) {
    if (repetition === 0) newInterval = 1;
    else if (repetition === 1) newInterval = 6;
    else newInterval = Math.round(interval * easeFactor);
    newRepetition = repetition + 1;
  } else {
    newRepetition = 0;
    newInterval = 1;
  }

  let newEaseFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return { repetition: newRepetition, interval: newInterval, easeFactor: newEaseFactor, nextReviewDate };
}

// ==========================================
// 3. TOAST NOTIFICATION (replaces alert())
// ==========================================
function showToast(message) {
  let toast = document.getElementById('sb-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'sb-toast';
    toast.style.cssText = `
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: rgba(20, 20, 30, 0.95); color: #fff; padding: 12px 24px;
      border-radius: 10px; font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 14px; z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.1); opacity: 0; transition: opacity 0.25s;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ==========================================
// 4. UI CONTROLLER & APP STATE
// ==========================================
let reviewQueue = [];
let currentCardIndex = 0;

const navButtons = document.querySelectorAll('.app-nav button');
const views = document.querySelectorAll('.view');
const reviewCountBadge = document.getElementById('review-count');
const flashcardEl = document.getElementById('flashcard');
const flipBtn = document.getElementById('btn-flip');
const cardFrontText = document.getElementById('card-front-text');
const cardBackText = document.getElementById('card-back-text');
const generateBtn = document.getElementById('btn-generate');
const noteInput = document.getElementById('note-input');
const cardsListEl = document.getElementById('cards-list');

document.addEventListener('DOMContentLoaded', async () => {
  await updateReviewBadge();
});

async function updateReviewBadge() {
  const dueCards = await FirestoreStore.getDueCards();
  if (reviewCountBadge) reviewCountBadge.textContent = dueCards.length;
}

// Programmatic navigation helper (so generate can jump to All Cards)
async function goToView(navId) {
  const targetBtn = document.getElementById(navId);
  if (!targetBtn) return;
  navButtons.forEach(b => b.classList.remove('active'));
  views.forEach(v => v.classList.remove('active-view'));
  targetBtn.classList.add('active');
  const targetViewId = targetBtn.id.replace('nav-', 'view-');
  document.getElementById(targetViewId).classList.add('active-view');

  if (targetViewId === 'view-review') await startReviewSession();
  else if (targetViewId === 'view-cards') await renderCardsLibrary();
}

navButtons.forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const targetBtn = e.target.closest('button');
    if (!targetBtn) return;
    await goToView(targetBtn.id);
  });
});

// AI Card Generation
generateBtn.addEventListener('click', async () => {
  const notes = noteInput.value.trim();
  if (!notes) return showToast('Please enter some notes first.');

  generateBtn.disabled = true;
  generateBtn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Generating & Saving...';

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: notes })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Server error occurred');

    if (data.cards && data.cards.length > 0) {
      await FirestoreStore.addGeneratedCards(data.cards);
      noteInput.value = '';
      await updateReviewBadge();
      showToast(`Saved ${data.cards.length} new flashcards.`);
      await goToView('nav-review'); // jump straight to Review, no alert
    } else {
      showToast('Could not parse flashcards from response.');
    }
  } catch (error) {
    console.error('Generation error:', error);
    showToast('Error: ' + error.message);
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span class="material-symbols-outlined">auto_awesome</span> Generate with AI';
  }
});

// Review Session
async function startReviewSession() {
  reviewQueue = await FirestoreStore.getDueCards();
  currentCardIndex = 0;
  renderCurrentCard();
}

function renderCurrentCard() {
  resetCardFlip();
  if (reviewQueue.length === 0 || currentCardIndex >= reviewQueue.length) {
    cardFrontText.textContent = "🎉 All done for today!";
    cardBackText.textContent = "You've reviewed all your due flashcards from Firebase.";
    flipBtn.style.display = 'none';
    return;
  }
  flipBtn.style.display = 'block';
  const currentCard = reviewQueue[currentCardIndex];
  cardFrontText.textContent = currentCard.front;
  cardBackText.textContent = currentCard.back;
}

function resetCardFlip() {
  flashcardEl.classList.remove('flipped');
  flipBtn.style.opacity = '1';
  flipBtn.style.pointerEvents = 'all';
}

flipBtn.addEventListener('click', () => {
  flashcardEl.classList.add('flipped');
  flipBtn.style.opacity = '0';
  flipBtn.style.pointerEvents = 'none';
});

flashcardEl.addEventListener('click', (e) => {
  if (!e.target.closest('.sm2-controls')) {
    flashcardEl.classList.toggle('flipped');
    const isFlipped = flashcardEl.classList.contains('flipped');
    flipBtn.style.opacity = isFlipped ? '0' : '1';
    flipBtn.style.pointerEvents = isFlipped ? 'none' : 'all';
  }
});

document.querySelectorAll('.grade-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const grade = parseInt(e.target.getAttribute('data-grade'));
    const currentCard = reviewQueue[currentCardIndex];
    if (!currentCard) return;

    const newStats = calculateSM2(grade, currentCard.repetition, currentCard.interval, currentCard.easeFactor);
    await FirestoreStore.updateCardStats(currentCard.id, newStats);
    currentCardIndex++;
    await updateReviewBadge();
    renderCurrentCard();
  });
});

// All Cards Library
async function renderCardsLibrary() {
  if (!cardsListEl) return;
  cardsListEl.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Loading cards from Firebase...</div>';

  const allCards = await FirestoreStore.getAllCards();
  cardsListEl.innerHTML = '';

  if (allCards.length === 0) {
    cardsListEl.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
        <p>No flashcards found in Firebase. Head over to Generate to add some!</p>
      </div>
    `;
    return;
  }

  allCards.forEach(card => {
    const row = document.createElement('div');
    row.className = 'card-item-row';
    row.innerHTML = `
      <div class="card-item-content">
        <div class="card-item-field">
          <span>Question</span>
          <p class="card-text-front">${escapeHTML(card.front)}</p>
        </div>
        <div class="card-item-field">
          <span>Answer</span>
          <p class="card-text-back">${escapeHTML(card.back)}</p>
        </div>
      </div>
      <div class="card-item-actions">
        <button class="icon-btn edit-btn" title="Edit Card" data-id="${card.id}">
          <span class="material-symbols-outlined" style="font-size: 1.1rem;">edit</span>
        </button>
        <button class="icon-btn delete delete-btn" title="Delete Card" data-id="${card.id}">
          <span class="material-symbols-outlined" style="font-size: 1.1rem;">delete</span>
        </button>
      </div>
    `;

    // Delete with a two-click confirm instead of a browser popup
    const deleteBtn = row.querySelector('.delete-btn');
    let confirming = false;
    deleteBtn.addEventListener('click', async () => {
      if (!confirming) {
        confirming = true;
        deleteBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.1rem;">warning</span>';
        deleteBtn.title = 'Click again to confirm delete';
        deleteBtn.style.background = '#c0553b';
        setTimeout(() => {
          if (confirming) {
            confirming = false;
            deleteBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.1rem;">delete</span>';
            deleteBtn.title = 'Delete Card';
            deleteBtn.style.background = '';
          }
        }, 3000);
        return;
      }
      await FirestoreStore.deleteCard(card.id);
      showToast('Card deleted.');
      await renderCardsLibrary();
      await updateReviewBadge();
    });

    // Inline Edit
    row.querySelector('.edit-btn').addEventListener('click', () => {
      const frontEl = row.querySelector('.card-text-front');
      const backEl = row.querySelector('.card-text-back');
      const currentFront = frontEl.textContent;
      const currentBack = backEl.textContent;

      frontEl.innerHTML = `<input type="text" class="edit-input-front" value="${escapeHTML(currentFront)}" style="width:100%; padding:0.4rem; background:rgba(0,0,0,0.3); border:1px solid var(--primary-accent); border-radius:6px; color:white;">`;
      backEl.innerHTML = `<input type="text" class="edit-input-back" value="${escapeHTML(currentBack)}" style="width:100%; padding:0.4rem; background:rgba(0,0,0,0.3); border:1px solid var(--primary-accent); border-radius:6px; color:white;">`;

      const actionsEl = row.querySelector('.card-item-actions');
      actionsEl.innerHTML = `
        <button class="icon-btn save-btn" title="Save" style="background:var(--primary-accent); color:white;">
          <span class="material-symbols-outlined" style="font-size: 1.1rem;">check</span>
        </button>
      `;

      actionsEl.querySelector('.save-btn').addEventListener('click', async () => {
        const newFront = row.querySelector('.edit-input-front').value.trim();
        const newBack = row.querySelector('.edit-input-back').value.trim();
        if (newFront && newBack) {
          await FirestoreStore.updateCardContent(card.id, newFront, newBack);
          await renderCardsLibrary();
        } else {
          showToast('Fields cannot be empty.');
        }
      });
    });

    cardsListEl.appendChild(row);
  });
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g,
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}