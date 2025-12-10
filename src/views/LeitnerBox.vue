<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useCardsStore } from '../stores/cards'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const cardsStore = useCardsStore()
const router = useRouter()

const showAddModal = ref(false)
const showStudyModal = ref(false)
const newFront = ref('')
const newBack = ref('')
const currentCard = ref(null)
const isFlipped = ref(false)
const studyBox = ref(1)
const addingCard = ref(false)

const boxColors = {
  1: { bg: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' },
  2: { bg: '#f97316', glow: 'rgba(249, 115, 22, 0.3)' },
  3: { bg: '#eab308', glow: 'rgba(234, 179, 8, 0.3)' },
  4: { bg: '#22c55e', glow: 'rgba(34, 197, 94, 0.3)' },
  5: { bg: '#06b6d4', glow: 'rgba(6, 182, 212, 0.3)' }
}

const boxLabels = {
  1: 'Daily',
  2: 'Every 2 Days',
  3: 'Every 4 Days',
  4: 'Weekly',
  5: 'Bi-weekly'
}

const getDueCards = (boxNum) => {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  
  return (cardsStore.cardsByBox[boxNum] || []).filter(card => {
    const nextReview = new Date(card.next_review)
    return nextReview <= today
  })
}

const studyQueue = computed(() => getDueCards(studyBox.value))

const totalCards = computed(() => cardsStore.cards.length)

const masteredCards = computed(() => cardsStore.cardsByBox[5]?.length || 0)

const totalDueToday = computed(() => {
  let total = 0
  for (let i = 1; i <= 5; i++) {
    total += getDueCards(i).length
  }
  return total
})

const boxesWithDueCards = computed(() => {
  const boxes = []
  for (let i = 1; i <= 5; i++) {
    const due = getDueCards(i).length
    if (due > 0) boxes.push({ box: i, count: due })
  }
  return boxes
})

const priorityBox = computed(() => {
  for (let i = 1; i <= 5; i++) {
    if (getDueCards(i).length > 0) return i
  }
  return null
})

onMounted(() => {
  cardsStore.fetchCards()
})

async function handleAddCard() {
  if (!newFront.value.trim() || !newBack.value.trim()) return
  
  addingCard.value = true
  await cardsStore.addCard(newFront.value.trim(), newBack.value.trim())
  newFront.value = ''
  newBack.value = ''
  addingCard.value = false
  showAddModal.value = false
}

function startStudy(boxNum) {
  studyBox.value = boxNum
  const queue = getDueCards(boxNum)
  if (queue.length > 0) {
    currentCard.value = queue[0]
    isFlipped.value = false
    showStudyModal.value = true
  }
}

function startAllStudy() {
  if (priorityBox.value) {
    startStudy(priorityBox.value)
  }
}

async function handleAnswer(correct) {
  if (!currentCard.value) return
  
  await cardsStore.updateCardBox(currentCard.value.id, correct)
  
  const queue = studyQueue.value.filter(c => c.id !== currentCard.value.id)
  if (queue.length > 0) {
    currentCard.value = queue[0]
    isFlipped.value = false
  } else {
    const nextBox = boxesWithDueCards.value.find(b => b.box > studyBox.value)
    if (nextBox) {
      studyBox.value = nextBox.box
      currentCard.value = getDueCards(nextBox.box)[0]
      isFlipped.value = false
    } else {
      showStudyModal.value = false
      currentCard.value = null
    }
  }
}

async function handleSignOut() {
  await authStore.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="app-container">
    <div class="app-background">
      <div class="gradient-mesh"></div>
    </div>

    <header class="app-header">
      <div class="header-left">
        <div class="logo">
          <span class="logo-icon">📦</span>
          <span class="logo-text">Leitner Box</span>
        </div>
      </div>
      <div class="header-right">
        <div class="stats">
          <div class="stat">
            <span class="stat-value">{{ totalCards }}</span>
            <span class="stat-label">Cards</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ masteredCards }}</span>
            <span class="stat-label">Mastered</span>
          </div>
        </div>
        <button @click="showAddModal = true" class="add-btn">
          <span>+</span> Add Card
        </button>
        <button @click="handleSignOut" class="logout-btn">
          Sign Out
        </button>
      </div>
    </header>

    <main class="main-content">
      <div v-if="totalDueToday > 0" class="today-study">
        <div class="today-header">
          <div class="today-icon">🎯</div>
          <div class="today-info">
            <h2>Today's Study</h2>
            <p>You have <strong>{{ totalDueToday }}</strong> cards to review</p>
          </div>
        </div>
        <div class="today-boxes">
          <div 
            v-for="item in boxesWithDueCards" 
            :key="item.box" 
            class="today-box-chip"
            :style="{ '--chip-color': boxColors[item.box].bg }"
          >
            <span class="chip-box">Box {{ item.box }}</span>
            <span class="chip-count">{{ item.count }}</span>
          </div>
        </div>
        <button @click="startAllStudy" class="start-study-btn">
          <span class="btn-icon">▶</span>
          Start Study Session
        </button>
      </div>

      <div v-else-if="totalCards > 0" class="all-done">
        <div class="done-icon">🎉</div>
        <h2>All Done for Today!</h2>
        <p>You've reviewed all your due cards. Come back tomorrow!</p>
      </div>

      <div class="boxes-grid">
        <div 
          v-for="boxNum in 5" 
          :key="boxNum" 
          class="leitner-box"
          :class="{ 'has-due': getDueCards(boxNum).length > 0 }"
          :style="{ '--box-color': boxColors[boxNum].bg, '--box-glow': boxColors[boxNum].glow }"
          @click="startStudy(boxNum)"
        >
          <div class="box-header">
            <span class="box-number">Box {{ boxNum }}</span>
            <span class="box-label">{{ boxLabels[boxNum] }}</span>
          </div>
          <div class="box-content">
            <div class="cards-stack">
              <div 
                v-for="n in Math.min(cardsStore.cardsByBox[boxNum]?.length || 0, 5)" 
                :key="n"
                class="stacked-card"
                :style="{ '--stack-index': n }"
              ></div>
            </div>
            <div class="card-count">
              <span class="count-number">{{ cardsStore.cardsByBox[boxNum]?.length || 0 }}</span>
              <span class="count-label">cards</span>
            </div>
          </div>
          <div class="box-footer">
            <span class="due-count" :class="{ 'has-due': getDueCards(boxNum).length > 0 }">
              <span v-if="getDueCards(boxNum).length > 0" class="due-dot"></span>
              {{ getDueCards(boxNum).length }} due today
            </span>
          </div>
          <div class="box-glow"></div>
          <div v-if="getDueCards(boxNum).length > 0" class="pulse-ring"></div>
        </div>
      </div>

      <div v-if="cardsStore.cards.length === 0 && !cardsStore.loading" class="empty-state">
        <div class="empty-icon">📚</div>
        <h2>Start Your Learning Journey</h2>
        <p>Add your first flashcard to begin mastering new knowledge</p>
        <button @click="showAddModal = true" class="empty-add-btn">
          Create Your First Card
        </button>
      </div>
    </main>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
          <div class="modal add-modal">
            <div class="modal-header">
              <h2>Add New Card</h2>
              <button @click="showAddModal = false" class="close-btn">×</button>
            </div>
            <form @submit.prevent="handleAddCard" class="add-form">
              <div class="form-group">
                <label>Front (Question)</label>
                <textarea 
                  v-model="newFront" 
                  placeholder="What do you want to learn?"
                  rows="3"
                  required
                ></textarea>
              </div>
              <div class="form-group">
                <label>Back (Answer)</label>
                <textarea 
                  v-model="newBack" 
                  placeholder="The answer..."
                  rows="3"
                  required
                ></textarea>
              </div>
              <button type="submit" class="submit-btn" :disabled="addingCard">
                {{ addingCard ? 'Adding...' : 'Add Card' }}
              </button>
            </form>
          </div>
        </div>
      </Transition>

      <Transition name="modal">
        <div v-if="showStudyModal && currentCard" class="modal-overlay" @click.self="showStudyModal = false">
          <div class="modal study-modal">
            <div class="modal-header">
              <div class="study-header-left">
                <h2>Study Mode</h2>
                <span class="current-box-badge" :style="{ background: boxColors[studyBox].bg }">
                  Box {{ studyBox }}
                </span>
              </div>
              <div class="study-progress">
                {{ studyQueue.length }} remaining in this box
              </div>
              <button @click="showStudyModal = false" class="close-btn">×</button>
            </div>
            <div class="flashcard-container">
              <div 
                class="flashcard" 
                :class="{ flipped: isFlipped }"
                @click="isFlipped = !isFlipped"
              >
                <div class="flashcard-front">
                  <div class="card-content">{{ currentCard.front }}</div>
                  <div class="flip-hint">Click to flip</div>
                </div>
                <div class="flashcard-back">
                  <div class="card-content">{{ currentCard.back }}</div>
                </div>
              </div>
            </div>
            <div v-if="isFlipped" class="answer-buttons">
              <button @click="handleAnswer(false)" class="answer-btn wrong">
                <span class="btn-icon">✗</span>
                <span>Didn't Know</span>
                <span class="answer-hint">→ Box 1</span>
              </button>
              <button @click="handleAnswer(true)" class="answer-btn correct">
                <span class="btn-icon">✓</span>
                <span>Got It!</span>
                <span class="answer-hint">→ Box {{ Math.min(studyBox + 1, 5) }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  position: relative;
}

