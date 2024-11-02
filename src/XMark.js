import React from 'react';

export function XMark({ position }) {
    return (
        <>
            <mesh castShadow rotation={[0, 0, Math.PI / 4]} position={position}>
                <boxGeometry args={[1.4, 0.2, 0.2]} />
                <meshStandardMaterial color="blue" />
            </mesh>
            <mesh castShadow rotation={[0, 0, -Math.PI / 4]} position={position}>
                <boxGeometry args={[1.4, 0.2, 0.2]} />
                <meshStandardMaterial color="blue" />
            </mesh>
        </>
    );
}