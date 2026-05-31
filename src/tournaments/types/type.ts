export type DraftMatch = {
    id: string;
    tournamentId: string;
    round: number;
    status: "SCHEDULED" | "FINISHED";
    teamAId: string | null;
    teamBId: string | null;
    winnerId: string | null;
    nextMatchId: string | null;
    scoreA?: number; 
    scoreB?: number; 
};
