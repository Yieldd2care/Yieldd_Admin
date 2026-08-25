import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function WifiIcon({ size = 18, color = '#4ED17F', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5a11 11 0 0114 0" />
      <Path d="M8.5 16a6 6 0 017 0" />
      <Circle cx="12" cy="19.5" r="1" fill={color} stroke="none" />
    </Svg>
  );
}

export function BellIcon({ size = 16, color = '#0B132B', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9" />
      <Path d="M10 21a2 2 0 004 0" />
    </Svg>
  );
}

export function UsersIcon({ size = 18, color = '#0B132B', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 00-3-3.87" />
      <Path d="M16 3.13a4 4 0 010 7.75" />
    </Svg>
  );
}

export function ClockIcon({ size = 18, color = '#0B132B', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3.5 2" />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 16, color = '#0B132B', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 18, color = '#97A3B8', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

export function CheckIcon({ size = 32, color = '#0B132B', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}

export function CameraIcon({ size = 20, color = '#0B132B', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 8a2 2 0 012-2h2l1.4-2h5.2L16 6h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
      <Circle cx="12" cy="13" r="3.5" />
    </Svg>
  );
}

export function HomeIcon({ size = 20, color = '#0B132B', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 11l9-8 9 8" />
      <Path d="M5 10v10h14V10" />
    </Svg>
  );
}

export function CalendarIcon({ size = 20, color = '#5A6B87', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="5" width="18" height="16" rx="2" />
      <Path d="M16 3v4M8 3v4M3 10h18" />
    </Svg>
  );
}

export function ProfileIcon({ size = 20, color = '#5A6B87', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
    </Svg>
  );
}

export function PlusIcon({ size = 16, color = '#F4B000', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function CloseIcon({ size = 15, color = '#5A6B87', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 6L6 18M6 6l12 12" />
    </Svg>
  );
}

export function PhoneIcon({ size = 14, color = '#F4B000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.06 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.81.31 1.6.57 2.36a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.72-1.14a2 2 0 012.11-.45c.76.26 1.55.45 2.36.57A2 2 0 0122 16.92z" />
    </Svg>
  );
}

export function MailIcon({ size = 14, color = '#F4B000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="4" width="20" height="16" rx="2" />
      <Path d="M22 6l-10 7L2 6" />
    </Svg>
  );
}

export function MessageIcon({ size = 22, color = '#0B132B', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </Svg>
  );
}

export function WhatsAppIcon({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </Svg>
  );
}

export function GridIcon({ size = 17, color = '#0B132B', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="4" y="4" width="7" height="7" rx="1" />
      <Rect x="13" y="4" width="7" height="7" rx="1" />
      <Rect x="4" y="13" width="7" height="7" rx="1" />
      <Rect x="13" y="13" width="7" height="7" rx="1" />
    </Svg>
  );
}

export function MoreIcon({ size = 22, color = '#0B132B', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="6" cy="12" r="2.5" />
      <Circle cx="18" cy="6" r="2.5" />
      <Circle cx="18" cy="18" r="2.5" />
      <Path d="M8.2 10.8l7.6-4.3M8.2 13.2l7.6 4.3" />
    </Svg>
  );
}

export function ShareIcon({ size = 17, color = '#0B132B', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7" />
      <Path d="M16 6l-4-4-4 4" />
      <Path d="M12 2v14" />
    </Svg>
  );
}

export function LinkIcon({ size = 17, color = '#0B132B', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11 5" />
      <Path d="M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07L13 19" />
    </Svg>
  );
}
