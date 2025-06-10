"use client";

import React, { useMemo, useRef } from "react";
import { Center, Environment, Float, Html, Text3D } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Sophisticated blockchain network with clear connections
function BlockchainNetwork() {
  const networkRef = useRef<THREE.Group>(null);
  const connectionsRef = useRef<THREE.Group>(null);

  const { nodes, connections } = useMemo(() => {
    const nodeCount = 12; // Fewer, more prominent nodes
    const nodes = [];
    const connections = [];

    // Create nodes in a clear hexagonal pattern
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 6;
      const height = Math.sin(i * 0.8) * 2;

      nodes.push({
        position: [Math.cos(angle) * radius, height, Math.sin(angle) * radius] as [number, number, number],
        size: 0.4,
        color: new THREE.Color(`hsl(${210 + i * 15}, 80%, 60%)`),
        id: i,
      });
    }

    // Create clear connections between adjacent nodes
    for (let i = 0; i < nodes.length; i++) {
      const nextIndex = (i + 1) % nodes.length;
      connections.push({
        start: nodes[i].position,
        end: nodes[nextIndex].position,
      });

      // Add some cross connections for complexity
      if (i % 3 === 0) {
        const crossIndex = (i + nodes.length / 2) % nodes.length;
        connections.push({
          start: nodes[i].position,
          end: nodes[crossIndex].position,
        });
      }
    }

    return { nodes, connections };
  }, []);

  useFrame(state => {
    if (networkRef.current) {
      networkRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }

    if (connectionsRef.current) {
      connectionsRef.current.children.forEach((line, i) => {
        if (line instanceof THREE.Mesh && line.material instanceof THREE.MeshBasicMaterial) {
          line.material.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.3;
        }
      });
    }
  });

  return (
    <group ref={networkRef} position={[0, 0, -8]}>
      {/* Network connections */}
      <group ref={connectionsRef}>
        {connections.map((connection, i) => {
          const start = new THREE.Vector3(...connection.start);
          const end = new THREE.Vector3(...connection.end);
          const direction = end.clone().sub(start);
          const length = direction.length();
          const center = start.clone().add(end).divideScalar(2);

          return (
            <mesh key={i} position={center.toArray()}>
              <cylinderGeometry args={[0.02, 0.02, length, 8]} />
              <meshBasicMaterial color="#60a5fa" transparent opacity={0.6} />
            </mesh>
          );
        })}
      </group>

      {/* Network nodes with clear labels */}
      {nodes.map((node, i) => (
        <Float key={i} speed={1 + i * 0.1} rotationIntensity={0.2} floatIntensity={0.3}>
          <group position={node.position}>
            {/* Main node sphere */}
            <mesh>
              <sphereGeometry args={[node.size, 32, 32]} />
              <meshStandardMaterial
                color={node.color}
                emissive={node.color}
                emissiveIntensity={0.4}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>

            {/* Node number */}
            <Html center>
              <div
                style={{
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "bold",
                  textShadow: "0 0 10px rgba(0,0,0,0.8)",
                  fontFamily: "monospace",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              >
                {node.id + 1}
              </div>
            </Html>

            {/* Glow effect */}
            <mesh>
              <sphereGeometry args={[node.size * 1.5, 16, 16]} />
              <meshBasicMaterial color={node.color} transparent opacity={0.2} />
            </mesh>
          </group>
        </Float>
      ))}
    </group>
  );
}

// Detailed credit score display with clear metrics
function CreditScoreDisplay() {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Group>(null);

  useFrame(state => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.2;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.2}>
      <group ref={groupRef} position={[5, 1, -2]}>
        {/* Main score platform */}
        <mesh>
          <cylinderGeometry args={[2, 2, 0.3, 32]} />
          <meshStandardMaterial
            color="#1e40af"
            metalness={0.9}
            roughness={0.1}
            emissive="#1e3a8a"
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* Score text */}
        <Center>
          <Text3D
            font="/fonts/helvetiker_regular.typeface.json"
            size={0.6}
            height={0.15}
            position={[0, 0.2, 0.2]}
            bevelEnabled
            bevelThickness={0.02}
            bevelSize={0.02}
          >
            750
            <meshStandardMaterial
              color="#fbbf24"
              metalness={0.8}
              roughness={0.2}
              emissive="#f59e0b"
              emissiveIntensity={0.3}
            />
          </Text3D>

          <Text3D font="/fonts/helvetiker_regular.typeface.json" size={0.15} height={0.05} position={[0, -0.4, 0.2]}>
            EXCELLENT
            <meshStandardMaterial color="#10b981" />
          </Text3D>
        </Center>

        {/* Rotating indicator ring */}
        <group ref={ringRef}>
          <mesh>
            <torusGeometry args={[2.2, 0.1, 8, 32]} />
            <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.5} />
          </mesh>
        </group>

        {/* Credit factors orbiting around */}
        {[
          { label: "TXN", color: "#3b82f6", angle: 0, value: "20%" },
          { label: "DeFi", color: "#10b981", angle: Math.PI / 3, value: "20%" },
          { label: "HIST", color: "#f59e0b", angle: (Math.PI * 2) / 3, value: "20%" },
          { label: "GOV", color: "#ef4444", angle: Math.PI, value: "15%" },
          { label: "AGE", color: "#8b5cf6", angle: (Math.PI * 4) / 3, value: "15%" },
          { label: "REP", color: "#06b6d4", angle: (Math.PI * 5) / 3, value: "10%" },
        ].map((factor, i) => (
          <group
            key={i}
            position={[Math.cos(factor.angle) * 3.5, Math.sin(i * 0.5) * 0.5, Math.sin(factor.angle) * 3.5]}
          >
            <mesh>
              <boxGeometry args={[0.6, 0.6, 0.2]} />
              <meshStandardMaterial
                color={factor.color}
                metalness={0.7}
                roughness={0.3}
                emissive={factor.color}
                emissiveIntensity={0.3}
              />
            </mesh>

            <Html center>
              <div
                style={{
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold",
                  textAlign: "center",
                  textShadow: "0 0 5px rgba(0,0,0,0.8)",
                  fontFamily: "monospace",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              >
                <div>{factor.label}</div>
                <div style={{ fontSize: "10px", opacity: 0.8 }}>{factor.value}</div>
              </div>
            </Html>
          </group>
        ))}
      </group>
    </Float>
  );
}

