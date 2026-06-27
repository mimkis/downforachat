// ==========================================
// 1. GLOBAL STATE & DATABASE
// ==========================================
let mockCards = []; 
let currentCard = null;
let typeTween = null; 

let activeCategories = new Set(['All']); 

const typePillEl = document.querySelector('.questions-type');
const questionTextEl = document.querySelector('.question');
const questionsWrapper = document.querySelector('.questions-wrapper');
const questionsListEl = document.querySelector('.questions-list');

// ==========================================
// 2. LOCAL STORAGE LOGIC
// ==========================================
// Saves current drawn/striken arrays to the browser
function saveProgress() {
  const drawn = mockCards.filter(c => c.isDrawn).map(c => c.text);
  const striken = mockCards.filter(c => c.isStriken).map(c => c.text);
  localStorage.setItem('drawnCards', JSON.stringify(drawn));
  localStorage.setItem('strikenCards', JSON.stringify(striken));
}

// Optional: Run `localStorage.clear()` in your browser console to reset the game

// ==========================================
// 3. CARD DRAWING LOGIC
// ==========================================
function drawRandomCard() {
  const availableCards = mockCards.filter(card => {
    const matchesCategory = activeCategories.size === 0 || activeCategories.has('All') || activeCategories.has(card.type);
    return !card.isStriken && !card.isDrawn && matchesCategory; 
  });

  if (availableCards.length === 0) {
    if (typePillEl) typePillEl.textContent = "Empty";
    if (questionTextEl) questionTextEl.textContent = "It's been nice talking to you, wanna hangout next weekend;)?";
    currentCard = null;
    return; 
  }

  const randomIndex = Math.floor(Math.random() * availableCards.length);
  const randomCard = availableCards[randomIndex];

  randomCard.isDrawn = true;
  randomCard.isStriken = true; // Mark it as striken in the database
  currentCard = randomCard;
  
  saveProgress(); // Save to local storage
  populateQuestionsList(); // Force the overlay list to visually update

  if (typePillEl && questionTextEl) {
    typePillEl.textContent = currentCard.type;
    
    if (typeTween) typeTween.kill();
    questionTextEl.textContent = ''; 
    
    const txt = currentCard.text;
    const animDuration = Math.max(0.5, txt.length * 0.03); 

    const proxy = { progress: 0 };
    
    typeTween = gsap.to(proxy, {
      progress: 1,
      duration: animDuration,
      ease: "power2.out", 
      onUpdate: () => {
        const currentLength = Math.floor(proxy.progress * txt.length);
        questionTextEl.textContent = txt.substring(0, currentLength);
      }
    });
  }
}

if (questionsWrapper) {
  questionsWrapper.addEventListener('click', () => {
    drawRandomCard();
  });
}

// ==========================================
// 4. FILTERING LOGIC (OVERLAY LIST)
// ==========================================
let isDragging = false;
document.addEventListener('mousedown', () => isDragging = true);
document.addEventListener('mouseup', () => isDragging = false);

const categoryPills = document.querySelectorAll('.category');

categoryPills.forEach(pill => {
  if (pill.textContent.trim() === 'All') {
    pill.classList.add('selected');
  }

  pill.addEventListener('click', () => {
    const clickedCat = pill.textContent.trim();

    if (clickedCat === 'All') {
      const allAreStricken = mockCards.length > 0 && mockCards.every(card => card.isStriken);
      const willStrikeAll = !allAreStricken;

      mockCards.forEach(card => card.isStriken = willStrikeAll);
      saveProgress(); 
      
      activeCategories.clear();
      
      if (!willStrikeAll) {
        activeCategories.add('All');
      }
      
    } else {
      activeCategories.delete('All'); 
      
      if (activeCategories.has(clickedCat)) {
        activeCategories.delete(clickedCat);
      } else {
        activeCategories.add(clickedCat);
      }
    }

    categoryPills.forEach(p => {
      if (activeCategories.has(p.textContent.trim())) {
        p.classList.add('selected');
      } else {
        p.classList.remove('selected');
      }
    });

    populateQuestionsList();

    if ((currentCard && activeCategories.size > 0 && !activeCategories.has('All') && !activeCategories.has(currentCard.type)) || clickedCat === 'All') {
      drawRandomCard();
    }
  });
});

function populateQuestionsList() {
  if (!questionsListEl) return;
  questionsListEl.innerHTML = '';

  const cardsToRender = mockCards.filter(card => {
    if (activeCategories.size === 0 || activeCategories.has('All')) return true;
    return activeCategories.has(card.type);
  });

  cardsToRender.forEach((card, index) => {
    const item = document.createElement('div');
    item.className = 'question-list-item';

    const number = String(index + 1).padStart(2, '0');

    item.innerHTML = `
      <span class="list-num">${number}.</span>
      <span class="list-text">${card.text}</span>
    `;

    if (card.isStriken) item.classList.add('active');

    const toggleStrike = () => {
      item.classList.toggle('active');
      card.isStriken = item.classList.contains('active');
      saveProgress(); 

      if (card.isStriken && currentCard && currentCard.text === card.text) {
        drawRandomCard();
      }
    };

    item.addEventListener('mousedown', toggleStrike);
    item.addEventListener('mouseenter', () => {
      if (isDragging) toggleStrike();
    });

    item.addEventListener('dragstart', (e) => e.preventDefault());

    questionsListEl.appendChild(item);
  });
}

// ==========================================
// 5. INITIALIZATION ON LOAD
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  Papa.parse("database.csv", {
    download: true,
    header: true, 
    skipEmptyLines: true,
    transformHeader: function(header) {
      return header.replace(/^\uFEFF/, '').trim();
    },
    complete: function(results) {
      const savedDrawn = JSON.parse(localStorage.getItem('drawnCards') || '[]');
      const savedStriken = JSON.parse(localStorage.getItem('strikenCards') || '[]');

      mockCards = results.data.map(row => {
        const rawType = row["Type"] || row["type"] || row[" Type"];
        const rawText = row["Question"] || row["question"] || row[" Question"];

        return {
          type: rawType || "Uncategorized",     
          text: rawText || "Missing Question text", 
          isStriken: savedStriken.includes(rawText),       
          isDrawn: savedDrawn.includes(rawText)
        };
      });

      drawRandomCard();
      populateQuestionsList();
    },
    error: function(err) {
      console.error("Failed to load database.csv:", err);
      if (questionTextEl) questionTextEl.textContent = "Error loading database. Make sure database.csv is in the folder.";
    }
  });
  
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
    });
  }

  const overlay = document.querySelector('.overlay');
  const openTrigger = document.getElementById('open-overlay');

  if (openTrigger && overlay) {
    openTrigger.addEventListener('click', () => {
      overlay.classList.add('active');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  }
});
