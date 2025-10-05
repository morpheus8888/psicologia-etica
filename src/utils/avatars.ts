export type AvatarValue =
  | 'crimson-fox'
  | 'golden-lion'
  | 'sunrise-giraffe'
  | 'coral-flamingo'
  | 'ruby-cardinal'
  | 'jade-turtle'
  | 'evergreen-frog'
  | 'teal-peacock'
  | 'ocean-dolphin'
  | 'cobalt-whale'
  | 'indigo-owl'
  | 'violet-butterfly'
  | 'twilight-wolf'
  | 'aurora-chameleon'
  | 'ember-dragon';

export type AvatarOption = {
  value: AvatarValue;
  emoji: string;
  gradient: string;
  labelKey: string;
};

export const avatarOptions: AvatarOption[] = [
  { value: 'crimson-fox', emoji: '🦊', gradient: 'bg-gradient-to-br from-orange-500 to-red-500', labelKey: 'avatars.crimsonFox' },
  { value: 'golden-lion', emoji: '🦁', gradient: 'bg-gradient-to-br from-amber-500 to-yellow-400', labelKey: 'avatars.goldenLion' },
  { value: 'sunrise-giraffe', emoji: '🦒', gradient: 'bg-gradient-to-br from-yellow-400 to-amber-300', labelKey: 'avatars.sunriseGiraffe' },
  { value: 'coral-flamingo', emoji: '🦩', gradient: 'bg-gradient-to-br from-rose-400 to-pink-500', labelKey: 'avatars.coralFlamingo' },
  { value: 'ruby-cardinal', emoji: '🐦', gradient: 'bg-gradient-to-br from-rose-500 to-red-600', labelKey: 'avatars.rubyCardinal' },
  { value: 'jade-turtle', emoji: '🐢', gradient: 'bg-gradient-to-br from-emerald-500 to-green-400', labelKey: 'avatars.jadeTurtle' },
  { value: 'evergreen-frog', emoji: '🐸', gradient: 'bg-gradient-to-br from-lime-500 to-emerald-500', labelKey: 'avatars.evergreenFrog' },
  { value: 'teal-peacock', emoji: '🦚', gradient: 'bg-gradient-to-br from-teal-500 to-cyan-500', labelKey: 'avatars.tealPeacock' },
  { value: 'ocean-dolphin', emoji: '🐬', gradient: 'bg-gradient-to-br from-cyan-500 to-sky-500', labelKey: 'avatars.oceanDolphin' },
  { value: 'cobalt-whale', emoji: '🐳', gradient: 'bg-gradient-to-br from-sky-500 to-blue-600', labelKey: 'avatars.cobaltWhale' },
  { value: 'indigo-owl', emoji: '🦉', gradient: 'bg-gradient-to-br from-indigo-500 to-slate-600', labelKey: 'avatars.indigoOwl' },
  { value: 'violet-butterfly', emoji: '🦋', gradient: 'bg-gradient-to-br from-violet-500 to-purple-500', labelKey: 'avatars.violetButterfly' },
  { value: 'twilight-wolf', emoji: '🐺', gradient: 'bg-gradient-to-br from-slate-500 to-indigo-500', labelKey: 'avatars.twilightWolf' },
  { value: 'aurora-chameleon', emoji: '🦎', gradient: 'bg-gradient-to-br from-lime-400 to-teal-500', labelKey: 'avatars.auroraChameleon' },
  { value: 'ember-dragon', emoji: '🐉', gradient: 'bg-gradient-to-br from-orange-600 to-red-600', labelKey: 'avatars.emberDragon' },
];

export const defaultAvatar: AvatarValue = 'crimson-fox';

export const avatarValues = avatarOptions.map(option => option.value);

export function getAvatarOption(value?: string | null) {
  if (!value) {
    return undefined;
  }

  return avatarOptions.find(option => option.value === value) ?? undefined;
}
