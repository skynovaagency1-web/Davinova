import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Float, Lightformer, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { ConceptDress } from '../components/DressViewer3D';

// Boutique alcove: an arched niche, a turning plinth with a dress, soft studio light.
// The camera eases toward the pointer for a gentle parallax.

function Arch() {
  const shape = useMemo(() => {
    const width = 1.15;
    const height = 0.75;
    const outer = new THREE.Shape();
    outer.moveTo(-width - 0.35, -1.3);
    outer.lineTo(width + 0.35, -1.3);
    outer.lineTo(width + 0.35, height + width + 0.5);
    outer.lineTo(-width - 0.35, height + width + 0.5);
    outer.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-width, -1.3);
    hole.lineTo(width, -1.3);
    hole.lineTo(width, height);
    hole.absarc(0, height, width, 0, Math.PI, false);
    hole.lineTo(-width, -1.3);
    outer.holes.push(hole);
    return outer;
  }, []);
  return <group position={[0, 0, -0.9]}>
    <mesh receiveShadow>
      <extrudeGeometry args={[shape, { depth: 0.25, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3, curveSegments: 48 }]} />
      <meshStandardMaterial color="#efe4da" roughness={0.85} />
    </mesh>
    {/* Recessed back wall of the niche */}
    <mesh position={[0, 0.9, -0.05]} receiveShadow>
      <planeGeometry args={[2.4, 4.6]} />
      <meshStandardMaterial color="#d9c4b4" roughness={0.95} />
    </mesh>
  </group>;
}

function Plinth({ children }: { children: React.ReactNode }) {
  const turn = useRef<THREE.Group>(null);
  useFrame((_, delta) => { if (turn.current) turn.current.rotation.y += delta * 0.32; });
  return <group position={[0, -0.55, 0]}>
    <mesh position={[0, -1.12, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.82, 0.86, 0.16, 96]} />
      <meshStandardMaterial color="#f6efe8" roughness={0.35} metalness={0.05} />
    </mesh>
    <mesh position={[0, -1.03, 0]} rotation-x={Math.PI / 2}>
      <torusGeometry args={[0.82, 0.008, 8, 120]} />
      <meshStandardMaterial color="#c9a86f" roughness={0.25} metalness={0.9} />
    </mesh>
    <group ref={turn} position={[0, 0.05, 0]}>{children}</group>
  </group>;
}

function CameraRig() {
  useFrame(({ camera, pointer }, delta) => {
    const ease = 1 - Math.exp(-delta * 2.2);
    camera.position.x += (pointer.x * 0.55 - camera.position.x) * ease;
    camera.position.y += (0.15 + pointer.y * 0.25 - camera.position.y) * ease;
    camera.lookAt(0, -0.25, 0);
  });
  return null;
}

export default function HeroScene({ color = '#b67f86' }: { color?: string }) {
  return <Canvas camera={{ position: [0, 0.15, 6.4], fov: 32 }} shadows dpr={[1, 1.6]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
    <color attach="background" args={['#f4eee7']} />
    <fog attach="fog" args={['#f4eee7', 6, 12]} />
    <ambientLight intensity={0.9} />
    <spotLight position={[2.5, 5, 4]} angle={0.45} penumbra={0.8} intensity={60} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} color="#fff4ea" />
    <pointLight position={[-3, 1, 2]} intensity={8} color="#f1c9c1" />
    <Suspense fallback={null}>
      <Arch />
      <Plinth>
        <Float speed={1.4} rotationIntensity={0.05} floatIntensity={0.25}>
          <ConceptDress color={color} />
        </Float>
      </Plinth>
      <Sparkles count={40} scale={[3.5, 3.5, 2]} size={2.2} speed={0.25} opacity={0.55} color="#d9b98a" position={[0, 0.2, 0]} />
      {/* Built from local light panels so the hero never waits on a downloaded HDR file. */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 3]} scale={[6, 2, 1]} color="#fff6ee" />
        <Lightformer form="rect" intensity={1.2} position={[-4, 1, 1]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} color="#f3d6cf" />
        <Lightformer form="rect" intensity={1} position={[4, 1, 1]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} color="#f7e9d6" />
      </Environment>
      <ContactShadows position={[0, -1.6, 0]} opacity={0.3} scale={5} blur={2.6} far={3} />
    </Suspense>
    <CameraRig />
  </Canvas>;
}
