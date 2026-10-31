export const exampleGames = { valorant: "Valorant", league: "League of Legends", overwatch: "Overwatch" };
export type ExampleGame = keyof typeof exampleGames;
export type GenerationExample = {
  id: number; title: string; game: ExampleGame; character_name: string | null;
  situation: string; example_excuse: string;
};
