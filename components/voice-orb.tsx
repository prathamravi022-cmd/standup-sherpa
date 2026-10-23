'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

type OrbState = 'idle' | 'listening' | 'processing' | 'done'

function CoreMesh({ state }: { state: OrbState }) {
  const mesh = useRef<THREE.Mesh>(null)
  const material = useRef<any>(null)
  useFrame((_, delta) => {
    if (!mesh.current) return
    mesh.current.rotation.y += delta * (state === 'processing' ? 1.1 : 0.16)
    mesh.current.rotation.x = Math.sin(Date.now() * 0.0003) * 0.12
    const mat = material.current
    if (mat) {
      const colors: Record<OrbState, string> = { idle: '#7394ff', listening: '#8c9fff', processing: '#f4bb68', done: '#74e7bd' }
      mat.color.lerp(new THREE.Color(colors[state]), Math.min(1, delta * 2.5))
      mat.distort = THREE.MathUtils.damp(mat.distort, state === 'listening' ? 0.55 : state === 'processing' ? 0.62 : 0.34, 2.5, delta)
    }
  })
  return (
    <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.32}>
      <mesh ref={mesh} scale={1.14}>
        <icosahedronGeometry args={[1, 5]} />
        <MeshDistortMaterial ref={material} color="#7394ff" roughness={0.18} metalness={0.16} distort={0.34} speed={2.1} emissive="#253c83" emissiveIntensity={0.65} />
      </mesh>
    </Float>
  )
}

export function VoiceOrb({ state }: { state: OrbState }) {
  return (
    <div className={`orb-stage orb-${state}`} aria-hidden="true">
      <div className="orb-halo orb-halo-back" />
      <div className="orb-halo orb-halo-front" />
      <div className="orb-canvas">
        <Canvas camera={{ position: [0, 0, 3.6], fov: 36 }} dpr={[1, 1.6]} gl={{ alpha: true, antialias: true }}>
          <ambientLight intensity={0.75} />
          <directionalLight position={[3, 4, 5]} intensity={1.8} color="#e2eaff" />
          <pointLight position={[-3, -2, 2]} intensity={7} color={state === 'processing' ? '#ffbd6e' : '#7796ff'} />
          <CoreMesh state={state} />
          <Sparkles count={30} scale={3.1} size={2.1} speed={0.28} color="#dce5ff" opacity={0.75} />
        </Canvas>
      </div>
      <div className="orb-center-shadow" />
      <div className="orb-ring" />
    </div>
  )
}
