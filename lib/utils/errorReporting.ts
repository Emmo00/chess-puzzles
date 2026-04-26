interface ErrorPayload {
  message: string;
  stack?: string;
  userAddress?: string;
  path?: string;
  action?: string;
  additionalData?: any;
}

export const detectPlatform = (): "minipay" | "farcaster" | "others" => {
  if (typeof window === "undefined") return "others";

  // Detect Minipay
  if (window.ethereum?.isMiniPay) {
    return "minipay";
  }

  // Detect Farcaster by checking for the sdk context or specific iframe properties
  // The Farcaster sdk might inject properties, or we can check user agent
  // For now, if window.parent !== window we could suspect it's an iframe, 
  // but miniapp-sdk initialization is the best way. Since this is synchronous,
  // we can rely on a global flag if we set one, or just check userAgent.
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes("farcaster") || ua.includes("warpcast")) {
    return "farcaster";
  }

  // Fallback for Farcaster (often embedded in an iframe)
  try {
    if (window.self !== window.top && document.referrer.includes("warpcast")) {
      return "farcaster";
    }
  } catch (e) {
    // Ignore cross-origin errors
  }

  return "others";
};

export const reportFrontendError = async (payload: ErrorPayload) => {
  try {
    const platform = detectPlatform();

    await fetch("/api/errors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        platform,
      }),
    });
  } catch (err) {
    console.error("Failed to report frontend error", err);
  }
};
