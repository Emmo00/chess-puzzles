"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract, useChainId, useSwitchChain } from "wagmi";
import { celo } from "wagmi/chains";
import { isOnCorrectChain } from "@/lib/config/wagmi";
import { GAME_ASSETS_CONTRACT, GAME_ASSET_TYPES, ALLOWLISTED_STABLECOINS } from "@/lib/config/wagmi";
import { GAME_ASSETS_ABI } from "@/lib/abi/gameAssets";
import { type Hex, parseUnits } from "viem";
import { erc20Abi } from "viem";

export interface AssetBalanceState {
  hintBalance: number;
  streakFreezes: number;
  loading: boolean;
}

export function useGameAssetsBalances(): AssetBalanceState {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [hintBalance, setHintBalance] = useState<number>(0);
  const [streakFreezes, setStreakFreezes] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!address || !isConnected || !publicClient || !GAME_ASSETS_CONTRACT) {
      setHintBalance(0);
      setStreakFreezes(0);
      return;
    }
    setLoading(true);
    try {
      const [hints, freezes] = await Promise.all([
        publicClient.readContract({
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "getHintBalance",
          args: [address as Hex],
        }),
        publicClient.readContract({
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "getStreakFreezeBalance",
          args: [address as Hex],
        }),
      ]);
      setHintBalance(Number(hints));
      setStreakFreezes(Number(freezes));
    } catch {
      setHintBalance(0);
      setStreakFreezes(0);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, publicClient]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { hintBalance, streakFreezes, loading };
}

export function useGameAssetsPurchase() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState<Hex | undefined>(undefined);

  const isCorrectChain = isOnCorrectChain(chainId);

  const ensureCorrectChain = async (): Promise<boolean> => {
    if (isCorrectChain) return true;
    
    if (!address) {
      throw new Error("Wallet not connected");
    }
    
    try {
      await switchChain({ chainId: celo.id });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to switch to Celo Mainnet";
      throw new Error(message);
    }
  };

  const ensureApproval = async (tokenAddress: Hex, amount: bigint) => {
    if (!address || !publicClient || !GAME_ASSETS_CONTRACT) return;
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [address as Hex, GAME_ASSETS_CONTRACT],
    });
    if (allowance < amount) {
      const approveHash = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [GAME_ASSETS_CONTRACT, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
    }
  };

  const buyAsset = async (
    assetType: Hex,
    quantity: number,
    usdAmount: string,
    tokenAddress: Hex,
    tokenDecimals: number,
  ) => {
    if (!address || !publicClient || !GAME_ASSETS_CONTRACT) {
      throw new Error("Wallet not connected");
    }
    
    await ensureCorrectChain();
    
    setIsPending(true);
    try {
      const amount = parseUnits(usdAmount, tokenDecimals);
      await ensureApproval(tokenAddress, amount);
      const hash = await writeContractAsync({
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "purchaseAsset",
        args: [assetType, BigInt(quantity), tokenAddress],
      });
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } finally {
      setIsPending(false);
    }
  };

  const buyAssetPack = async (
    packId: number,
    usdAmount: string,
    tokenAddress: Hex,
    tokenDecimals: number,
  ) => {
    if (!address || !publicClient || !GAME_ASSETS_CONTRACT) {
      throw new Error("Wallet not connected");
    }
    
    await ensureCorrectChain();
    
    setIsPending(true);
    try {
      const amount = parseUnits(usdAmount, tokenDecimals);
      await ensureApproval(tokenAddress, amount);
      const hash = await writeContractAsync({
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "purchaseAssetPack",
        args: [BigInt(packId), tokenAddress],
      });
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } finally {
      setIsPending(false);
    }
  };

  // Daily pass purchase
  const buyDailyPass = async (
    paymentToken: Hex,
  ) => {
    if (!address || !publicClient || !GAME_ASSETS_CONTRACT) {
      throw new Error("Wallet not connected");
    }
    
    await ensureCorrectChain();
    
    setIsPending(true);
    try {
      const hash = await writeContractAsync({
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "purchaseDailyPass",
        args: [paymentToken],
      });
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } finally {
      setIsPending(false);
    }
  };

  return { buyAsset, buyAssetPack, buyDailyPass, isPending, txHash, isCorrectChain, isSwitchingChain };
}

export function useGameAssetsAdmin() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const isCorrectChain = isOnCorrectChain(chainId);

  const ensureCorrectChain = async (): Promise<boolean> => {
    if (isCorrectChain) return true;
    
    if (!address) {
      throw new Error("Wallet not connected");
    }
    
    try {
      await switchChain({ chainId: celo.id });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to switch to Celo Mainnet";
      throw new Error(message);
    }
  };

  const grantAsset = async (to: Hex, assetType: Hex, quantity: number) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    return writeContractAsync({
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "grantAsset",
      args: [to, assetType, BigInt(quantity)],
    });
  };

  const grantDailyPass = async (to: Hex) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    return writeContractAsync({
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "grantDailyPass",
      args: [to],
    });
  };

  const grantAssetPack = async (to: Hex, packId: number) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    return writeContractAsync({
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "grantAssetPack",
      args: [to, BigInt(packId)],
    });
  };

  const createAssetPack = async (name: string, assetType: Hex, quantity: number, price: number) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    return writeContractAsync({
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "createAssetPack",
      args: [name, assetType, BigInt(quantity), BigInt(price)],
    });
  };

  const updateAssetPack = async (packId: number, price: number, active: boolean) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    return writeContractAsync({
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "updateAssetPack",
      args: [BigInt(packId), BigInt(price), active],
    });
  };

  const setUnitPrice = async (assetType: Hex, price: number) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    return writeContractAsync({
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "setUnitPrice",
      args: [assetType, BigInt(price)],
    });
  };

  const setDailyPassPrice = async (price: number) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    return writeContractAsync({
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "setDailyPassPrice",
      args: [BigInt(price)],
    });
  };

  const setDailyPassDuration = async (duration: number) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    return writeContractAsync({
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "setDailyPassDuration",
      args: [BigInt(duration)],
    });
  };

  const updateTreasury = async (newTreasury: Hex) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    return writeContractAsync({
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "updateTreasury",
      args: [newTreasury],
    });
  };

  return {
    grantAsset, grantDailyPass, grantAssetPack,
    createAssetPack, updateAssetPack,
    setUnitPrice, setDailyPassPrice, setDailyPassDuration,
    updateTreasury,
    isCorrectChain,
  };
}