export interface Avatar {
  id: string;
  emoji: string;
  label: string;
  bg: string;
}

export const AVATARS: Avatar[] = [
  { id: 'star-girl', emoji: '🌟', label: 'Star', bg: '#7357FF' },
  { id: 'rocket-boy', emoji: '🚀', label: 'Rocket', bg: '#38BDF8' },
  { id: 'lion', emoji: '🦁', label: 'Lion', bg: '#FFD54A' },
  { id: 'panda', emoji: '🐼', label: 'Panda', bg: '#49D17D' },
  { id: 'unicorn', emoji: '🦄', label: 'Unicorn', bg: '#FF686B' },
  { id: 'dino', emoji: '🦖', label: 'Dino', bg: '#49D17D' },
  { id: 'owl', emoji: '🦉', label: 'Owl', bg: '#7357FF' },
  { id: 'fox', emoji: '🦊', label: 'Fox', bg: '#38BDF8' },
  { id: 'turtle', emoji: '🐢', label: 'Turtle', bg: '#FFD54A' },
  { id: 'octopus', emoji: '🐙', label: 'Octopus', bg: '#FF686B' },
  { id: 'robot', emoji: '🤖', label: 'Robot', bg: '#38BDF8' },
  { id: 'butterfly', emoji: '🦋', label: 'Butterfly', bg: '#7357FF' },
];

export function getAvatar(id: string): Avatar {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
