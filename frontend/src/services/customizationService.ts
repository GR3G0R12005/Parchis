export interface CustomizationSettings {
  boardTheme: string;
  tokenStyle: string;
}

const CUSTOMIZATION_KEY = 'parchis_customization';

export const customizationService = {
  getSettings: (): CustomizationSettings => {
    const saved = localStorage.getItem(CUSTOMIZATION_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { boardTheme: 'classic', tokenStyle: 'classic' };
      }
    }
    return { boardTheme: 'classic', tokenStyle: 'classic' };
  },

  saveSettings: (settings: CustomizationSettings) => {
    localStorage.setItem(CUSTOMIZATION_KEY, JSON.stringify(settings));
  },

  getBoardUrl: (theme: string): string => {
    const baseUrl = 'https://supabase.cloudteco.com/storage/v1/object/public/assets/boards';
    if (theme === 'classic') {
      return `${baseUrl}/tablero.png`;
    }
    return `${baseUrl}/tablero-${theme}.png`;
  },
};