// Enhanced privacy shield with clear ZK branding
function PrivacyShield() {
  const shieldRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const count = 100;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const radius = 2 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    return positions;
  }, []);

  useFrame(state => {
    if (shieldRef.current) {
      shieldRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      shieldRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.05);
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
      <group ref={shieldRef} position={[-5, 0, -1]}>
        {/* Main shield */}
        <mesh>
          <cylinderGeometry args={[1.8, 1.2, 0.5, 8]} />
          <meshStandardMaterial
            color="#7c3aed"
            metalness={0.9}
            roughness={0.1}
            emissive="#6d28d9"
            emissiveIntensity={0.4}
          />
        </mesh>

        {/* Shield details */}
        <mesh position={[0, 0, 0.3]}>
          <cylinderGeometry args={[1.6, 1.0, 0.1, 8]} />
          <meshStandardMaterial color="#8b5cf6" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* ZK text */}
        <Center>
          <Text3D
            font="/fonts/helvetiker_regular.typeface.json"
            size={0.4}
            height={0.1}
            position={[0, 0.1, 0.4]}
            bevelEnabled
            bevelThickness={0.02}
            bevelSize={0.02}
          >
            ZK
            <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.3} />
          </Text3D>

          <Text3D font="/fonts/helvetiker_regular.typeface.json" size={0.12} height={0.03} position={[0, -0.3, 0.4]}>
            PRIVACY
            <meshStandardMaterial color="#e5e7eb" />
          </Text3D>
        </Center>

        {/* Protective particles */}
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={particles.length / 3}
              array={particles}
              itemSize={3}
              args={[particles, 3]}
            />
          </bufferGeometry>
          <pointsMaterial color="#a855f7" size={0.08} transparent opacity={0.8} sizeAttenuation />
        </points>
      </group>
    </Float>
  );
}

