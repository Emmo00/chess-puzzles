import { randomInt } from "crypto";

import {
  CHECKIN_RESERVATION_TTL_MINUTES,
  CHECKIN_SIGNATURE_TTL_SECONDS,
  CHECK_IN_CLAIM_TYPES,
  DAILY_CHALLENGE_MAX_RATING,
  DAILY_CHALLENGE_MIN_RATING,
  PAYOUT_CLAIMS_ABI,
  PAYOUT_CLAIMS_EIP712_DOMAIN,
} from "@/lib/config/payoutClaims";
import { PAYOUT_CLAIM_CONTRACT } from "@/lib/config/wagmi";
import {
  CheckInReservation,
  ICheckInReservation,
} from "@/lib/models/checkInReservation.model";
import { DailyChallenge, IDailyChallenge } from "@/lib/models/dailyChallenge.model";
import { HttpException } from "@/lib/services/users.service";
import { getDateAfterMinutes, getUtcDayNumber } from "@/lib/utils/time";
import userPuzzlesModel from "@/lib/models/userPuzzles.model";
import PuzzleAPIClient from "@/lib/services/puzzle-api.client";
import CheckInContractService from "@/lib/services/checkin-contract.service";
import CheckInSigningService from "@/lib/services/checkin-signing.service";
import { recoverTypedDataAddress } from "viem";
import onchainStore from "@/lib/services/onchain-store.service";
import { ReservationStatus } from "@/lib/config/onchainStore";
import { DailyChallenge as DailyChallengeModel } from "@/lib/models/dailyChallenge.model";
import { CheckInReservation as CheckInReservationModel } from "@/lib/models/checkInReservation.model";

const ACTIVE_STATUSES = ["pending", "earned", "claiming", "claimed"];
const CLAIMABLE_STATUSES = ["earned", "claiming"];

class CheckInService {
  private puzzleApi = new PuzzleAPIClient();
  private contractService = new CheckInContractService();
  private signingService = new CheckInSigningService();

  public async getDailyStatus(walletAddress?: string) {
    const utcDay: number = getUtcDayNumber();
    const contractValues = await this.contractService.getCheckInContractValues();
    const challenge = await DailyChallenge.findOne({ utcDay });

    if (challenge) {
      await this.expirePendingReservations(challenge);
    }

    const refreshedChallenge = challenge
      ? await DailyChallenge.findById(challenge._id)
      : null;

    const activeReservations = refreshedChallenge?.activeReservationCount || 0;
    const slotsRemaining = Math.max(
      0,
      contractValues.maxDailyCheckIns - activeReservations
    );

    let reservation: ICheckInReservation | null = null;
    if (walletAddress) {
      reservation = await CheckInReservation.findOne({
        walletAddress: walletAddress.toLowerCase(),
        utcDay,
      });
    }

    const canClaimReward = this.canClaimReward(reservation);

    return {
      utcDay,
      maxDailyCheckIns: contractValues.maxDailyCheckIns,
      checkInAmountWei: contractValues.checkInAmountWei,
      checkInAmountDisplay: contractValues.checkInAmountDisplay,
      payoutTokenAddress: contractValues.payoutTokenAddress,
      payoutTokenDecimals: contractValues.payoutTokenDecimals,
      payoutTokenSymbol: contractValues.payoutTokenSymbol,
      activeReservations,
      slotsRemaining,
      hasSlots: slotsRemaining > 0,
      canClaimReward,
      challenge: refreshedChallenge
        ? {
            puzzleId: refreshedChallenge.puzzle.puzzleId,
            fen: refreshedChallenge.puzzle.fen,
            rating: refreshedChallenge.puzzle.rating,
            ratingDeviation: refreshedChallenge.puzzle.ratingDeviation,
            moves: refreshedChallenge.puzzle.moves,
            themes: refreshedChallenge.puzzle.themes,
          }
        : null,
      reservation: reservation
        ? {
            status: reservation.status,
            rewardEligible: this.isRewardEligible(reservation),
            canClaimReward,
            pendingExpiresAt: reservation.pendingExpiresAt,
            claimTxHash: reservation.claimTxHash,
            claimedAt: reservation.claimedAt,
          }
        : null,
    };
  }

