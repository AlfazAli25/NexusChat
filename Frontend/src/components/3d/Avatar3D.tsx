import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function Avatar3D({ seed = 'avatar' }: { seed?: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Generate color based on seed
  const hue = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
  const color = `hsl(${hue}, 70%, 50%)`;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 2]} />
        <MeshDistortMaterial
          color={color}
          distort={0.3}
          speed={2}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, 0, 0]} scale={1.1}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.2} />
      </mesh>
    </Float>
  );
}

function Scene({ seed }: { seed: string }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#00D9FF" />
      <pointLight position={[-5, -5, 5]} intensity={0.5} color="#9333EA" />
      <Avatar3D seed={seed} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.5}
      />
    </>
  );
}

export function Avatar3DViewer({ seed = 'avatar', className = '' }: { seed?: string; className?: string }) {
  return (
    <div className={`${className}`}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene seed={seed} />
      </Canvas>
    </div>
  );
}
