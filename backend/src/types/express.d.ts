// Augments Express Request to include authenticated user
declare namespace Express {
  interface Request {
    user?: { id: string; email: string; name: string };
  }
}
