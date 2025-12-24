import { Puzzle } from "../types";
import { HttpException } from "./users.service";

export interface PuzzleAPIResponse {
  puzzles: Puzzle[];
}

export interface FetchPuzzleOptions {
  id?: string;
  themesType?: string;
  playerMoves?: number;
  count?: number;
}

class PuzzleAPIClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    const { PUZZLE_API_URL, PUZZLE_API_KEY } = process.env;

    if (!PUZZLE_API_URL || !PUZZLE_API_KEY) {
      throw new HttpException(500, "Puzzle API not configured");
    }

    this.baseUrl = PUZZLE_API_URL;
    this.apiKey = PUZZLE_API_KEY;
  }

  private buildHeaders(): HeadersInit {
    return {
      "X-RapidAPI-Host": this.baseUrl,
      "X-RapidAPI-Key": this.apiKey,
    };
  }

  private buildUrl(params: FetchPuzzleOptions): string {
    const queryParams = new URLSearchParams();

    if (params.id) {
      queryParams.append("id", params.id);
    }
    if (params.themesType) {
      queryParams.append("themesType", params.themesType);
    }
    if (params.playerMoves) {
      queryParams.append("playerMoves", params.playerMoves.toString());
    }
    if (params.count) {
      queryParams.append("count", params.count.toString());
    }

    const url = `https://${this.baseUrl}/?${queryParams.toString()}`;
    return url;
  }

  public async fetchPuzzles(options: FetchPuzzleOptions): Promise<Puzzle[]> {
    const url = this.buildUrl(options);

    const response = await fetch(url, {
      method: "GET",
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw new HttpException(500, "Failed to fetch puzzle from API");
    }

    const data: PuzzleAPIResponse = await response.json();

    if (!data.puzzles || data.puzzles.length === 0) {
      throw new HttpException(500, "No puzzles available");
    }

    return data.puzzles;
  }

  public async fetchPuzzleById(puzzleId: string): Promise<Puzzle> {
    const puzzles = await this.fetchPuzzles({ id: puzzleId });
    return puzzles[0];
  }

  public async fetchRandomPuzzle(moves: number = 2): Promise<Puzzle> {
    const puzzles = await this.fetchPuzzles({
      themesType: "ALL",
      playerMoves: moves,
      count: 1,
    });
    return puzzles[0];
  }
}

export default PuzzleAPIClient;