  public async fetchDailyChallenge(walletAddress: string) {
    const utcDay: number = getUtcDayNumber();
    const normalizedWallet = walletAddress.toLowerCase();

    const contractValues = await this.contractService.getCheckInContractValues();
    const challenge = await this.ensureDailyChallenge(
      utcDay,
      normalizedWallet,
      contractValues.maxDailyCheckIns,
      contractValues.checkInAmountWei
    );

    return {
      reusedReservation: false,
      utcDay: challenge.utcDay,
      checkInAmountWei: contractValues.checkInAmountWei,
      checkInAmountDisplay: contractValues.checkInAmountDisplay,
      payoutTokenAddress: contractValues.payoutTokenAddress,
      payoutTokenDecimals: contractValues.payoutTokenDecimals,
      payoutTokenSymbol: contractValues.payoutTokenSymbol,
      maxDailyCheckIns: contractValues.maxDailyCheckIns,
      activeReservations: challenge.activeReservationCount,
      slotsRemaining: Math.max(0, contractValues.maxDailyCheckIns - challenge.activeReservationCount),
      hasSlots: challenge.activeReservationCount < contractValues.maxDailyCheckIns,
      puzzle: {
        puzzleid: challenge.puzzle.puzzleId,
        fen: challenge.puzzle.fen,
        rating: challenge.puzzle.rating,
        ratingdeviation: challenge.puzzle.ratingDeviation,
        moves: challenge.puzzle.moves,
        themes: challenge.puzzle.themes,
      },
    };
  }

  public async solveDailyChallenge(walletAddress: string, puzzleId: string) {
    const utcDay: number = getUtcDayNumber();
    const normalizedWallet = walletAddress.toLowerCase();

    const challenge = await DailyChallenge.findOne({ utcDay });
    if (!challenge) {
      throw new HttpException(404, "No daily challenge found for today");
    }

    if (challenge.puzzle.puzzleId !== puzzleId) {
      throw new HttpException(400, "Submitted puzzle does not match today's challenge");
    }

    const contractValues = await this.contractService.getCheckInContractValues();

    // Check for existing reservation (already solved or claimed)
    const existingReservation = await CheckInReservation.findOne({
      walletAddress: normalizedWallet,
      utcDay,
    });

    if (existingReservation) {
      if (existingReservation.status === "claimed") {
        return {
          alreadyClaimed: true,
          status: existingReservation.status,
          puzzleId,
          rewardEligible: this.isRewardEligible(existingReservation),
          canClaimReward: false,
        };
      }

      if (existingReservation.status === "earned" || existingReservation.status === "claiming") {
        return {
          success: true,
          firstSolve: false,
          alreadySolved: true,
          status: existingReservation.status,
          checkInAmountWei: existingReservation.checkInAmountWei,
          rewardEligible: this.isRewardEligible(existingReservation),
          canClaimReward: this.canClaimReward(existingReservation),
        };
      }
    }

    const solvedAt = new Date();

    // Atomically reserve a slot — only succeeds if under the daily limit
    const slotChallenge = await DailyChallenge.findOneAndUpdate(
      {
        _id: challenge._id,
        activeReservationCount: { $lt: contractValues.maxDailyCheckIns },
      },
      { $inc: { activeReservationCount: 1 } },
      { returnDocument: "after" }
    );

    const hasSlot = !!slotChallenge;
    const activeCount = slotChallenge?.activeReservationCount ?? challenge.activeReservationCount;

    const pendingExpiresAt = getDateAfterMinutes(CHECKIN_RESERVATION_TTL_MINUTES);

    // Create or update reservation
    const reservationData = {
      walletAddress: normalizedWallet,
      utcDay,
      dailyChallengeId: challenge._id,
      puzzleId,
      status: "earned" as const,
      rewardEligible: hasSlot,
      countsTowardSlots: hasSlot,
      checkInAmountWei: contractValues.checkInAmountWei,
      pendingExpiresAt,
      solvedAt,
    };

    if (existingReservation) {
      await CheckInReservation.findByIdAndUpdate(
        existingReservation._id,
        { $set: reservationData },
        { returnDocument: "after" }
      );
    } else {
      try {
        await CheckInReservation.create(reservationData);
      } catch (err: any) {
        // Roll back slot increment on reservation creation failure
        if (hasSlot) {
          await DailyChallenge.findByIdAndUpdate(challenge._id, {
            $inc: { activeReservationCount: -1 },
          });
        }
        throw err;
      }
    }

    await userPuzzlesModel.findOneAndUpdate(
      { userWalletAddress: normalizedWallet, puzzleId },
      {
        completed: true,
        attempts: 1,
        points: 0,
        type: "daily",
        solvedAt,
      },
      { returnDocument: "after", upsert: true }
    );

    // Fire and forget on-chain solve
    if (hasSlot) {
      onchainStore.setReservation(
        utcDay,
        normalizedWallet,
        ReservationStatus.Earned,
        contractValues.checkInAmountWei,
        Math.floor(solvedAt.getTime() / 1000)
      ).then(hash => {
        if (hash) {
          console.log(`On-chain solve synced for ${normalizedWallet}. Updating DB...`);
          CheckInReservationModel.findOneAndUpdate(
            { walletAddress: normalizedWallet, utcDay },
            { onChainSynced: true }
          ).exec();
        }
      }).catch(err => console.error("On-chain solve update failed:", err));
    }

    return {
      success: true,
      firstSolve: true,
      status: "earned",
      checkInAmountWei: contractValues.checkInAmountWei,
      rewardEligible: hasSlot,
      canClaimReward: hasSlot,
      slotsRemaining: Math.max(0, contractValues.maxDailyCheckIns - activeCount),
    };
  }

