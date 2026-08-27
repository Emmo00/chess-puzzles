const ADJECTIVES = [
  "Brave", "Calm", "Swift", "Cunning", "Bold", "Quiet", "Royal", "Silver",
  "Golden", "Crimson", "Iron", "Wise", "Noble", "Hidden", "Lucky", "Steady",
  "Fierce", "Gentle", "Mighty", "Bright", "Dark", "Eager", "Fleet", "Grand",
  "Happy", "Jolly", "Keen", "Lively", "Merry", "Neat", "Proud", "Rapid",
  "Sharp", "Tough", "Vivid", "Wild", "Young", "Zesty", "Brisk", "Chill",
  "Dapper", "Elite", "Fresh", "Glad", "Humble", "Jade", "Kind", "Light",
  "Mild", "Nimble", "Odd", "Peak", "Quick", "Rare", "Safe", "Tall",
  "Unreal", "Vast", "Warm", "Able", "Blunt", "Clean", "Dense", "Even",
  "Fine", "Gray", "Hale", "Icy", "Jumbo", "Lanky", "Misty", "Nifty",
  "Open", "Plumb", "Radiant", "Sleek", "Trim", "UltrA", "Vocal", "Wiry",
  "Ample", "Brisk", "Chief", "Droll", "Earnest", "Flush", "Glossy", "Hefty",
  "Indigo", "Jazzy", "Knotty", "Lemon", "Mauve", "Navy", "Olive", "Plum",
  "Rusty", "Sandy", "Teal", "Umber", "Velvet", "White", "Xeric", "Yellow",
];

const ANIMALS = [
  "Falcon", "Lynx", "Badger", "Otter", "Heron", "Viper", "Stag", "Raven",
  "Fox", "Bear", "Wolf", "Owl", "Hawk", "Puma", "Crane", "Mantis",
  "Eagle", "Lion", "Tiger", "Shark", "Whale", "Cobra", "Deer", "Moose",
  "Osprey", "Panther", "Quail", "Robin", "Seal", "Toad", "Urchin", "Vole",
  "Wren", "Yak", "Zebra", "Asp", "Bison", "Coyote", "Dove", "Elk",
  "Finch", "Gecko", "Hare", "Ibex", "Jay", "Koala", "Lark", "Mink",
  "Newt", "Octopus", "Panda", "Rex", "Skunk", "Trout", "Unicorn", "Vulture",
  "Walrus", "Xerus", "Yabby", "Anaconda", "Barracuda", "Cheetah", "Dragon", "Emu",
  "Flamingo", "Gibbon", "Hornet", "Impala", "Jaguar", "Kestrel", "Lemur", "Macaw",
  "Narwhal", "Orca", "Peacock", "Raccoon", "Salamander", "Toucan", "Urus", "Vicuna",
  "Wolverine", "Xenops", "Yapok", "Zorilla", "Antelope", "Bobcat", "Chimpanzee", "Dolphin",
  "Echidna", "Ferret", "Gorilla", "Hyena", "Iguana", "Jackal", "Kangaroo", "Lionfish",
  "Manatee", "Nighthawk", "Ocelot", "Penguin", "Rhinoceros", "Swordfish", "Tapir",
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
  return `${adjective} ${animal}`;
}
