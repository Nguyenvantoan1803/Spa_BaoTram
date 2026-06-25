// Bộ icon line SVG dùng chung (stroke theo currentColor)
const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

export const IcLeaf = (p) => (
  <svg {...base} {...p}>
    <path d="M11 20A7 7 0 0 1 4 13c0-4 3-8 9-9 0 6-2 10-9 12" />
    <path d="M11 20c0-4 2-7 6-9" />
  </svg>
);
export const IcSpa = (p) => (
  <svg {...base} {...p}>
    <path d="M12 22c4-3 8-6 8-11a4 4 0 0 0-8-1 4 4 0 0 0-8 1c0 5 4 8 8 11Z" />
    <path d="M12 10c0-3 2-5 5-6-1 3-3 5-5 6Zm0 0c0-3-2-5-5-6 1 3 3 5 5 6Z" />
  </svg>
);
export const IcHands = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="6" r="2.5" />
    <path d="M5 21c1-4 3-7 7-7s6 3 7 7" />
    <path d="M4 14l3 2M20 14l-3 2" />
  </svg>
);
export const IcLotus = (p) => (
  <svg {...base} {...p}>
    <path d="M12 5c1.5 2 2 4 0 7-2-3-1.5-5 0-7Z" />
    <path d="M12 12c-2-2-5-2-7-1 1 4 4 6 7 6m0-5c2-2 5-2 7-1-1 4-4 6-7 6" />
    <path d="M5 11C3 12 3 14 3 14m16-3c2 1 2 3 2 3" />
  </svg>
);
export const IcUsers = (p) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
    <path d="M16 6a3 3 0 0 1 0 6M21 20c0-2.5-1.5-4.3-4-4.8" />
  </svg>
);
export const IcCheckBadge = (p) => (
  <svg {...base} {...p}>
    <path d="m9 12 2 2 4-4" />
    <path d="M12 3l2.5 1.7 3-.2.6 2.9 2.4 1.8-1.3 2.7 1.3 2.7-2.4 1.8-.6 2.9-3-.2L12 21l-2.5-1.7-3 .2-.6-2.9L3.5 15l1.3-2.7L3.5 9.6l2.4-1.8.6-2.9 3 .2Z" />
  </svg>
);
export const IcShield = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
export const IcPrice = (p) => (
  <svg {...base} {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h9l7 7-9 9-9-9V7Z" />
    <circle cx="8" cy="10" r="1.4" />
  </svg>
);
export const IcPhone = (p) => (
  <svg {...base} {...p}>
    <path d="M5 4h3l1.5 4-2 1.5a12 12 0 0 0 5 5l1.5-2 4 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 1-2Z" />
  </svg>
);
export const IcChat = (p) => (
  <svg {...base} {...p}>
    <path d="M4 5h16v11H9l-4 3V5Z" />
    <path d="M8 9h8M8 12h5" />
  </svg>
);
export const IcRobot = (p) => (
  <svg {...base} {...p}>
    <rect x="4" y="8" width="16" height="11" rx="3" />
    <path d="M12 4v4M12 4l-.01 0" />
    <circle cx="12" cy="3.5" r="1.2" />
    <circle cx="9" cy="13" r="1.1" />
    <circle cx="15" cy="13" r="1.1" />
    <path d="M9.5 16h5" />
    <path d="M2 12v3M22 12v3" />
  </svg>
);
export const IcZalo = (p) => (
  <svg viewBox="0 0 44 18" fill="none" {...p}>
    <text
      x="22" y="14.5" textAnchor="middle"
      fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="17"
      fill="currentColor"
    >Zalo</text>
  </svg>
);
export const IcMessenger = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3c5 0 9 3.6 9 8.2 0 4.5-4 8.1-9 8.1a10 10 0 0 1-3-.5L5 20l1-3a7.6 7.6 0 0 1-3-6.5C3 6.6 7 3 12 3Z" />
    <path d="m7 13 3-3 2.5 2L16 9l-3 3-2.5-2L7 13Z" />
  </svg>
);
export const IcMap = (p) => (
  <svg {...base} {...p}>
    <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
export const IcClock = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const IcStar = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19l1-5.8L3.5 9.2l5.9-.9L12 3Z" />
  </svg>
);
export const IcTrophy = (p) => (
  <svg {...base} {...p}>
    <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 14h6M10 18h4M9 20h6" />
  </svg>
);
