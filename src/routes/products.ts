import experess from "express";
import crypto from "crypto";
import { ddb } from "../db/dyClient";
import {
  PutCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Product, User } from "../types/types";
import { requireUser } from "../middleware/requreUser";

const router = experess.Router();

router.get("/", async (_req, res) => {
  const result = await ddb.send(new ScanCommand({ TableName: "Products" }));
  res.json((result.Items || []) as Product[]);
});

router.post("/", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;

    const product: Product = {
      productId: crypto.randomUUID(),
      sellerId: user.userId,
      name: req.body?.name,
      price: req.body?.price,
      category: req.body?.category ?? "general",
      stock: req.body?.stock ?? 0,
      imageURL: req.body?.imageURL,
    };

    if (!product.name || typeof product.price !== "number") {
      return res.status(400).json({ error: "name and price are required" });
    }

    await ddb.send(new PutCommand({ TableName: "Products", Item: product }));
    res.status(201).json(product);
  } catch (err) {
    console.error("error", err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.get("/seller", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;

    const result = await ddb.send(
      new ScanCommand({
        TableName: "Products",
        FilterExpression: "sellerId = :sid",
        ExpressionAttributeValues: { ":sid": user.userId },
      })
    );

    res.json(result.Items || []);
  } catch (err) {
    console.error("error", err);
    res.status(500).json({ error: "Failed to load your products" });
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
      ([k, v]) => allowed.includes(k as any) && v !== undefined
    );

    if (entries.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const names: Record<string, string> = {};
    const values: Record<string, any> = { ":sid": user.userId };
    const sets: string[] = [];

    entries.forEach(([key, val], i) => {
      const nk = `#f${i}`;
      const vk = `:v${i}`;
      names[nk] = key;
      values[vk] = val;
      sets.push(`${nk} = ${vk}`);
    });

    const result = await ddb.send(
      new UpdateCommand({
        TableName: "Products",
        Key: { productId },
        UpdateExpression: `SET ${sets.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: "sellerId = :sid",
        ReturnValues: "ALL_NEW",
      })
    );

    res.json(result.Attributes);
  } catch (err: any) {
    if (err?.name === "ConditionalCheckFailedException") {
      return res
        .status(403)
        .json({ error: "Not allowed to update this product" });
    }
    console.error("error", err);
    res.status(500).json({ error: "Failed to update product" });
  }
});
router.delete("/:productId", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { productId } = req.params;

    await ddb.send(
      new DeleteCommand({
        TableName: "Products",
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
    console.error("error", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
