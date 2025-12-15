import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function usePageTransition() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      );
    }
  }, []);

  return containerRef;
}

export function useMessageAnimation() {
  const animateMessage = (element: HTMLElement, direction: 'left' | 'right') => {
    gsap.fromTo(
      element,
      {
        opacity: 0,
        x: direction === 'right' ? 30 : -30,
        scale: 0.9,
      },
      {
        opacity: 1,
        x: 0,
        scale: 1,
        duration: 0.4,
        ease: 'back.out(1.7)',
      }
    );
  };

  return { animateMessage };
}

export function useSidebarAnimation() {
  const sidebarRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = (isOpen: boolean) => {
    if (sidebarRef.current) {
      gsap.to(sidebarRef.current, {
        x: isOpen ? 0 : -320,
        duration: 0.4,
        ease: 'power3.inOut',
      });
    }
  };

  return { sidebarRef, toggleSidebar };
}

export function useModalAnimation() {
  const openModal = (overlay: HTMLElement, content: HTMLElement) => {
    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    gsap.fromTo(
      content,
      { opacity: 0, scale: 0.9, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.7)' }
    );
  };

  const closeModal = (overlay: HTMLElement, content: HTMLElement, onComplete: () => void) => {
    gsap.to(content, {
      opacity: 0,
      scale: 0.9,
      y: 20,
      duration: 0.3,
      ease: 'power3.in',
    });
    gsap.to(overlay, {
      opacity: 0,
      duration: 0.3,
      onComplete,
    });
  };

  return { openModal, closeModal };
}

export function useStaggerAnimation() {
  const animateStagger = (elements: HTMLElement[], direction: 'up' | 'down' | 'left' | 'right' = 'up') => {
    const axis = direction === 'up' || direction === 'down' ? 'y' : 'x';
    const distance = direction === 'up' || direction === 'left' ? 30 : -30;

    gsap.fromTo(
      elements,
      {
        opacity: 0,
        [axis]: distance,
      },
      {
        opacity: 1,
        [axis]: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: 'power3.out',
      }
    );
  };

  return { animateStagger };
}

export function useHoverAnimation() {
  const animateHover = (element: HTMLElement, scale = 1.05) => {
    gsap.to(element, {
      scale,
      duration: 0.2,
      ease: 'power2.out',
    });
  };

  const animateHoverOut = (element: HTMLElement) => {
    gsap.to(element, {
      scale: 1,
      duration: 0.2,
      ease: 'power2.out',
    });
  };

  return { animateHover, animateHoverOut };
}
