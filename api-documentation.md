# Chess Puzzles API Documentation

## Base URL

```
https://your-api-domain.com
```

## Authentication

All requests require an API key to be passed in the request headers. You can provide the API key in one of two ways:

1. **Using `x-api-key` header:**
   ```
   x-api-key: your-api-key
   ```

2. **Using `Authorization` header with Bearer token:**
   ```
   Authorization: Bearer your-api-key
   ```

Contact your API administrator to obtain a valid API key. API keys must be whitelisted before use.

---

## Endpoints

### 1. Get Puzzles

Retrieve chess puzzles with optional filtering.

**Endpoint:** `GET /`

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `id` | string | No* | Get a specific puzzle by ID. Overrides all other parameters. | `00008` |
| `count` | number | No* | Number of random puzzles to return (1-100) | `10` |
| `rating` | string | No | Filter by rating range. Can be exact or range. | `1500` or `1200-1800` |
| `themes` | string | No | JSON array of themes to filter by | `["fork","pin"]` |
| `themesType` | string | No** | How to match themes: `ANY` or `ALL` | `ALL` |
| `playerMoves` | string | No | Filter by number of player moves. Can be exact or range. | `3` or `2-5` |

\* Either `id` or `count` is required.  
\*\* Required when providing multiple themes.

**Response Format:**

```typescript
{
  "puzzles": [
    {
      "puzzleid": string,
      "fen": string,
      "moves": string[],
      "rating": number,
      "ratingdeviation": number,
      "popularity": number,
      "themes": string[],
      "opening tags": string[]
    }
  ]
}
```

---

## Examples

### Get a Specific Puzzle by ID

**Request:**
```bash
GET /?id=00008
```

With API key header:
```bash
curl -H "x-api-key: your-api-key" https://your-api-domain.com/?id=00008
```

```javascript
fetch('https://your-api-domain.com/?id=00008', {
  headers: {
    'x-api-key': 'your-api-key'
  }
})
  .then(res => res.json())
  .then(data => console.log(data));
```

**Response:**
```json
{
  "puzzles": [
    {
      "puzzleid": "00008",
      "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
      "moves": ["f6h5", "c4f7"],
      "rating": 1356,
      "ratingdeviation": 76,
      "popularity": 95,
      "themes": ["mate", "mateIn1", "short"],
      "opening tags": ["Italian_Game"]
    }
  ]
}
```

---

### Get 10 Random Puzzles

**Request:**
```bash
GET /?count=10
```

```javascript
fetch('https://your-api-domain.com/?count=10', {
  headers: {
    'x-api-key': 'your-api-key'
  }
})
  .then(res => res.json())
  .then(data => console.log(data));
```

**Response:**
```json
{
  "puzzles": [
    {
      "puzzleid": "00123",
      "fen": "...",
      "moves": ["e4", "e5", "nf3"],
      "rating": 1500,
      "ratingdeviation": 80,
      "popularity": 90,
      "themes": ["fork", "middlegame"],
      "opening tags": ["Sicilian_Defense"]
    }
    // ... 9 more puzzles
  ]
}
```

---

### Get Puzzles by Rating Range

**Request:**
```bash
GET /?count=5&rating=1500-1800
```

```javascript
fetch('https://your-api-domain.com/?count=5&rating=1500-1800', {
  headers: {
    'x-api-key': 'your-api-key'
  }
})
  .then(res => res.json())
  .then(data => console.log(data));
```

**Response:**
Returns 5 random puzzles with rating between 1500-1800.

---

### Get Puzzles with Specific Themes (ANY)

**Request:**
```bash
GET /?count=10&themes=["fork","pin"]&themesType=ANY
```

```javascript
const themes = JSON.stringify(['fork', 'pin']);
fetch(`https://your-api-domain.com/?count=10&themes=${encodeURIComponent(themes)}&themesType=ANY`, {
  headers: {
    'x-api-key': 'your-api-key'
  }
})
  .then(res => res.json())
  .then(data => console.log(data));
```

**Response:**
Returns 10 puzzles that have **either** "fork" OR "pin" themes (or both).

---

### Get Puzzles with Specific Themes (ALL)

**Request:**
```bash
GET /?count=10&themes=["fork","pin"]&themesType=ALL
```

```javascript
const themes = JSON.stringify(['fork', 'pin']);
fetch(`https://your-api-domain.com/?count=10&themes=${encodeURIComponent(themes)}&themesType=ALL`, {
  headers: {
    'x-api-key': 'your-api-key'
  }
})
  .then(res => res.json())
  .then(data => console.log(data));
```

**Response:**
Returns 10 puzzles that have **both** "fork" AND "pin" themes.

---

### Get Puzzles by Player Moves

**Request:**
```bash
GET /?count=10&playerMoves=3
```

```javascript
fetch('https://your-api-domain.com/?count=10&playerMoves=3', {
  headers: {
    'x-api-key': 'your-api-key'
  }
})
  .then(res => res.json())
  .then(data => console.log(data));
