import { formatUnits } from "viem";

import dbConnect from "@/lib/db";
import { DailyChallenge } from "@/lib/models/dailyChallenge.model";
import CheckInContractService from "@/lib/services/checkin-contract.service";
import { getDateFromUtcDayNumber, getUtcDayNumber } from "@/lib/utils/time";

type DailyChallengeRecord = {
  utcDay: number;
  checkInAmountWeiSnapshot: string;
  puzzle: {
    puzzleId: string;
    fen: string;
    rating: number;
    themes: string[];
  };
};

export type DailyChallengeShareData = {
  utcDay: number;
  dayLabel: string;
  rating: number;
  rewardLabel: string;
  fen: string;
  puzzleId: string;
  themes: string[];
};

const formatRewardAmount = (amountWei: string, decimals: number) => {
  try {
    return formatUnits(BigInt(amountWei), decimals)
      .replace(/\.0+$/, "")
      .replace(/(\.\d*?)0+$/, "$1");
  } catch {
    return "0";
  }
};

export const parseUtcDayInput = (input: string | null | undefined): number => {
  if (!input) {
    return getUtcDayNumber();
  }

  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const asDate = new Date(trimmed);
  if (Number.isNaN(asDate.getTime())) {
    return getUtcDayNumber();
  }

  return getUtcDayNumber(asDate);
};

export const getDailyChallengeShareData = async (
  utcDay: number,
): Promise<DailyChallengeShareData | null> => {
  await dbConnect();

  const challenge = await DailyChallenge.findOne({ utcDay }).lean<DailyChallengeRecord | null>();
  if (!challenge) {
    return null;
  }

  let payoutTokenSymbol = "TOKEN";
  let payoutTokenDecimals = 18;

  try {
    const contractValues = await new CheckInContractService().getCheckInContractValues();
    payoutTokenSymbol = contractValues.payoutTokenSymbol;
    payoutTokenDecimals = contractValues.payoutTokenDecimals;
  } catch {
    // Use fallback token metadata when contract lookup is unavailable.
  }

  const amount = formatRewardAmount(challenge.checkInAmountWeiSnapshot || "0", payoutTokenDecimals);

  return {
    utcDay,
    dayLabel: getDateFromUtcDayNumber(utcDay).toISOString().slice(0, 10),
    rating: challenge.puzzle.rating,
    rewardLabel: `${amount} ${payoutTokenSymbol}`,
    fen: challenge.puzzle.fen,
    puzzleId: challenge.puzzle.puzzleId,
    themes: challenge.puzzle.themes || [],
  };
};
