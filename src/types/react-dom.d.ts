declare module 'react-dom' {
  import type { FormEvent } from 'react';

  export function useFormStatus(): {
    pending: boolean;
    data: FormData | null;
    action: (formData: FormData) => void;
    method: string;
  };

  export function useFormState<State, Payload>(
    action: (state: State, payload: Payload) => State | Promise<State>,
    initialState: State,
  ): [State, (payload: Payload) => void];

  export type FormEventHandler<T = Element> = (event: FormEvent<T>) => void;
}
