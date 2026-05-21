import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshWobbleMaterial, Sphere, Box, Torus, Icosahedron } from '@react-three/drei';
import * as THREE from 'three';

function FloatingShape({ position, color, shape, speed = 1 }: { position: [number, number, number]; color: string; shape: 'sphere' | 'box' | 'torus' | 'icosahedron'; speed?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2 * speed;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3 * speed;
    }
  });

  const ShapeComponent = useMemo(() => {
    switch (shape) {
      case 'sphere':
        return (
          <Sphere args={[1, 32, 32]} ref={meshRef}>
            <MeshDistortMaterial color={color} distort={0.4} speed={2} transparent opacity={0.8} />
          </Sphere>
        );
      case 'box':
        return (
          <Box args={[1.5, 1.5, 1.5]} ref={meshRef}>
            <MeshWobbleMaterial color={color} factor={0.3} speed={1} transparent opacity={0.7} />
          </Box>
        );
      case 'torus':
        return (
          <Torus args={[1, 0.4, 16, 100]} ref={meshRef}>
            <MeshDistortMaterial color={color} distort={0.3} speed={1.5} transparent opacity={0.75} />
          </Torus>
        );
      case 'icosahedron':
        return (
          <Icosahedron args={[1, 1]} ref={meshRef}>
            <MeshWobbleMaterial color={color} factor={0.4} speed={2} transparent opacity={0.8} wireframe />
          </Icosahedron>
        );
      default:
        return null;
    }
  }, [shape, color]);

  return (
    <Float speed={speed} rotationIntensity={0.5} floatIntensity={1}>
      <group position={position} scale={0.8}>
        {ShapeComponent}
      </group>
    </Float>
  );
}

function ParticleField() {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 500;

  const [positions, sizes] = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      sizes[i] = Math.random() * 0.02 + 0.01;
    }

    return [positions, sizes];
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      particlesRef.current.rotation.x = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#00D9FF"
        size={0.05}
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00D9FF" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#9333EA" />
      
      <ParticleField />
      
      <FloatingShape position={[-3, 2, -2]} color="#00D9FF" shape="sphere" speed={0.8} />
      <FloatingShape position={[3, -1, -3]} color="#9333EA" shape="box" speed={1.2} />
      <FloatingShape position={[-2, -2, -1]} color="#00D9FF" shape="torus" speed={0.6} />
      <FloatingShape position={[2, 2, -4]} color="#9333EA" shape="icosahedron" speed={1} />
      <FloatingShape position={[0, 0, -5]} color="#00D9FF" shape="sphere" speed={0.5} />
    </>
  );
}

export function LandingScene() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