  public async getFreshClaimPayload(walletAddress: string, deviceFingerprint?: string) {
    const utcDay: number = getUtcDayNumber();
    const normalizedWallet = walletAddress.toLowerCase();
    const normalizedFingerprint = this.normalizeDeviceFingerprint(deviceFingerprint);

    const reservation = await CheckInReservation.findOne({
      walletAddress: normalizedWallet,
      utcDay,
    });

    if (!reservation) {
      throw new HttpException(404, "No daily check-in reservation found");
    }

    if (reservation.status === "claimed") {
      throw new HttpException(409, "Daily challenge reward already claimed");
    }

    if (!this.isRewardEligible(reservation)) {
      throw new HttpException(409, "Today's reward slots are already taken up");
    }

    if (!CLAIMABLE_STATUSES.includes(reservation.status)) {
      throw new HttpException(
        409,
        `Cannot claim reward while reservation is '${reservation.status}'`
      );
    }

    await this.assertClaimAllowedForDevice(
      reservation,
      normalizedWallet,
      utcDay,
      normalizedFingerprint
    );

    const signedPayload = await this.generateSignedPayload(normalizedWallet, utcDay);

    if (signedPayload.deadline <= Math.floor(Date.now() / 1000)) {
      throw new HttpException(500, "Generated claim signature is already expired");
    }

    return {
      user: normalizedWallet as `0x${string}`,
      day: utcDay,
      nonce: signedPayload.nonce,
      deadline: signedPayload.deadline,
      signature: signedPayload.signature,
    };
  }

  public async markClaiming(
    walletAddress: string,
    txHash: string,
    deviceFingerprint?: string
  ) {
    const utcDay: number = getUtcDayNumber();
    const normalizedWallet = walletAddress.toLowerCase();
    const normalizedFingerprint = this.normalizeDeviceFingerprint(deviceFingerprint);

    const reservation = await CheckInReservation.findOne({
      walletAddress: normalizedWallet,
      utcDay,
    });

    if (!reservation) {
      throw new HttpException(404, "No daily check-in reservation found");
    }

    if (!this.isRewardEligible(reservation)) {
      throw new HttpException(409, "Today's reward slots are already taken up");
    }

    if (![...CLAIMABLE_STATUSES, "claimed"].includes(reservation.status)) {
      throw new HttpException(409, `Cannot claim in '${reservation.status}' state`);
    }

    await this.assertClaimAllowedForDevice(
      reservation,
      normalizedWallet,
      utcDay,
      normalizedFingerprint
    );

    if (reservation.status === "claimed") {
      return reservation;
    }

    reservation.status = "claiming";
    reservation.claimTxHash = txHash.toLowerCase();
    await reservation.save();

    return reservation;
  }

  public async markClaimed(walletAddress: string, txHash: string) {
    const utcDay: number = getUtcDayNumber();
    const reservation = await CheckInReservation.findOne({
      walletAddress: walletAddress.toLowerCase(),
      utcDay,
    });

    if (!reservation) {
      throw new HttpException(404, "No daily check-in reservation found");
    }

    reservation.status = "claimed";
    reservation.claimTxHash = txHash.toLowerCase();
    reservation.claimedAt = new Date();
    await reservation.save();

    // Fire and forget on-chain claim update
    onchainStore.setReservation(
      reservation.utcDay,
      reservation.walletAddress,
      ReservationStatus.Claimed,
      reservation.checkInAmountWei,
      reservation.solvedAt ? Math.floor(reservation.solvedAt.getTime() / 1000) : 0
    ).then(hash => {
      if (hash) {
        console.log(`On-chain claim synced for ${reservation.walletAddress}. Updating DB...`);
        CheckInReservationModel.findByIdAndUpdate(reservation._id, { onChainSynced: true }).exec();
      }
    }).catch(err => console.error("On-chain claim update failed:", err));

    return reservation;
  }

