import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// Get all customers (This will power your "Active Leads" count)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM Customers ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

export default router;
