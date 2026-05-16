import { useId, type SVGProps } from "react";

type WebsterLogoIconProps = SVGProps<SVGSVGElement> & {
  height?: number;
  variant?: "light" | "dark";
};

const VIEW_WIDTH = 138;
const VIEW_HEIGHT = 38;

const LOGO_TEXT = {
  x: 2,
  y: 27,
  fontSize: 29,
  fontWeight: 800,
  letterSpacing: "-0.06em",
  skew: -7,
} as const;

/** Stylized “webster” wordmark — layered SVG type only. */
export function WebsterLogoIcon({
  height = 34,
  variant = "dark",
  className = "",
  ...props
}: WebsterLogoIconProps) {
  const uid = useId().replace(/:/g, "");
  const fillId = `w-fill-${uid}`;
  const shineId = `w-shine-${uid}`;
  const strokeId = `w-stroke-${uid}`;
  const glowId = `w-glow-${uid}`;
  const clipId = `w-clip-${uid}`;
  const accentId = `w-accent-${uid}`;

  const width = (height / VIEW_HEIGHT) * VIEW_WIDTH;
  const light = variant === "light";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      width={width}
      height={height}
      fill="none"
      role="img"
      aria-hidden={props["aria-label"] ? undefined : true}
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="6" x2={VIEW_WIDTH} y2={32} gradientUnits="userSpaceOnUse">
          {light ? (
            <>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="42%" stopColor="#f0abfc" />
              <stop offset="100%" stopColor="#67e8f9" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="38%" stopColor="#e879f9" />
              <stop offset="72%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#22d3ee" />
            </>
          )}
        </linearGradient>

        <linearGradient id={shineId} x1="0" y1="0" x2="0" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light ? "#ffffff" : "#faf5ff"} stopOpacity={light ? 0.55 : 0.85} />
          <stop offset="100%" stopColor={light ? "#ffffff" : "#c4b5fd"} stopOpacity="0" />
        </linearGradient>

        <linearGradient id={strokeId} x1="0" y1="10" x2={VIEW_WIDTH} y2="30" gradientUnits="userSpaceOnUse">
          {light ? (
            <>
              <stop offset="0%" stopColor="#e9d5ff" />
              <stop offset="100%" stopColor="#a5f3fc" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#5b21b6" />
              <stop offset="100%" stopColor="#0e7490" />
            </>
          )}
        </linearGradient>

        <linearGradient id={accentId} x1="48" y1="30" x2="98" y2="30" gradientUnits="userSpaceOnUse">
          {light ? (
            <>
              <stop offset="0%" stopColor="#f0abfc" stopOpacity="0" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
              <stop offset="50%" stopColor="#e879f9" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </>
          )}
        </linearGradient>

        <clipPath id={clipId}>
          <rect x="0" y="0" width={VIEW_WIDTH} height="17" />
        </clipPath>

        <filter id={glowId} x="-20%" y="-30%" width="140%" height="160%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="2" stdDeviation={light ? 2 : 3} floodColor={light ? "#c4b5fd" : "#7c3aed"} floodOpacity={light ? 0.45 : 0.35} />
          <feDropShadow dx="0" dy="0" stdDeviation={light ? 4 : 5} floodColor={light ? "#67e8f9" : "#ec4899"} floodOpacity={light ? 0.25 : 0.22} />
        </filter>
      </defs>

      <g filter={`url(#${glowId})`} transform={`skewX(${LOGO_TEXT.skew})`}>
        {/* depth */}
        <text
          x={LOGO_TEXT.x + 1.5}
          y={LOGO_TEXT.y + 2}
          fill={light ? "#312e81" : "#4c1d95"}
          fillOpacity={light ? 0.35 : 0.45}
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontSize={LOGO_TEXT.fontSize}
          fontWeight={LOGO_TEXT.fontWeight}
          letterSpacing={LOGO_TEXT.letterSpacing}
        >
          webster
        </text>

        {/* main */}
        <text
          x={LOGO_TEXT.x}
          y={LOGO_TEXT.y}
          fill={`url(#${fillId})`}
          stroke={`url(#${strokeId})`}
          strokeWidth="0.65"
          paintOrder="stroke fill"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontSize={LOGO_TEXT.fontSize}
          fontWeight={LOGO_TEXT.fontWeight}
          letterSpacing={LOGO_TEXT.letterSpacing}
        >
          webster
        </text>

        {/* top shine */}
        <text
          x={LOGO_TEXT.x}
          y={LOGO_TEXT.y}
          fill={`url(#${shineId})`}
          clipPath={`url(#${clipId})`}
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontSize={LOGO_TEXT.fontSize}
          fontWeight={LOGO_TEXT.fontWeight}
          letterSpacing={LOGO_TEXT.letterSpacing}
        >
          webster
        </text>
      </g>

      {/* accent swoosh under “ster” */}
      <path
        d="M 54 31.5 Q 69 35.5 84 31.5"
        stroke={`url(#${accentId})`}
        strokeWidth="2.25"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
    </svg>
  );
}
