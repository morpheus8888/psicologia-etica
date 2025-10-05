'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '@/libs/auth/config';
import { db } from '@/libs/db';
import { users } from '@/models/auth';
import { avatarValues, defaultAvatar } from '@/utils/avatars';
import { getI18nPath } from '@/utils/Helpers';

export type ProfileFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string>;
};

const initialState: ProfileFormState = { status: 'idle' };

const profileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { message: 'required' })
    .max(100, { message: 'max_100' }),
  lastName: z
    .string()
    .trim()
    .max(100, { message: 'max_100' })
    .optional(),
  email: z
    .string()
    .trim()
    .min(1, { message: 'required' })
    .email({ message: 'invalid_email' })
    .max(190, { message: 'max_190' }),
  phone: z
    .union([
      z
        .string()
        .trim()
        .regex(/^[+\d()\-\s]*$/, { message: 'invalid_phone' })
        .max(32, { message: 'max_32' }),
      z.literal(''),
    ])
    .optional()
    .transform(value => (value && value.length > 0 ? value : undefined)),
  avatar: z
    .enum(avatarValues as [string, ...string[]], {
      invalid_type_error: 'invalid_avatar',
    })
    .default(defaultAvatar),
  locale: z
    .string()
    .trim()
    .min(2, { message: 'invalid_locale' })
    .max(5, { message: 'invalid_locale' }),
});

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const submission = {
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    avatar: formData.get('avatar'),
    locale: formData.get('locale'),
  };

  const parsed = profileSchema.safeParse(submission);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    const flattened = parsed.error.flatten().fieldErrors;

    for (const [key, value] of Object.entries(flattened)) {
      if (value && value.length > 0) {
        fieldErrors[key] = value[0] ?? 'invalid';
      }
    }

    return {
      status: 'error',
      message: 'validation_error',
      fieldErrors,
    };
  }

  const { firstName, lastName, email, phone, avatar, locale } = parsed.data;
  const cleanedPhone = phone?.trim() ? phone.trim() : null;
  const cleanedLastName = lastName?.trim() ? lastName.trim() : null;
  const chosenAvatar = avatar ?? defaultAvatar;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return {
      status: 'error',
      message: 'unauthenticated',
    };
  }

  const emailLower = email.toLowerCase();
  const existingWithEmail = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, emailLower), ne(users.id, userId)));

  if (existingWithEmail.length > 0) {
    return {
      status: 'error',
      fieldErrors: { email: 'email_taken' },
      message: 'email_taken',
    };
  }

  await db
    .update(users)
    .set({
      name: firstName.trim(),
      familyName: cleanedLastName,
      email: emailLower,
      phoneNumber: cleanedPhone,
      avatar: chosenAvatar,
    })
    .where(eq(users.id, userId));

  const profilePath = getI18nPath('/dashboard/user-profile', locale);
  const dashboardPath = getI18nPath('/dashboard', locale);

  revalidatePath(profilePath);
  revalidatePath(dashboardPath);

  return {
    status: 'success',
    message: 'profile_updated',
  };
}

export { initialState as profileInitialState };
