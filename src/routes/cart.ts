import express from "express";
import { ddb } from "../db/dyClient";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { requireUser } from "../middleware/requreUser";

const router = express.Router();
//add to cart
router.post("/", requireUser, async (req, res) => {
  const user = (req as any).user;
  const { items } = req.body;

  const cart = { userId: user.userId, items };
  await ddb.send(new PutCommand({ TableName: "EcommerceTable", Item: cart }));
  res.status(201).json(cart);
});
//get whole cart
router.get("/", requireUser, async (req, res) => {
  const user = (req as any).user;

  const reuslt = await ddb.send(
    new GetCommand({ TableName: "EcommerceTable", Key: { userId: user.userI } })
  );
  res.json(reuslt.Item);
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
