import express from "express";
import { ddb } from "../db/dyClient";
import { requireUser } from "../middleware/requreUser";
import { requireAdmin } from "../middleware/requireAdmin";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { inversePkQuery } from "../db/QueryFunction";

const router = express.Router();

router.get("/user", requireUser, requireAdmin, async (_req, res) => {
  const result = await inversePkQuery("profile");
  res.json(result);
});

router.get("/product", requireUser, requireAdmin, async (_req, res) => {});

router.delete("/users/:userId", requireUser, requireAdmin, async (req, res) => {
  const { userId } = req.params;

  await ddb.send(
    new DeleteCommand({
      TableName: "EcommerceTable",
      Key: { userId },
    })
  );

  res.json({ message: "User deleted." });
});

router.delete(
  "/orders/:orderId",
  requireUser,
  requireAdmin,
  async (req, res) => {
    const { orderId } = req.params;

    await ddb.send(
      new DeleteCommand({
        TableName: "EcommerceTable",
        Key: { orderId },
      })
    );

    res.json({ message: "Order deleted." });
  }
);

router.delete(
  "/products/:productId",
  requireUser,
  requireAdmin,
  async (req, res) => {
    const { productId } = req.params;

    await ddb.send(
      new DeleteCommand({
        TableName: "EcommerceTable",
        Key: { productId },
      })
    );

    res.json({ message: "Product deleted." });
  }
);

export default router;
