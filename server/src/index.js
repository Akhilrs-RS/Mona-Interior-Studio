import express from "express";
import cors from "cors";
import pool from "./config/db.js";
import customerRoutes from "./routes/customerRoutes.js";

const app = express();
const PORT = 5000; // This is the port *inside* the Docker container

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/customers", customerRoutes);

app.get("/", (req, res) => {
  res.send("Mona Interior CRM Server is running!");
});

// IMPORTANT: Added '0.0.0.0' so the container accepts connections
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
