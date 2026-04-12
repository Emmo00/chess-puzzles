"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { encodeFunctionData, formatUnits, parseUnits } from "viem";
import { celo } from "viem/chains";
import {
  injected,
  useAccount,
  useConnect,
  usePublicClient,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";

import payoutContractAbiJson from "@/abis/payout-contract.json";
import revenueCollectorAbiJson from "@/abis/revenue-receiver.json";
import { useChainSwitching } from "@/lib/hooks/useChainSwitching";
import { CUSD_ADDRESSES, PAYOUT_CLAIM_CONTRACT } from "@/lib/config/wagmi";
import { selectSupportedFeeCurrency } from "@/lib/utils/feeCurrency";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

type AbiInput = {
  name?: string;
  type: string;
};

type AbiFunction = {
  type: "function";
  name: string;
  stateMutability?: "pure" | "view" | "nonpayable" | "payable";
  inputs?: AbiInput[];
  outputs?: Array<{ name?: string; type: string }>;
};

const payoutAbi = payoutContractAbiJson as AbiFunction[];
const revenueAbi = revenueCollectorAbiJson as AbiFunction[];

const PAYOUT_ADMIN_FUNCTIONS = new Set([
  "setCheckInAmount",
  "setMaxDailyCheckIns",
  "setServerSigner",
  "ownerWithdraw",
  "transferOwnership",
  "renounceOwnership",
]);

const REVENUE_ADMIN_FUNCTIONS = new Set([
  "setTreasury",
  "withdraw",
  "withdrawAllToTreasury",
  "transferOwnership",
  "renounceOwnership",
]);

const CLAIMS_READ_ABI = [
  {
    type: "function",
    name: "payoutToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "checkInAmount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "maxDailyCheckIns",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const isWritableFunction = (item: AbiFunction): boolean => {
  return (
    item.type === "function" &&
    (item.stateMutability === "nonpayable" || item.stateMutability === "payable")
  );
};

const parseScalarArgument = (raw: string, type: string) => {
  if (type.startsWith("uint") || type.startsWith("int")) {
    if (raw.trim().length === 0) {
      throw new Error(`Value is required for ${type}`);
    }
    return BigInt(raw.trim());
  }

  if (type === "address") {
    if (!ADDRESS_REGEX.test(raw.trim())) {
      throw new Error(`Invalid address: ${raw}`);
    }
    return raw.trim() as `0x${string}`;
  }

  if (type === "bool") {
    const lowered = raw.trim().toLowerCase();
    if (!["true", "false", "1", "0"].includes(lowered)) {
      throw new Error(`Invalid bool value: ${raw}`);
    }
    return lowered === "true" || lowered === "1";
  }

  if (type.startsWith("bytes")) {
    const value = raw.trim();
    if (!value.startsWith("0x")) {
      throw new Error(`Bytes value must start with 0x for ${type}`);
    }
    return value as `0x${string}`;
  }

  return raw;
};

const parseArgument = (raw: string, type: string) => {
  if (!type.endsWith("[]")) {
    return parseScalarArgument(raw, type);
  }

  const baseType = type.slice(0, -2);
  let parsedList: unknown;
  try {
    parsedList = JSON.parse(raw);
  } catch {
    throw new Error(`Array argument for ${type} must be valid JSON`);
  }

  if (!Array.isArray(parsedList)) {
    throw new Error(`Array argument for ${type} must be a JSON array`);
  }

  return parsedList.map((item) => parseScalarArgument(String(item), baseType));
};

const formatRunwayDays = (value: string | null) => {
  return value ? `${value} days` : "--";
};

const formatRunwayDate = (value: Date | null) => {
  return value ? value.toISOString().replace("T", " ").slice(0, 16) + " UTC" : "--";
};

const ERC20_HELPER_ABI = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

interface ContractAdminPanelProps {
  title: string;
  subtitle: string;
  defaultAddress: string;
  abi: AbiFunction[];
  adminFunctionNames: Set<string>;
}

function ContractAdminPanel({
  title,
  subtitle,
  defaultAddress,
  abi,
  adminFunctionNames,
}: ContractAdminPanelProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [contractAddress, setContractAddress] = useState(defaultAddress);
  const [showAllWriteFunctions, setShowAllWriteFunctions] = useState(false);
  const [selectedFunctionName, setSelectedFunctionName] = useState("");
  const [argValues, setArgValues] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  const writableFunctions = useMemo(() => {
    const all = abi.filter(isWritableFunction);
    if (showAllWriteFunctions) {
      return all;
    }
    return all.filter((fn) => adminFunctionNames.has(fn.name));
  }, [abi, adminFunctionNames, showAllWriteFunctions]);

  const selectedFunction = useMemo(() => {
    return writableFunctions.find((fn) => fn.name === selectedFunctionName) || null;
  }, [writableFunctions, selectedFunctionName]);

  useEffect(() => {
    if (!writableFunctions.length) {
      setSelectedFunctionName("");
      return;
    }

    if (!selectedFunction || !selectedFunctionName) {
      setSelectedFunctionName(writableFunctions[0].name);
    }
  }, [writableFunctions, selectedFunction, selectedFunctionName]);

  useEffect(() => {
    if (!selectedFunction) {
      setArgValues([]);
      return;
    }

    const inputLength = selectedFunction.inputs?.length || 0;
    setArgValues((current) => {
      if (current.length === inputLength) {
        return current;
      }
      return Array.from({ length: inputLength }, (_, index) => current[index] || "");
    });
  }, [selectedFunction]);

  const {
    sendTransaction,
    data: transactionHash,
    error: transactionError,
    isPending,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: transactionHash,
  });

  const handleArgChange = (index: number, value: string) => {
    setArgValues((current) => {
      const copy = [...current];
      copy[index] = value;
      return copy;
    });
  };

  const handleSubmit = async () => {
    setLocalError(null);

    if (!selectedFunction) {
      setLocalError("No function selected.");
      return;
    }

    if (!ADDRESS_REGEX.test(contractAddress.trim())) {
      setLocalError("Enter a valid contract address.");
      return;
    }

    if (!isConnected || !address) {
      setLocalError("Connect your wallet first.");
      return;
    }

    if (!publicClient) {
      setLocalError("Blockchain client unavailable. Please retry.");
      return;
    }

    try {
      const parsedArgs = (selectedFunction.inputs || []).map((input, index) =>
        parseArgument(argValues[index] || "", input.type)
      );

      const calldata = encodeFunctionData({
        abi: [selectedFunction],
        functionName: selectedFunction.name,
        args: parsedArgs,
      });

      const feeCurrency = await selectSupportedFeeCurrency({
        publicClient,
        account: address,
        to: contractAddress.trim() as `0x${string}`,
        data: calldata,
      });

      sendTransaction({
        to: contractAddress.trim() as `0x${string}`,
        data: calldata,
        feeCurrency,
      });
    } catch (error: any) {
      setLocalError(error.message || "Failed to prepare transaction");
    }
  };

  return (
    <section className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
      <h2 className="text-xl font-black uppercase text-black">{title}</h2>
      <p className="text-xs font-bold uppercase text-black/80 mt-1">{subtitle}</p>

      <div className="mt-4 space-y-3">
        <label className="block text-xs font-black uppercase text-black">Contract Address</label>
        <input
          value={contractAddress}
          onChange={(event) => setContractAddress(event.target.value)}
          placeholder="0x..."
          className="w-full border-2 border-black px-3 py-2 text-xs font-bold"
        />

        <label className="inline-flex items-center gap-2 text-xs font-bold uppercase text-black">
          <input
            type="checkbox"
            checked={showAllWriteFunctions}
            onChange={(event) => setShowAllWriteFunctions(event.target.checked)}
          />
          Show all writable functions
        </label>

        <label className="block text-xs font-black uppercase text-black">Function</label>
        <select
          value={selectedFunctionName}
          onChange={(event) => setSelectedFunctionName(event.target.value)}
          className="w-full border-2 border-black px-3 py-2 text-xs font-bold bg-white"
        >
          {writableFunctions.map((fn) => (
            <option key={fn.name} value={fn.name}>
              {fn.name}
            </option>
          ))}
        </select>

        {selectedFunction?.inputs?.map((input, index) => (
          <div key={`${selectedFunction.name}-${index}`} className="space-y-1">
            <label className="block text-[11px] font-black uppercase text-black">
              {(input.name || `arg${index}`).toUpperCase()} ({input.type})
            </label>
            <input
              value={argValues[index] || ""}
              onChange={(event) => handleArgChange(index, event.target.value)}
              placeholder={input.type.endsWith("[]") ? '["value1", "value2"]' : "Enter value"}
              className="w-full border-2 border-black px-3 py-2 text-xs font-bold"
            />
          </div>
        ))}

        <button
          onClick={handleSubmit}
          disabled={isPending || isConfirming || !selectedFunction}
          className="w-full bg-black text-cyan-300 py-3 px-4 font-black text-xs uppercase tracking-wider border-2 border-cyan-300 disabled:opacity-50"
        >
          {isPending ? "Awaiting Wallet Confirmation..." : isConfirming ? "Confirming On-Chain..." : "Send Admin Transaction"}
        </button>

        {(localError || transactionError) && (
          <div className="bg-red-300 border-2 border-black p-2 text-xs font-black uppercase text-black">
            {localError || transactionError?.message}
          </div>
        )}

        {transactionHash && (
          <div className="bg-yellow-200 border-2 border-black p-2 text-xs font-bold text-black">
            <p className="font-black uppercase">Tx Hash</p>
            <p className="break-all">{transactionHash}</p>
            <a
              href={`https://celoscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-black uppercase"
            >
              View on Celoscan
            </a>
          </div>
        )}

        {isConfirmed && (
          <div className="bg-green-300 border-2 border-black p-2 text-xs font-black uppercase text-black">
            Transaction confirmed.
          </div>
        )}
      </div>
    </section>
  );
}

interface PayoutFundingPanelProps {
  defaultClaimsAddress: string;
  isOnCorrectChain: boolean;
  onSwitchChain: () => void;
}

function PayoutFundingPanel({
  defaultClaimsAddress,
  isOnCorrectChain,
  onSwitchChain,
}: PayoutFundingPanelProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [claimsAddress, setClaimsAddress] = useState(defaultClaimsAddress);
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("TOKEN");
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [checkInAmountDisplay, setCheckInAmountDisplay] = useState("0");
  const [maxDailyCheckIns, setMaxDailyCheckIns] = useState(0);
  const [dailyPayoutRaw, setDailyPayoutRaw] = useState<bigint>(BigInt(0));
  const [dailyPayoutDisplay, setDailyPayoutDisplay] = useState("0");
  const [contractBalanceRaw, setContractBalanceRaw] = useState<bigint>(BigInt(0));
  const [walletBalanceDisplay, setWalletBalanceDisplay] = useState("0");
  const [contractBalanceDisplay, setContractBalanceDisplay] = useState("0");
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const parsedDepositRaw = useMemo(() => {
    if (!amountInput.trim()) {
      return BigInt(0);
    }

    try {
      return parseUnits(amountInput.trim(), tokenDecimals);
    } catch {
      return null;
    }
  }, [amountInput, tokenDecimals]);

  const estimatedDepositDays = useMemo(() => {
    if (!amountInput.trim() || dailyPayoutRaw <= BigInt(0) || parsedDepositRaw === null) {
      return null;
    }

    if (parsedDepositRaw <= BigInt(0)) {
      return null;
    }

    const scaledDays = (parsedDepositRaw * BigInt(10000)) / dailyPayoutRaw;
    return (Number(scaledDays) / 10000).toFixed(2);
  }, [amountInput, parsedDepositRaw, dailyPayoutRaw]);

  const contractRunwayDays = useMemo(() => {
    if (dailyPayoutRaw <= BigInt(0) || contractBalanceRaw <= BigInt(0)) {
      return null;
    }

    const scaledDays = (contractBalanceRaw * BigInt(10000)) / dailyPayoutRaw;
    return (Number(scaledDays) / 10000).toFixed(2);
  }, [dailyPayoutRaw, contractBalanceRaw]);

  const contractNextDepositDate = useMemo(() => {
    if (!contractRunwayDays) {
      return null;
    }

    const daysNumber = Number(contractRunwayDays);
    if (!Number.isFinite(daysNumber) || daysNumber <= 0) {
      return null;
    }

    return new Date(Date.now() + daysNumber * 24 * 60 * 60 * 1000);
  }, [contractRunwayDays]);

  const combinedRunwayDays = useMemo(() => {
    if (dailyPayoutRaw <= BigInt(0) || parsedDepositRaw === null) {
      return null;
    }

    const effectiveBalance = contractBalanceRaw + parsedDepositRaw;
    if (effectiveBalance <= BigInt(0)) {
      return null;
    }

    const scaledDays = (effectiveBalance * BigInt(10000)) / dailyPayoutRaw;
    return (Number(scaledDays) / 10000).toFixed(2);
  }, [dailyPayoutRaw, contractBalanceRaw, parsedDepositRaw]);

  const combinedNextDepositDate = useMemo(() => {
    if (!combinedRunwayDays) {
      return null;
    }

    const daysNumber = Number(combinedRunwayDays);
    if (!Number.isFinite(daysNumber) || daysNumber <= 0) {
      return null;
    }

    return new Date(Date.now() + daysNumber * 24 * 60 * 60 * 1000);
  }, [combinedRunwayDays]);

  const {
    sendTransaction,
    data: txHash,
    error: txError,
    isPending,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const refreshFundingInfo = async () => {
    setError(null);

    if (!publicClient) {
      return;
    }

    if (!ADDRESS_REGEX.test(claimsAddress.trim())) {
      setError("Enter a valid payout claims contract address.");
      return;
    }

    try {
      const [payoutToken, rawCheckInAmount, rawMaxDailyCheckIns] = await Promise.all([
        publicClient.readContract({
          address: claimsAddress.trim() as `0x${string}`,
          abi: CLAIMS_READ_ABI,
          functionName: "payoutToken",
        }),
        publicClient.readContract({
          address: claimsAddress.trim() as `0x${string}`,
          abi: CLAIMS_READ_ABI,
          functionName: "checkInAmount",
        }),
        publicClient.readContract({
          address: claimsAddress.trim() as `0x${string}`,
          abi: CLAIMS_READ_ABI,
          functionName: "maxDailyCheckIns",
        }),
      ]);

      const [rawDecimals, rawSymbol, rawContractBalance] = await Promise.all([
        publicClient.readContract({
          address: payoutToken,
          abi: ERC20_HELPER_ABI,
          functionName: "decimals",
        }),
        publicClient.readContract({
          address: payoutToken,
          abi: ERC20_HELPER_ABI,
          functionName: "symbol",
        }),
        publicClient.readContract({
          address: payoutToken,
          abi: ERC20_HELPER_ABI,
          functionName: "balanceOf",
          args: [claimsAddress.trim() as `0x${string}`],
        }),
      ]);

      const decimals = Number(rawDecimals);
      const maxCheckIns = Number(rawMaxDailyCheckIns);
      const dailyRequiredRaw = rawCheckInAmount * BigInt(maxCheckIns);

      setTokenAddress(payoutToken);
      setTokenDecimals(decimals);
      setTokenSymbol(String(rawSymbol));
      setCheckInAmountDisplay(formatUnits(rawCheckInAmount, decimals));
      setMaxDailyCheckIns(maxCheckIns);
      setDailyPayoutRaw(dailyRequiredRaw);
      setDailyPayoutDisplay(formatUnits(dailyRequiredRaw, decimals));
      setContractBalanceRaw(rawContractBalance);
      setContractBalanceDisplay(formatUnits(rawContractBalance, decimals));

      if (isConnected && address) {
        const rawWalletBalance = await publicClient.readContract({
          address: payoutToken,
          abi: ERC20_HELPER_ABI,
          functionName: "balanceOf",
          args: [address],
        });
        setWalletBalanceDisplay(formatUnits(rawWalletBalance, decimals));
      } else {
        setWalletBalanceDisplay("0");
      }
    } catch (loadError: any) {
      setError(loadError.message || "Failed to fetch payout token info");
    }
  };

  useEffect(() => {
    refreshFundingInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isConfirmed) {
      refreshFundingInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed]);

  const handleDeposit = async () => {
    setError(null);

    if (!isConnected || !address) {
      setError("Connect your wallet first.");
      return;
    }

    if (!isOnCorrectChain) {
      setError("Switch to Celo before depositing.");
      return;
    }

    if (!ADDRESS_REGEX.test(claimsAddress.trim())) {
      setError("Enter a valid payout claims address.");
      return;
    }

    if (!ADDRESS_REGEX.test(tokenAddress.trim())) {
      setError("Load payout token first.");
      return;
    }

    if (!amountInput.trim()) {
      setError("Enter an amount to deposit.");
      return;
    }

    try {
      const amountBaseUnits = parseUnits(amountInput.trim(), tokenDecimals);
      if (amountBaseUnits <= BigInt(0)) {
        setError("Deposit amount must be greater than zero.");
        return;
      }

      const calldata = encodeFunctionData({
        abi: ERC20_HELPER_ABI,
        functionName: "transfer",
        args: [claimsAddress.trim() as `0x${string}`, amountBaseUnits],
      });

      if (!publicClient) {
        setError("Blockchain client unavailable. Please retry.");
        return;
      }

      const feeCurrency = await selectSupportedFeeCurrency({
        publicClient,
        account: address,
        to: tokenAddress.trim() as `0x${string}`,
        data: calldata,
      });

      sendTransaction({
        to: tokenAddress.trim() as `0x${string}`,
        data: calldata,
        feeCurrency,
      });
    } catch (prepareError: any) {
      setError(prepareError.message || "Failed to prepare deposit transaction");
    }
  };

  return (
    <section className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
      <h2 className="text-xl font-black uppercase text-black">Fund Claims Pool</h2>
      <p className="text-xs font-bold uppercase text-black/80 mt-1">
        Transfer payout tokens directly into the claims contract to top up reward liquidity.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block text-xs font-black uppercase text-black">Payout Claims Contract</label>
        <input
          value={claimsAddress}
          onChange={(event) => setClaimsAddress(event.target.value)}
          placeholder="0x..."
          className="w-full border-2 border-black px-3 py-2 text-xs font-bold"
        />

        <button
          onClick={refreshFundingInfo}
          className="w-full bg-cyan-300 text-black py-2 px-4 font-black text-xs uppercase border-2 border-black"
        >
          Refresh Token Info
        </button>

        <div className="bg-gray-100 border-2 border-black p-3 text-xs font-bold space-y-1">
          <p>Payout Token: {tokenSymbol}</p>
          <p>Token Address: {tokenAddress || "--"}</p>
          <p>Decimals: {tokenDecimals}</p>
          <p>Check-in Amount: {checkInAmountDisplay} {tokenSymbol}</p>
          <p>Max Daily Check-ins: {maxDailyCheckIns}</p>
          <p>Daily Payout At Max: {dailyPayoutDisplay} {tokenSymbol}</p>
          <p>Your Balance: {walletBalanceDisplay}</p>
          <p>Contract Balance: {contractBalanceDisplay}</p>
          <p>Contract Runway At Max: {formatRunwayDays(contractRunwayDays)}</p>
          <p>Next Deposit (Current Balance): {formatRunwayDate(contractNextDepositDate)}</p>
        </div>

        {!isOnCorrectChain && (
          <button
            onClick={onSwitchChain}
            className="w-full bg-yellow-400 text-black py-2 px-4 font-black text-xs uppercase border-2 border-black"
          >
            Switch To Celo
          </button>
        )}

        <label className="block text-xs font-black uppercase text-black">Deposit Amount ({tokenSymbol})</label>
        <input
          value={amountInput}
          onChange={(event) => setAmountInput(event.target.value)}
          placeholder="e.g. 100.5"
          className="w-full border-2 border-black px-3 py-2 text-xs font-bold"
        />

        <div className="bg-yellow-100 border-2 border-black p-2 text-xs font-black uppercase text-black">
          <p>Estimated Runway For This Deposit: {formatRunwayDays(estimatedDepositDays)}</p>
          <p>Next Deposit (Current + Entered): {formatRunwayDays(combinedRunwayDays)}</p>
          <p>Projected Deposit Date (Current + Entered): {formatRunwayDate(combinedNextDepositDate)}</p>
        </div>

        <button
          onClick={handleDeposit}
          disabled={isPending || isConfirming}
          className="w-full bg-black text-cyan-300 py-3 px-4 font-black text-xs uppercase tracking-wider border-2 border-cyan-300 disabled:opacity-50"
        >
          {isPending
            ? "Awaiting Wallet Confirmation..."
            : isConfirming
            ? "Confirming Deposit..."
            : "Deposit To Claims Contract"}
        </button>

        {(error || txError) && (
          <div className="bg-red-300 border-2 border-black p-2 text-xs font-black uppercase text-black">
            {error || txError?.message}
          </div>
        )}

        {txHash && (
          <div className="bg-yellow-200 border-2 border-black p-2 text-xs font-bold text-black">
            <p className="font-black uppercase">Deposit Tx Hash</p>
            <p className="break-all">{txHash}</p>
            <a
              href={`https://celoscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-black uppercase"
            >
              View on Celoscan
            </a>
          </div>
        )}

        {isConfirmed && (
          <div className="bg-green-300 border-2 border-black p-2 text-xs font-black uppercase text-black">
            Deposit confirmed.
          </div>
        )}
      </div>
    </section>
  );
}

export default function HiddenAdminOpsPage() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { isOnCorrectChain, switchToPreferredChain } = useChainSwitching();

  const [unlockInput, setUnlockInput] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);

  const adminAccessKey = process.env.NEXT_PUBLIC_ADMIN_PAGE_KEY || "";
  const revenueCollectorAddress = process.env.NEXT_PUBLIC_REVENUE_COLLECTOR_CONTRACT || "";

  useEffect(() => {
    if (!adminAccessKey) {
      setIsUnlocked(true);
    }
  }, [adminAccessKey]);

  const handleUnlock = () => {
    if (!adminAccessKey) {
      setIsUnlocked(true);
      return;
    }

    if (unlockInput === adminAccessKey) {
      setIsUnlocked(true);
      return;
    }

    alert("Invalid admin key");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="bg-black text-white px-2 py-1 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            ← BACK
          </Link>
          <p className="text-[10px] font-black uppercase tracking-wide text-gray-600">
            Hidden admin route
          </p>
        </div>

        {!isUnlocked && (
          <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] max-w-md">
            <h1 className="text-2xl font-black uppercase">Unlock Admin Console</h1>
            <p className="text-xs font-bold uppercase mt-2 text-black/80">
              Enter the admin key configured via NEXT_PUBLIC_ADMIN_PAGE_KEY.
            </p>
            <input
              type="password"
              value={unlockInput}
              onChange={(event) => setUnlockInput(event.target.value)}
              className="mt-3 w-full border-2 border-black px-3 py-2 text-xs font-bold"
              placeholder="Admin key"
            />
            <button
              onClick={handleUnlock}
              className="mt-3 w-full bg-black text-cyan-300 py-3 px-4 font-black text-xs uppercase border-2 border-cyan-300"
            >
              Unlock
            </button>
          </div>
        )}

        {isUnlocked && (
          <>
            <div className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
              <h1 className="text-2xl font-black uppercase">Admin Contract Console</h1>
              <p className="text-xs font-bold uppercase text-black/80 mt-1">
                Use with the owner wallet only.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!isConnected ? (
                  <button
                    onClick={() => {
                      const injectedConnector = connectors.find((connector) => connector.type === "injected");
                      if (injectedConnector) {
                        connect({ connector: injectedConnector });
                        return;
                      }
                      connect({ connector: injected() });
                    }}
                    disabled={isConnectPending}
                    className="bg-purple-400 border-4 border-black px-4 py-2 font-black text-xs uppercase"
                  >
                    {isConnectPending ? "Connecting..." : "Connect Wallet"}
                  </button>
                ) : (
                  <div className="bg-green-300 border-2 border-black px-3 py-2 text-xs font-black uppercase">
                    Connected: {address}
                  </div>
                )}

                {!isOnCorrectChain && (
                  <button
                    onClick={switchToPreferredChain}
                    className="bg-yellow-400 border-4 border-black px-4 py-2 font-black text-xs uppercase"
                  >
                    Switch To Celo
                  </button>
                )}

                <div className="bg-cyan-200 border-2 border-black px-3 py-2 text-xs font-black uppercase">
                  Chain ID: {chainId || "--"}
                </div>
              </div>
            </div>

            <PayoutFundingPanel
              defaultClaimsAddress={PAYOUT_CLAIM_CONTRACT}
              isOnCorrectChain={isOnCorrectChain}
              onSwitchChain={switchToPreferredChain}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ContractAdminPanel
                title="Payout Claims Contract"
                subtitle="Set check-in amount, signer, cap, ownership, and withdrawals"
                defaultAddress={PAYOUT_CLAIM_CONTRACT}
                abi={payoutAbi}
                adminFunctionNames={PAYOUT_ADMIN_FUNCTIONS}
              />

              <ContractAdminPanel
                title="Revenue Collector Contract"
                subtitle="Treasury updates, withdrawals, and ownership operations"
                defaultAddress={revenueCollectorAddress}
                abi={revenueAbi}
                adminFunctionNames={REVENUE_ADMIN_FUNCTIONS}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
