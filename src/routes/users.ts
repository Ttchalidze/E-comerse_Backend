import express from "express";
import bcrypt from "bcryptjs";
import { ddb } from "../db/dyClient";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { createToken } from "../utilities/jwt";
import { User } from "../types/types";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, lastname, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const hashedPassword = await bcrypt.hash(password, 7);
    const userId = crypto.randomUUID;

    const user = {
      PK: `USER#${userId}`,
      SK: `PROFILE#${userId}`,
      userId,
      name,
      lastname,
      email,
      role: "seller",
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };
    await ddb.send(
      new PutCommand({
        TableName: "EcommerceTable",
        Item: user,
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );
    res.status(201).json({ message: "user registered" });
  } catch (error: any) {
    if (error.name === "Condition Expression check failed") {
      return res.status(500).json({ error: "Registration failed" });
    }
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email + Password required" });

    const emailLookUp = await ddb.send(
      new GetCommand({
        TableName: "EcommerceTable",
        Key: {
          PK: `EMAIL#${email}`,
          SK: `EMAIL#${email}`,
        },
      })
    );
    if (!emailLookUp.Item) {
      return res.status(401).json({ error: "invalid email" });
    }
    const userId = emailLookUp.Item.userId;

    const result = await ddb.send(
      new GetCommand({
        TableName: "EcommerceTable",
        Key: {
          PK: `USER#${userId}`,
          SK: `PROFILE#${userId}`,
        },
      })
    );
    const user = result.Item as User;
    if (!user) {
      return res.status(401).json({ error: "invalid account" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "invalid password" });
    }
    const token = createToken({
      userId: user.userId,
      email: user.email,
      roleL: user.role,
    });
    res.json({ token });
  } catch (err) {
    console.error("login error");
    res.status(500).json({ error: "login failed" });
  }
});
export default router;
