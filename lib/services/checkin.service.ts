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

  public async reserveDailyChallenge(walletAddress: string) {
    const utcDay: number = getUtcDayNumber();
    const normalizedWallet = walletAddress.toLowerCase();

    const contractValues = await this.contractService.getCheckInContractValues();
    let challenge = await this.ensureDailyChallenge(
      utcDay,
      normalizedWallet,
      contractValues.maxDailyCheckIns,
      contractValues.checkInAmountWei
    );

    await this.expirePendingReservations(challenge);
    const reloadedChallenge = await DailyChallenge.findById(challenge._id);
    if (reloadedChallenge) {
      challenge = reloadedChallenge;
    }

    const existingReservation: ICheckInReservation | null =
      await CheckInReservation.findOne({
      walletAddress: normalizedWallet,
      utcDay,
      });

    if (existingReservation) {
      if (existingReservation.status === "pending") {
        if (existingReservation.pendingExpiresAt.getTime() > Date.now()) {
          return this.toReservationResponse(
            challenge,
            existingReservation,
            contractValues,
            true
          );
        }

        existingReservation.status = "expired";
        await existingReservation.save();
        if (this.countsTowardSlots(existingReservation)) {
          const decrementedChallenge = await DailyChallenge.findByIdAndUpdate(
            challenge._id,
            {
              $inc: { activeReservationCount: -1 },
            },
            { new: true }
          );

          if (decrementedChallenge) {
            challenge = decrementedChallenge;
          }
        }
      } else if (ACTIVE_STATUSES.includes(existingReservation.status)) {
        return this.toReservationResponse(
          challenge,
          existingReservation,
          contractValues,
          true
        );
      }
    }

    let rewardEligible = true;
    let countsTowardSlots = true;
    const incrementedChallenge = await DailyChallenge.findOneAndUpdate(
      {
        _id: challenge._id,
        activeReservationCount: { $lt: contractValues.maxDailyCheckIns },
      },
      {
        $inc: { activeReservationCount: 1 },
      },
      { new: true }
    );

    if (incrementedChallenge) {
      challenge = incrementedChallenge;
    } else {
      rewardEligible = false;
      countsTowardSlots = false;
    }

    const pendingExpiresAt = getDateAfterMinutes(CHECKIN_RESERVATION_TTL_MINUTES);

    const reservationData = {
      walletAddress: normalizedWallet,
      utcDay,
      dailyChallengeId: challenge._id,
      puzzleId: challenge.puzzle.puzzleId,
      status: "pending" as const,
      rewardEligible,
      countsTowardSlots,
      checkInAmountWei: contractValues.checkInAmountWei,
      pendingExpiresAt,
      solvedAt: undefined,
      claimNonce: undefined,
      claimDeadline: undefined,
      claimSignature: undefined,
      claimTxHash: undefined,
      claimedAt: undefined,
      errorMessage: undefined,
    };

    let reservation: ICheckInReservation;
    if (existingReservation) {
      const updatedReservation = await CheckInReservation.findByIdAndUpdate(
        existingReservation._id,
        { $set: reservationData },
        { new: true }
      );

      if (!updatedReservation) {
        if (countsTowardSlots) {
          await DailyChallenge.findByIdAndUpdate(challenge._id, {
            $inc: { activeReservationCount: -1 },
          });
        }
        throw new HttpException(500, "Failed to refresh daily challenge reservation");
      }

      reservation = updatedReservation;
    } else {
      try {
        reservation = await CheckInReservation.create(reservationData);
      } catch (error) {
        if (countsTowardSlots) {
          await DailyChallenge.findByIdAndUpdate(challenge._id, {
            $inc: { activeReservationCount: -1 },
          });
        }
        throw error;
      }
    }

    if (!reservation) {
      if (countsTowardSlots) {
        await DailyChallenge.findByIdAndUpdate(challenge._id, {
          $inc: { activeReservationCount: -1 },
        });
      }
      throw new HttpException(500, "Failed to reserve daily challenge slot");
    }

    const existingPuzzleAttempt = await userPuzzlesModel.findOne({
      userWalletAddress: normalizedWallet,
      puzzleId: challenge.puzzle.puzzleId,
    });

    if (!existingPuzzleAttempt) {
      await userPuzzlesModel.create({
        userWalletAddress: normalizedWallet,
        puzzleId: challenge.puzzle.puzzleId,
        type: "daily",
      });
    }

    return this.toReservationResponse(challenge, reservation, contractValues, false);
  }

  public async solveDailyChallenge(walletAddress: string, puzzleId: string) {
    const utcDay: number = getUtcDayNumber();
    const normalizedWallet = walletAddress.toLowerCase();

    const reservation = await CheckInReservation.findOne({
      walletAddress: normalizedWallet,
      utcDay,
    });

    if (!reservation) {
      throw new HttpException(404, "No daily challenge reservation found for today");
    }

    const challenge = await DailyChallenge.findById(reservation.dailyChallengeId);
    if (!challenge) {
      throw new HttpException(500, "Daily challenge record is missing");
    }

    await this.expirePendingReservations(challenge);
    const refreshedReservation = await CheckInReservation.findById(reservation._id);
    if (!refreshedReservation) {
      throw new HttpException(404, "Daily challenge reservation no longer exists");
    }

    const currentReservation = refreshedReservation;
    const rewardEligible = this.isRewardEligible(currentReservation);

    if (currentReservation.status === "claimed") {
      return {
        alreadyClaimed: true,
        status: currentReservation.status,
        puzzleId: challenge.puzzle.puzzleId,
        rewardEligible,
        canClaimReward: false,
      };
    }

    if (currentReservation.status === "earned" || currentReservation.status === "claiming") {
      return {
        success: true,
        firstSolve: false,
        alreadySolved: true,
        status: currentReservation.status,
        checkInAmountWei: currentReservation.checkInAmountWei,
        rewardEligible,
        canClaimReward: this.canClaimReward(currentReservation),
      };
    }

    if (currentReservation.status !== "pending") {
      throw new HttpException(
        409,
        `Daily challenge is not solvable in '${currentReservation.status}' state`
      );
    }

    if (
      rewardEligible &&
      currentReservation.pendingExpiresAt.getTime() <= Date.now()
    ) {
      currentReservation.status = "expired";
      await currentReservation.save();
      if (this.countsTowardSlots(currentReservation)) {
        await DailyChallenge.findByIdAndUpdate(challenge._id, {
          $inc: { activeReservationCount: -1 },
        });
      }
      throw new HttpException(409, "Reservation expired. Please reserve again.");
    }

    if (currentReservation.puzzleId !== puzzleId) {
      throw new HttpException(400, "Submitted puzzle does not match today's challenge");
    }

    const solvedAt = new Date();
    const updatedReservation = await CheckInReservation.findOneAndUpdate(
      {
        _id: currentReservation._id,
        status: "pending",
      },
      {
        $set: {
          status: "earned",
          solvedAt,
          claimNonce: undefined,
          claimDeadline: undefined,
          claimSignature: undefined,
        },
      },
      { new: true }
    );

    if (!updatedReservation) {
      const latestReservation = await CheckInReservation.findById(currentReservation._id);

      if (!latestReservation) {
        throw new HttpException(404, "Daily challenge reservation no longer exists");
      }

      const latestRewardEligible = this.isRewardEligible(latestReservation);

      if (latestReservation.status === "claimed") {
        return {
          alreadyClaimed: true,
          status: latestReservation.status,
          puzzleId: challenge.puzzle.puzzleId,
          rewardEligible: latestRewardEligible,
          canClaimReward: false,
        };
      }

      if (latestReservation.status === "earned" || latestReservation.status === "claiming") {
        return {
          success: true,
          firstSolve: false,
          alreadySolved: true,
          status: latestReservation.status,
          checkInAmountWei: latestReservation.checkInAmountWei,
          rewardEligible: latestRewardEligible,
          canClaimReward: this.canClaimReward(latestReservation),
        };
      }

      throw new HttpException(
        409,
        `Daily challenge is not solvable in '${latestReservation.status}' state`
      );
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
      { new: true }
    );

    return {
      success: true,
      firstSolve: true,
      status: updatedReservation.status,
      checkInAmountWei: updatedReservation.checkInAmountWei,
      rewardEligible,
      canClaimReward: this.canClaimReward(updatedReservation),
    };
  }

  public async getFreshClaimPayload(walletAddress: string) {
    const utcDay: number = getUtcDayNumber();
    const normalizedWallet = walletAddress.toLowerCase();

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

  public async markClaiming(walletAddress: string, txHash: string) {
    const utcDay: number = getUtcDayNumber();

    const reservation = await CheckInReservation.findOne({
      walletAddress: walletAddress.toLowerCase(),
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

    return reservation;
  }

  public async markFailedClaim(walletAddress: string, txHash: string, error: string) {
    const utcDay: number = getUtcDayNumber();
    const reservation = await CheckInReservation.findOne({
      walletAddress: walletAddress.toLowerCase(),
      utcDay,
    });

    if (!reservation) {
      throw new HttpException(404, "No daily check-in reservation found");
    }

    reservation.status = "earned";
    reservation.claimTxHash = txHash.toLowerCase();
    reservation.errorMessage = error;
    await reservation.save();

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
      return await DailyChallenge.create({
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
}

export default CheckInService;
