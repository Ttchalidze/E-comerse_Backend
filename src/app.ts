import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import userRoutes from "./routes/users";
import productRoutes from "./products";
import orderRoutes from "./routes/orders";
import cartRoutes from "./routes/cart";
import adminRoutes from "./routes/admin";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (_req, res) => res.send("E-commerce backend is running"));

app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
