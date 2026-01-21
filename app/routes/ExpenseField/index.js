import express from "express";
import passport from "passport";
import { ExpensesFieldModel } from "../../DBModel/ExpenseFieldModel/index.js";
import { userModel } from "../../DBModel/userModal/index.js";
import { expenseModal } from "../../DBModel/expenseModal/index.js";
import mongoose from "mongoose";
import { FieldanduserModel } from "../../DBModel/RequestModel/index.js";
const Router = express.Router();


// create field
Router.post(
  "/createField",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { _id } = req.user;
      req.body.userId = _id;

      const response = await ExpensesFieldModel.create(req.body);
      await FieldanduserModel.create({
        user: _id,
        field: response._id,
      });
      return res
        .status(200)
        .json({ message: "Expensefield created", response, success: true });
    } catch (error) {
      return res.status(400).json({ message: error.message, sucess: false });
    }
  }
);

// get field
Router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { _id } = req.user;
    const { fieldType } = req.query;
    try {
      const userExist = await userModel.findById(_id);
      if (!userExist)
        return res.status(404).json({ message: "user dose not exist" });

      const query = { userId: _id };

      // Add fieldType to query if it is present
      if (fieldType !== "undefined" && fieldType) {
        query.fieldType = fieldType;
      } else if (
        fieldType !== "Primary" ||
        fieldType !== "undefined" ||
        fieldType !== undefined
      ) {
        query.fieldType = { $ne: "Primary" };
      }

      const expenseField = await FieldanduserModel.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(_id)
          }
        },
        {
          $unwind: {
            path: "$field",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: "expensefields",
            localField: "field",
            foreignField: "_id",
            as: "expensefields"
          }
        },
        {
          $unwind: {
            path: "$expensefields",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project:{
            expensefields:1
          }
        }
      ]);
      
      if (expenseField.length === 0)
        return res.status(404).json({ message: "Add Expese field " });

      return res.status(202).json({ expenseField, success: true });
    } catch (error) {
      console.log(error,"error");
      
      return res.status(400).json({ message: error.message });
    }
  }
);

// get field by id

Router.get(
  "/:fieldId",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { fieldId } = req.params;
    try {
      const field = await ExpensesFieldModel.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(fieldId),
          },
        },
        {
          $lookup: {
            from: "expenses",
            localField: "_id",
            foreignField: "fieldId",
            as: "expenses",
          },
        },
        {
          $unwind: {
            path: "$expenses",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "expenses.userId",
            foreignField: "_id",
            as: "user",
          }
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            "expenses.userName": "$user.name"
          }
        },
        {
          $group: {
            _id: "$_id",
            doc: { $first: "$$ROOT" },
            expenses: { $push: "$expenses" }
          }
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                "$doc",
                { expenses: "$expenses" }
              ]
            }
          }
        }
      ]);
      return res
        .status(200)
        .json({
          field: field[0],
          success: true,
          message: "Expenses fetched successfully",
        });
    } catch (error) {
      console.log(error,"error");
      
      return res.status(400).json({ message: error.message });
    }
  }
);
// add expenses (we have to shift this in expenses api
Router.post(
  "/add-expense/:fieldId",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { fieldId } = req.params;
    const { desc, category, price, date } = req.body;
    const { _id } = req.user;
    req.body.fieldId = _id;

    try {
      const expense = await expenseModal.create({
        desc: desc,
        category: category,
        price,
        price,
        date: date,
        fieldId: fieldId,
        userId: _id,
      });

      const field = await ExpensesFieldModel.findById(fieldId);
      if (!field) return res.status(404).json({ message: "field not found" });

      const expenses = await expenseModal.find({ fieldId: fieldId });
      let Updatedfield;
      if (field.fieldType !== "Primary") {
        const totalExpenses = expenses.reduce((acc, exp) => acc + exp.price, 0);
        const currentBalance = field.RecivedAmount - totalExpenses;

        Updatedfield = await ExpensesFieldModel.findByIdAndUpdate(
          fieldId,
          {
            balance: currentBalance,
          },
          { new: true }
        );
      } else {
        const totalExpenses = expenses.reduce((acc, exp) => acc + exp.price, 0);

        Updatedfield = await ExpensesFieldModel.findByIdAndUpdate(
          fieldId,
          {
            RecivedAmount: totalExpenses,
          },
          { new: true }
        );
      }
      res
        .status(200)
        .json({
          message: "Expenses added successfully",
          Updatedfield,
          sucess: true,
        });
    } catch (error) {
      return res
        .status(500)
        .json({ messsage: "Somthing went wrong", error: error.message });
    }
  }
);

