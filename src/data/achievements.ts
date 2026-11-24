export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

/** Positive, exploration-based rewards. No streaks, currency or loss penalties. Unlocking arrives with the games. */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-adventure', title: 'First Adventure', description: 'Play your very first game.', emoji: '🎒' },
  { id: 'rainbow-collector', title: 'Rainbow Collector', description: 'Find a rainbow crystal.', emoji: '🌈' },
  { id: 'super-jumper', title: 'Super Jumper', description: 'Bounce on a super spring.', emoji: '🦘' },
  { id: 'puzzle-master', title: 'Puzzle Master', description: 'Finish a memory puzzle.', emoji: '🧩' },
  { id: 'math-explorer', title: 'Math Explorer', description: 'Open a door with math.', emoji: '🔢' },
  { id: 'racing-champion', title: 'Racing Champion', description: 'Finish a race.', emoji: '🏁' },
  { id: 'secret-discoverer', title: 'Secret Discoverer', description: 'Find a secret area.', emoji: '🔍' },
  { id: 'teamwork-hero', title: 'Teamwork Hero', description: 'Play with Afa and with Terdoo.', emoji: '🤝' },
  { id: 'world-explorer', title: 'World Explorer', description: 'Visit three different worlds.', emoji: '🌍' },
];
