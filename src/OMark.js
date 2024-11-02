import React from 'react';

export function OMark({ position }) {
    return (
        <mesh castShadow position={position}>
            <torusGeometry args={[0.5, 0.1, 16, 32]} />
            <meshStandardMaterial color="red" />
        </mesh>
    );
}