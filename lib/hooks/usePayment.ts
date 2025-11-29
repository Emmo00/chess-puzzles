'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CUSD_ABI, getCUSDAddress, PAYMENT_AMOUNTS, PAYMENT_RECIPIENT } from '../utils/payment'
import { PaymentType } from '../types/payment'
import { isOnCorrectChain } from '../config/wagmi'

export function usePayment() {
  const { address, chainId } = useAccount()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null)
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const makePayment = async (type: PaymentType) => {
    if (!address || !chainId) {
      throw new Error('Wallet not connected')
    }

    if (!isOnCorrectChain(chainId)) {
      throw new Error('Please switch to Celo network to make payments')
    }

    try {
      setPaymentType(type)
      const cusdAddress = getCUSDAddress(chainId)
      const amount = type === PaymentType.DAILY_ACCESS 
        ? PAYMENT_AMOUNTS.DAILY_ACCESS 
        : PAYMENT_AMOUNTS.PREMIUM

      // Use writeContract with proper parameters for MiniPay compatibility
      await writeContract({
        address: cusdAddress as `0x${string}`,
        abi: CUSD_ABI,
        functionName: 'transfer',
        args: [PAYMENT_RECIPIENT as `0x${string}`, amount],
      })
    } catch (error) {
      setPaymentType(null)
      throw error
    }
  }

  const verifyPayment = async () => {
    if (!hash || !address || !chainId || !paymentType) {
      return false
    }

    try {
      // Call backend to verify payment
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionHash: hash,
          walletAddress: address,
          paymentType,
          chainId,
        }),
      })

      if (!response.ok) {
        throw new Error('Payment verification failed')
      }

      const result = await response.json()
      setPaymentType(null)
      return result.verified
    } catch (error) {
      console.error('Payment verification error:', error)
      return false
    }
  }

  return {
    makePayment,
    verifyPayment,
    isPaymentPending: isPending,
    isConfirming,
    isSuccess,
    transactionHash: hash,
    paymentType,
  }
}