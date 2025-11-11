import { redirect } from 'next/navigation';

import { AppConfig } from '@/utils/AppConfig';

export default function Flipbook2Redirect() {
  redirect(`/${AppConfig.defaultLocale}/flipbook2`);
}