// Professional DeFi token display
function DeFiTokens() {
  const tokens = [
    { symbol: "ETH", name: "Ethereum", color: "#627eea", position: [-8, 2, 0] as [number, number, number] },
    { symbol: "BTC", name: "Bitcoin", color: "#f7931a", position: [8, -1, 1] as [number, number, number] },
    { symbol: "UNI", name: "Uniswap", color: "#ff007a", position: [3, 3, -5] as [number, number, number] },
    { symbol: "AAVE", name: "Aave", color: "#2ebac6", position: [-3, -2, 4] as [number, number, number] },
  ];

  return (
    <group>
      {tokens.map((token, index) => (
        <Float key={index} speed={1 + index * 0.2} rotationIntensity={0.1} floatIntensity={0.3}>
          <group position={token.position}>
            {/* Token base */}
            <mesh>
              <cylinderGeometry args={[0.8, 0.8, 0.3, 32]} />
              <meshStandardMaterial
                color={token.color}
                metalness={0.9}
                roughness={0.1}
                emissive={token.color}
                emissiveIntensity={0.2}
              />
            </mesh>

            {/* Token edge */}
            <mesh>
              <torusGeometry args={[0.8, 0.15, 8, 32]} />
              <meshStandardMaterial color={token.color} metalness={1.0} roughness={0.0} />
            </mesh>

            {/* Token symbol */}
            <Center>
              <Text3D
                font="/fonts/helvetiker_regular.typeface.json"
                size={0.25}
                height={0.05}
                position={[0, 0.05, 0.2]}
                bevelEnabled
                bevelThickness={0.01}
                bevelSize={0.01}
              >
                {token.symbol}
                <meshStandardMaterial color="#ffffff" metalness={0.7} roughness={0.3} />
              </Text3D>
            </Center>

            <Html center distanceFactor={10}>
              <div
                style={{
                  color: token.color,
                  fontSize: "11px",
                  fontWeight: "bold",
                  textAlign: "center",
                  marginTop: "40px",
                  textShadow: "0 0 10px rgba(0,0,0,0.8)",
                  fontFamily: "monospace",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              >
                {token.name}
              </div>
            </Html>

            {/* Subtle glow */}
            <mesh>
              <sphereGeometry args={[1.2, 16, 16]} />
              <meshBasicMaterial color={token.color} transparent opacity={0.1} />
            </mesh>
          </group>
        </Float>
      ))}
    </group>
  );
}

// Elegant data visualization cubes
function DataVisualization() {
  const cubesRef = useRef<THREE.Group>(null);

  const cubes = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      position: [Math.cos(i * 0.8) * 4, Math.sin(i * 0.6) * 2, Math.sin(i * 0.8) * 4] as [number, number, number],
      size: 0.5 + Math.random() * 0.3,
      color: new THREE.Color().setHSL(0.3 + i * 0.1, 0.8, 0.6),
    }));
  }, []);

  useFrame(state => {
    if (cubesRef.current) {
      cubesRef.current.children.forEach((child, i) => {
        child.rotation.x = state.clock.elapsedTime * (0.5 + i * 0.1);
        child.rotation.y = state.clock.elapsedTime * (0.3 + i * 0.1);
        child.position.y = cubes[i].position[1] + Math.sin(state.clock.elapsedTime + i) * 0.3;
      });
    }
  });

  return (
    <group ref={cubesRef} position={[0, 0, 3]}>
      {cubes.map((cube, i) => (
        <mesh key={i} position={cube.position} scale={cube.size}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={cube.color}
            transparent
            opacity={0.8}
            metalness={0.6}
            roughness={0.4}
            emissive={cube.color}
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

// Main Three.js Scene with professional lighting
export function ThreeJSScene() {
  return (
    <div className="fixed inset-0 -z-10 opacity-60">
      <Canvas camera={{ position: [0, 3, 10], fov: 60 }} gl={{ alpha: true, antialias: true }} shadows>
        {/* Professional lighting setup */}
        <ambientLight intensity={0.2} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, 5, -5]} intensity={0.8} color="#60a5fa" />
        <pointLight position={[10, -5, 5]} intensity={0.6} color="#a855f7" />
        <spotLight position={[0, 15, 0]} angle={0.4} penumbra={0.5} intensity={0.8} color="#10b981" castShadow />

        {/* Environment for reflections */}
        <Environment preset="night" />

        {/* All 3D components */}
        <BlockchainNetwork />
        <CreditScoreDisplay />
        <PrivacyShield />
        <DeFiTokens />
        <DataVisualization />

        {/* Atmospheric fog */}
        <fog attach="fog" args={["#0f172a", 5, 30]} />
      </Canvas>
    </div>
  );
}
