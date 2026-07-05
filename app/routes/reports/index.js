import express from "express";
import passport from "passport";
import mongoose from "mongoose";
import { FieldanduserModel } from "../../DBModel/RequestModel/index.js";
import { expenseModal } from "../../DBModel/expenseModal/index.js";

const Router = express.Router();

Router.post(
  "/generate",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { _id } = req.user;
      const { fieldIds = [], includeTeamPools = false } = req.body;

      const userFieldLinks = await FieldanduserModel.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(_id),
          },
        },
        {
          $lookup: {
            from: "expensefields",
            localField: "field",
            foreignField: "_id",
            as: "fieldDoc",
          },
        },
        { $unwind: "$fieldDoc" },
        {
          $match: {
            "fieldDoc.fieldType": { $ne: "Primary" },
          },
        },
        {
          $project: {
            fieldId: "$fieldDoc._id",
            fieldName: "$fieldDoc.fieldName",
            fieldType: "$fieldDoc.fieldType",
          },
        },
      ]);

      let pools = userFieldLinks;

      if (!includeTeamPools) {
        pools = pools.filter((pool) => pool.fieldType !== "Team");
      }

      if (Array.isArray(fieldIds) && fieldIds.length > 0) {
        const selectedIds = new Set(fieldIds.map((id) => id.toString()));
        pools = pools.filter((pool) => selectedIds.has(pool.fieldId.toString()));
      }

      if (pools.length === 0) {
        return res.status(200).json({
          success: true,
          pools: [],
          columnTotals: {},
          grandTotal: 0,
        });
      }

      const poolIds = pools.map((pool) => pool.fieldId);

      const expenseAgg = await expenseModal.aggregate([
        {
          $match: {
            fieldId: { $in: poolIds },
          },
        },
        {
          $group: {
            _id: {
              fieldId: "$fieldId",
              category: "$category",
            },
            total: { $sum: "$price" },
          },
        },
      ]);

      const totalsByField = new Map();

      for (const item of expenseAgg) {
        const fieldKey = item._id.fieldId.toString();
        if (!totalsByField.has(fieldKey)) {
          totalsByField.set(fieldKey, {});
        }
        totalsByField.get(fieldKey)[item._id.category] = item.total;
      }

      const columnTotals = {};
      let grandTotal = 0;

      const reportPools = pools.map((pool) => {
        const fieldKey = pool.fieldId.toString();
        const categoryTotals = totalsByField.get(fieldKey) || {};
        const rowTotal = Object.values(categoryTotals).reduce(
          (sum, value) => sum + value,
          0
        );

        for (const [category, amount] of Object.entries(categoryTotals)) {
          columnTotals[category] = (columnTotals[category] || 0) + amount;
        }

        grandTotal += rowTotal;

        return {
          fieldId: fieldKey,
          fieldName: pool.fieldName,
          fieldType: pool.fieldType,
          categoryTotals,
          rowTotal,
        };
      });

      return res.status(200).json({
        success: true,
        pools: reportPools,
        columnTotals,
        grandTotal,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

export default Router;
