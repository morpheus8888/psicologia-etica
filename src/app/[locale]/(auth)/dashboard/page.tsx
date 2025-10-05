import { useTranslations } from 'next-intl';

import { MessageState } from '@/features/dashboard/MessageState';
import { TitleBar } from '@/features/dashboard/TitleBar';

const DashboardIndexPage = () => {
  const t = useTranslations('DashboardIndex');

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      <MessageState
        icon={(
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M0 0h24v24H0z" stroke="none" />
            <path d="M12 4 20 8 12 12 4 8 12 4" />
            <path d="M4 12l8 4 8-4" />
            <path d="M4 16l8 4 8-4" />
          </svg>
        )}
        title={t('message_state_title')}
        description={t('message_state_description')}
        button={null}
      />
    </>
  );
};

export default DashboardIndexPage;
