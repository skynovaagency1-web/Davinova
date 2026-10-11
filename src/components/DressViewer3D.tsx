import { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Html, OrbitControls, useGLTF } from '@react-three/drei';
import { LoaderCircle, Rotate3D } from 'lucide-react';
import * as THREE from 'three';

function GarmentModel({ url, scale = 1, rotationY = 0 }: { url: string; scale?: number; rotationY?: number }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (Array.isArray(child.material)) child.material = child.material.map((material) => material.clone());
        else child.material = child.material.clone();
      }
    });
    return clone;
  }, [scene]);
  return <primitive object={model} scale={scale} rotation-y={rotationY} position={[0, -1.15, 0]} />;
}

function makeSkirtGeometry() {
  const rings = 30;
  const segments = 96;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings;
    const y = -0.13 - t * 1.15;
    const baseRadius = 0.245 + Math.pow(t, 0.82) * 0.43;
    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const folds = Math.sin(angle * 14 + t * 1.4) * (0.012 + t * 0.018)
        + Math.sin(angle * 27 - t * 2) * 0.007;
      const radius = baseRadius + folds;
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    }
  }
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = ring * (segments + 1) + segment;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function ConceptDress({ color }: { color: string }) {
  const skirt = useMemo(() => makeSkirtGeometry(), []);
  const bodice = useMemo(() => new THREE.LatheGeometry([
    new THREE.Vector2(0.25, -0.17),
    new THREE.Vector2(0.29, -0.09),
    new THREE.Vector2(0.27, 0.04),
    new THREE.Vector2(0.25, 0.17),
    new THREE.Vector2(0.31, 0.34),
    new THREE.Vector2(0.25, 0.46),
    new THREE.Vector2(0.16, 0.54),
    new THREE.Vector2(0.12, 0.57),
  ], 64), []);
  const cloth = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.025, side: THREE.DoubleSide }), [color]);
  const waist = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.78), roughness: 0.42 }), [color]);
  return <group position={[0, 0.25, 0]}>
    <mesh geometry={skirt} material={cloth} castShadow receiveShadow />
    <mesh geometry={bodice} material={cloth} castShadow receiveShadow />
    <mesh position={[0, -0.13, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <torusGeometry args={[0.265, 0.018, 10, 80]} />
      <primitive object={waist} attach="material" />
    </mesh>
    <mesh position={[0, -1.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.66, 0.006, 6, 96]} />
      <meshStandardMaterial color={new THREE.Color(color).multiplyScalar(0.72)} roughness={0.6} />
    </mesh>
  </group>;
}

function ViewerLoader() {
  return <Html center><span className="viewer-loading"><LoaderCircle size={18} className="viewer-spinner" /> Preparing your view…</span></Html>;
}

const fabricColors: Record<string, string> = {
  blush: '#b67f86',
  champagne: '#b9a17b',
  navy: '#28354b',
  black: '#302c2b',
  sage: '#929b80',
  berry: '#7f354d',
  'powder blue': '#8faec8',
  terracotta: '#a75f48',
};

export function DressViewer3D({ modelUrl, title, color = 'blush', scale, rotationY = 0 }: { modelUrl?: string; title: string; color?: string; scale?: number; rotationY?: number }) {
  const [fullscreen, setFullscreen] = useState(false);
  const garmentColor = fabricColors[color.toLowerCase()] ?? '#ad777d';
  return <div className={fullscreen ? 'dress-viewer dress-viewer--fullscreen' : 'dress-viewer'}>
    <div className="dress-viewer__label">
      <span><Rotate3D size={14} /> {modelUrl ? 'Interactive 3D' : '3D silhouette preview'}</span>
      <button type="button" onClick={() => setFullscreen((value) => !value)}>{fullscreen ? 'Exit expanded view' : 'Expand view'}</button>
    </div>
    <Canvas camera={{ position: [0, 0.12, 4.15], fov: 34 }} shadows dpr={[1, 1.75]}>
      <color attach="background" args={['#eee5dc']} />
      <ambientLight intensity={1.3} />
      <directionalLight position={[4, 5, 5]} intensity={2.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <Suspense fallback={<ViewerLoader />}>
        {modelUrl
          ? <GarmentModel url={modelUrl} scale={scale} rotationY={rotationY} />
          : <ConceptDress color={garmentColor} />}
        <Environment preset="studio" />
        <ContactShadows position={[0, -1.05, 0]} opacity={0.25} scale={3.2} blur={2.4} far={3} />
      </Suspense>
      <OrbitControls makeDefault enablePan={false} minDistance={2.4} maxDistance={5.8} minPolarAngle={Math.PI / 3.2} maxPolarAngle={Math.PI * 0.76} />
    </Canvas>
    <div className="dress-viewer__hint">Drag to rotate · Scroll or pinch to zoom</div>
    {!modelUrl && <p className="dress-viewer__disclaimer">Concept silhouette only — not an exact representation of the garment.</p>}
    <span className="sr-only">3D dress view for {title}. Drag or use touch gestures to rotate the silhouette and scroll or pinch to zoom.</span>
  </div>;
}
