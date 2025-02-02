export interface CharacterStats {
  character: string;
  gameCount: number;
}

interface RankedNetplayProfile {
  rank?: number; // populated separately
  ratingOrdinal: number;
  ratingUpdateCount: number;
  wins: number;
  losses: number;
  dailyGlobalPlacement: number | null;
  dailyRegionalPlacement: number | null;
  characters: CharacterStats[];
}
export interface PlayersRowData  {
  rank: number;
  connectCode: string;
  name: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  ladderPoints: number;
  monthlyWins: number;
}

export interface Player {
  displayName: string;
  connectCode: {
    code: string;
  };
  rankedNetplayProfile: RankedNetplayProfile
  oldRankedNetplayProfile?: RankedNetplayProfile // populated separately
  databaseProfile?: PlayersRowData
}
