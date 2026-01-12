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
  rating?: number; // Single rating value - API uses puzzle's ratingDeviation to find matches
  themes?: string[]; // Array of theme IDs
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
    if (params.playerMoves) {
      queryParams.append("playerMoves", params.playerMoves.toString());
    }
    if (params.count) {
      queryParams.append("count", params.count.toString());
    }
    if (params.rating) {
      queryParams.append("rating", params.rating.toString());
    }
    if (params.themes && params.themes.length > 0) {
      // API expects JSON array format: ?themes=["theme1","theme2"]
      queryParams.append("themes", JSON.stringify(params.themes));
      // themesType is required when passing more than one theme
      if (params.themes.length > 1 && params.themesType) {
        queryParams.append("themesType", params.themesType);
      }
    }

    const url = `https://${this.baseUrl}/?${queryParams.toString()}`;
    return url;
  }

  public async fetchPuzzles(options: FetchPuzzleOptions): Promise<Puzzle[]> {
    const url = this.buildUrl(options);

    console.log("Fetching puzzles from URL:", url, this.buildHeaders());

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
      playerMoves: moves,
      count: 1,
    };

    // Add rating filter if provided - use midpoint of range
    // API uses puzzle's ratingDeviation to find matches around this value
    if (ratingRange) {
      options.rating = Math.round((ratingRange.min + ratingRange.max) / 2);
    }

    // Add themes filter if provided
    if (themes && themes.length > 0) {
      options.themes = themes;
      // Use ONE so puzzle matches at least one of the enabled themes
      options.themesType = "ONE";
    }

    const puzzles = await this.fetchPuzzles(options);
    return puzzles[0];
  }
}

export default PuzzleAPIClient;
