import express from "express";
import { ddb } from "../db/dyClient";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { requireUser } from "../middleware/requreUser";
import { BatchGetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const router = express.Router();

router.get("/", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;

    const rv = await ddb.send(
      new GetCommand({
        TableName: "RecentlyViewed",
        Key: {
          PK: `USER#${user.userId}`,
          SK: `RECENTLYVIEWED#${user.userId}`,
        },
      })
    );

    const ids: string[] = rv.Item?.productIds ?? [];
    if (ids.length === 0) return res.json([]);
    const keys = ids.map((id) => ({
      PK: { S: `PRODUCT#${id}` },
      SK: { S: `ITEM#${id}` },
    }));

    const resp = await ddb.send(
      new BatchGetItemCommand({
        RequestItems: {
          EcommerceTable: {
            Keys: keys,
          },
        },
      })
    );

    const raw = resp.Responses?.EcommerceTable || [];
    const items = raw.map((i) => unmarshall(i));

    const byId = new Map(items.map((p) => [p.productId, p]));

    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
    res.json(ordered);
  } catch {}
});

export default router;
