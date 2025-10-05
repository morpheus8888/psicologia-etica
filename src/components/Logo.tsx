import { AppConfig } from '@/utils/AppConfig';

export const Logo = (props: { isTextHidden?: boolean }) => (
  <div className="flex items-center text-xl font-semibold">
    <svg
      className="mr-2 size-9 stroke-current"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
    >
      <path d="M6 7c0-2.761 2.239-5 5-5h2c2.761 0 5 2.239 5 5" />
      <path d="M8 7v3c0 2.209 1.791 4 4 4s4-1.791 4-4V7" />
      <path d="M12 3v18" />
      <path d="M9 21h6" />
    </svg>
    {!props.isTextHidden && AppConfig.name}
  </div>
);
