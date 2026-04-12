import { ethers } from "ethers";

const action = process.env.ACTION ?? "checkin";
const chainId = Number(process.env.CHAIN_ID ?? "42220");
const claimsContract = process.env.CLAIMS_CONTRACT;
const userAddress = process.env.USER_ADDRESS;
const serverPrivateKey = process.env.SERVER_PRIVATE_KEY;

if (!claimsContract || !userAddress || !serverPrivateKey) {
  throw new Error("Missing required env vars: CLAIMS_CONTRACT, USER_ADDRESS, SERVER_PRIVATE_KEY");
}

const now = Math.floor(Date.now() / 1000);
const signer = new ethers.Wallet(serverPrivateKey);

const domain = {
  name: "MiniPayPayoutClaims",
  version: "1",
  chainId,
  verifyingContract: claimsContract,
};

const types = {
  CheckInClaim: [
    { name: "user", type: "address" },
    { name: "day", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  LeaderboardClaim: [
    { name: "user", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "claimId", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

function toBigIntEnv(name, fallback) {
  return BigInt(process.env[name] ?? fallback);
}

async function signCheckIn() {
  const message = {
    user: userAddress,
    day: toBigIntEnv("DAY", String(Math.floor(now / 86400))),
    nonce: toBigIntEnv("NONCE", "1"),
    deadline: toBigIntEnv("DEADLINE", String(now + 600)),
  };

  const signature = await signer.signTypedData(domain, { CheckInClaim: types.CheckInClaim }, message);

  console.log(
    JSON.stringify(
      {
        action: "checkin",
        domain,
        message,
        signature,
        signer: signer.address,
      },
      null,
      2
    )
  );
}

async function signLeaderboard() {
  const message = {
    user: userAddress,
    amount: toBigIntEnv("AMOUNT", "1000000000000000000"),
    claimId: process.env.CLAIM_ID ?? ethers.hexlify(ethers.randomBytes(32)),
    nonce: toBigIntEnv("NONCE", "1"),
    deadline: toBigIntEnv("DEADLINE", String(now + 600)),
  };

  const signature = await signer.signTypedData(domain, { LeaderboardClaim: types.LeaderboardClaim }, message);

  console.log(
    JSON.stringify(
      {
        action: "leaderboard",
        domain,
        message,
        signature,
        signer: signer.address,
      },
      null,
      2
    )
  );
}

if (action === "checkin") {
  await signCheckIn();
} else if (action === "leaderboard") {
  await signLeaderboard();
} else {
  throw new Error("ACTION must be checkin or leaderboard");
}
