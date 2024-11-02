import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import './App.css';
import {XMark} from "./XMark";
import {OMark} from "./OMark";
import { WinLine } from "./WinLine";
import { calculateWinner } from "./GameManager";

function App() {
  const [gameBoard, setGameBoard] = useState(Array(27).fill(null));
  const [hovered, setHovered] = useState(null);
  const [isXNext, setIsXNext] = useState(true);
  const [winInfo, setWinInfo] = useState(null);
  const spacing = 2.5; // Adjust this value to increase or decrease spacing

  function calculatePosition(index) {
    const x = (index % 3) - 1;
    const y = Math.floor(index / 9) - 1;
    const z = Math.floor((index % 9) / 3) - 1;
    return [x * spacing, y * spacing, z * spacing];
  }

  function handleClick(i) {
    if (gameBoard[i] || winInfo?.winner) return;

    const boardCopy = [...gameBoard];
    boardCopy[i] = isXNext ? "X" : "O";
    setGameBoard(boardCopy);

    const result = calculateWinner(boardCopy);
    if (result) {
      setWinInfo(result);
    } else {
      setIsXNext(!isXNext);
    }
  }

  function resetGame() {
    setGameBoard(Array(27).fill(null));
    setIsXNext(true);
    setWinInfo(null);
  }

  useEffect(() => {
    const result = calculateWinner(gameBoard);
    if (result) {
      setWinInfo(result);
    }
  }, [gameBoard]);

  return (
      <>
        {winInfo ? (
            <div className="winner-info">
              {winInfo.winner === 'draw' ? "Draw!" : `Winner is: ${winInfo.winner}`}
              <button onClick={resetGame}>New Game</button>
            </div>
        ) : (
            <span className="turn-indicator">
              {isXNext ? "X's" : "O's"} move
            </span>
        )}
        <div className="game-container">
          <Canvas camera={{fov: 50, position: [-10, -10, -15]}}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
              <planeGeometry args={[100, 100]}/>
              <shadowMaterial opacity={0.5}/>
            </mesh>
            <OrbitControls maxDistance={40} enableDamping/>
            <ambientLight intensity={0.5}/>
            <pointLight position={[-150, 300, -300]} intensity={0.9} />
            <directionalLight position={[0, 10, 0]} intensity={1} />

            {gameBoard.map((cell, index) => {
              const position = calculatePosition(index);

              return (
                  <React.Fragment key={index}>
                    {!cell && (
                        <mesh
                            position={position}
                            onClick={() => handleClick(index)}
                            onPointerOver={() => setHovered(index)}
                            onPointerOut={() => setHovered(null)}
                        >
                          <boxGeometry args={[1, 1, 1]} />
                          <meshStandardMaterial
                              color={hovered === index ? "yellow" : "gray"}
                              opacity={0.5}
                              transparent
                          />
                        </mesh>
                    )}

                    {cell === "X" && <XMark position={position} />}
                    {cell === "O" && <OMark position={position} />}
                  </React.Fragment>
              );
            })}

            {winInfo && winInfo.positions && (
                <WinLine
                    startPos={calculatePosition(winInfo.positions[0])}
                    endPos={calculatePosition(winInfo.positions[2])}
                />
            )}
          </Canvas>
        </div>
      </>
  );
}
export default App;