import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function App() {
  const [gameBoard, setGameBoard] = useState(Array(27).fill(null));
  const spacing = 2.5; // Adjust this value to increase or decrease spacing

  function calculatePosition(index) {
    const x = (index % 3) - 1;
    const y = Math.floor(index / 9) - 1;
    const z = Math.floor((index % 9) / 3) - 1;
    return [x * spacing, y * spacing, z * spacing];
  }

  function handleClick(i) {
    if (gameBoard[i]) {
      return;
    }

    const boardCopy = [...gameBoard];
    boardCopy[i] = "Cube";
    setGameBoard(boardCopy);
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{
          fov: 50,
          position: [-10, -10, -15]
        }}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <shadowMaterial opacity={0.5} />
        </mesh>
        <OrbitControls maxDistance={40} enableDamping />
        <ambientLight intensity={0.5} />
        <pointLight position={[-150, 300, -300]} intensity={0.9} />
        <directionalLight position={[0, 10, 0]} intensity={1} />

        {/* Render 3x3x3 game board with spacing */}
        {gameBoard.map((cell, index) => (
          <mesh
            key={index}
            position={calculatePosition(index)}
            onClick={() => handleClick(index)}
            castShadow
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={cell ? "red" : "gray"} />
          </mesh>
        ))}
      </Canvas>
    </div>
  );
}

export default React.memo(App);