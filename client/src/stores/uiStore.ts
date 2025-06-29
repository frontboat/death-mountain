import { create } from 'zustand'

interface UIState {
  // Game settings
  setGameSettingsListOpen: (isOpen: boolean) => void
  setGameSettingsDialogOpen: (isOpen: boolean) => void
  setGameSettingsEdit: (edit: boolean) => void
  setSelectedSettingsId: (id: number | null) => void
  isGameSettingsListOpen: boolean
  isGameSettingsDialogOpen: boolean
  gameSettingsEdit: boolean
  selectedSettingsId: number | null
}

export const useUIStore = create<UIState>((set) => ({
  // Game settings
  setGameSettingsListOpen: (isOpen) => set({ isGameSettingsListOpen: isOpen }),
  setGameSettingsDialogOpen: (isOpen) => set({ isGameSettingsDialogOpen: isOpen }),
  setGameSettingsEdit: (edit) => set({ gameSettingsEdit: edit }),
  setSelectedSettingsId: (id) => set({ selectedSettingsId: id }),
  isGameSettingsListOpen: false,
  isGameSettingsDialogOpen: false,
  gameSettingsEdit: false,
  selectedSettingsId: null,
}))
