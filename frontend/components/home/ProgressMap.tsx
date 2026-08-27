"use client";

import type { CSSProperties, RefObject } from "react";
import {
  Check,
  Crown,
  Gift,
  LockKeyhole,
  Sparkles,
  Star,
  Target,
  UserRound,
  Zap,
} from "lucide-react";
import styles from "@/app/page.module.css";
import {
  levelWindow,
  levelStateFor,
  isChestLevel,
} from "@/lib/leveling";

const MAP_WIDTH = 400;
const LEVEL_SPACING = 112;
const MAP_PADDING = 150;

const CLOUD_PATH =
  "M 130.9,49.4 L 127.1,41.7 L 122.5,35.8 L 116.9,30.9 L 110.4,27.3 L 103.3,24.9 L 95.9,24.0 L 88.5,24.6 L 81.3,26.5 L 74.7,29.9 L 68.1,35.1 L 62.9,41.7 L 59.5,48.3 L 52.8,48.1 L 45.6,49.5 L 39.0,52.7 L 33.8,56.8 L 27.3,66.6 L 21.2,70.5 L 17.1,76.0 L 15.0,84.0 L 16.3,92.2 L 20.9,99.1 L 27.3,103.5 L 34.0,105.0 L 40.5,104.2 L 47.0,106.9 L 53.5,108.0 L 65.1,106.2 L 70.4,103.7 L 75.4,100.0 L 119.6,100.0 L 129.2,106.0 L 140.0,108.0 L 147.3,107.1 L 154.4,104.3 L 161.2,106.7 L 168.8,106.7 L 174.9,104.7 L 180.2,100.9 L 185.1,93.9 L 187.0,85.5 L 185.5,77.1 L 180.9,69.8 L 173.9,64.9 L 166.0,63.0 L 159.6,55.3 L 151.5,50.3 L 142.9,48.1 L 137.1,48.1 L 130.9,49.4 Z";

interface MapNode {
  id: number;
  x: number;
  y: number;
  state: "completed" | "current" | "locked";
  hasChest: boolean;
}

function MapCloud({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 200 120">
      <path d={CLOUD_PATH} fill="#ffffff" stroke="#101010" strokeWidth="5" />
    </svg>
  );
}

