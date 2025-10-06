import { AppConfig } from '@/utils/AppConfig';

export const Logo = (props: { isTextHidden?: boolean }) => (
  <div className="flex items-center text-xl font-semibold">
    <svg
      className="mr-2 size-10 text-primary"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="12.5" opacity={0.25} />
      <path d="M10 24h12" />
      <path d="M16 8v16" />
      <path d="M8 8h4.5c0 6.5 2 10 3.5 10s3.5-3.5 3.5-10H24" />
    </svg>
    {!props.isTextHidden && AppConfig.name}
  </div>
);
