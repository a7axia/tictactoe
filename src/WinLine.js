import { Line } from '@react-three/drei';

export function WinLine({ startPos, endPos }) {
    return (
        <Line
            points={[startPos, endPos]}
            color="green"
            lineWidth={5}
        />
    );
}