import express from "express";
import { ddb } from "../db/dyClient";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { requireUser } from "../middleware/requreUser";
import { inversePkQuery } from "../db/QueryFunction";

const router = express.Router();
//add to cart
router.post("/", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { productId, quantity } = req.body;
    if (!productId || !quantity) {
      return res.status(400).json({ error: "missing product" });
    }
    const carItem = {
      PK: `USER#${user.userId}`,
      SK: `CARTITEM#${productId}`,
      quantity,
      addedAt: new Date().toISOString(),
    };
    await ddb.send(
      new PutCommand({
        TableName: "EcommerceTable",
        Item: carItem,
      })
    );
    res.status(201).json({ message: "ITem added to cart", item: carItem });
  } catch (error) {
    console.error("error adding to cart", error);
    res.status(500).json({ error: "failed to add item to cart" });
  }
});
//get whole cartd
router.get("/", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const items = await inversePkQuery("CARTITEM#");
    const userCart = items.filter(
      (item) => item.pk?.S === `USER#${user.userId}`
    );
    res.json({ cart: userCart });
  } catch (error) {
    console.error("error getting cart", error);
    res.status(500).json({ error: "failed to catch cart" });
  }
});

//delete from cart
router.delete("/:productyId", requireUser, async (req, res) => {
  const user = (req as any).user;
  const { productId } = req.params;

  const result = await ddb.send(
    new GetCommand({
      TableName: "EcommerceTable",
      Key: { userId: user.userId },
    })
  );
  const cart = result.Item;
  if (!cart) return res.status(404).json({ error: "cart not found" });

  const itemsFiltered = cart.items.filter(
    (item: any) => item.productId !== productId
  );
  await ddb.send(
    new PutCommand({
      TableName: "EcommerceTable",
      Item: {
        userId: user.userId,
        items: itemsFiltered,
      },
    })
  );
  res.json({ message: "Itrem removed from cart" });
});
export default router;
