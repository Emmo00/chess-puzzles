interface Window {
  ethereum?: {
    request: (request: { method: string; params?: any[] }) => Promise<any>;
    isMiniPay?: boolean;
    isMetaMask?: boolean;
    on?: (eventName: string, handler: (...args: any[]) => void) => void;
    removeListener?: (eventName: string, handler: (...args: any[]) => void) => void;
  };
}

declare global {
  interface Window {
    ethereum?: {
      request: (request: { method: string; params?: any[] }) => Promise<any>;
      isMiniPay?: boolean;
      isMetaMask?: boolean;
      on?: (eventName: string, handler: (...args: any[]) => void) => void;
      removeListener?: (eventName: string, handler: (...args: any[]) => void) => void;
    };
  }
}

export {};