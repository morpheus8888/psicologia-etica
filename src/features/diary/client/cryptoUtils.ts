import type {
  CryptoAdapter,
  DiaryKdfParams,
} from '@/features/diary/adapters/types';

const MASTER_KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const NONCE_LENGTH = 12;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const createDefaultKdfParams = (): DiaryKdfParams => ({
  iterations: 210_000,
  hash: 'SHA-256',
  length: 256,
});

export const generateRandomBytes = (length: number) => {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return buffer;
};

export const createMasterKey = () => generateRandomBytes(MASTER_KEY_LENGTH);

export const wrapMasterKey = async (
  cryptoAdapter: CryptoAdapter,
  masterKey: Uint8Array,
  password: string,
) => {
  const salt = generateRandomBytes(SALT_LENGTH);
  const kdfParams = createDefaultKdfParams();
  const derivedKey = await cryptoAdapter.deriveKey(password, salt, kdfParams);
  const { ct, nonce } = await cryptoAdapter.encrypt(masterKey, derivedKey);

  const encMasterKey = new Uint8Array(nonce.length + ct.length);
  encMasterKey.set(nonce, 0);
  encMasterKey.set(ct, nonce.length);

  return {
    encMasterKey,
    salt,
    kdfParams,
  };
};

type UnwrapOptions = {
  cryptoAdapter: CryptoAdapter;
  encMasterKey: Uint8Array;
  salt: Uint8Array;
  kdfParams: DiaryKdfParams;
  password: string;
};

export const unwrapMasterKey = async ({
  cryptoAdapter,
  encMasterKey,
  salt,
  kdfParams,
  password,
}: UnwrapOptions) => {
  if (encMasterKey.length <= NONCE_LENGTH) {
    throw new Error('CORRUPTED_MASTER_KEY');
  }

  const nonce = encMasterKey.slice(0, NONCE_LENGTH);
  const ct = encMasterKey.slice(NONCE_LENGTH);
  const derivedKey = await cryptoAdapter.deriveKey(password, salt, kdfParams);
  const masterKey = await cryptoAdapter.decrypt(ct, derivedKey, undefined, nonce);
  return masterKey;
};

export const importAesKey = async (masterKey: Uint8Array) => {
  return crypto.subtle.importKey('raw', masterKey, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
};

type EncryptPayloadOptions = {
  key: CryptoKey;
  cryptoAdapter: CryptoAdapter;
  payload: unknown;
  aad?: Uint8Array;
};

export const encryptPayload = async ({
  key,
  cryptoAdapter,
  payload,
  aad,
}: EncryptPayloadOptions) => {
  const data = textEncoder.encode(JSON.stringify(payload));
  const { ct, nonce } = await cryptoAdapter.encrypt(data, key, aad);
  return { ciphertext: ct, nonce };
};

type DecryptPayloadOptions = {
  key: CryptoKey;
  cryptoAdapter: CryptoAdapter;
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  aad?: Uint8Array | null;
};

export const decryptPayload = async <T>({
  key,
  cryptoAdapter,
  ciphertext,
  nonce,
  aad,
}: DecryptPayloadOptions): Promise<T> => {
  const data = await cryptoAdapter.decrypt(ciphertext, key, aad ?? undefined, nonce);
  const decoded = textDecoder.decode(data);
  return JSON.parse(decoded) as T;
};
