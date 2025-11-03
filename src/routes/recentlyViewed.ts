import express from "express";
import { ddb } from "../db/dyClient";
import { GetCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { requireUser } from "../middleware/requreUser";
import { Product } from "../types/types";

const router = express.Router();

router.get("/", requireUser, async (req, res) => {
  const user = (req as any).user;

  const rv = await ddb.send(
    new GetCommand({
      TableName: "RecentlyViewed",
      Key: { userId: user.userId },
    })
  );

  const ids: string[] = rv.Item?.productIds ?? [];
  if (ids.length === 0) return res.json([]);

  const resp = await ddb.send(
    new BatchGetCommand({
      RequestItems: {
        Products: {
          Keys: ids.map((id) => ({ productId: id })),
        },
      },
    })
  );

  const items = (resp.Responses?.Products ?? []) as Product[];
  const byId = new Map(items.map((p) => [p.productId, p]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

  res.json(ordered);
});

export default router;
