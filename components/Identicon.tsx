"use client";

import { useMemo } from "react";

interface IdenticonProps {
  address: string;
  size?: number;
}

const PALETTE = [
  "#a3ff12", "#00e5ff", "#ffd600", "#ff6b57", "#ff4fd8",
  "#6cc81b", "#8b5cf6", "#f97316", "#0ea5e9", "#ef4444",
];

function hashSeed(address: string): number[] {
  const normalized = address.toLowerCase().replace(/^0x/, "");
  const bytes: number[] = [];
  let hash = 5381;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
    bytes.push((hash >>> (i % 24)) & 0xff);
  }
  while (bytes.length < 16) bytes.push((bytes[bytes.length - 1] * 7) & 0xff);
  return bytes;
}

export function Identicon({ address, size = 96 }: IdenticonProps) {
  const cells = useMemo(() => {
    const bytes = hashSeed(address || "0x0");
    const fg = PALETTE[bytes[0] % PALETTE.length];
    const bg = PALETTE[bytes[1] % PALETTE.length];
    const grid: { fill: boolean; color: string }[] = [];
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const idx = (row * 3 + col) % bytes.length;
        const fill = (bytes[idx] >> (col + 1)) & 1;
        grid.push({ fill: Boolean(fill), color: fill ? fg : bg });
      }
    }
    return { grid, fg };
  }, [address]);

  const cell = size / 5;
  const mirrored = cells.grid.flatMap((c, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const results = [{ col, row, ...c }];
    if (col < 2) {
      results.push({ col: 4 - col, row, ...c });
    }
    return results;
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <rect width={size} height={size} fill="#fff9e9" />
      {mirrored.map((c, i) => (
        <rect
          key={i}
          x={c.col * cell}
          y={c.row * cell}
          width={cell}
          height={cell}
          fill={c.fill ? c.color : "#fff9e9"}
        />
      ))}
      <rect
        x={1}
        y={1}
        width={size - 2}
        height={size - 2}
        fill="none"
        stroke="#111111"
        strokeWidth={Math.max(3, size / 24)}
      />
      <rect
        x={1}
        y={1}
        width={size - 2}
        height={size - 2}
        fill="none"
        stroke={cells.fg}
        strokeWidth={Math.max(2, size / 48)}
        opacity={0.5}
      />
    </svg>
  );
}
