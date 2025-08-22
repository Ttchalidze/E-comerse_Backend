import express from "express";
import { ddb } from "../db/dyClient";
import { ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Product } from "../types/types";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    let user: any = undefined;
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
      try {
        const token = auth.split(" ")[1];
        const { verifyToken } = await import("../utilities/jwt");
        user = verifyToken(token);
      } catch {}
    }

    const all = await ddb.send(new ScanCommand({ TableName: "Products" }));
    const products = (all.Items || []) as Product[];

    const trending = products
      .slice()
      .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
      .slice(0, 20);

    if (!user) {
      return res.json({ trending, recentlyViewed: [] });
    }

    const rv = await ddb.send(
      new GetCommand({
        TableName: "recent",
        Key: { userId: user.userId },
      })
    );

    const recentIds: string[] = rv.Item?.productIds ?? [];
    if (recentIds.length === 0) {
      return res.json({ trending, recentlyViewed: [] });
    }

    const byId = new Map(products.map((p) => [p.productId, p]));
    const recentlyViewed = recentIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .slice(0, 20) as Product[];

    return res.json({ trending, recentlyViewed });
  } catch (err) {
    console.error("[home] error", err);
    return res.status(500).json({ error: "Home Page error" });
  }
});

export default router;
