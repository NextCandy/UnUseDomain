/**
 * 统一图标库 —— 全部为内联 SVG，避免为几个图标引入整个图标库。
 * 约定：24×24 viewBox、stroke 1.75、round cap/join、currentColor 描边。
 * 新增图标必须沿用同一视觉重量，禁止混入实心风格或其它图标集。
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconHome = (props: IconProps) => (
  <Svg {...props}>
    <path d="M3 10.2 12 3.5l9 6.7" />
    <path d="M5.5 9.4V19a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9.4" />
    <path d="M9.75 20.5v-5.25h4.5v5.25" />
  </Svg>
);

export const IconGrid = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
  </Svg>
);

export const IconSearch = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Svg>
);

export const IconSparkle = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 3.5 13.9 9 19.5 11l-5.6 2L12 18.5 10.1 13 4.5 11l5.6-2z" />
  </Svg>
);

export const IconGlobe = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17" />
    <path d="M12 3.5a13 13 0 0 1 0 17a13 13 0 0 1 0-17Z" />
  </Svg>
);

export const IconLayers = (props: IconProps) => (
  <Svg {...props}>
    <path d="m12 3.5 8.5 4.25L12 12 3.5 7.75z" />
    <path d="m3.5 12 8.5 4.25L20.5 12" />
    <path d="m3.5 16.25 8.5 4.25 8.5-4.25" />
  </Svg>
);

export const IconTag = (props: IconProps) => (
  <Svg {...props}>
    <path d="M11.2 3.5H19a1.5 1.5 0 0 1 1.5 1.5v7.8a2 2 0 0 1-.6 1.4l-6 6a2 2 0 0 1-2.8 0l-6.3-6.3a2 2 0 0 1 0-2.8l6-6a2 2 0 0 1 1.4-.6Z" />
    <circle cx="16" cy="8" r="1.4" />
  </Svg>
);

export const IconInbox = (props: IconProps) => (
  <Svg {...props}>
    <path d="M3.5 13.5 6 5.2a1.5 1.5 0 0 1 1.45-1.1h9.1A1.5 1.5 0 0 1 18 5.2l2.5 8.3" />
    <path d="M3.5 13.5h4l1.2 2.4h6.6l1.2-2.4h4v4.9a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" />
  </Svg>
);

export const IconRoute = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="M8.5 6h5A4.5 4.5 0 0 1 18 10.5v5" />
  </Svg>
);

export const IconBuilding = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 20.5h16" />
    <path d="M5.5 20.5V5a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 14.5 5v15.5" />
    <path d="M14.5 20.5V10h3A1.5 1.5 0 0 1 19 11.5v9" />
    <path d="M8.5 7.5h3M8.5 11h3M8.5 14.5h3" />
  </Svg>
);

export const IconSettings = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 14.5a1.4 1.4 0 0 0 .3 1.55l.05.05a1.7 1.7 0 1 1-2.4 2.4l-.05-.05a1.4 1.4 0 0 0-1.55-.3 1.4 1.4 0 0 0-.85 1.3v.15a1.7 1.7 0 1 1-3.4 0v-.08a1.4 1.4 0 0 0-.92-1.3 1.4 1.4 0 0 0-1.55.3l-.05.05a1.7 1.7 0 1 1-2.4-2.4l.05-.05a1.4 1.4 0 0 0 .3-1.55 1.4 1.4 0 0 0-1.3-.85H4.5a1.7 1.7 0 1 1 0-3.4h.08a1.4 1.4 0 0 0 1.3-.92 1.4 1.4 0 0 0-.3-1.55l-.05-.05a1.7 1.7 0 1 1 2.4-2.4l.05.05a1.4 1.4 0 0 0 1.55.3h.07a1.4 1.4 0 0 0 .85-1.3V4.5a1.7 1.7 0 1 1 3.4 0v.08a1.4 1.4 0 0 0 .85 1.3 1.4 1.4 0 0 0 1.55-.3l.05-.05a1.7 1.7 0 1 1 2.4 2.4l-.05.05a1.4 1.4 0 0 0-.3 1.55v.07a1.4 1.4 0 0 0 1.3.85h.15a1.7 1.7 0 1 1 0 3.4h-.08a1.4 1.4 0 0 0-1.3.85Z" />
  </Svg>
);

export const IconBell = (props: IconProps) => (
  <Svg {...props}>
    <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5" />
    <path d="M13.7 19a2 2 0 0 1-3.4 0" />
  </Svg>
);

export const IconShield = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 3.5 5 6.2v5c0 4.4 2.9 8.2 7 9.3 4.1-1.1 7-4.9 7-9.3v-5z" />
    <path d="m9.2 11.8 2 2 3.6-3.6" />
  </Svg>
);

export const IconList = (props: IconProps) => (
  <Svg {...props}>
    <path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12" />
    <path d="M4 6.5h.01M4 12h.01M4 17.5h.01" />
  </Svg>
);

export const IconPlus = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconChevronRight = (props: IconProps) => (
  <Svg {...props}>
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
  </Svg>
);

export const IconChevronLeft = (props: IconProps) => (
  <Svg {...props}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Svg>
);

export const IconArrowLeft = (props: IconProps) => (
  <Svg {...props}>
    <path d="M20 12H4.5" />
    <path d="m10.5 5.5-6 6.5 6 6.5" />
  </Svg>
);

export const IconArrowUpRight = (props: IconProps) => (
  <Svg {...props}>
    <path d="M7 17 17 7" />
    <path d="M8.5 7H17v8.5" />
  </Svg>
);

export const IconCopy = (props: IconProps) => (
  <Svg {...props}>
    <rect x="9" y="9" width="11.5" height="11.5" rx="2.5" />
    <path d="M15 6.2A2.2 2.2 0 0 0 12.8 4H6a2 2 0 0 0-2 2v6.8A2.2 2.2 0 0 0 6.2 15" />
  </Svg>
);

export const IconClose = (props: IconProps) => (
  <Svg {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
);

export const IconLogout = (props: IconProps) => (
  <Svg {...props}>
    <path d="M9.5 20.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5h3.5" />
    <path d="M15.5 16 20 12l-4.5-4" />
    <path d="M20 12H9.5" />
  </Svg>
);

export const IconFilter = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 6h16" />
    <path d="M7 12h10" />
    <path d="M10 18h4" />
  </Svg>
);

export const IconTrash = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4.5 6.5h15" />
    <path d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5" />
    <path d="M6.5 6.5 7.3 19a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12.5" />
  </Svg>
);

export const IconEdit = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 20h4l10-10-4-4L4 16z" />
    <path d="m14 6 4 4" />
  </Svg>
);

export const IconDownload = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 4v11" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M4.5 20h15" />
  </Svg>
);

export const IconUpload = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 15V4" />
    <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
    <path d="M4.5 20h15" />
  </Svg>
);

export const IconCheck = (props: IconProps) => (
  <Svg {...props}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Svg>
);

export const IconAlert = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V13" />
    <path d="M12 16.3h.01" />
  </Svg>
);

export const IconInfo = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 16.5V11" />
    <path d="M12 7.7h.01" />
  </Svg>
);

export const IconMail = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
    <path d="m4.5 7.5 6.4 4.6a2 2 0 0 0 2.2 0l6.4-4.6" />
  </Svg>
);

export const IconClock = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5.2l3.3 2" />
  </Svg>
);

export const IconDoc = (props: IconProps) => (
  <Svg {...props}>
    <path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5z" />
    <path d="M13.5 3.5v5h5" />
  </Svg>
);
