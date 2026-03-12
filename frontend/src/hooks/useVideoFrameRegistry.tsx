import React, { createContext, useContext, useRef, useCallback } from 'react';

/**
 * Registry for direct DOM manipulation of video frame <img> elements.
 * Avoids React state updates for every frame arrival — instead updates
 * img.src directly via ref, eliminating 7.5+ re-renders/second.
 */

interface FrameRegistry {
  registerAvatarRef: (userId: string, ref: React.RefObject<HTMLImageElement>) => void;
  updateFrame: (userId: string, url: string) => void;
  unregisterAvatarRef: (userId: string) => void;
  setVideoActive: (userId: string, active: boolean) => void;
}

const FrameRegistryContext = createContext<FrameRegistry | null>(null);

export function useFrameRegistry(): FrameRegistry {
  const context = useContext(FrameRegistryContext);
  if (!context) {
    throw new Error('useFrameRegistry must be used within FrameRegistryProvider');
  }
  return context;
}

export function FrameRegistryProvider({ children }: { children: React.ReactNode }) {
  const registryRef = useRef<Map<string, React.RefObject<HTMLImageElement>>>(new Map());
  const urlCacheRef = useRef<Map<string, string>>(new Map()); // track previous URLs for cleanup
  const videoActiveRef = useRef<Map<string, boolean>>(new Map());

  const registerAvatarRef = useCallback((userId: string, ref: React.RefObject<HTMLImageElement>) => {
    registryRef.current.set(userId, ref);
  }, []);

  const unregisterAvatarRef = useCallback((userId: string) => {
    registryRef.current.delete(userId);
    // Clean up stored URL
    const prevUrl = urlCacheRef.current.get(userId);
    if (prevUrl) {
      URL.revokeObjectURL(prevUrl);
      urlCacheRef.current.delete(userId);
    }
    videoActiveRef.current.delete(userId);
  }, []);

  const updateFrame = useCallback((userId: string, url: string) => {
    const ref = registryRef.current.get(userId);
    if (ref?.current) {
      // Revoke previous URL to prevent memory leak
      const prevUrl = urlCacheRef.current.get(userId);
      if (prevUrl && prevUrl !== url) {
        URL.revokeObjectURL(prevUrl);
      }
      // Direct DOM write — no React state update
      ref.current.src = url;
      urlCacheRef.current.set(userId, url);
      // Mark video as active on first frame
      if (!videoActiveRef.current.has(userId)) {
        videoActiveRef.current.set(userId, true);
      }
    }
  }, []);

  const setVideoActive = useCallback((userId: string, active: boolean) => {
    videoActiveRef.current.set(userId, active);
  }, []);

  const value: FrameRegistry = {
    registerAvatarRef,
    updateFrame,
    unregisterAvatarRef,
    setVideoActive,
  };

  return (
    <FrameRegistryContext.Provider value={value}>
      {children}
    </FrameRegistryContext.Provider>
  );
}
