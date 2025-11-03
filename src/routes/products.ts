import express from "express";
import crypto from "crypto";
import { ddb } from "../db/dyClient";
import {
  PutCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { Product } from "../types/types";
import { requireUser } from "../middleware/requreUser";

const router = express.Router();

router.get("/", async (_req, res) => {
  const result = await ddb.send(
    new ScanCommand({ TableName: "EcommerceTable" })
  );
  res.json((result.Items || []) as Product[]);
});

router.post("/", requireUser, async (req, res) => {
  const user = (req as any).user;

  const product: Product = {
    ...req.body,
    productId: crypto.randomUUID(),
    sellerId: user.userId,
  };

  await ddb.send(
    new PutCommand({ TableName: "EcommerceTable", Item: product })
  );
  res.status(201).json(product);
});

router.get("/user", requireUser, async (req, res) => {
  const user = (req as any).user;

  const result = await ddb.send(
    new ScanCommand({
      TableName: "EcommerceTable",
      FilterExpression: "userid = :sid",
      ExpressionAttributeValues: { ":sid": user.userId },
    })
  );

  res.json(result.Items || []);
});

router.patch("/:productId", requireUser, async (req, res) => {
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
    ([k, v]) => allowed.includes(k as any) && v !== undefined
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

  try {
    const out = await ddb.send(
      new UpdateCommand({
        TableName: "EcommerceTable",
        Key: { productId },
        UpdateExpression: `SET ${sets.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: "sellerId = :sid",
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
  const user = (req as any).user;
  const { productId } = req.params;

  try {
    await ddb.send(
      new DeleteCommand({
        TableName: "EcommerceTable",
        Key: { productId },
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
  const user = (req as any).user;
  const { productId } = req.params;

  await ddb.send(
    new UpdateCommand({
      TableName: "EcommerceTable",
      Key: { productId },
      UpdateExpression: "ADD ViewCount :one",
      ExpressionAttributeValues: { ":one": 1 },
    })
  );

  const recenViewKey = { userId: user.userId };
  const current = await ddb.send(
    new GetCommand({
      TableName: "EcommerceTable",
      Key: recenViewKey,
    })
  );

  const now = new Date().toISOString();
  const existing: string[] = (current.Item?.productIds ?? []) as string[];
  const next = [productId, ...existing.filter((id) => id !== productId)].slice(
    0,
    10
  );

  await ddb.send(
    new PutCommand({
      TableName: "EcommerceTable",
      Item: { userId: user.userId, productIds: next, updatedAt: now },
    })
  );
  res.json({ ok: true });
});
export default router;
