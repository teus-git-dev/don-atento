"use client";

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Points, PointMaterial, Center } from '@react-three/drei';
import * as THREE from 'three';
import { MapPin, Info, Camera, Box, Move, CheckCircle2 } from 'lucide-react';
import TicketCreationModal from './TicketCreationModal';

interface Annotation {
  id: string;
  position: THREE.Vector3;
  label: string;
  type: 'damage' | 'info' | 'critical';
  ticketId?: string;
}

function SplatCloud({ onSplatClick }: { onSplatClick: (point: THREE.Vector3) => void }) {
  // Simulate a Gaussian Splat cloud for demonstration
  const count = 50000;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Create a "room-like" structure
      const side = Math.random() > 0.5 ? 1 : -1;
      const wall = Math.floor(Math.random() * 3);
      
      if (wall === 0) { // Floor/Ceiling
        pos[i * 3] = (Math.random() - 0.5) * 10;
        pos[i * 3 + 1] = side * 3 + (Math.random() - 0.5) * 0.1;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      } else if (wall === 1) { // Walls X
        pos[i * 3] = side * 5 + (Math.random() - 0.5) * 0.1;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      } else { // Walls Z
        pos[i * 3] = (Math.random() - 0.5) * 10;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
        pos[i * 3 + 2] = side * 5 + (Math.random() - 0.5) * 0.1;
      }
    }
    return pos;
  }, []);

  const colors = useMemo(() => {
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const r = 0.0 + Math.random() * 0.1;
        const g = 0.2 + Math.random() * 0.3;
        const b = 0.4 + Math.random() * 0.5;
        col[i * 3] = r;
        col[i * 3 + 1] = g;
        col[i * 3 + 2] = b;
    }
    return col;
  }, []);

  const sizes = useMemo(() => {
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        s[i] = 0.02 + Math.random() * 0.08;
    }
    return s;
  }, []);

  return (
    <Points 
      positions={positions} 
      colors={colors}
      sizes={sizes}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSplatClick(e.point);
      }}
    >
      <PointMaterial
        transparent
        vertexColors
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.4}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

function AnnotationMarker({ annotation, onClick }: { annotation: Annotation, onClick: () => void }) {
    return (
        <group position={annotation.position} onClick={(e) => {
            e.stopPropagation();
            onClick();
        }}>
            <mesh>
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshBasicMaterial color={annotation.type === 'critical' ? '#ff0055' : '#00ffff'} transparent opacity={0.8} />
            </mesh>
            <mesh scale={[1.2, 1.2, 1.2]}>
                <sphereGeometry args={[0.12, 16, 16]} />
                <meshBasicMaterial color={annotation.type === 'critical' ? '#ff0055' : '#00ffff'} wireframe transparent opacity={0.4} />
            </mesh>
        </group>
    );
}

export default function SplatViewer() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<THREE.Vector3 | null>(null);

  const handleSplatClick = (point: THREE.Vector3) => {
    setPendingPoint(point.clone());
    setIsModalOpen(true);
  };

  const handleTicketCreated = (ticket: any) => {
    if (pendingPoint) {
      const newAnnotation: Annotation = {
        id: ticket.id,
        position: pendingPoint.clone(),
        label: ticket.title,
        type: ticket.priority === 'urgent' ? 'critical' : 'damage',
        ticketId: ticket.id
      };
      setAnnotations([...annotations, newAnnotation]);
      setSelectedAnnotation(newAnnotation);
      setPendingPoint(null);
    }
  };

  return (
    <div className="relative w-full h-full glass rounded-3xl border border-white/5 overflow-hidden bg-black/40">
      {/* 3D Canvas */}
      <Canvas dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[8, 5, 8]} fov={50} />
        <color attach="background" args={['#03070d']} />
        <ambientLight intensity={0.5} />
        
        <SplatCloud onSplatClick={handleSplatClick} />

        {annotations.map(ann => (
            <AnnotationMarker 
                key={ann.id} 
                annotation={ann} 
                onClick={() => setSelectedAnnotation(ann)} 
            />
        ))}

        <OrbitControls 
            enableDamping 
            dampingFactor={0.05} 
            maxDistance={20} 
            minDistance={2} 
        />
        
        {/* Grid Helper for scale */}
        <gridHelper args={[20, 20, 0x00ffff, 0x112233]} position={[0, -3, 0]} />
      </Canvas>

      {/* Modal */}
      <TicketCreationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        spatialPoint={pendingPoint}
        propertyId="ED-HOR-101" 
        onTicketCreated={handleTicketCreated}
      />

      {/* UI Overlay */}
      <div className="absolute top-6 left-6 flex flex-col gap-3">
        <div className="glass px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-neon-cyan)] animate-pulse"></div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-300">Modo: Inspección Digital Twin</span>
        </div>
        
        <div className="flex gap-2">
            {[
                { icon: <Move size={16} />, label: "Navegar" },
                { icon: <Camera size={16} />, label: "Captura" },
                { icon: <Box size={16} />, label: "Splat-Click" },
            ].map((btn, i) => (
                <button key={i} className="glass p-3 rounded-2xl border border-white/10 hover:bg-white/10 transition-all text-gray-400 hover:text-[var(--color-neon-cyan)]">
                    {btn.icon}
                </button>
            ))}
        </div>
      </div>

      {/* Annotation Detail Panel */}
      {selectedAnnotation && (
        <div className="absolute bottom-6 right-6 w-72 animate-in slide-in-from-right duration-300">
            <div className="glass p-5 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-[var(--color-neon-cyan)]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-white">ID: {selectedAnnotation.ticketId}</span>
                    </div>
                    <button onClick={() => setSelectedAnnotation(null)} className="text-gray-500 hover:text-white">&times;</button>
                </div>
                
                <h4 className="text-sm font-bold text-white mb-2">{selectedAnnotation.label}</h4>
                <p className="text-[10px] text-gray-400 mb-4 leading-relaxed">
                    Ubicación espacial: {selectedAnnotation.position.x.toFixed(2)}, {selectedAnnotation.position.y.toFixed(2)}, {selectedAnnotation.position.z.toFixed(2)}
                </p>

                <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                        <CheckCircle2 size={16} className="text-[var(--color-neon-cyan)]" />
                        <span className="text-xs text-gray-300">Vinculado al Orquestador IA</span>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-6 right-6 glass p-4 rounded-2xl border border-white/10 text-[10px] text-gray-500 space-y-2">
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-neon-cyan)]"></div>
            <span>Anomalía Generada</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span>Punto de Interés</span>
        </div>
      </div>
    </div>
  );
}
