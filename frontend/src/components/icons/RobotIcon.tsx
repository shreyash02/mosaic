interface RobotIconProps {
  size?: number;
  className?: string;
}

export default function RobotIcon({ size = 24, className }: RobotIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="16" r="1" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <path d="M9 7h6" />
      <path d="M8 12h8" />
    </svg>
  );
}

