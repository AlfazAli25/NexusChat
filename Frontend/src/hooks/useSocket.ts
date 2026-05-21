import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useChatStore } from '@/stores/chatStore';

// Socket events types
interface ServerToClientEvents {
  'user:online': (userId: string) => void;
  'user:offline': (userId: string) => void;
  'message:new': (message: any) => void;
  'message:updated': (message: any) => void;
  'message:deleted': (messageId: string, chatId: string) => void;
  'typing:start': (chatId: string, userName: string) => void;
  'typing:stop': (chatId: string, userName: string) => void;
  'notification:new': (notification: any) => void;
}

interface ClientToServerEvents {
  'message:send': (message: any) => void;
  'message:edit': (messageId: string, content: string) => void;
  'message:delete': (messageId: string) => void;
  'typing:start': (chatId: string) => void;
  'typing:stop': (chatId: string) => void;
  'user:status': (status: string) => void;
}

// Mock socket for demo (no actual server connection)
class MockSocket {
  private listeners: Record<string, Function[]> = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return this;
  }

  off(event: string, callback?: Function) {
    if (callback && this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    } else {
      delete this.listeners[event];
    }
    return this;
  }

  emit(event: string, ...args: any[]) {
    // Simulate server response
    if (event === 'typing:start') {
      setTimeout(() => {
        this.trigger('typing:start', args[0], 'Someone');
      }, 100);
    }
    return this;
  }

  trigger(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(...args));
    }
  }

  connect() {
    return this;
  }

  disconnect() {
    return this;
  }

  get connected() {
    return true;
  }
}

const mockSocket = new MockSocket();

export function useSocket() {
  const socketRef = useRef<MockSocket>(mockSocket);
  const { setTyping } = useChatStore();

  useEffect(() => {
    const socket = socketRef.current;

    // Setup listeners
    socket.on('typing:start', (chatId: string, userName: string) => {
      setTyping(chatId, true);
    });

    socket.on('typing:stop', (chatId: string, userName: string) => {
      setTyping(chatId, false);
    });

    return () => {
      socket.off('typing:start');
      socket.off('typing:stop');
    };
  }, [setTyping]);

  const emitTyping = useCallback((chatId: string, isTyping: boolean) => {
    if (isTyping) {
      socketRef.current.emit('typing:start', chatId);
    } else {
      socketRef.current.emit('typing:stop', chatId);
    }
  }, []);

  const emitMessage = useCallback((message: any) => {
    socketRef.current.emit('message:send', message);
  }, []);

  const emitStatus = useCallback((status: string) => {
    socketRef.current.emit('user:status', status);
  }, []);

  return {
    socket: socketRef.current,
    emitTyping,
    emitMessage,
    emitStatus,
    isConnected: true,
  };
}
