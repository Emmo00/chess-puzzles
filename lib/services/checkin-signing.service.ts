import { randomBytes } from "crypto";
import { privateKeyToAccount } from "viem/accounts";

import {
  CHECK_IN_CLAIM_TYPES,
  CHECKIN_SIGNATURE_TTL_SECONDS,
  PAYOUT_CLAIMS_EIP712_DOMAIN,
} from "@/lib/config/payoutClaims";
import { getUnixTimestampSeconds } from "@/lib/utils/time";

interface SignedClaimPayload {
  day: number;
  nonce: string;
  deadline: number;
  signature: `0x${string}`;
}

export class CheckInSigningService {
  public generateNonce(): string {
    const hex = randomBytes(16).toString("hex");
    return BigInt(`0x${hex}`).toString();
  }

  public async signCheckInClaim(
    user: `0x${string}`,
    day: number,
    nonce: string,
    deadline = getUnixTimestampSeconds() + CHECKIN_SIGNATURE_TTL_SECONDS
  ): Promise<SignedClaimPayload> {
    const signer = this.resolveSigner();

    const signature = await signer.signTypedData({
      domain: PAYOUT_CLAIMS_EIP712_DOMAIN,
      types: CHECK_IN_CLAIM_TYPES,
      primaryType: "CheckInClaim",
      message: {
        user,
        day: BigInt(day),
        nonce: BigInt(nonce),
        deadline: BigInt(deadline),
      },
    });

    return {
      day,
      nonce,
      deadline,
      signature,
    };
  }

  private resolveSigner() {
    const privateKey = process.env.CHECKIN_SIGNER_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error(
        "Missing CHECKIN_SIGNER_PRIVATE_KEY for check-in claim signing"
      );
    }

    const normalizedPrivateKey = privateKey.split("#")[0]?.trim();
    if (!normalizedPrivateKey || !/^0x[a-fA-F0-9]{64}$/.test(normalizedPrivateKey)) {
      throw new Error(
        "CHECKIN_SIGNER_PRIVATE_KEY must be a valid 32-byte hex private key"
      );
    }

    return privateKeyToAccount(normalizedPrivateKey as `0x${string}`);
  }
}

export default CheckInSigningService;
