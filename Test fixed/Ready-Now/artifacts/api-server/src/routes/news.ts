import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, newsTable } from "@workspace/db";

const router = Router();

// GET /news - list all active news (for public)
router.get("/news", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(newsTable)
    .where(eq(newsTable.isActive, true))
    .orderBy(desc(newsTable.createdAt));
  res.json(rows);
});

// GET /news/all - list all news (for admin)
router.get("/news/all", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(newsTable)
    .orderBy(desc(newsTable.createdAt));
  res.json(rows);
});

// GET /news/:id
router.get("/news/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.select().from(newsTable).where(eq(newsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "News not found" });
    return;
  }
  res.json(row);
});

// POST /news - create news
router.post("/news", async (req, res): Promise<void> => {
  const { title, content } = req.body as { title?: string; content?: string };
  if (!title || !content) {
    res.status(400).json({ error: "Title and content required" });
    return;
  }
  const [row] = await db
    .insert(newsTable)
    .values({ title, content, isActive: true })
    .returning();
  res.status(201).json(row);
});

// PATCH /news/:id - update news
router.patch("/news/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { title, content, isActive } = req.body as { title?: string; content?: string; isActive?: boolean };
  const [row] = await db
    .update(newsTable)
    .set({
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date(),
    })
    .where(eq(newsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "News not found" });
    return;
  }
  res.json(row);
});

// DELETE /news/:id
router.delete("/news/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.delete(newsTable).where(eq(newsTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "News not found" });
    return;
  }
  res.json({ success: true });
});

// DELETE /news - clear all
router.delete("/news", async (_req, res): Promise<void> => {
  await db.delete(newsTable);
  res.json({ success: true, message: "All news cleared" });
});

export default router;