  private async ensureDailyChallenge(
    utcDay: number,
    createdByWallet: string,
    maxDailyCheckIns: number,
    checkInAmountWei: string
  ) {
    const existing = await DailyChallenge.findOne({ utcDay });
    if (existing) {
      return existing;
    }

    const puzzle = await this.puzzleApi.fetchRandomPuzzle(randomInt(2, 4), {
      min: DAILY_CHALLENGE_MIN_RATING,
      max: DAILY_CHALLENGE_MAX_RATING,
    });

    try {
      const challenge = await DailyChallenge.create({
        utcDay,
        puzzle: {
          puzzleId: puzzle.puzzleid,
          fen: puzzle.fen,
          rating: puzzle.rating,
          ratingDeviation: puzzle.ratingdeviation,
          moves: puzzle.moves,
          themes: puzzle.themes,
        },
        activeReservationCount: 0,
        maxDailyCheckInsSnapshot: maxDailyCheckIns,
        checkInAmountWeiSnapshot: checkInAmountWei,
        createdByWallet,
      });

      // Fire and forget on-chain daily puzzle
      onchainStore.setDailyPuzzle(
        utcDay,
        puzzle.puzzleid,
        checkInAmountWei,
        maxDailyCheckIns
      ).then(hash => {
        if (hash) {
          console.log(`On-chain daily puzzle synced for day ${utcDay}. Updating DB...`);
          DailyChallengeModel.findOneAndUpdate({ utcDay }, { onChainSynced: true }).exec();
        }
      }).catch(err => console.error("On-chain setDailyPuzzle failed:", err));

      return challenge;
    } catch (error: any) {
      if (error?.code === 11000) {
        const duplicated = await DailyChallenge.findOne({ utcDay });
        if (duplicated) {
          return duplicated;
        }
      }
      throw error;
    }
  }

  private async expirePendingReservations(challenge: IDailyChallenge) {
    const now = new Date();

    const expiringReservations = await CheckInReservation.find(
      {
        dailyChallengeId: challenge._id,
        status: "pending",
        pendingExpiresAt: { $lte: now },
      },
      { _id: 1, countsTowardSlots: 1 }
    );

    if (expiringReservations.length === 0) {
      return;
    }

    const expiringIds = expiringReservations.map((reservation) => reservation._id);

    await CheckInReservation.updateMany(
      {
        _id: { $in: expiringIds },
      },
      {
        $set: { status: "expired", errorMessage: "Reservation expired" },
      }
    );

    const countedExpirations = expiringReservations.filter((reservation) =>
      this.countsTowardSlots(reservation)
    ).length;

    if (countedExpirations > 0) {
      await DailyChallenge.findByIdAndUpdate(challenge._id, {
        $inc: { activeReservationCount: -countedExpirations },
      });
    }
  }

  private async generateSignedPayload(walletAddress: string, utcDay: number) {
    const publicClient = this.contractService.getPublicClient();
    const [onChainSigner, onChainDomain, onChainCheckInNonce] = await Promise.all([
      publicClient.readContract({
        address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
        abi: PAYOUT_CLAIMS_ABI,
        functionName: "serverSigner",
      }),
      publicClient.readContract({
        address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
        abi: PAYOUT_CLAIMS_ABI,
        functionName: "eip712Domain",
      }),
      publicClient.readContract({
        address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
        abi: PAYOUT_CLAIMS_ABI,
        functionName: "checkInNonces",
        args: [walletAddress as `0x${string}`],
      }),
    ]);

    const [, domainName, domainVersion, domainChainId, domainVerifyingContract] =
      onChainDomain;

    const expectedDomain = PAYOUT_CLAIMS_EIP712_DOMAIN;
    const domainMatches =
      String(domainName) === expectedDomain.name &&
      String(domainVersion) === expectedDomain.version &&
      Number(domainChainId) === Number(expectedDomain.chainId) &&
      String(domainVerifyingContract).toLowerCase() ===
        String(expectedDomain.verifyingContract).toLowerCase();

    if (!domainMatches) {
      throw new HttpException(
        500,
        "EIP-712 domain mismatch between backend config and payout contract"
      );
    }

    const nonce = onChainCheckInNonce.toString();
    const deadline =
      Math.floor(Date.now() / 1000) + CHECKIN_SIGNATURE_TTL_SECONDS;

    const signed = await this.signingService.signCheckInClaim(
      walletAddress as `0x${string}`,
      utcDay,
      nonce,
      deadline
    );

    const recoveredAddress = await recoverTypedDataAddress({
      domain: expectedDomain,
      types: CHECK_IN_CLAIM_TYPES,
      primaryType: "CheckInClaim",
      message: {
        user: walletAddress as `0x${string}`,
        day: BigInt(utcDay),
        nonce: BigInt(signed.nonce),
        deadline: BigInt(signed.deadline),
      },
      signature: signed.signature,
    });

    if (recoveredAddress.toLowerCase() !== String(onChainSigner).toLowerCase()) {
      throw new HttpException(
        500,
        "CHECKIN_SIGNER_PRIVATE_KEY does not match on-chain serverSigner"
      );
    }

    return signed;
  }

