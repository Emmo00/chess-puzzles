import { apiFetch } from "@/lib/api";

interface ErrorPayload {
  message: string;
  stack?: string;
  userAddress?: string;
  path?: string;
  action?: string;
  additionalData?: any;
}

export const detectPlatform = (): "minipay" | "others" => {
  if (typeof window === "undefined") return "others";

  // Detect Minipay
  if (window.ethereum?.isMiniPay) {
    return "minipay";
  }

  return "others";
};

export const reportFrontendError = async (payload: ErrorPayload) => {
  try {
    const platform = detectPlatform();

    await apiFetch("/api/errors", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        platform,
      }),
    });
  } catch (err) {
    console.error("Failed to report frontend error", err);
  }
};
