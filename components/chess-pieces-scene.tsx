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

    // 4. Lighting (Premium Studio Setup)

    // Key Light (Warm, from top right)
    const keyLight = new THREE.SpotLight(0xfff5ea, 300);
    keyLight.position.set(8, 10, 8);
    keyLight.angle = Math.PI / 6;
    keyLight.penumbra = 0.5;
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.bias = -0.0001;
    keyLight.shadow.radius = 4; // Softer shadows
    scene.add(keyLight);

    // Fill Light (Cool, from left)
    const fillLight = new THREE.SpotLight(0xdbeafe, 60);
    fillLight.position.set(-6, 2, 4);
    fillLight.lookAt(0, 0, 0);
    scene.add(fillLight);

    // Rim Light (Sharp, from back)
    const rimLight = new THREE.DirectionalLight(0xffffff, 40);
    rimLight.position.set(0, 5, -8);
    scene.add(rimLight);

    // Ambient (Soft base)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // 5. Materials

    // Matte Black (The King)
    const blackMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a1a,
      metalness: 0.1,
      roughness: 0.4,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
      sheen: 0.2,
    });

    // Glossy White (The Pawn) - Ceramic feel
    const whiteMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transmission: 0.1, // Slight translucency
      thickness: 2,
      ior: 1.5,
    });

    // 6. Geometry & Meshes
    const kingGeometry = new THREE.LatheGeometry(KING_PROFILE, 128);
    // Scale down slightly and center pivot
    kingGeometry.computeBoundingBox();
    const kingHeight = kingGeometry.boundingBox!.max.y - kingGeometry.boundingBox!.min.y;
    kingGeometry.translate(0, -kingHeight / 2, 0);

    const pawnGeometry = new THREE.LatheGeometry(PAWN_PROFILE, 128);
    pawnGeometry.computeBoundingBox();
    const pawnHeight = pawnGeometry.boundingBox!.max.y - pawnGeometry.boundingBox!.min.y;
    pawnGeometry.translate(0, -pawnHeight / 2, 0);

    const group = new THREE.Group();
    scene.add(group);

    // King Object
    const king = new THREE.Mesh(kingGeometry, blackMaterial);
    king.scale.multiplyScalar(2); // Scale up for visibility
    king.position.set(-2.5, 0, 0);
    king.castShadow = true;
    king.receiveShadow = true;
    // Slight tilt
    king.rotation.z = 0.1;
    king.rotation.x = 0.1;
    group.add(king);
    console.log("King created:", king);

    // Pawn Object
    const pawn = new THREE.Mesh(pawnGeometry, whiteMaterial);
    pawn.scale.multiplyScalar(2); // Scale up for visibility
    pawn.position.set(2.5, 0, 0);
    pawn.castShadow = true;
    pawn.receiveShadow = true;
    // Slight tilt opposite way
    pawn.rotation.z = -0.15;
    pawn.rotation.x = 0.1;
    group.add(pawn);
    console.log("Pawn created:", pawn);

    // Shadow Plane (invisible but receives shadows)
    const planeGeo = new THREE.PlaneGeometry(20, 20);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.15, color: 0x000000 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -2.5;
    plane.receiveShadow = true;
    group.add(plane);

    // 7. Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      const time = clock.getElapsedTime();

      // Float animation (increased amplitude for visibility)
      king.position.y = -0.5 + Math.sin(time * 0.8) * 0.1;
      pawn.position.y = -0.8 + Math.sin(time * 0.7 + 2) * 0.1;

      // Self-rotation (increased speed for visibility)
      king.rotation.y += 0.003;
      pawn.rotation.y -= 0.004;

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
