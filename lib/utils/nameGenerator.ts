const ADJECTIVES = [
  "Brave", "Calm", "Swift", "Cunning", "Bold", "Quiet", "Royal", "Silver",
  "Golden", "Crimson", "Iron", "Wise", "Noble", "Hidden", "Lucky", "Steady",
];
const ANIMALS = [
  "Falcon", "Lynx", "Badger", "Otter", "Heron", "Viper", "Stag", "Raven",
  "Fox", "Bear", "Wolf", "Owl", "Hawk", "Puma", "Crane", "Mantis",
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateDisplayName(walletAddress: string): string {
  const normalized = walletAddress.toLowerCase();
  const hash = hashString(normalized);
  const adjective = ADJECTIVES[hash % ADJECTIVES.length];
  const animal = ANIMALS[(hash >> 8) % ANIMALS.length];
  const suffix = normalized.slice(-4).toUpperCase();
  return `${adjective} ${animal} ${suffix}`;
}
