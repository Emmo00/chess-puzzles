"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

export default function ChessPiecesScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const piecesRef = useRef<THREE.Group[]>([])

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    sceneRef.current = scene
    scene.background = new THREE.Color(0xffffff)

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.position.z = 4
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    rendererRef.current = renderer
    container.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0xffffff, 0.8)
    pointLight.position.set(3, 4, 5)
    pointLight.castShadow = true
    scene.add(pointLight)

    const whitePiece = createChessKing(0xf5f5f5, 0xcccccc)
    const blackPiece = createChessPawn(0x1a1a1a, 0x333333)

    whitePiece.position.x = -1
    whitePiece.position.y = 0
    blackPiece.position.x = 1.2
    blackPiece.position.y = -0.2

    scene.add(whitePiece)
    scene.add(blackPiece)

    piecesRef.current = [whitePiece, blackPiece]

    // Animation loop
    let animationId: number
    const animate = () => {
      animationId = requestAnimationFrame(animate)

      // Gentle rotation
      whitePiece.rotation.y += 0.003
      blackPiece.rotation.y -= 0.003

      // Subtle floating animation
      whitePiece.position.y = Math.sin(Date.now() * 0.001) * 0.1
      blackPiece.position.y = Math.cos(Date.now() * 0.001) * 0.1 - 0.2

      renderer.render(scene, camera)
    }

    animate()

    // Handle window resize
    const handleResize = () => {
      const newWidth = container.clientWidth
      const newHeight = container.clientHeight
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(animationId)
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={containerRef} className="w-full h-full" />
}

function createChessKing(mainColor: number, accentColor: number): THREE.Group {
  const group = new THREE.Group()

  // Base
  const baseGeometry = new THREE.CylinderGeometry(0.35, 0.45, 0.15, 32)
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: mainColor,
    metalness: 0.3,
    roughness: 0.7,
  })
  const base = new THREE.Mesh(baseGeometry, baseMaterial)
  base.position.y = -0.55
  base.castShadow = true
  group.add(base)

  // Shaft
  const shaftGeometry = new THREE.CylinderGeometry(0.12, 0.18, 1.0, 32)
  const shaftMaterial = new THREE.MeshStandardMaterial({
    color: mainColor,
    metalness: 0.3,
    roughness: 0.7,
  })
  const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial)
  shaft.castShadow = true
  group.add(shaft)

  // Main sphere
  const sphereGeometry = new THREE.SphereGeometry(0.22, 32, 32)
  const sphereMaterial = new THREE.MeshStandardMaterial({
    color: accentColor,
    metalness: 0.6,
    roughness: 0.4,
  })
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
  sphere.position.y = 0.6
  sphere.castShadow = true
  group.add(sphere)

  // Crown cross (vertical)
  const crossVertGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8)
  const crossMaterial = new THREE.MeshStandardMaterial({
    color: accentColor,
    metalness: 0.8,
    roughness: 0.2,
  })
  const crossVert = new THREE.Mesh(crossVertGeometry, crossMaterial)
  crossVert.position.y = 1.0
  crossVert.castShadow = true
  group.add(crossVert)

  // Crown cross (horizontal)
  const crossHorizGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8)
  const crossHoriz = new THREE.Mesh(crossHorizGeometry, crossMaterial)
  crossHoriz.rotation.z = Math.PI / 2
  crossHoriz.position.y = 1.0
  crossHoriz.castShadow = true
  group.add(crossHoriz)

  return group
}

function createChessPawn(mainColor: number, accentColor: number): THREE.Group {
  const group = new THREE.Group()

  // Base
  const baseGeometry = new THREE.CylinderGeometry(0.3, 0.38, 0.12, 32)
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: mainColor,
    metalness: 0.3,
    roughness: 0.7,
  })
  const base = new THREE.Mesh(baseGeometry, baseMaterial)
  base.position.y = -0.5
  base.castShadow = true
  group.add(base)

  // Shaft
  const shaftGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.85, 32)
  const shaftMaterial = new THREE.MeshStandardMaterial({
    color: mainColor,
    metalness: 0.3,
    roughness: 0.7,
  })
  const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial)
  shaft.castShadow = true
  group.add(shaft)

  // Head (small sphere)
  const headGeometry = new THREE.SphereGeometry(0.18, 32, 32)
  const headMaterial = new THREE.MeshStandardMaterial({
    color: accentColor,
    metalness: 0.6,
    roughness: 0.4,
  })
  const head = new THREE.Mesh(headGeometry, headMaterial)
  head.position.y = 0.55
  head.castShadow = true
  group.add(head)

  // Top finial
  const finialGeometry = new THREE.SphereGeometry(0.08, 24, 24)
  const finialMaterial = new THREE.MeshStandardMaterial({
    color: accentColor,
    metalness: 0.8,
    roughness: 0.2,
  })
  const finial = new THREE.Mesh(finialGeometry, finialMaterial)
  finial.position.y = 0.85
  finial.castShadow = true
  group.add(finial)

  return group
}
