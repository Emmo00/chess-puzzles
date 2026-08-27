import { Request, Response, NextFunction } from "express";

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error(JSON.stringify({
    level: "error",
    message: "unhandled_error",
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  }));

  const status = (err as any).status || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
  });
}
