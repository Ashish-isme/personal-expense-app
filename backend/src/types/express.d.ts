// Augment Express' Request with the authenticated user id set by requireAuth.
import "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