Router.post(
  "/add-fixed-expenses",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { desc, category, price, date } = req.body;
    const { _id: userId } = req.user;

    try {
      // Find existing Primary ExpensesField or create one
      let expenseField = await ExpensesFieldModel.findOne({ userId, fieldType: "Primary" });
      if (!expenseField) {
        expenseField = await ExpensesFieldModel.create({
          fieldName: "Fixed expense",
          fieldType: "Primary",
          userId,
          RecivedAmount: '',
        });
      }

      // Create new expense linked to the Primary expense field
      const expense = await expenseModal.create({
        desc,
        category,
        price,
        date,
        fieldId: expenseField._id,
      });

      const field = await ExpensesFieldModel.findById( expenseField._id);
      if (!field) return res.status(404).json({ message: "field not found" });

      const expenses = await expenseModal.find({ fieldId:  expenseField._id });
      let Updatedfield;
      if (field.fieldType !== "Primary") {
        const totalExpenses = expenses.reduce((acc, exp) => acc + exp.price, 0);
        const currentBalance = field.RecivedAmount - totalExpenses;

        Updatedfield = await ExpensesFieldModel.findByIdAndUpdate(
          expenseField._id,
          {
            balance: currentBalance,
          },
          { new: true }
        );
      } else {
        const totalExpenses = expenses.reduce((acc, exp) => acc + exp.price, 0);

        Updatedfield = await ExpensesFieldModel.findByIdAndUpdate(
          expenseField._id,
          {
            RecivedAmount: totalExpenses,
          },
          { new: true }
        );
      }
      res
        .status(200)
        .json({
          message: "Expenses added successfully",
          Updatedfield,
          success: true,
        });
    } catch (error) {
      return res
        .status(500)
        .json({ messsage: "Somthing went wrong", error: error.message });
    }
  }
);


// https://chatgpt.com/share/672bd7a5-c66c-8001-a453-4757b3f870ce

// merge expenses into main feild
Router.post(
  "/team-expenses/:fieldId",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { fieldId } = req.params;
    const { _id } = req.user;
    const { myFieldId } = req.body;

    try {
      const teamField = await ExpensesFieldModel.findById(fieldId);

      if (!teamField)
        return res.status(404).json({ message: "Feild does not exist" });

      const myExpenses = await ExpensesFieldModel.findById(myFieldId);
      const memberExpenseEntry = teamField.membersExpenses.find(
        (me) => me.memberId.toString() === _id.toString()
      );

      if (!memberExpenseEntry) {
        // Step 3: Add a new entry for the member if it doesn't exist
        await ExpensesFieldModel.findByIdAndUpdate(fieldId, {
          $push: {
            membersExpenses: { memberId: _id, expenses: [], status: "Pending" },
          },
        });
      }

      const addExpensesField = await ExpensesFieldModel.findByIdAndUpdate(
        fieldId,
        {
          $push: {
            "membersExpenses.$[member].expenses": {
              $each: myExpenses?.expenses,
            },
          },
        },
        { arrayFilters: [{ "member.memberId": _id }], new: true }
      );
      return res
        .status(200)
        .json({ message: "Expenses upated", addExpensesField });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

// status will change to approve and expenses will added to field expenses list
Router.post(
  "/review-Pr/:fieldId",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { fieldId } = req.params;
    const { review, prId } = req.body;

    try {
      const teamField = await ExpensesFieldModel.findOneAndUpdate(
        { _id: fieldId, "membersExpenses._id": prId },
        {
          $set: { "membersExpenses.$.status": review },
        },
        { new: true }
      );

      if (!teamField) {
        return res
          .status(404)
          .json({ message: "Team field or member expense not found" });
      }

      return res
        .status(200)
        .json({ message: "Field status has been changed", teamField });
    } catch (error) {
      return res
        .status(400)
        .json({ message: "Somthing went wrong", error: error.message });
    }
  }
);

Router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const fieldExist = await ExpensesFieldModel.findById(id);
      if (!fieldExist)
        return res.status(404).json({ message: "Feild does not exist" });

      await ExpensesFieldModel.findByIdAndDelete(id);
      return res.status(200).json({ message: "Field deleted successfully" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

Router.put(
  "/:id/update",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const fieldExist = await ExpensesFieldModel.findById(id);
      if (!fieldExist)
        return res.status(404).json({ message: "Feild does not exist" });

      const response = await ExpensesFieldModel.findByIdAndUpdate(
        id,
        req.body,
        {
          new: true,
          runValidators: true,
          useFindAndModify: false,
        }
      );
      return res
        .status(200)
        .json({ message: "field created", response: response });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);


// migrateData();
export default Router;