  private toReservationResponse(
    challenge: IDailyChallenge,
    reservation: ICheckInReservation,
    contractValues: {
      checkInAmountWei: string;
      checkInAmountDisplay: string;
      maxDailyCheckIns: number;
      payoutTokenAddress: `0x${string}`;
      payoutTokenDecimals: number;
      payoutTokenSymbol: string;
    },
    reusedReservation: boolean
  ) {
    return {
      reusedReservation,
      utcDay: challenge.utcDay,
      checkInAmountWei: contractValues.checkInAmountWei,
      checkInAmountDisplay: contractValues.checkInAmountDisplay,
      payoutTokenAddress: contractValues.payoutTokenAddress,
      payoutTokenDecimals: contractValues.payoutTokenDecimals,
      payoutTokenSymbol: contractValues.payoutTokenSymbol,
      maxDailyCheckIns: contractValues.maxDailyCheckIns,
      activeReservations: challenge.activeReservationCount,
      slotsRemaining: Math.max(
        0,
        contractValues.maxDailyCheckIns - challenge.activeReservationCount
      ),
      hasSlots: challenge.activeReservationCount < contractValues.maxDailyCheckIns,
      reservation: {
        status: reservation.status,
        rewardEligible: this.isRewardEligible(reservation),
        canClaimReward: this.canClaimReward(reservation),
        pendingExpiresAt: reservation.pendingExpiresAt,
      },
      puzzle: {
        puzzleid: challenge.puzzle.puzzleId,
        fen: challenge.puzzle.fen,
        rating: challenge.puzzle.rating,
        ratingdeviation: challenge.puzzle.ratingDeviation,
        moves: challenge.puzzle.moves,
        themes: challenge.puzzle.themes,
      },
    };
  }

  private isRewardEligible(
    reservation?: Pick<ICheckInReservation, "rewardEligible"> | null
  ) {
    return reservation?.rewardEligible !== false;
  }

  private countsTowardSlots(
    reservation?: Pick<ICheckInReservation, "countsTowardSlots"> | null
  ) {
    return reservation?.countsTowardSlots !== false;
  }

  private canClaimReward(
    reservation?: Pick<ICheckInReservation, "status" | "rewardEligible"> | null
  ) {
    if (!reservation || !this.isRewardEligible(reservation)) {
      return false;
    }

    return CLAIMABLE_STATUSES.includes(reservation.status);
  }

  private normalizeDeviceFingerprint(deviceFingerprint?: string) {
    const normalized = deviceFingerprint?.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }

    return normalized;
  }

  private isDuplicateDeviceRewardSlotError(error: any) {
    return (
      error?.code === 11000 &&
      (error?.keyPattern?.deviceFingerprint ||
        String(error?.message || "").includes("unique_reward_slot_per_device_per_day"))
    );
  }

  private async assertClaimAllowedForDevice(
    reservation: ICheckInReservation,
    walletAddress: string,
    utcDay: number,
    deviceFingerprint?: string
  ) {
    const storedFingerprint = this.normalizeDeviceFingerprint(
      reservation.deviceFingerprint
    );

    if (storedFingerprint && deviceFingerprint && storedFingerprint !== deviceFingerprint) {
      throw new HttpException(
        409,
        "Claim must be completed from the same device fingerprint used for reservation"
      );
    }

    const claimFingerprint = deviceFingerprint || storedFingerprint;
    if (!claimFingerprint) {
      return;
    }

    const alreadyClaimedFromDevice = await CheckInReservation.exists({
      utcDay,
      deviceFingerprint: claimFingerprint,
      status: "claimed",
      walletAddress: { $ne: walletAddress },
    });

    if (alreadyClaimedFromDevice) {
      throw new HttpException(409, "Only one claim is allowed per device fingerprint each day");
    }
  }
}

export default CheckInService;
