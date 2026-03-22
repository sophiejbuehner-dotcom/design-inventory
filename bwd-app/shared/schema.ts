import { pgTable, text, integer, decimal, timestamp, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  companyName: text("company_name").default("BWD"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").notNull(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").notNull(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  sku: text("sku"),
  vendor: text("vendor"),
  category: text("category"),
  location: text("location"),
  quantity: integer("quantity").default(0),
  cost: text("cost").default("0.00"),
  price: text("price").default("0.00"),
  bwdPrice: text("bwd_price").default("0.00"),
  dimensions: text("dimensions"),
  description: text("description"),
  imageUrl: text("image_url"),
  link: text("link"),
  orderUrl: text("order_url"),
  trackingNumber: text("tracking_number"),
  carrier: text("carrier"),
  trackingStatus: text("tracking_status").default("ordered"),
  notes: text("notes"),
  poNumber: text("po_number"),
  poDateSent: text("po_date_sent"),
  estInvNumber: text("est_inv_number"),
  vendorInvoiceNumber: text("vendor_invoice_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  clientName: text("client_name"),
  status: text("status").default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectItems = pgTable("project_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  itemId: integer("item_id").notNull(),
  quantity: integer("quantity").default(1),
  status: text("status").default("pulled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  description: text("description").notNull(),
  vendor: text("vendor").notNull(),
  category: text("category").notNull(),
  quantity: integer("quantity").default(1),
  unitCost: text("unit_cost").notNull(),
  totalCost: text("total_cost").notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  invoiceNumber: text("invoice_number"),
  notes: text("notes"),
  itemId: integer("item_id"),
  projectId: integer("project_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const googleTokens = pgTable("google_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quickbooksTokens = pgTable("quickbooks_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  realmId: text("realm_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertItemSchema = createInsertSchema(items).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertProjectItemSchema = createInsertSchema(projectItems).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectItem = typeof projectItems.$inferSelect;
export type InsertProjectItem = z.infer<typeof insertProjectItemSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