```

**Response:**
Returns 10 puzzles where the player needs to make exactly 3 moves.

---

### Combined Filters

**Request:**
```bash
GET /?count=5&rating=1200-1500&themes=["endgame"]&playerMoves=2-4
```

```javascript
const themes = JSON.stringify(['endgame']);
const params = new URLSearchParams({
  count: '5',
  rating: '1200-1500',
  themes: themes,
  playerMoves: '2-4'
});

fetch(`https://your-api-domain.com/?${params}`, {
  headers: {
    'x-api-key': 'your-api-key'
  }
})
  .then(res => res.json())
  .then(data => console.log(data));
```

**Response:**
Returns 5 puzzles with:
- Rating between 1200-1500
- Contains "endgame" theme
- Requires 2-4 player moves

---

## Available Themes

To get a list of all available themes:

**Endpoint:** `GET /puzzles/themes` (if implemented)

Common themes include:
- `mate` - Checkmate
- `mateIn1`, `mateIn2`, `mateIn3`, etc.
- `fork` - Fork tactic
- `pin` - Pin tactic
- `skewer` - Skewer tactic
- `discoveredAttack` - Discovered attack
- `doubleCheck` - Double check
- `sacrifice` - Sacrifice
- `endgame` - Endgame puzzle
- `middlegame` - Middlegame puzzle
- `opening` - Opening puzzle
- `advantage` - Winning advantage
- `crushing` - Crushing move
- `hangingPiece` - Hanging piece
- `backRankMate` - Back rank mate
- `smotheredMate` - Smothered mate
- And many more...

---

## Error Responses

### Missing API Key

**Request:**
```bash
GET /?count=10
```

**Response:** `401 Unauthorized`
```json
{
  "error": "Unauthorized. API key required in 'x-api-key' header or 'Authorization: Bearer <key>' header"
}
```

---

### Invalid API Key

**Request:**
```bash
GET /?count=10 -H "x-api-key: invalid-key"
```

**Response:** `403 Forbidden`
```json
{
  "error": "Forbidden. Invalid API key"
}
```

---

### Missing Required Parameters

**Request:**
```bash
GET /
```

**Response:** `400 Bad Request`
```json
{
  "error": "You must provide either 'id' or 'count' parameter"
}
```

---

### Invalid Puzzle ID

**Request:**
```bash
GET /?id=invalid999999
```

**Response:** `400 Bad Request`
```json
{
  "error": "Puzzle not found with the provided id"
}
```

---

### Invalid Themes Format

**Request:**
```bash
GET /?count=10&themes=fork,pin
```

**Response:** `400 Bad Request`
```json
{
  "error": "Invalid themes format. Must be a JSON array"
}
```

---

### Missing themesType

**Request:**
```bash
GET /?count=10&themes=["fork","pin"]
```

**Response:** `400 Bad Request`
```json
{
  "error": "themesType is required when passing more than one theme. Use 'ALL' or 'ANY'"
}
```

---

### Server Error

**Response:** `500 Internal Server Error`
```json
{
  "error": "Internal server error"
}
```

---

## Notes

### Count Limits
- Maximum `count` value is **100**
- Minimum `count` value is **1**
- Values outside this range will be clamped automatically

### Random Results
- Results are randomized on each request
- Same query parameters will return different puzzles each time

### Rating Filters
- Single value: `rating=1500` - Matches puzzles around 1500 ± rating deviation
- Range: `rating=1200-1800` - Matches puzzles between 1200 and 1800

### Player Moves
- Single value: `playerMoves=3` - Exactly 3 player moves
- Range: `playerMoves=2-5` - Between 2 and 5 player moves

---

## React/TypeScript Example

```typescript
interface Puzzle {
  puzzleid: string;
  fen: string;
  moves: string[];
  rating: number;
  ratingdeviation: number;
  popularity: number;
  themes: string[];
  'opening tags': string[];
}

interface PuzzlesResponse {
  puzzles: Puzzle[];
}

async function fetchPuzzles(
  apiKey: string,
  count: number, 
  filters?: {
    rating?: string;
    themes?: string[];
    themesType?: 'ANY' | 'ALL';
    playerMoves?: string;
  }
): Promise<Puzzle[]> {
  const params = new URLSearchParams({ count: count.toString() });
  
  if (filters?.rating) params.append('rating', filters.rating);
  if (filters?.themes) {
    params.append('themes', JSON.stringify(filters.themes));
    if (filters.themesType) params.append('themesType', filters.themesType);
  }
  if (filters?.playerMoves) params.append('playerMoves', filters.playerMoves);
  
  const response = await fetch(`https://your-api-domain.com/?${params}`, {
    headers: {
      'x-api-key': apiKey
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch puzzles');
  }
  
  const data: PuzzlesResponse = await response.json();
  return data.puzzles;
}

// Usage examples
const apiKey = 'your-api-key';
const easyPuzzles = await fetchPuzzles(apiKey, 10, { rating: '800-1200' });
const tacticPuzzles = await fetchPuzzles(apiKey, 5, { 
  themes: ['fork', 'pin'], 
  themesType: 'ANY' 
});
const specificPuzzle = await fetchPuzzles(apiKey, 1);
```

---

## Support

For issues or questions, please contact [your contact info].
