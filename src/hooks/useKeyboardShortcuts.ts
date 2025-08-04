import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

export interface KeyboardShortcutsConfig {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export const useKeyboardShortcuts = (config: KeyboardShortcutsConfig) => {
  const { shortcuts, enabled = true } = config;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in input fields
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement || 
          e.target instanceof HTMLSelectElement) {
        return;
      }

      shortcuts.forEach(shortcut => {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey ? e.ctrlKey : !e.ctrlKey;
        const metaMatch = shortcut.metaKey ? e.metaKey : !e.metaKey;
        const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch) {
          e.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
};

// Predefined shortcuts for common actions
export const createNavigationShortcuts = (setCurrentPage: (page: string) => void) => [
  {
    key: 'd',
    ctrlKey: true,
    action: () => setCurrentPage('dashboard'),
    description: 'Go to Dashboard'
  },
  {
    key: 'p',
    ctrlKey: true,
    action: () => setCurrentPage('pos'),
    description: 'Go to POS'
  },
  {
    key: 'b',
    ctrlKey: true,
    action: () => setCurrentPage('products'),
    description: 'Go to Products'
  },
  {
    key: 'c',
    ctrlKey: true,
    action: () => setCurrentPage('customers'),
    description: 'Go to Customers'
  },
  {
    key: 'i',
    ctrlKey: true,
    action: () => setCurrentPage('inventory'),
    description: 'Go to Inventory'
  },
  {
    key: 'r',
    ctrlKey: true,
    action: () => setCurrentPage('reports'),
    description: 'Go to Reports'
  },
  {
    key: 's',
    ctrlKey: true,
    action: () => setCurrentPage('sales'),
    description: 'Go to Sales'
  },
  {
    key: 'l',
    ctrlKey: true,
    action: () => setCurrentPage('salesperson'),
    description: 'Go to Salesperson'
  }
];

export const createFormShortcuts = (onEscape?: () => void) => [
  {
    key: 'Escape',
    action: () => onEscape?.(),
    description: 'Close/Cancel'
  }
];

export const createPOSShortcuts = (onPaymentFocus?: () => void) => [
  {
    key: 'p',
    metaKey: true,
    action: () => onPaymentFocus?.(),
    description: 'Focus on first price input'
  }
]; 