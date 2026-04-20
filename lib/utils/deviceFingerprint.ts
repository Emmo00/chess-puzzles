const DEVICE_FINGERPRINT_STORAGE_KEY = "cp_device_fingerprint_v1";
const DEVICE_FINGERPRINT_REGEX = /^[a-z0-9:_-]{16,128}$/;

const normalizeFingerprint = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!DEVICE_FINGERPRINT_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
};

const generateFingerprint = () => {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now()}${Math.random().toString(36).slice(2, 14)}`;

  return `fp-${raw}`;
};

export const getDeviceFingerprint = () => {
  if (typeof window === "undefined") {
    return "fp-server";
  }

  try {
    const existing = normalizeFingerprint(
      window.localStorage.getItem(DEVICE_FINGERPRINT_STORAGE_KEY)
    );

    if (existing) {
      return existing;
    }

    const generated = generateFingerprint();
    window.localStorage.setItem(DEVICE_FINGERPRINT_STORAGE_KEY, generated);
    return generated;
  } catch {
    return "fp-storage-unavailable";
  }
};

export const DEVICE_FINGERPRINT_HEADER = "x-device-fingerprint";
