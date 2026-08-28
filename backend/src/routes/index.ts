import { Router } from "express";
import usersInit from "./users/init";
import usersSettings from "./users/settings";
import usersStreak from "./users/streak";
import usersStreakEvent from "./users/streak-event";
import puzzlesToday from "./puzzles/today";
import puzzlesTodayMe from "./puzzles/today-me";
import puzzlesSolveStatus from "./puzzles/solve-status";
import puzzlesSolveNew from "./puzzles/solve-new";
import puzzlesSolveSolve from "./puzzles/solve-solve";
import puzzlesDaily from "./puzzles/daily";
import puzzlesDailySolve from "./puzzles/daily-solve";
import hintsBalance from "./hints/balance";
import hintsConsume from "./hints/consume";
import paymentsVerify from "./payments/verify";
import paymentsStatus from "./payments/status";
import puzzleRushStatus from "./puzzle-rush/status";
import puzzleRushSessionStart from "./puzzle-rush/session-start";
import puzzleRushSessionResult from "./puzzle-rush/session-result";
import puzzleRushSessionEnd from "./puzzle-rush/session-end";
import puzzleRushPuzzles from "./puzzle-rush/puzzles";
import puzzleRushLeaderboard from "./puzzle-rush/leaderboard";
import checkinStatus from "./checkin/status";
import checkinShare from "./checkin/share";
import checkinFetch from "./checkin/fetch";
import checkinSolve from "./checkin/solve";
import checkinClaimPayload from "./checkin/claim-payload";
import checkinClaimConfirm from "./checkin/claim-confirm";
import leaderboard from "./leaderboard";
import adminAuthNonce from "./admin/auth-nonce";
import adminAuthVerify from "./admin/auth-verify";
import adminAuthMe from "./admin/auth-me";
import adminAuthLogout from "./admin/auth-logout";
import adminScoringConfig from "./admin/scoring-config";
import adminAccessConfig from "./admin/access-config";
import adminPuzzleRushConfig from "./admin/puzzle-rush-config";
import adminErrors from "./admin/errors";
import errors from "./errors";

export const routes: Router = Router();

// Users
routes.use("/users/init", usersInit);
routes.use("/users/settings", usersSettings);
routes.use("/users/streak/event", usersStreakEvent);
routes.use("/users/streak", usersStreak);

// Puzzles
routes.use("/puzzles/today/me", puzzlesTodayMe);
routes.use("/puzzles/today", puzzlesToday);
routes.use("/puzzles/solve/status", puzzlesSolveStatus);
routes.use("/puzzles/solve/new", puzzlesSolveNew);
routes.use("/puzzles/solve/solve", puzzlesSolveSolve);
routes.use("/puzzles/daily/solve", puzzlesDailySolve);
routes.use("/puzzles/daily", puzzlesDaily);

// Hints
routes.use("/hints/consume", hintsConsume);
routes.use("/hints", hintsBalance);

// Payments
routes.use("/payments/verify", paymentsVerify);
routes.use("/payments/status", paymentsStatus);

// Puzzle Rush
routes.use("/puzzle-rush/status", puzzleRushStatus);
routes.use("/puzzle-rush/session/start", puzzleRushSessionStart);
routes.use("/puzzle-rush/session/result", puzzleRushSessionResult);
routes.use("/puzzle-rush/session/end", puzzleRushSessionEnd);
routes.use("/puzzle-rush/puzzles", puzzleRushPuzzles);
routes.use("/puzzle-rush/leaderboard", puzzleRushLeaderboard);

// Check-in
routes.use("/checkin/status", checkinStatus);
routes.use("/checkin/share", checkinShare);
routes.use("/checkin/fetch", checkinFetch);
routes.use("/checkin/solve", checkinSolve);
routes.use("/checkin/claim/payload", checkinClaimPayload);
routes.use("/checkin/claim/confirm", checkinClaimConfirm);

// Leaderboard
routes.use("/leaderboard", leaderboard);

// Admin auth
routes.use("/admin/auth/nonce", adminAuthNonce);
routes.use("/admin/auth/verify", adminAuthVerify);
routes.use("/admin/auth/me", adminAuthMe);
routes.use("/admin/auth/logout", adminAuthLogout);

// Admin config
routes.use("/admin/scoring-config", adminScoringConfig);
routes.use("/admin/access-config", adminAccessConfig);
routes.use("/admin/puzzle-rush-config", adminPuzzleRushConfig);

// Admin management
routes.use("/admin/errors", adminErrors);

// Error reporting
routes.use("/errors", errors);
