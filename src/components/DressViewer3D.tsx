import { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Html, OrbitControls, useGLTF } from '@react-three/drei';
import { Box, LoaderCircle, Rotate3D } from 'lucide-react';
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

function ViewerLoader() {
  return <Html center><span className="viewer-loading"><LoaderCircle size={18} className="viewer-spinner" /> Preparing your view…</span></Html>;
}

export function DressViewer3D({ modelUrl, title, scale, rotationY = 0 }: { modelUrl?: string; title: string; scale?: number; rotationY?: number }) {
  const [fullscreen, setFullscreen] = useState(false);
  if (!modelUrl) {
    return <div className="viewer-unavailable">
      <div className="viewer-unavailable__icon"><Box size={26} strokeWidth={1.25} /></div>
      <p className="eyebrow">A closer look</p>
      <h3>Explore every detail.</h3>
      <p>An interactive 3D model for this dress is coming soon. We are preparing the garment model so you can explore the silhouette from every angle.</p>
      <div className="viewer-unavailable__foot"><Rotate3D size={15} /> 360° viewing will be available when the model is added.</div>
    </div>;
  }
  return <div className={fullscreen ? 'dress-viewer dress-viewer--fullscreen' : 'dress-viewer'}>
    <div className="dress-viewer__label"><span><Rotate3D size={14} /> Interactive 3D</span><button onClick={() => setFullscreen((value) => !value)}>{fullscreen ? 'Exit fullscreen' : 'Expand view'}</button></div>
    <Canvas camera={{ position: [0, 0.15, 4.4], fov: 33 }} shadows dpr={[1, 1.75]}>
      <color attach="background" args={['#eee5dc']} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[4, 5, 5]} intensity={2.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <Suspense fallback={<ViewerLoader />}>
        <GarmentModel url={modelUrl} scale={scale} rotationY={rotationY} />
        <Environment preset="studio" />
        <ContactShadows position={[0, -1.16, 0]} opacity={0.28} scale={3.5} blur={2.5} far={3} />
      </Suspense>
      <OrbitControls makeDefault enablePan={false} minDistance={2.7} maxDistance={6} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI * 0.78} />
    </Canvas>
    <div className="dress-viewer__hint">Drag to rotate · Scroll to zoom</div>
    <span className="sr-only">3D model viewer for {title}. Use a mouse or touch gesture to rotate the model and scroll or pinch to zoom.</span>
  </div>;
}