function buildNodes(points: number) {
  const { firstLevel, lastLevel, currentLevel } = levelWindow(points);
  const levelCount = lastLevel - firstLevel + 1;
  const mapHeight = MAP_PADDING * 2 + Math.max(levelCount - 1, 0) * LEVEL_SPACING;

  const nodes: MapNode[] = Array.from({ length: levelCount }, (_, index) => {
    const id = firstLevel + index;
    return {
      id,
      x: 200 + Math.sin((id - 1) * 1.22) * 112,
      y: mapHeight - MAP_PADDING - index * LEVEL_SPACING,
      state: levelStateFor(id, currentLevel),
      hasChest: isChestLevel(id),
    };
  });

  return { nodes, mapHeight, firstLevel, lastLevel, currentLevel };
}

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  return points.slice(0, -1).reduce((path, point, index) => {
    const previous = points[index - 1] ?? point;
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;
    const firstControlX = point.x + (next.x - previous.x) / 6;
    const firstControlY = point.y + (next.y - previous.y) / 6;
    const secondControlX = next.x - (afterNext.x - point.x) / 6;
    const secondControlY = next.y - (afterNext.y - point.y) / 6;
    return `${path} C ${firstControlX} ${firstControlY}, ${secondControlX} ${secondControlY}, ${next.x} ${next.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function NodeIcon({ node }: { node: MapNode }) {
  if (node.hasChest) {
    return node.state === "completed" ? (
      <span className={styles.chestIcon}>
        <Gift strokeWidth={3.5} aria-hidden="true" />
        <Check className={styles.chestCheck} strokeWidth={4.5} aria-hidden="true" />
      </span>
    ) : (
      <Gift strokeWidth={3.5} aria-hidden="true" />
    );
  }
  if (node.state === "completed") {
    return <Check strokeWidth={4.5} aria-hidden="true" />;
  }
  if (node.state === "locked") {
    return <LockKeyhole strokeWidth={3.5} aria-hidden="true" />;
  }
  return <span className={styles.levelNumber}>{node.id}</span>;
}

interface ProgressMapProps {
  points: number;
  currentNodeRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onStart?: () => void;
  onLevelClick?: (level: number) => void;
}

export function ProgressMap({ points, currentNodeRef, scrollContainerRef, onStart, onLevelClick }: ProgressMapProps) {
  const { nodes, mapHeight, firstLevel, lastLevel } = buildNodes(points);
  const journeyPath = buildSmoothPath(nodes);

  return (
    <div className={styles.mapScroll} ref={scrollContainerRef}>
      <section
        className={styles.mapCanvas}
        style={{ height: `${mapHeight}px` }}
        aria-label={`Progress map. Showing levels ${firstLevel} through ${lastLevel}.`}
      >
        <div className={`${styles.doodle} ${styles.doodleStarOne}`}>
          <Star fill="currentColor" />
        </div>
        <div className={`${styles.doodle} ${styles.doodleStarTwo}`}>
          <Sparkles />
        </div>
        <div className={`${styles.doodle} ${styles.doodleZap}`}>
          <Zap fill="currentColor" />
        </div>
        <div className={`${styles.doodle} ${styles.doodleTarget}`}>
          <Target />
        </div>

        <svg
          className={styles.pathSvg}
          viewBox={`0 0 ${MAP_WIDTH} ${mapHeight}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path className={styles.pathShadow} d={journeyPath} />
          <path className={styles.pathBase} d={journeyPath} />
          <path className={styles.pathDash} d={journeyPath} />
        </svg>

        {nodes.map((node, index) => {
          const nodeStyle = {
            left: `${(node.x / MAP_WIDTH) * 100}%`,
            top: `${(node.y / mapHeight) * 100}%`,
            "--node-delay": `${Math.min(index * 35, 500)}ms`,
          } as CSSProperties;

          const rewardStatus = node.hasChest
            ? node.state === "completed"
              ? " Chest unlocked."
              : " Complete this level to unlock a chest."
            : "";

          return (
            <button
              key={node.id}
              type="button"
              className={`${styles.nodeWrap} ${styles[node.state]} ${
                node.hasChest ? styles.chestLevel : ""
              }`}
              style={nodeStyle}
              onClick={() => onLevelClick?.(node.id)}
              aria-label={`Level ${node.id}, ${node.state}.${rewardStatus}`}
            >
              {node.state === "current" && (
                <div className={styles.avatarToken} aria-label="Your current position">
                  <UserRound size={24} strokeWidth={3.5} />
                  <span className={styles.avatarCrown}>
                    <Crown size={15} fill="currentColor" strokeWidth={3} />
                  </span>
                </div>
              )}

              {node.hasChest && (
                <span className={styles.milestoneTag}>
                  {node.state === "completed" ? "UNLOCKED" : "CHEST"}
                </span>
              )}

              <div
                ref={node.state === "current" ? currentNodeRef : undefined}
                className={styles.levelNode}
                role="img"
                aria-label={`Level ${node.id}, ${node.state}.${rewardStatus}`}
                aria-current={node.state === "current" ? "step" : undefined}
              >
                <NodeIcon node={node} />
              </div>

              <span className={styles.nodeLabel}>LVL {node.id}</span>
            </button>
          );
        })}

        <div className={styles.cloudBarrier} aria-hidden="true">
          <MapCloud className={`${styles.cloud} ${styles.cloudTopLeft}`} />
          <MapCloud className={`${styles.cloud} ${styles.cloudTopCenter}`} />
          <MapCloud className={`${styles.cloud} ${styles.cloudTopRight}`} />
          <MapCloud className={`${styles.cloud} ${styles.cloudMiddleLeft}`} />
          <MapCloud className={`${styles.cloud} ${styles.cloudMiddleCenter}`} />
          <MapCloud className={`${styles.cloud} ${styles.cloudMiddleRight}`} />
          <MapCloud className={`${styles.cloud} ${styles.cloudBottomLeft}`} />
          <MapCloud className={`${styles.cloud} ${styles.cloudBottomRight}`} />
        </div>

        {firstLevel === 1 ? (
          <button
            type="button"
            className={styles.startFlag}
            onClick={onStart}
            aria-label="Start solving puzzles"
          >
            <span>START</span>
            <Zap size={18} fill="currentColor" strokeWidth={3} />
          </button>
        ) : (
          <div className={styles.pastLevels}>
            {firstLevel - 1} EARLIER LEVELS COMPLETED
          </div>
        )}
      </section>
    </div>
  );
}
