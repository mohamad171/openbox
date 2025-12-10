import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'

export const useCardsStore = defineStore('cards', () => {
  const cards = ref([])
  const loading = ref(false)

  const cardsByBox = computed(() => {
    const boxes = { 1: [], 2: [], 3: [], 4: [], 5: [] }
    cards.value.forEach(card => {
      if (boxes[card.box]) boxes[card.box].push(card)
    })
    return boxes
  })

  async function fetchCards() {
    const authStore = useAuthStore()
    if (!authStore.user) return

    loading.value = true
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', authStore.user.id)
      .order('created_at', { ascending: false })

    if (!error) cards.value = data || []
    loading.value = false
  }

  async function addCard(front, back) {
    const authStore = useAuthStore()
    if (!authStore.user) return { error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('cards')
      .insert({
        front,
        back,
        box: 1,
        user_id: authStore.user.id,
        next_review: new Date().toISOString()
      })
      .select()
      .single()

    if (!error && data) cards.value.unshift(data)
    return { error }
  }

  async function updateCardBox(cardId, correct) {
    const card = cards.value.find(c => c.id === cardId)
    if (!card) return

    const newBox = correct 
      ? Math.min(card.box + 1, 5) 
      : 1

    const reviewIntervals = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 }
    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + reviewIntervals[newBox])

    const { error } = await supabase
      .from('cards')
      .update({ box: newBox, next_review: nextReview.toISOString() })
      .eq('id', cardId)

    if (!error) {
      card.box = newBox
      card.next_review = nextReview.toISOString()
    }
  }

  async function deleteCard(cardId) {
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', cardId)

    if (!error) {
      cards.value = cards.value.filter(c => c.id !== cardId)
    }
  }

  return { cards, cardsByBox, loading, fetchCards, addCard, updateCardBox, deleteCard }
})

