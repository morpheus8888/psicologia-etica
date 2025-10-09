import type { CryptoAdapter, DiaryKdfParams } from '@/features/diary/adapters/types';

const textEncoder = new TextEncoder();

const getCrypto = () => {
  if (typeof crypto === 'undefined') {
    throw new TypeError('WEB_CRYPTO_UNAVAILABLE');
  }

  return crypto.subtle;
};

const getRandomValues = (length: number) => {
  const buffer = new Uint8Array(length);
  if (typeof crypto === 'undefined') {
    throw new TypeError('WEB_CRYPTO_UNAVAILABLE');
  }
  crypto.getRandomValues(buffer);
  return buffer;
};

const asNumber = (value: unknown, fallback: number) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const asString = (value: unknown, fallback: string) => {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
};

const normalizeBytes = (value: unknown): Uint8Array => {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (Array.isArray(value)) {
    return new Uint8Array(value);
  }

  if (value && typeof value === 'object') {
    const bufferObj = value as Record<string, unknown>;

    if (bufferObj.type === 'Buffer' && Array.isArray(bufferObj.data)) {
      return new Uint8Array(bufferObj.data as number[]);
    }

    if (bufferObj.buffer instanceof ArrayBuffer) {
      const view = bufferObj as { buffer: ArrayBuffer; byteOffset?: number; byteLength?: number };
      const offset = typeof view.byteOffset === 'number' ? view.byteOffset : 0;
      const length = typeof view.byteLength === 'number'
        ? view.byteLength
        : view.buffer.byteLength - offset;
      return new Uint8Array(view.buffer.slice(offset, offset + length));
    }

    const numericKeys = Object.keys(bufferObj)
      .filter(key => Number.isFinite(Number(key)))
      .sort((a, b) => Number(a) - Number(b));

    if (numericKeys.length > 0) {
      return new Uint8Array(
        numericKeys.map(key => Number(bufferObj[key as keyof typeof bufferObj] ?? 0)),
      );
    }
  }

  throw new TypeError('UNSUPPORTED_BYTE_FORMAT');
};

const deriveAesKey = async (
  password: string,
  salt: Uint8Array,
  params: DiaryKdfParams,
) => {
  const subtle = getCrypto();
  const keyMaterial = await subtle.importKey(
    'raw',
    textEncoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  const iterations = asNumber((params as any).iterations, 210_000);
  const hash = asString((params as any).hash, 'SHA-256');
  const length = asNumber((params as any).length, 256);

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash,
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length,
    },
    false,
    ['encrypt', 'decrypt'],
  );
};

const bufferFromPromise = async (promise: Promise<ArrayBuffer>) => {
  const buffer = await promise;
  return new Uint8Array(buffer);
};

export const cryptoAdapter: CryptoAdapter = {
  async deriveKey(password, salt, params) {
    return deriveAesKey(password, normalizeBytes(salt), params);
  },

  async encrypt(plain, key, aad) {
    const subtle = getCrypto();
    const nonce = getRandomValues(12);
    const params: AesGcmParams = {
      name: 'AES-GCM',
      iv: nonce,
    };
    if (aad && aad.length > 0) {
      params.additionalData = aad;
    }
    const encrypted = await bufferFromPromise(
      subtle.encrypt(params, key, plain),
    );

    return {
      ct: encrypted,
      nonce,
    };
  },

  async decrypt(ct, key, aad, nonce) {
    if (!nonce) {
      throw new Error('NONCE_REQUIRED');
    }

    const subtle = getCrypto();
    const params: AesGcmParams = {
      name: 'AES-GCM',
      iv: normalizeBytes(nonce),
    };
    if (aad && aad.length > 0) {
      params.additionalData = normalizeBytes(aad);
    }
    const plain = await bufferFromPromise(
      subtle.decrypt(params, key, normalizeBytes(ct)),
    );

    return plain;
  },
};
