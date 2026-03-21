import type { Express, Request, Response } from "express";
import { db } from "./db";
import { requireAuth } from "./auth";
import {
  items, projects, projectItems, expenses, categories, locations, googleTokens,
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

  // Helper: build an authenticated OAuth2 client for the given user, with auto-refresh saved to DB
  async function getGoogleAuth(userId: number) {
    const { google } = require("googleapis");
    const [tokenRecord] = await db.select().from(googleTokens).where(eq(googleTokens.userId, userId));
    if (!tokenRecord) return null;
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.APP_URL}/api/google/callback`
    );
    oauth2Client.setCredentials({
      access_token: tokenRecord.accessToken,
      refresh_token: tokenRecord.refreshToken,
      expiry_date: tokenRecord.expiresAt ? new Date(tokenRecord.expiresAt).getTime() : undefined,
    });
    // Persist refreshed tokens automatically
    oauth2Client.on("tokens", async (tokens: any) => {
      const upd: any = {};
      if (tokens.access_token) upd.accessToken = tokens.access_token;
      if (tokens.refresh_token) upd.refreshToken = tokens.refresh_token;
      if (tokens.expiry_date) upd.expiresAt = new Date(tokens.expiry_date);
      if (Object.keys(upd).length) {
        await db.update(googleTokens).set(upd).where(eq(googleTokens.userId, userId));
      }
    });
    return oauth2Client;
  }

  app.get("/api/google-sheets/status", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const [tokenRecord] = await db.select().from(googleTokens).where(eq(googleTokens.userId, userId));
    res.json({
      connected: !!tokenRecord,
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    });
  });

  app.get("/api/google/connect", requireAuth, (req: Request, res: Response) => {
    const { google } = require("googleapis");
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.APP_URL}/api/google/callback`
    );
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
      ],
      prompt: "consent",
    });
    res.redirect(url);
  });

  app.get("/api/google/callback", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { google } = require("googleapis");
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.APP_URL}/api/google/callback`
      );
      const { tokens } = await oauth2Client.getToken(req.query.code as string);
      await db.insert(googleTokens).values({
        userId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      }).onConflictDoUpdate({
        target: googleTokens.userId,
        set: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || null,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        },
      });
      res.redirect("/settings?google=connected");
    } catch (err) {
      console.error("Google OAuth callback error:", err);
      res.redirect("/settings?google=error");
    }
  });

  app.post("/api/google/disconnect", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    await db.delete(googleTokens).where(eq(googleTokens.userId, userId));
    res.json({ success: true });
  });

  app.get("/api/sheets/spreadsheets", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const auth = await getGoogleAuth(userId);
      if (!auth) return res.status(401).json({ message: "Not connected to Google Sheets" });
      const { google } = require("googleapis");
      const drive = google.drive({ version: "v3", auth });
      const response = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
        fields: "files(id, name)",
        orderBy: "modifiedTime desc",
        pageSize: 50,
      });
      res.json({ spreadsheets: response.data.files || [] });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/sheets/:id/sheets", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const auth = await getGoogleAuth(userId);
      if (!auth) return res.status(401).json({ message: "Not connected" });
      const { google } = require("googleapis");
      const sheetsApi = google.sheets({ version: "v4", auth });
      const response = await sheetsApi.spreadsheets.get({ spreadsheetId: req.params.id, fields: "sheets.properties" });
      res.json({ sheets: response.data.sheets?.map((s: any) => ({ id: s.properties?.sheetId, title: s.properties?.title })) || [] });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Export all inventory items to a new Google Sheet
  app.post("/api/sheets/export/inventory", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const auth = await getGoogleAuth(userId);
      if (!auth) return res.status(401).json({ message: "Not connected to Google Sheets" });
      const { google } = require("googleapis");
      const sheetsApi = google.sheets({ version: "v4", auth });

      const inventoryItems = await db.select().from(items).where(eq(items.userId, userId)).orderBy(desc(items.createdAt));

      const headers = ["Name", "SKU", "Vendor", "Category", "Location", "Quantity", "Cost", "Price", "BWD Price", "Dimensions", "Notes", "Tracking #", "Carrier", "Status", "PO Number"];
      const rows = inventoryItems.map(item => [
        item.name, item.sku || "", item.vendor || "", item.category || "", item.location || "",
        item.quantity, item.cost, item.price, item.bwdPrice, item.dimensions || "",
        item.notes || "", item.trackingNumber || "", item.carrier || "", item.trackingStatus || "", item.poNumber || "",
      ]);

      const spreadsheet = await sheetsApi.spreadsheets.create({
        requestBody: {
          properties: { title: `BWD Inventory Export - ${new Date().toLocaleDateString()}` },
          sheets: [{ properties: { title: "Inventory" } }],
        },
      });

      const spreadsheetId = spreadsheet.data.spreadsheetId;
      await sheetsApi.spreadsheets.values.update({
        spreadsheetId,
        range: "Inventory!A1",
        valueInputOption: "RAW",
        requestBody: { values: [headers, ...rows] },
      });

      res.json({ spreadsheetId, url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` });
    } catch (err: any) {
      console.error("Export inventory error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // Import inventory items from a Google Sheet
  app.post("/api/sheets/import/inventory", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { spreadsheetId, sheetName } = req.body;
      if (!spreadsheetId) return res.status(400).json({ message: "spreadsheetId is required" });

      const auth = await getGoogleAuth(userId);
      if (!auth) return res.status(401).json({ message: "Not connected to Google Sheets" });
      const { google } = require("googleapis");
      const sheetsApi = google.sheets({ version: "v4", auth });

      const response = await sheetsApi.spreadsheets.values.get({
        spreadsheetId,
        range: sheetName ? `${sheetName}!A1:ZZ` : "A1:ZZ",
      });

      const rows: string[][] = response.data.values || [];
      if (rows.length < 2) return res.json({ imported: 0, message: "No data rows found" });

      const headers = rows[0].map((h: string) => h.toLowerCase().trim());
      const col = (name: string) => headers.indexOf(name);
      const nameIdx = col("name");
      if (nameIdx === -1) return res.status(400).json({ message: "Sheet must have a 'Name' column header" });

      let imported = 0;
      for (const row of rows.slice(1)) {
        const name = row[nameIdx]?.trim();
        if (!name) continue;
        const qty = parseInt(row[col("quantity")]) || 0;
        await db.insert(items).values({
          userId,
          name,
          sku: row[col("sku")]?.trim() || null,
          vendor: row[col("vendor")]?.trim() || null,
          category: row[col("category")]?.trim() || null,
          location: row[col("location")]?.trim() || null,
          quantity: qty,
          cost: row[col("cost")]?.trim() || "0.00",
          price: row[col("price")]?.trim() || "0.00",
          bwdPrice: row[col("bwd price")]?.trim() || row[col("bwdprice")]?.trim() || "0.00",
          notes: row[col("notes")]?.trim() || null,
          trackingNumber: row[col("tracking #")]?.trim() || null,
          carrier: row[col("carrier")]?.trim() || null,
        });
        imported++;
      }

      res.json({ imported });
    } catch (err: any) {
      console.error("Import inventory error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // Export a project's pull list to a new Google Sheet
  app.post("/api/sheets/export/project/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const projectId = parseInt(req.params.id);
      const auth = await getGoogleAuth(userId);
      if (!auth) return res.status(401).json({ message: "Not connected to Google Sheets" });

      const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
      if (!project) return res.status(404).json({ message: "Project not found" });

      const pItems = await db.select({
        id: projectItems.id,
        quantity: projectItems.quantity,
        status: projectItems.status,
        notes: projectItems.notes,
        item: items,
      }).from(projectItems)
        .leftJoin(items, eq(projectItems.itemId, items.id))
        .where(eq(projectItems.projectId, projectId));

      const { google } = require("googleapis");
      const sheetsApi = google.sheets({ version: "v4", auth });

      const headers = ["Item Name", "SKU", "Vendor", "Quantity", "Status", "Cost", "Price", "BWD Price", "Notes"];
      const rows = pItems.map(pi => [
        pi.item?.name || "", pi.item?.sku || "", pi.item?.vendor || "",
        pi.quantity, pi.status,
        pi.item?.cost || "", pi.item?.price || "", pi.item?.bwdPrice || "",
        pi.notes || "",
      ]);

      const spreadsheet = await sheetsApi.spreadsheets.create({
        requestBody: {
          properties: { title: `${project.name} - Pull List` },
          sheets: [{ properties: { title: "Pull List" } }],
        },
      });

      const spreadsheetId = spreadsheet.data.spreadsheetId;
      await sheetsApi.spreadsheets.values.update({
        spreadsheetId,
        range: "Pull List!A1",
        valueInputOption: "RAW",
        requestBody: { values: [headers, ...rows] },
      });

      res.json({ spreadsheetId, url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` });
    } catch (err: any) {
      console.error("Export project error:", err);
      res.status(500).json({ message: err.message });
    }
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
