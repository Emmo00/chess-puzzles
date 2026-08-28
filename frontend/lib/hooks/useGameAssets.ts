"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract, useChainId, useSwitchChain } from "wagmi";
import { celo } from "wagmi/chains";
import { isOnCorrectChain, isMiniPay } from "@/lib/config/wagmi";
import { GAME_ASSETS_CONTRACT, GAME_ASSET_TYPES, ALLOWLISTED_STABLECOINS } from "@/lib/config/wagmi";
import { GAME_ASSETS_ABI } from "@/lib/abi/gameAssets";
import { type Hex, parseUnits } from "viem";
import { erc20Abi } from "viem";
import { buildLegacyTxParams } from "@/lib/utils/minipayTx";
import { runWithDevCapture } from "@/lib/utils/devStore";

const DEFAULT_FEE_CURRENCY = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as Hex;

const getFeeCurrencyForToken = (tokenAddress: Hex): Hex => {
  const currency = ALLOWLISTED_STABLECOINS.find(
    (c) => c.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
  );
  return (currency?.feeCurrencyAddress as Hex) ?? DEFAULT_FEE_CURRENCY;
};

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
    // MiniPay is always on Celo mainnet; during SSR/hydration chainId is
    // undefined. Both should short-circuit instead of requesting a switch.
    if (chainId === undefined || isMiniPay()) return true;
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
      const feeCurrency = getFeeCurrencyForToken(tokenAddress);
      const { gas, gasPrice } = await buildLegacyTxParams(publicClient, {
        account: address,
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [GAME_ASSETS_CONTRACT, amount],
        feeCurrency,
        fallbackGas: 150_000n,
      });
      const approveRequest: Parameters<typeof writeContractAsync>[0] = {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [GAME_ASSETS_CONTRACT, amount],
        feeCurrency,
        gas,
        gasPrice,
      };
      const approveHash = await runWithDevCapture(
        "gameAssets.approve",
        approveRequest,
        () => writeContractAsync(approveRequest)
      );
      await publicClient.waitForTransactionReceipt({ hash: approveHash, timeout: 60_000 });
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
      const feeCurrency = getFeeCurrencyForToken(tokenAddress);
      const { gas, gasPrice } = await buildLegacyTxParams(publicClient, {
        account: address,
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "purchaseAsset",
        args: [assetType, BigInt(quantity), tokenAddress],
        feeCurrency,
        fallbackGas: 300_000n,
      });
      const buyRequest: Parameters<typeof writeContractAsync>[0] = {
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "purchaseAsset",
        args: [assetType, BigInt(quantity), tokenAddress],
        feeCurrency,
        gas,
        gasPrice,
      };
      const hash = await runWithDevCapture(
        "gameAssets.purchaseAsset",
        buyRequest,
        () => writeContractAsync(buyRequest)
      );
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
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
      const feeCurrency = getFeeCurrencyForToken(tokenAddress);
      const { gas, gasPrice } = await buildLegacyTxParams(publicClient, {
        account: address,
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "purchaseAssetPack",
        args: [BigInt(packId), tokenAddress],
        feeCurrency,
        fallbackGas: 300_000n,
      });
            const packRequest: Parameters<typeof writeContractAsync>[0] = {
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "purchaseAssetPack",
        args: [BigInt(packId), tokenAddress],
        feeCurrency,
        gas,
        gasPrice,
      };
      const hash = await runWithDevCapture(
        "gameAssets.purchaseAssetPack",
        packRequest,
        () => writeContractAsync(packRequest)
      );
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
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
      const feeCurrency = getFeeCurrencyForToken(paymentToken);
      const { gas, gasPrice } = await buildLegacyTxParams(publicClient, {
        account: address,
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "purchaseDailyPass",
        args: [paymentToken],
        feeCurrency,
        fallbackGas: 300_000n,
      });
            const passRequest: Parameters<typeof writeContractAsync>[0] = {
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "purchaseDailyPass",
        args: [paymentToken],
        feeCurrency,
        gas,
        gasPrice,
      };
      const hash = await runWithDevCapture(
        "gameAssets.purchaseDailyPass",
        passRequest,
        () => writeContractAsync(passRequest)
      );
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
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
    // MiniPay is always on Celo mainnet; during SSR/hydration chainId is
    // undefined. Both should short-circuit instead of requesting a switch.
    if (chainId === undefined || isMiniPay()) return true;
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

  const adminParams = async (functionName: string, args: readonly unknown[], fallbackGas: bigint) => {
    if (!address || !publicClient || !GAME_ASSETS_CONTRACT) {
      throw new Error("Wallet not connected");
    }
    return buildLegacyTxParams(publicClient, {
      account: address,
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName,
      args,
      feeCurrency: DEFAULT_FEE_CURRENCY,
      fallbackGas,
    });
  };

  const adminWrite = (action: string, request: unknown) =>
    runWithDevCapture(`gameAssets.admin.${action}`, request, () =>
      writeContractAsync(request as any)
    );

  const grantAsset = async (to: Hex, assetType: Hex, quantity: number) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    const { gas, gasPrice, feeCurrency } = await adminParams("grantAsset", [to, assetType, BigInt(quantity)], 250_000n);
    return adminWrite("grantAsset", {
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "grantAsset",
      args: [to, assetType, BigInt(quantity)],
      feeCurrency,
      gas,
      gasPrice,
    });
  };

  const grantDailyPass = async (to: Hex) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    const { gas, gasPrice, feeCurrency } = await adminParams("grantDailyPass", [to], 150_000n);
    return adminWrite("grantDailyPass", {
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "grantDailyPass",
      args: [to],
      feeCurrency,
      gas,
      gasPrice,
    });
  };

  const grantAssetPack = async (to: Hex, packId: number) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    const { gas, gasPrice, feeCurrency } = await adminParams("grantAssetPack", [to, BigInt(packId)], 250_000n);
    return adminWrite("grantAssetPack", {
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "grantAssetPack",
      args: [to, BigInt(packId)],
      feeCurrency,
      gas,
      gasPrice,
    });
  };

  const createAssetPack = async (name: string, assetType: Hex, quantity: number, price: number) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    const { gas, gasPrice, feeCurrency } = await adminParams("createAssetPack", [name, assetType, BigInt(quantity), BigInt(price)], 400_000n);
    return adminWrite("createAssetPack", {
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "createAssetPack",
      args: [name, assetType, BigInt(quantity), BigInt(price)],
      feeCurrency,
      gas,
      gasPrice,
    });
  };

  const updateAssetPack = async (packId: number, price: number, active: boolean) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    const { gas, gasPrice, feeCurrency } = await adminParams("updateAssetPack", [BigInt(packId), BigInt(price), active], 200_000n);
    return adminWrite("updateAssetPack", {
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "updateAssetPack",
      args: [BigInt(packId), BigInt(price), active],
      feeCurrency,
      gas,
      gasPrice,
    });
  };

  const setUnitPrice = async (assetType: Hex, price: number) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    const { gas, gasPrice, feeCurrency } = await adminParams("setUnitPrice", [assetType, BigInt(price)], 150_000n);
    return adminWrite("setUnitPrice", {
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "setUnitPrice",
      args: [assetType, BigInt(price)],
      feeCurrency,
      gas,
      gasPrice,
    });
  };

  const setDailyPassPrice = async (price: number) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    const { gas, gasPrice, feeCurrency } = await adminParams("setDailyPassPrice", [BigInt(price)], 150_000n);
    return adminWrite("setDailyPassPrice", {
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "setDailyPassPrice",
      args: [BigInt(price)],
      feeCurrency,
      gas,
      gasPrice,
    });
  };

  const setDailyPassDuration = async (duration: number) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    const { gas, gasPrice, feeCurrency } = await adminParams("setDailyPassDuration", [BigInt(duration)], 150_000n);
    return adminWrite("setDailyPassDuration", {
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "setDailyPassDuration",
      args: [BigInt(duration)],
      feeCurrency,
      gas,
      gasPrice,
    });
  };

  const updateTreasury = async (newTreasury: Hex) => {
    if (!GAME_ASSETS_CONTRACT) throw new Error("Contract not deployed");
    await ensureCorrectChain();
    const { gas, gasPrice, feeCurrency } = await adminParams("updateTreasury", [newTreasury], 150_000n);
    return adminWrite("updateTreasury", {
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "updateTreasury",
      args: [newTreasury],
      feeCurrency,
      gas,
      gasPrice,
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
