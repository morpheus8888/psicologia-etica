export type ProfileFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const profileInitialState: ProfileFormState = { status: 'idle' };
