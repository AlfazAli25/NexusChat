import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function WaveParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 2000;

  const [positions, originalPositions] = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 15;
      const y = (Math.random() - 0.5) * 15;
      const z = (Math.random() - 0.5) * 5;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;
    }

    return [positions, originalPositions];
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      const positionAttribute = pointsRef.current.geometry.attributes.position;
      const time = state.clock.elapsedTime;

      for (let i = 0; i < particleCount; i++) {
        const x = originalPositions[i * 3];
        const y = originalPositions[i * 3 + 1];

        // Create wave effect
        const waveX = Math.sin(y * 0.5 + time * 0.5) * 0.3;
        const waveY = Math.cos(x * 0.5 + time * 0.3) * 0.3;
        const waveZ = Math.sin((x + y) * 0.3 + time * 0.4) * 0.5;

        positionAttribute.setXYZ(
          i,
          x + waveX,
          y + waveY,
          originalPositions[i * 3 + 2] + waveZ
        );
      }

      positionAttribute.needsUpdate = true;
      pointsRef.current.rotation.z = time * 0.02;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#00D9FF"
        size={0.03}
        transparent
        opacity={0.5}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.5} color="#00D9FF" />
      <pointLight position={[-5, -5, 5]} intensity={0.3} color="#9333EA" />
      <WaveParticles />
    </>
  );
}

export function ParticleBackground() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
