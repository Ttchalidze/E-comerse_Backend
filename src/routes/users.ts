import express from "express";
import bcrypt from "bcryptjs";
import { ddb } from "../db/dyClient";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { createToken } from "../utilities/jwt";
import { User } from "../types/types";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, lastname, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 7);

  const user: User = {
    userId: crypto.randomUUID(),
    name,
    lastname,
    email,
    password: hashedPassword,
    createdAt: new Date().toISOString(),
  };
  await ddb.send(new PutCommand({ TableName: "EcommerceTable", Item: user }));
  res.status(201).json({ message: "user registered" });
});

router.post("/login", async (req, res) => {
  const { Email, Password } = req.body;
  const result = await ddb.send(
    new GetCommand({ TableName: "EcommerceTable", Key: { UserId: Email } })
  );
  const user = result.Item as User;
  if (!user) return res.status(401).json({ error: "invalid email" });

  const userMatched = await bcrypt.compare(Password, user.password);
  if (!userMatched) return res.status(401).json({ error: "invalid Password" });
  const token = createToken({
    UserId: user.userId,
    Email: user.email,
    Role: user.role,
  });
  res.json(token);
});
export default router;
