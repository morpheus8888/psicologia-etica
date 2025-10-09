export type ChangePasswordStatus =
  | 'idle'
  | 'error'
  | 'success';

export type ChangePasswordMessage =
  | 'validation_error'
  | 'invalid_current'
  | 'mismatch'
  | 'same_password'
  | 'no_password'
  | 'unauthenticated'
  | 'password_updated'
  | 'unknown_error';

export type ChangePasswordFormState = {
  status: ChangePasswordStatus;
  message?: ChangePasswordMessage;
  fieldErrors?: Record<string, string>;
};

export const changePasswordInitialState: ChangePasswordFormState = {
  status: 'idle',
};
