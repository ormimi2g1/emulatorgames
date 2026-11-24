/** Hero sizes and colors, kept apart from the Phaser drawing code so tests can read them. */
export interface Hero {
  key: string;
  w: number;
  h: number;
  skin: number;
  shirt: number;
  hair: number;
  puffs: boolean;
}

export const HEROES = {
  afa: { key: 'afa', w: 28, h: 44, skin: 0x8b5a3c, shirt: 0x7357ff, hair: 0x1f130d, puffs: true },
  terdoo: { key: 'terdoo', w: 24, h: 28, skin: 0x7a4b2f, shirt: 0xff686b, hair: 0x1f130d, puffs: false },
} satisfies Record<string, Hero>;
