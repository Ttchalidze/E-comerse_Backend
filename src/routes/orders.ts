import express from "express";
import crypto from "crypto";
import { ddb } from "../db/dyClient";
import {
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { requireUser } from "../middleware/requreUser";

const router = express.Router();

router.post("/", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { items, totalPrice } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Missing order items" });
    }

    if (!totalPrice) {
      return res.status(400).json({ error: "Missing totalPrice" });
    }

    const orderId = crypto.randomUUID();

    const order = {
      PK: `ORDER#${orderId}`,
      SK: `ITEM#${orderId}`,
      orderId,
      userId: user.userId,
      items,
      totalPrice,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    await ddb.send(
      new PutCommand({ TableName: "EcommerceTable", Item: order })
    );

    res.status(201).json({ message: "Order created", order });
  } catch (err) {
    console.error("POST error:", err);
    res.status(500).json({ error: "failed to create order" });
  }
});

router.patch("/:orderId", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { orderId } = req.params;
    const allowed = ["items", "totalPrice", "status"] as const;

    const body = req.body || {};
    const keys = allowed.filter((k) => body[k] !== undefined);

    const setParts = [
      ...keys.map((k) => `#${k} = :${k}`),
      "#updatedAt = :updatedAt",
    ];

    const ExpressionAttributeNames = keys.reduce<Record<string, string>>(
      (a, k) => ((a[`#${k}`] = k), a),
      { "#updatedAt": "updatedAt" }
    );

    const ExpressionAttributeValues = keys.reduce<Record<string, any>>(
      (a, k) => ((a[`:${k}`] = body[k]), a),
      { ":updatedAt": new Date().toISOString(), ":uid": user.userId }
    );

    const result = await ddb.send(
      new UpdateCommand({
        TableName: "EcommerceTable",
        Key: {
          PK: `ORDER#${orderId}`,
          SK: `ITEM#${orderId}`,
        },
        UpdateExpression: "SET " + setParts.join(", "),
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        ConditionExpression: "userId = :uid",
        ReturnValues: "ALL_NEW",
      })
    );

    res.json({ message: "Order updated", order: result.Attributes });
  } catch (err) {
    console.error("order PATCH error:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

router.delete("/:orderId", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { orderId } = req.params;

    await ddb.send(
      new DeleteCommand({
        TableName: "EcommerceTable",
        Key: {
          PK: `ORDER#${orderId}`,
          SK: `ITEM#${orderId}`,
        },
        ConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": user.userId },
      })
    );

    res.status(204).send();
  } catch (err) {
    console.error("order DELETE error:", err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

export default router;
