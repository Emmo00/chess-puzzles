import { Puzzle } from "../types";
import { HttpException } from "./users.service";

export interface PuzzleAPIResponse {
  puzzles: Puzzle[];
}

export interface FetchPuzzleOptions {
  id?: string;
  themesType?: "ANY" | "ALL";
  playerMoves?: string; // Can be exact "3" or range "2-5"
  count?: number;
  rating?: string; // Can be exact "1500" or range "1200-1800"
  themes?: string[]; // Array of theme IDs
}

class PuzzleAPIClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    const { PUZZLE_API_URL, PUZZLE_API_KEY } = process.env;

    if (!PUZZLE_API_KEY) {
      throw new HttpException(500, "Puzzle API key not configured");
    }

    this.baseUrl = PUZZLE_API_URL || "https://your-api-domain.com";
    this.apiKey = PUZZLE_API_KEY;
  }

  private buildHeaders(): HeadersInit {
    return {
      "x-api-key": this.apiKey,
    };
  }

  private buildUrl(params: FetchPuzzleOptions): string {
    const queryParams = new URLSearchParams();

    if (params.id) {
      queryParams.append("id", params.id);
    }
    if (params.playerMoves) {
      queryParams.append("playerMoves", params.playerMoves);
    }
    if (params.count) {
      queryParams.append("count", params.count.toString());
    }
    if (params.rating) {
      queryParams.append("rating", params.rating);
    }
    if (params.themes && params.themes.length > 0) {
      // API expects JSON array format: ?themes=["theme1","theme2"]
      queryParams.append("themes", JSON.stringify(params.themes));
      // themesType is required when passing more than one theme
      if (params.themes.length > 1 && params.themesType) {
        queryParams.append("themesType", params.themesType);
      }
    }

    const url = `${this.baseUrl}/?${queryParams.toString()}`;
    return url;
  }

  public async fetchPuzzles(options: FetchPuzzleOptions): Promise<Puzzle[]> {
    const url = this.buildUrl(options);

    console.log("Fetching puzzles from URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      console.log("Puzzle API response not ok:", response.status, await response.text());
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

  public async fetchRandomPuzzle(
    moves: number = 2,
    ratingRange?: { min: number; max: number },
    themes?: string[]
  ): Promise<Puzzle> {
    const options: FetchPuzzleOptions = {
      playerMoves: moves.toString(),
      count: 1,
    };

    // Add rating filter if provided - use range format "min-max"
    if (ratingRange) {
      options.rating = `${ratingRange.min}-${ratingRange.max}`;
    }

    // Add themes filter if provided
    if (themes && themes.length > 0) {
      options.themes = themes;
      // Use ANY so puzzle matches at least one of the enabled themes
      options.themesType = "ANY";
    }

    const puzzles = await this.fetchPuzzles(options);
    return puzzles[0];
  }
}

export default PuzzleAPIClient;