.app-background {
  position: fixed;
  inset: 0;
  background: #0a0a0f;
  z-index: -1;
}

.gradient-mesh {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(236, 72, 153, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(20, 184, 166, 0.08) 0%, transparent 50%);
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 2rem;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 1.75rem;
}

.logo-text {
  font-family: 'Outfit', system-ui, sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.stats {
  display: flex;
  gap: 1.5rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px -10px rgba(99, 102, 241, 0.5);
}

.add-btn span {
  font-size: 1.25rem;
}

.logout-btn {
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.main-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.today-study {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 20px;
  padding: 1.5rem 2rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.today-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.today-icon {
  font-size: 2.5rem;
}

.today-info h2 {
  color: #fff;
  font-size: 1.25rem;
  margin: 0;
}

.today-info p {
  color: rgba(255, 255, 255, 0.6);
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
}

.today-info strong {
  color: #fff;
  font-weight: 700;
}

.today-boxes {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  flex: 1;
}

.today-box-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--chip-color);
  border-radius: 20px;
}

.chip-box {
  color: var(--chip-color);
  font-weight: 600;
  font-size: 0.875rem;
}

.chip-count {
  background: var(--chip-color);
  color: #000;
  font-weight: 700;
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
}

.start-study-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  border: none;
  border-radius: 14px;
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.start-study-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 35px -10px rgba(34, 197, 94, 0.5);
}

