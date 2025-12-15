import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';

export function useScrollToBottom<T extends HTMLElement>(dependency: any[]) {
  const containerRef = useRef<T>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (containerRef.current) {
      const element = containerRef.current;
      if (smooth) {
        gsap.to(element, {
          scrollTop: element.scrollHeight,
          duration: 0.5,
          ease: 'power2.out',
        });
      } else {
        element.scrollTop = element.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, dependency);

  return { containerRef, scrollToBottom };
}
