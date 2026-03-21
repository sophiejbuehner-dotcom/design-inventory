import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";

export function setupAuth(app: Express) {
  // Session store
  const PgStore = connectPgSimple(session);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  app.use(session({
    store: new PgStore({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
      if (!user) return done(null, false, { message: "Invalid username or password" });
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return done(null, false, { message: "Invalid username or password" });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });

  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { username, password, name, companyName } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ message: "Username, password and name are required" });
    }
    try {
      const existing = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
      if (existing.length > 0) return res.status(400).json({ message: "Username already taken" });
      const passwordHash = await bcrypt.hash(password, 12);
      const [user] = await db.insert(users).values({
        username: username.toLowerCase(),
        passwordHash,
        name,
        companyName: companyName || "BWD",
      }).returning();
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after register" });
        const { passwordHash: _, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.login(user, (err) => {
        if (err) return next(err);
        const { passwordHash: _, ...safeUser } = user;
        res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout(() => res.json({ success: true }));
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const { passwordHash: _, ...safeUser } = req.user as any;
    res.json(safeUser);
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Authentication required" });
  next();
}
