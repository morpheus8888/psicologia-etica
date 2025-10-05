import { AppConfig } from '@/utils/AppConfig';

export const Logo = (props: { isTextHidden?: boolean }) => (
  <div className="flex items-center text-xl font-semibold">
    <svg
      className="mr-2 size-10 text-primary"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="12.4" opacity={0.35} />
      <path d="M9.5 8v16" />
      <path d="M9.5 8h4.1a3.4 3.4 0 0 1 0 6.8H9.5" />
      <path d="M17.5 8v16" />
      <path d="M17.5 8h5" />
      <path d="M17.5 15.4h4.2" />
      <path d="M17.5 24h5" />
      <circle cx="16" cy="16" r="4.4" opacity={0.2} fill="currentColor" stroke="none" />
    </svg>
    {!props.isTextHidden && AppConfig.name}
  </div>
);