.start-study-btn .btn-icon {
  font-size: 0.875rem;
}

.all-done {
  text-align: center;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(6, 182, 212, 0.1));
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 20px;
  margin-bottom: 2rem;
}

.done-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.all-done h2 {
  color: #22c55e;
  margin: 0 0 0.5rem;
}

.all-done p {
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.boxes-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1.5rem;
}

@media (max-width: 1200px) {
  .boxes-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .boxes-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .today-study {
    flex-direction: column;
    align-items: flex-start;
  }
  .start-study-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .boxes-grid {
    grid-template-columns: 1fr;
  }
}

.leitner-box {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.leitner-box.has-due {
  border-color: var(--box-color);
  box-shadow: 0 0 30px -15px var(--box-glow);
}

.leitner-box:hover {
  transform: translateY(-5px);
  border-color: var(--box-color);
  box-shadow: 0 20px 40px -20px var(--box-glow);
}

.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  border: 2px solid var(--box-color);
  border-radius: 20px;
  transform: translate(-50%, -50%);
  animation: pulse-ring 2s ease-out infinite;
  pointer-events: none;
}

@keyframes pulse-ring {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.5;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 0;
  }
}

.box-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--box-color);
  opacity: 0.8;
}

.box-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.box-number {
  font-weight: 700;
  color: var(--box-color);
  font-size: 1.1rem;
}

.box-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.box-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 80px;
}

.cards-stack {
  position: relative;
  width: 60px;
  height: 70px;
}

.stacked-card {
  position: absolute;
  width: 50px;
  height: 60px;
  background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  bottom: calc(var(--stack-index) * 4px);
  left: calc(var(--stack-index) * 2px);
  transform: rotate(calc(var(--stack-index) * -2deg));
}

.card-count {
  text-align: right;
}

.count-number {
  display: block;
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}

.count-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
}

.box-footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.due-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
}

.due-count.has-due {
  color: var(--box-color);
}

.due-dot {
  width: 8px;
  height: 8px;
  background: var(--box-color);
  border-radius: 50%;
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  margin-top: 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
}

.empty-state h2 {
  color: #fff;
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 2rem;
}

.empty-add-btn {
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.empty-add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 35px -10px rgba(99, 102, 241, 0.5);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  z-index: 1000;
}

.modal {
  background: linear-gradient(135deg, #1a1a2e, #16162a);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.study-modal {
  max-width: 600px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  gap: 1rem;
  flex-wrap: wrap;
}

.study-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-header h2 {
  color: #fff;
  font-size: 1.25rem;
  margin: 0;
}

.current-box-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
}

.study-progress {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
}

.close-btn {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.add-form {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  font-weight: 500;
}

.form-group textarea {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #fff;
  font-size: 1rem;
  resize: vertical;
  font-family: inherit;
  transition: all 0.3s ease;
}

.form-group textarea::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.form-group textarea:focus {
  outline: none;
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
}

.submit-btn {
  padding: 1rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px -10px rgba(99, 102, 241, 0.5);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.flashcard-container {
  padding: 2rem;
  perspective: 1000px;
}

.flashcard {
  width: 100%;
  height: 250px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.flashcard.flipped {
  transform: rotateY(180deg);
}

.flashcard-front,
.flashcard-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.flashcard-back {
  transform: rotateY(180deg);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.1));
}

.card-content {
  font-size: 1.25rem;
  color: #fff;
  text-align: center;
  line-height: 1.6;
}

.flip-hint {
  position: absolute;
  bottom: 1rem;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.75rem;
}

.answer-buttons {
  display: flex;
  gap: 1rem;
  padding: 0 2rem 2rem;
}

.answer-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 1rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.answer-btn.wrong {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
}

.answer-btn.correct {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff;
}

.answer-btn:hover {
  transform: translateY(-2px);
}

.answer-btn.wrong:hover {
  box-shadow: 0 10px 30px -10px rgba(239, 68, 68, 0.5);
}

.answer-btn.correct:hover {
  box-shadow: 0 10px 30px -10px rgba(34, 197, 94, 0.5);
}

.answer-btn .btn-icon {
  font-size: 1.25rem;
}

.answer-hint {
  font-size: 0.7rem;
  opacity: 0.7;
  font-weight: 400;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: scale(0.95) translateY(20px);
}
</style>
