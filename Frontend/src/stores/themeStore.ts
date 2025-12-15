import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import gsap from 'gsap';

interface SettingsState {
  theme: 'dark' | 'light';
  notifications: boolean;
  sounds: boolean;
  chatTheme: string;
  avatarSeed: string; // For 3D avatar customization

  toggleTheme: () => void;
  toggleNotifications: () => void;
  toggleSounds: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setChatTheme: (theme: string) => void;
  setAvatarSeed: (seed: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      notifications: true,
      sounds: true,
      chatTheme: 'default',
      avatarSeed: '', // Empty means use username by default

      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark';

        // Animate theme transition
        gsap.to('body', {
          opacity: 0.8,
          duration: 0.15,
          onComplete: () => {
            if (newTheme === 'light') {
              document.documentElement.classList.add('light');
            } else {
              document.documentElement.classList.remove('light');
            }
            gsap.to('body', { opacity: 1, duration: 0.15 });
          },
        });

        set({ theme: newTheme });
      },

      toggleNotifications: () => set((state) => ({ notifications: !state.notifications })),
      toggleSounds: () => set((state) => ({ sounds: !state.sounds })),

      setTheme: (theme) => {
        if (theme === 'light') {
          document.documentElement.classList.add('light');
        } else {
          document.documentElement.classList.remove('light');
        }
        set({ theme });
      },

      setChatTheme: (chatTheme) => set({ chatTheme }),
      setAvatarSeed: (avatarSeed) => set({ avatarSeed }),
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.theme === 'light') {
          document.documentElement.classList.add('light');
        }
      },
    }
  )
);
