import React, { useEffect, useRef } from "react";
import * as THREE from "three";

// Helper to generate smooth points from control points
const generateSmoothProfile = (points: [number, number][], segments: number = 128) => {
  const vectorPoints = points.map((p) => new THREE.Vector2(p[0], p[1]));
  const curve = new THREE.SplineCurve(vectorPoints);
  return curve.getPoints(segments);
};

// High-fidelity King Profile using Spline Control Points
const KING_CONTROL_POINTS: [number, number][] = [
  [0, 0],
  [0.45, 0],
  [0.45, 0.15], // Base
  [0.38, 0.4],
  [0.28, 1.0],
  [0.22, 1.8], // Body curve
  [0.32, 2.1],
  [0.25, 2.3], // Neck
  [0.38, 2.5],
  [0.42, 2.8],
  [0.35, 3.1], // Head
  [0.15, 3.2],
  [0.15, 3.3], // Top detail
  [0.05, 3.4],
  [0.05, 3.6],
  [0.15, 3.6],
  [0.15, 3.7],
  [0, 3.7], // Cross
];

// High-fidelity Pawn Profile
const PAWN_CONTROL_POINTS: [number, number][] = [
  [0, 0],
  [0.42, 0],
  [0.42, 0.15], // Base
  [0.35, 0.3],
  [0.25, 0.8],
  [0.18, 1.4], // Body curve
  [0.25, 1.55], // Collar
  [0.15, 1.65],
  [0.28, 1.9],
  [0.28, 2.1], // Head bottom
  [0.15, 2.25],
  [0, 2.3], // Head top
];

const KING_PROFILE = generateSmoothProfile(KING_CONTROL_POINTS);
const PAWN_PROFILE = generateSmoothProfile(PAWN_CONTROL_POINTS);

export const THEME_COLORS = {
  primary: "#8b5cf6",
  primaryDark: "#7c3aed",
  dark: "#111827",
  light: "#f3f4f6",
};

interface ChessPiecesSceneProps {
  className?: string;
}

const ChessPiecesScene: React.FC<ChessPiecesSceneProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationRef = useRef<number>(0);

  // Mouse interaction state
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = null;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 20);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting (Simple, flat neo-brutalism style)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = false;
    scene.add(directionalLight);

    // Ambient (Strong, even lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    // 5. Materials (Flat, bold neo-brutalism)

    // Matte Black (The King)
    const blackMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      metalness: 0,
      roughness: 1,
    });

    // Flat White (The Pawn)
    const whiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 1,
    });

    // 6. Geometry & Meshes
    const kingGeometry = new THREE.LatheGeometry(KING_PROFILE, 32);
    // Scale down slightly and center pivot
    kingGeometry.computeBoundingBox();
    const kingHeight = kingGeometry.boundingBox!.max.y - kingGeometry.boundingBox!.min.y;
    kingGeometry.translate(0, -kingHeight / 2, 0);

    const pawnGeometry = new THREE.LatheGeometry(PAWN_PROFILE, 32);
    pawnGeometry.computeBoundingBox();
    const pawnHeight = pawnGeometry.boundingBox!.max.y - pawnGeometry.boundingBox!.min.y;
    pawnGeometry.translate(0, -pawnHeight / 2, 0);

    const group = new THREE.Group();
    scene.add(group);

    // King Object
    const king = new THREE.Mesh(kingGeometry, blackMaterial);
    king.scale.multiplyScalar(2); // Scale up for visibility
    king.position.set(-2.5, 0, 0);
    king.castShadow = false;
    king.receiveShadow = false;
    // Slight tilt
    king.rotation.z = 0.1;
    king.rotation.x = 0.1;
    group.add(king);
    console.log("King created:", king);

    // Pawn Object
    const pawn = new THREE.Mesh(pawnGeometry, whiteMaterial);
    pawn.scale.multiplyScalar(2); // Scale up for visibility
    pawn.position.set(2.5, 0, 0);
    pawn.castShadow = false;
    pawn.receiveShadow = false;
    // Slight tilt opposite way
    pawn.rotation.z = -0.15;
    pawn.rotation.x = 0.1;
    group.add(pawn);
    console.log("Pawn created:", pawn);

    // No shadow plane for flat aesthetic

    // 7. Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      const time = clock.getElapsedTime();

      // Subtle floating (reduced for flat aesthetic)
      king.position.y = Math.sin(time * 0.5) * 0.1;
      pawn.position.y = Math.sin(time * 0.5) * 0.1;

      king.position.x += Math.sin(time) * 0.01;
      pawn.position.x -= Math.sin(time) * 0.01;

      // Slow rotation
      king.rotation.y += 0.08;
      pawn.rotation.y -= 0.08;

      renderer.render(scene, camera);
      // animationRef.current = requestAnimationFrame(animate);
      setTimeout(() => {
        animate()
      }, 100);
    };

    animate();

    // 8. Event Listeners
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-screen h-screen ${className}`}
      // style={{ touchAction: "none" }}
    />
  );
};

export default ChessPiecesScene;
