import { randomInt } from "crypto";

import {
  CHECKIN_RESERVATION_TTL_MINUTES,
  DAILY_CHALLENGE_MAX_RATING,
  DAILY_CHALLENGE_MIN_RATING,
} from "@/lib/config/payoutClaims";
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

const ACTIVE_STATUSES = ["pending", "earned", "claiming", "claimed"];

class CheckInService {
  private puzzleApi = new PuzzleAPIClient();
  private contractService = new CheckInContractService();
  private signingService = new CheckInSigningService();

  public async getDailyStatus(walletAddress?: string) {
    const utcDay = getUtcDayNumber();
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
            pendingExpiresAt: reservation.pendingExpiresAt,
            claimTxHash: reservation.claimTxHash,
            claimedAt: reservation.claimedAt,
          }
        : null,
    };
  }

  public async reserveDailyChallenge(walletAddress: string) {
    const utcDay = getUtcDayNumber();
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

    const existingReservation = await CheckInReservation.findOne({
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
      } else if (ACTIVE_STATUSES.includes(existingReservation.status)) {
        return this.toReservationResponse(
          challenge,
          existingReservation,
          contractValues,
          true
        );
      }
    }

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

    if (!incrementedChallenge) {
      throw new HttpException(409, "Daily check-in slots are already full");
    }

    challenge = incrementedChallenge;

    const pendingExpiresAt = getDateAfterMinutes(CHECKIN_RESERVATION_TTL_MINUTES);

    const reservationData = {
      walletAddress: normalizedWallet,
      utcDay,
      dailyChallengeId: challenge._id,
      puzzleId: challenge.puzzle.puzzleId,
      status: "pending" as const,
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
        await DailyChallenge.findByIdAndUpdate(challenge._id, {
          $inc: { activeReservationCount: -1 },
        });
        throw new HttpException(500, "Failed to refresh daily challenge reservation");
      }

      reservation = updatedReservation;
    } else {
      try {
        reservation = await CheckInReservation.create(reservationData);
      } catch (error) {
        await DailyChallenge.findByIdAndUpdate(challenge._id, {
          $inc: { activeReservationCount: -1 },
        });
        throw error;
      }
    }

    if (!reservation) {
      await DailyChallenge.findByIdAndUpdate(challenge._id, {
        $inc: { activeReservationCount: -1 },
      });
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
    const utcDay = getUtcDayNumber();
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

    if (currentReservation.status === "claimed") {
      return {
        alreadyClaimed: true,
        status: currentReservation.status,
        puzzleId: challenge.puzzle.puzzleId,
      };
    }

    if (currentReservation.status !== "pending") {
      throw new HttpException(
        409,
        `Daily challenge is not solvable in '${currentReservation.status}' state`
      );
    }

    if (currentReservation.pendingExpiresAt.getTime() <= Date.now()) {
      currentReservation.status = "expired";
      await currentReservation.save();
      await DailyChallenge.findByIdAndUpdate(challenge._id, {
        $inc: { activeReservationCount: -1 },
      });
      throw new HttpException(409, "Reservation expired. Please reserve again.");
    }

    if (currentReservation.puzzleId !== puzzleId) {
      throw new HttpException(400, "Submitted puzzle does not match today's challenge");
    }

    currentReservation.status = "earned";
    currentReservation.solvedAt = new Date();
    currentReservation.claimNonce = undefined;
    currentReservation.claimDeadline = undefined;
    currentReservation.claimSignature = undefined;
    await currentReservation.save();

    await userPuzzlesModel.findOneAndUpdate(
      { userWalletAddress: normalizedWallet, puzzleId },
      {
        completed: true,
        attempts: 1,
        points: 0,
        type: "daily",
        solvedAt: new Date(),
      },
      { new: true }
    );

    return {
      success: true,
      status: currentReservation.status,
      checkInAmountWei: currentReservation.checkInAmountWei,
    };
  }

  public async getFreshClaimPayload(walletAddress: string) {
    const utcDay = getUtcDayNumber();
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

    if (!["earned", "claiming"].includes(reservation.status)) {
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
      day: utcDay,
      nonce: signedPayload.nonce,
      deadline: signedPayload.deadline,
      signature: signedPayload.signature,
    };
  }

  public async markClaiming(walletAddress: string, txHash: string) {
    const utcDay = getUtcDayNumber();

    const reservation = await CheckInReservation.findOne({
      walletAddress: walletAddress.toLowerCase(),
      utcDay,
    });

    if (!reservation) {
      throw new HttpException(404, "No daily check-in reservation found");
    }

    if (!["earned", "claiming", "claimed"].includes(reservation.status)) {
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
    const utcDay = getUtcDayNumber();
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
    const utcDay = getUtcDayNumber();
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

    const result = await CheckInReservation.updateMany(
      {
        dailyChallengeId: challenge._id,
        status: "pending",
        pendingExpiresAt: { $lte: now },
      },
      {
        $set: { status: "expired", errorMessage: "Reservation expired" },
      }
    );

    if (result.modifiedCount > 0) {
      await DailyChallenge.findByIdAndUpdate(challenge._id, {
        $inc: { activeReservationCount: -result.modifiedCount },
      });
    }
  }

  private async generateSignedPayload(walletAddress: string, utcDay: number) {
    let retries = 0;

    while (retries < 3) {
      const nonce = this.signingService.generateNonce();

      try {
        const signed = await this.signingService.signCheckInClaim(
          walletAddress as `0x${string}`,
          utcDay,
          nonce
        );

        return signed;
      } catch (error: any) {
        retries += 1;
        if (retries >= 3) {
          throw error;
        }
      }
    }

    throw new HttpException(500, "Failed to create check-in signature");
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
      reservation: {
        status: reservation.status,
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
}

export default CheckInService;
