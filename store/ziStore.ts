import { create } from 'zustand'
import axios from 'axios'
import type { LkeSubmission, ZiSummary } from '@/types/zi'

interface ZiFilters {
  eselon1: string
  status:  string
  target:  string
  search:  string
}

interface ZiState {
  submissions:   LkeSubmission[]
  summary:       ZiSummary | null
  isLoading:     boolean
  syncingIds:    string[]
  selectedUnit:  LkeSubmission | null
  compareIds:    string[]
  filters:       ZiFilters

  fetchSubmissions:   () => Promise<void>
  addSubmission:      (data: any) => Promise<{ submission: LkeSubmission; abbrev_warning?: boolean; parse_error?: string }>
  updateSubmission:   (id: string, data: any) => Promise<void>
  deleteSubmission:   (id: string) => Promise<void>
  syncSubmission:     (id: string) => Promise<void>
  setSelectedUnit:    (unit: LkeSubmission | null) => void
  toggleCompare:      (id: string) => void
  clearCompare:       () => void
  setFilters:         (f: Partial<ZiFilters>) => void
}

export const useZiStore = create<ZiState>((set, get) => ({
  submissions:  [],
  summary:      null,
  isLoading:    false,
  syncingIds:   [],
  selectedUnit: null,
  compareIds:   [],
  filters:      { eselon1: '', status: '', target: '', search: '' },

  fetchSubmissions: async () => {
    set({ isLoading: true })
    try {
      const { filters } = get()
      const params = new URLSearchParams()
      if (filters.eselon1) params.set('eselon1', filters.eselon1)
      if (filters.status)  params.set('status',  filters.status)
      if (filters.target)  params.set('target',  filters.target)
      if (filters.search)  params.set('search',  filters.search)
      const { data } = await axios.get(`/api/zi/submissions?${params}`)
      set((s) => ({
        submissions: data.submissions,
        summary:     data.summary,
        // Sinkronkan selectedUnit jika ada di hasil fetch terbaru
        selectedUnit: s.selectedUnit
          ? (data.submissions.find((x: LkeSubmission) => x._id === s.selectedUnit!._id) ?? s.selectedUnit)
          : null,
      }))
    } finally {
      set({ isLoading: false })
    }
  },

  addSubmission: async (formData) => {
    const { data } = await axios.post('/api/zi/submissions', formData)
    await get().fetchSubmissions()
    return data
  },

  updateSubmission: async (id, formData) => {
    await axios.patch(`/api/zi/submissions/${id}`, formData)
    await get().fetchSubmissions()
  },

  deleteSubmission: async (id) => {
    await axios.delete(`/api/zi/submissions/${id}`)
    set((s) => ({
      submissions: s.submissions.filter((x) => x._id !== id),
      compareIds:  s.compareIds.filter((x) => x !== id),
    }))
    await get().fetchSubmissions()
  },

  syncSubmission: async (id) => {
    set((s) => ({ syncingIds: [...s.syncingIds, id] }))
    try {
      const { data } = await axios.post(`/api/zi/submissions/${id}/sync`)
      set((s) => ({
        submissions: s.submissions.map((x) => x._id === id ? data.submission : x),
        selectedUnit: s.selectedUnit?._id === id ? data.submission : s.selectedUnit,
      }))
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.message
      console.error('[syncSubmission]', msg)
      // Refresh so drawer shows updated sync_error from DB
      await get().fetchSubmissions()
      throw new Error(msg)
    } finally {
      set((s) => ({ syncingIds: s.syncingIds.filter((x) => x !== id) }))
    }
  },

  setSelectedUnit: (unit) => set({ selectedUnit: unit }),

  toggleCompare: (id) => {
    const { compareIds } = get()
    if (compareIds.includes(id)) {
      set({ compareIds: compareIds.filter((x) => x !== id) })
    } else if (compareIds.length < 4) {
      set({ compareIds: [...compareIds, id] })
    }
  },

  clearCompare: () => set({ compareIds: [] }),

  setFilters: (f) => {
    set((s) => ({ filters: { ...s.filters, ...f } }))
    get().fetchSubmissions()
  },
}))
