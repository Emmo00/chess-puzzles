/**
 * Format an Ethereum address to show first 6 and last 4 characters
 * @param address - The full Ethereum address
 * @returns Formatted address like "0x1234...5678"
 */
export function formatAddress(address?: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}