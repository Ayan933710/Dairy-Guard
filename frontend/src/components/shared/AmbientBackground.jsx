const particlePositions = [
  [6, 18, 3, 18],
  [14, 72, 4, 22],
  [22, 38, 2, 15],
  [31, 86, 3, 25],
  [39, 16, 5, 20],
  [47, 62, 2, 17],
  [55, 30, 4, 24],
  [63, 78, 3, 19],
  [71, 12, 2, 16],
  [78, 52, 5, 23],
  [86, 26, 3, 18],
  [94, 84, 2, 21],
  [11, 94, 2, 27],
  [27, 8, 3, 20],
  [44, 46, 2, 26],
  [68, 92, 4, 18],
  [83, 68, 2, 24],
  [97, 42, 3, 17],
];

export default function AmbientBackground({ variant = 'fresh' }) {
  return (
    <div className={`ambient-background ambient-background-${variant}`} aria-hidden="true">
      <div className="ambient-light ambient-light-one" />
      <div className="ambient-light ambient-light-two" />
      <div className="ambient-ring ambient-ring-one" />
      <div className="ambient-ring ambient-ring-two" />
      <div className="ambient-beam" />
      <div className="ambient-particles">
        {particlePositions.map(([left, top, size, duration], particleIndex) => (
          <span
            key={`${left}-${top}`}
            className={`ambient-particle ambient-particle-${particleIndex % 3}`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${size}px`,
              height: `${size}px`,
              animationDuration: `${duration}s`,
              animationDelay: `${-(particleIndex * 1.7)}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
