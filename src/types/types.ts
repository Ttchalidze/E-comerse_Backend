export interface User {
  userId: string;
  name: string;
  email: string;
  password: string;
  role?: "seller" | "admin";
  address?: string;
  phone?: string;
  createdAt: string;
}
export interface Product {
  productId: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  imageURL?: string;
  sellerId: string;
  description?: string;
  createdAt: string;
  viewCount?: number;
}

export interface Cart {
  userId: string;
  items: { ProductId: string; Quantity: number }[];
}

export interface Order {
  orderId: string;
  userId: string;
  items: { ProductID: string; Quantity: number }[];
  totalPrice: number;
  status: "Pending" | "Shiped" | "Delivered";
  createdAt: string;
}
