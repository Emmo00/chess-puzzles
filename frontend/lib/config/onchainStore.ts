export enum ReservationStatus {
  None = 0,
  Pending = 1,
  Earned = 2,
  Claiming = 3,
  Claimed = 4,
  Expired = 5,
  Failed = 6,
}

export const STORE_ABI = [
  {
    type: "function",
    name: "recordPuzzleAttempt",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "puzzleId", type: "string", internalType: "string" },
      { name: "completed", type: "bool", internalType: "bool" },
      { name: "attempts", type: "uint256", internalType: "uint256" },
      { name: "points", type: "uint256", internalType: "uint256" },
      { name: "solvedAt", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setDailyPuzzle",
    inputs: [
      { name: "utcDay", type: "uint256", internalType: "uint256" },
      { name: "puzzleId", type: "string", internalType: "string" },
      { name: "rewardAmount", type: "uint256", internalType: "uint256" },
      { name: "maxCheckIns", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setReservation",
    inputs: [
      { name: "utcDay", type: "uint256", internalType: "uint256" },
      { name: "user", type: "address", internalType: "address" },
      { name: "status", type: "uint8", internalType: "enum ChessPuzzlesStore.ReservationStatus" },
      { name: "rewardAmount", type: "uint256", internalType: "uint256" },
      { name: "solvedAt", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
