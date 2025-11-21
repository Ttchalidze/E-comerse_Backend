import express from "express";
import crypto from "crypto";
import { ddb } from "../db/dyClient";
import {
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { requireUser } from "../middleware/requreUser";
import { inversePkQuery } from "../db/QueryFunction";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const items = await inversePkQuery("ITEM#");
    res.json({ products: items });
  } catch (err) {
    console.error("products GET error", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});
router.post("/", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, description, price, category, imageURL } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "missing name or price" });
    }
    const productId = crypto.randomUUID();

    const product = {
      PK: `PRODUCT#${productId}`,
      SK: `ITEM#${productId}`,
      productId,
      name,
      price,
      description: description || "",
      category: category || "",
      imageURL: imageURL || "",
      viewCount: 0,
      createdAt: new Date().toISOString(),
    };
    await ddb.send(
      new PutCommand({ TableName: "EcommerceTable", Item: product })
    );
    res.status(201).json({ message: "product created", product });
  } catch (err) {
    console.error("products POST error", err);
    res.status(500).json({ error: "failed to create Product" });
  }
});

router.get("/user", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const items = await inversePkQuery("ITEM#");
    const userProducts = items.filter((p) => p.sellerId?.S === user.userId);
    res.json({ products: userProducts });
  } catch (err) {
    console.error("products Get usererror", err);
    res.status(500).json({ error: "failed to fetch user products" });
  }
});

router.patch("/:productId", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { productId } = req.params;

    const allowed = [
      "name",
      "description",
      "price",
      "category",
      "stock",
      "imageURL",
    ] as const;
    const entries = Object.entries(req.body || {}).filter(
      ([key, val]) => allowed.includes(key as any) && val !== undefined
    );
    if (entries.length === 0)
      return res.status(400).json({ error: "No valid fields to update" });

    const names: Record<string, string> = {};
    const values: Record<string, any> = { ":sid": user.userId };
    const sets: string[] = [];

    entries.forEach(([k, v], i) => {
      const nk = `#f${i}`;
      const vk = `:v${i}`;
      names[nk] = k;
      values[vk] = v;
      sets.push(`${nk} = ${vk}`);
    });

    const out = await ddb.send(
      new UpdateCommand({
        TableName: "EcommerceTable",
        Key: {
          PK: `PRODUCTY#${productId}`,
          SK: `ITEM#${productId}`,
        },
        UpdateExpression: `SET ${sets.join(", ")},updatedAt = :updatedAt`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: {
          ...values,
          updatedAt: new Date().toISOString,
        },
        ConditionExpression: "sellerId = :uid",
        ReturnValues: "ALL_NEW",
      })
    );
    res.json(out.Attributes);
  } catch (err: any) {
    if (err?.name === "ConditionalCheckFailedException") {
      return res
        .status(403)
        .json({ error: "Not allowed to update this product" });
    }
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/:productId", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { productId } = req.params;

    await ddb.send(
      new DeleteCommand({
        TableName: "EcommerceTable",
        Key: {
          PK: `PRODUCTY#${productId}`,
          SK: `ITEM#${productId}`,
        },
        ConditionExpression: "sellerId = :sid",
        ExpressionAttributeValues: { ":sid": user.userId },
      })
    );
    res.json({ message: "Product deleted" });
  } catch (err: any) {
    if (err?.name === "ConditionalCheckFailedException") {
      return res
        .status(403)
        .json({ error: "Not allowed to delete this product" });
    }
    res.status(500).json({ error: "Failed to delete product" });
  }
});
router.post("/:productId/view", async (req, res) => {
  try {
    const user = (req as any).user;
    const { productId } = req.params;

    await ddb.send(
      new UpdateCommand({
        TableName: "EcommerceTable",
        Key: {
          PK: `PRODUCTY#${productId}`,
          SK: `ITEM#${productId}`,
        },
        UpdateExpression: "ADD ViewCount :one",
        ExpressionAttributeValues: { ":one": 1 },
      })
    );

    const recentViewKey = {
      PK: `PRODUCTY#${productId}`,
      SK: `ITEM#${productId}`,
    };
    const current = await ddb.send(
      new GetCommand({
        TableName: "EcommerceTable",
        Key: recentViewKey,
      })
    );

    const now = new Date().toISOString();
    const existing: string[] = (current.Item?.productIds ?? []) as string[];
    const next = [
      productId,
      ...existing.filter((id) => id !== productId),
    ].slice(0, 10);

    await ddb.send(
      new PutCommand({
        TableName: "EcommerceTable",
        Item: {
          ...recentViewKey,
          productIds: next,
          updatedAt: now,
        },
      })
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("products VIEW error:", err);
    res.status(500).json({ error: "Failed to update view" });
  }
});
export default router;
