import type { Express, Request, Response } from "express";
import { db } from "./db";
import { requireAuth } from "./auth";
import {
  items, projects, projectItems, expenses, categories, locations,
  insertItemSchema, insertProjectSchema, insertExpenseSchema,
  insertCategorySchema, insertLocationSchema,
} from "../shared/schema";
import { eq, and, ilike, or, desc } from "drizzle-orm";

export function registerRoutes(app: Express) {

  // ── ITEMS ─────────────────────────────────────────────────────────────────
  app.get("/api/items", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const search = req.query.search as string | undefined;
    let query = db.select().from(items).where(eq(items.userId, userId));
    const result = await db.select().from(items).where(
      search
        ? and(eq(items.userId, userId), or(ilike(items.name, `%${search}%`), ilike(items.vendor, `%${search}%`), ilike(items.sku, `%${search}%`)))
        : eq(items.userId, userId)
    ).orderBy(desc(items.createdAt));
    res.json(result);
  });

  app.get("/api/items/:id", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const [item] = await db.select().from(items).where(and(eq(items.id, parseInt(req.params.id)), eq(items.userId, userId)));
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  });

  app.post("/api/items", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const parsed = insertItemSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const [item] = await db.insert(items).values(parsed.data).returning();
    res.status(201).json(item);
  });

  app.patch("/api/items/:id", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const [item] = await db.update(items)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(items.id, parseInt(req.params.id)), eq(items.userId, userId)))
      .returning();
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  });

  app.delete("/api/items/:id", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    await db.delete(items).where(and(eq(items.id, parseInt(req.params.id)), eq(items.userId, userId)));
    res.json({ success: true });
  });

  app.get("/api/items/:id/tracking", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const [item] = await db.select().from(items).where(and(eq(items.id, parseInt(req.params.id)), eq(items.userId, userId)));
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ status: item.trackingStatus, carrier: item.carrier, trackingNumber: item.trackingNumber });
  });

  // ── PROJECTS ──────────────────────────────────────────────────────────────
  app.get("/api/projects", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const result = await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
    res.json(result);
  });

  app.get("/api/projects/:id", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const [project] = await db.select().from(projects).where(and(eq(projects.id, parseInt(req.params.id)), eq(projects.userId, userId)));
    if (!project) return res.status(404).json({ message: "Project not found" });

    const pItems = await db.select({
      id: projectItems.id,
      projectId: projectItems.projectId,
      itemId: projectItems.itemId,
      quantity: projectItems.quantity,
      status: projectItems.status,
      notes: projectItems.notes,
      createdAt: projectItems.createdAt,
      item: items,
    }).from(projectItems)
      .leftJoin(items, eq(projectItems.itemId, items.id))
      .where(eq(projectItems.projectId, project.id));

    res.json({ ...project, items: pItems });
  });

  app.post("/api/projects", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const parsed = insertProjectSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const [project] = await db.insert(projects).values(parsed.data).returning();
    res.status(201).json(project);
  });

  app.patch("/api/projects/:id", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const [project] = await db.update(projects)
      .set(req.body)
      .where(and(eq(projects.id, parseInt(req.params.id)), eq(projects.userId, userId)))
      .returning();
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.delete("/api/projects/:id", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    await db.delete(projectItems).where(eq(projectItems.projectId, parseInt(req.params.id)));
    await db.delete(projects).where(and(eq(projects.id, parseInt(req.params.id)), eq(projects.userId, userId)));
    res.json({ success: true });
  });

  // ── PROJECT ITEMS ─────────────────────────────────────────────────────────
  app.post("/api/projects/:id/items", requireAuth, async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.id);
    const { itemId, quantity, status, notes } = req.body;
    const [pi] = await db.insert(projectItems).values({ projectId, itemId, quantity: quantity || 1, status: status || "pulled", notes }).returning();
    res.status(201).json(pi);
  });

  app.patch("/api/projects/:id/items/:itemId", requireAuth, async (req: Request, res: Response) => {
    const [pi] = await db.update(projectItems)
      .set(req.body)
      .where(eq(projectItems.id, parseInt(req.params.itemId)))
      .returning();
    res.json(pi);
  });

  app.delete("/api/projects/:id/items/:itemId", requireAuth, async (req: Request, res: Response) => {
    await db.delete(projectItems).where(eq(projectItems.id, parseInt(req.params.itemId)));
    res.json({ success: true });
  });

  app.post("/api/projects/:id/create-item", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const projectId = parseInt(req.params.id);
    const { projectQuantity, ...itemData } = req.body;
    const [item] = await db.insert(items).values({ ...itemData, userId }).returning();
    const [pi] = await db.insert(projectItems).values({ projectId, itemId: item.id, quantity: projectQuantity || 1 }).returning();
    res.status(201).json({ item, projectItem: pi });
  });

  // ── EXPENSES ──────────────────────────────────────────────────────────────
  app.get("/api/expenses", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const result = await db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(desc(expenses.createdAt));
    res.json(result);
  });

  app.get("/api/expenses/summary", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const result = await db.select().from(expenses).where(eq(expenses.userId, userId));
    const totalSpend = result.reduce((sum, e) => sum + parseFloat(e.totalCost || "0"), 0);
    res.json({ totalSpend, expenseCount: result.length });
  });

  app.post("/api/expenses", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const data = { ...req.body, userId, purchaseDate: new Date(req.body.purchaseDate) };
    const [expense] = await db.insert(expenses).values(data).returning();
    res.status(201).json(expense);
  });

  app.delete("/api/expenses/:id", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    await db.delete(expenses).where(and(eq(expenses.id, parseInt(req.params.id)), eq(expenses.userId, userId)));
    res.json({ success: true });
  });

  // ── CATEGORIES ────────────────────────────────────────────────────────────
  app.get("/api/categories", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const result = await db.select().from(categories).where(eq(categories.userId, userId));
    res.json(result);
  });

  app.post("/api/categories", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const [cat] = await db.insert(categories).values({ name: req.body.name, userId }).returning();
    res.status(201).json(cat);
  });

  app.delete("/api/categories/:id", requireAuth, async (req: Request, res: Response) => {
    await db.delete(categories).where(eq(categories.id, parseInt(req.params.id)));
    res.json({ success: true });
  });

  // ── LOCATIONS ─────────────────────────────────────────────────────────────
  app.get("/api/locations", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const result = await db.select().from(locations).where(eq(locations.userId, userId));
    res.json(result);
  });

  app.post("/api/locations", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const [loc] = await db.insert(locations).values({ name: req.body.name, userId }).returning();
    res.status(201).json(loc);
  });

  app.delete("/api/locations/:id", requireAuth, async (req: Request, res: Response) => {
    await db.delete(locations).where(eq(locations.id, parseInt(req.params.id)));
    res.json({ success: true });
  });

  // ── UPLOADS ───────────────────────────────────────────────────────────────
  app.post("/api/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const { randomUUID } = await import("crypto");
    const path = await import("path");

    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket || !process.env.AWS_ACCESS_KEY_ID) {
      return res.status(503).json({ error: "File uploads not configured. Set AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY in Railway Variables." });
    }
    const { name, size, contentType } = req.body;
    const ext = path.extname(name);
    const objectKey = `uploads/${randomUUID()}${ext}`;
    const s3 = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      ...(process.env.AWS_ENDPOINT_URL ? { endpoint: process.env.AWS_ENDPOINT_URL, forcePathStyle: true } : {}),
      credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! },
    });
    const uploadURL = await getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: contentType }), { expiresIn: 3600 });
    const publicUrl = process.env.AWS_ENDPOINT_URL
      ? `${process.env.AWS_ENDPOINT_URL}/${bucket}/${objectKey}`
      : `https://${bucket}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${objectKey}`;
    res.json({ uploadURL, objectPath: objectKey, publicUrl, metadata: { name, size, contentType } });
  });

  // ── GOOGLE SHEETS ─────────────────────────────────────────────────────────
  app.get("/api/google-sheets/status", (req: Request, res: Response) => {
    const session = req.session as any;
    res.json({
      connected: !!(session?.googleTokens?.access_token),
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    });
  });

  app.get("/api/google/connect", (req: Request, res: Response) => {
    const { google } = require("googleapis");
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.APP_URL}/api/google/callback`
    );
    const url = oauth2Client.generateAuthUrl({ access_type: "offline", scope: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"], prompt: "consent" });
    res.redirect(url);
  });

  app.get("/api/google/callback", async (req: Request, res: Response) => {
    const { google } = require("googleapis");
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `${process.env.APP_URL}/api/google/callback`);
    const { tokens } = await oauth2Client.getToken(req.query.code as string);
    (req.session as any).googleTokens = tokens;
    res.redirect("/settings?google=connected");
  });

  app.get("/api/sheets/spreadsheets", requireAuth, async (req: Request, res: Response) => {
    const tokens = (req.session as any)?.googleTokens;
    if (!tokens?.access_token) return res.status(401).json({ message: "Not connected to Google Sheets" });
    const { google } = require("googleapis");
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials(tokens);
    const drive = google.drive({ version: "v3", auth });
    const response = await drive.files.list({ q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false", fields: "files(id, name)", orderBy: "modifiedTime desc", pageSize: 50 });
    res.json({ spreadsheets: response.data.files || [] });
  });

  app.get("/api/sheets/:id/sheets", requireAuth, async (req: Request, res: Response) => {
    const tokens = (req.session as any)?.googleTokens;
    if (!tokens?.access_token) return res.status(401).json({ message: "Not connected" });
    const { google } = require("googleapis");
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials(tokens);
    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.get({ spreadsheetId: req.params.id, fields: "sheets.properties" });
    res.json({ sheets: response.data.sheets?.map((s: any) => ({ id: s.properties?.sheetId, title: s.properties?.title })) || [] });
  });

  app.get("/api/sheets/:id/data", requireAuth, async (req: Request, res: Response) => {
    const tokens = (req.session as any)?.googleTokens;
    if (!tokens?.access_token) return res.status(401).json({ message: "Not connected" });
    const { google } = require("googleapis");
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials(tokens);
    const sheets = google.sheets({ version: "v4", auth });
    const sheetName = req.query.sheet as string;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: req.params.id, range: sheetName ? `${sheetName}!A1:ZZ` : "A1:ZZ" });
    res.json({ values: response.data.values || [] });
  });

  // ── QUICKBOOKS ────────────────────────────────────────────────────────────
  app.get("/api/quickbooks/configured", (req: Request, res: Response) => {
    res.json({ configured: !!(process.env.QB_CLIENT_ID && process.env.QB_CLIENT_SECRET) });
  });

  app.get("/api/quickbooks/status", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const { quickbooksTokens } = await import("../shared/schema");
    const [token] = await db.select().from(quickbooksTokens).where(eq(quickbooksTokens.userId, userId));
    res.json({ connected: !!(token && new Date(token.expiresAt) > new Date()) });
  });
}
