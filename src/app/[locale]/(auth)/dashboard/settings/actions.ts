'use server';

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import type { ChangePasswordFormState } from '@/features/settings/change-password/form-state';
import { authOptions } from '@/libs/auth/config';
import { db } from '@/libs/db';
import { users } from '@/models/auth';
import { getI18nPath } from '@/utils/Helpers';

const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { message: 'required' }),
  newPassword: z
    .string()
    .min(8, { message: 'min_length' }),
  confirmPassword: z
    .string()
    .min(1, { message: 'required' }),
  locale: z
    .string()
    .min(2)
    .max(5),
});

export async function changePasswordAction(
  _prevState: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  const submission = {
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
    locale: formData.get('locale'),
  };

  const parsed = changePasswordSchema.safeParse(submission);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    const flattened = parsed.error.flatten().fieldErrors;

    for (const [field, value] of Object.entries(flattened)) {
      if (value && value.length > 0) {
        fieldErrors[field] = value[0] ?? 'invalid';
      }
    }

    return {
      status: 'error',
      message: 'validation_error',
      fieldErrors,
    };
  }

  const {
    currentPassword,
    newPassword,
    confirmPassword,
    locale,
  } = parsed.data;

  if (newPassword !== confirmPassword) {
    return {
      status: 'error',
      message: 'mismatch',
      fieldErrors: {
        confirmPassword: 'mismatch',
      },
    };
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return {
      status: 'error',
      message: 'unauthenticated',
    };
  }

  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.passwordHash) {
    return {
      status: 'error',
      message: 'no_password',
    };
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isCurrentValid) {
    return {
      status: 'error',
      message: 'invalid_current',
      fieldErrors: {
        currentPassword: 'invalid_current',
      },
    };
  }

  const matchesExisting = await bcrypt.compare(newPassword, user.passwordHash);

  if (matchesExisting) {
    return {
      status: 'error',
      message: 'same_password',
      fieldErrors: {
        newPassword: 'same_password',
      },
    };
  }

  try {
    const newHash = await bcrypt.hash(newPassword, 12);

    await db
      .update(users)
      .set({
        passwordHash: newHash,
      })
      .where(eq(users.id, userId));

    const settingsPath = getI18nPath('/dashboard/settings', locale);
    revalidatePath(settingsPath);

    return {
      status: 'success',
      message: 'password_updated',
    };
  } catch (error) {
    console.error('[settings] change password failed', error);
    return {
      status: 'error',
      message: 'unknown_error',
    };
  }
}
