
import mongoose from "mongoose";
import { ExpensesFieldModel } from "../../DBModel/ExpenseFieldModel/index.js";
import { expenseModal } from "../../DBModel/expenseModal/index.js";
import express from "express";
import passport from "passport";
const Router = express.Router();


Router.post("/:id/addexpense", passport.authenticate("jwt", { session: false }), async (req, res) => {
    try {
        const { id } = req.params;
        const feildExist = await ExpensesFieldModel.findById(id);
        if (!feildExist) return res.status(404).json({ message: "Feild not found first create feild" })
        req.body.feildId = id;
      req.body.userId = req.user._id;
      
        const newExpense = await expenseModal.create(req.body);
        return res.status(201).json({ status: "expense Created", newExpense })
    } catch (error) {
        return res.status(400).json({ status: "somthing went wrong", error: error.message })
    }
})

Router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const fieldExist = await ExpensesFieldModel.findById(id);
        if (!fieldExist) return res.status(404).json({ message: "Feild not found first create feild" })


        const expensesList = await expenseModal.find({ fieldId: new mongoose.Types.ObjectId(id) });

        return res.status(201).json({ expensesList })
    } catch (error) {
        return res.status(400).json({ status: "Somthing went wrong", error: error.message })
    }
})

Router.delete("/deleteExpense/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        const expense = await expenseModal.findById(id);
        const field = await ExpensesFieldModel.findById(expense.fieldId);
        if (field.fieldType === "Primary") {
            await ExpensesFieldModel.findByIdAndUpdate(expense.fieldId, {
                RecivedAmount: field.RecivedAmount - expense.price,
            })
        } else {
        await ExpensesFieldModel.findByIdAndUpdate(expense.fieldId, {
                balance: field.balance + expense.price,
            })
        }
        await expenseModal.findByIdAndDelete(id);
        // await commanExpenseFieldModal.findOneAndDelete({ expenseId: id })
        return res.status(200).json({ status: 'deleted succesfully', success: true })
    } catch (error) {
        return res.status(400).json({ status: "Somthing went wrong", error: error.message })
    }
})

Router.put("/updateExpense/:id", async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const { id } = req.params;
      const newData = req.body;
  
      // Fetch old expense
      const oldExpense = await expenseModal.findById(id).session(session);
      if (!oldExpense) {
        return res.status(404).json({ status: "Expense not found" });
      }
  
      // Fetch related field
      const field = await ExpensesFieldModel.findById(oldExpense.fieldId).session(session);
      if (!field) {
        return res.status(404).json({ status: "Field not found" });
      }
  
      // Calculate adjustment
      const amountDiff = Number(newData.price) - Number(oldExpense.price);
  
      // Update expense
      const updatedExpense = await expenseModal.findByIdAndUpdate(
        id,
        newData,
        { new: true, runValidators: true, session }
      );
  
      // Update field in one step
      if (field.fieldType === "Primary") {
        await ExpensesFieldModel.findByIdAndUpdate(
          oldExpense.fieldId,
          { $inc: { RecivedAmount: amountDiff } },
          { session }
        );
      } else {
        await ExpensesFieldModel.findByIdAndUpdate(
          oldExpense.fieldId,
          { $inc: { balance: -amountDiff } }, // subtract diff if price increased
          { session }
        );
      }
  
      await session.commitTransaction();
      session.endSession();
      return res.status(200).json({
        status: "Expense updated successfully",
        updatedExpense,
        success: true,
      });
  
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ status: "Something went wrong", error: error.message });
    }
  });
  

Router.post('/mergeExpense', async (req, res) => {
    try {
        const { expenseList, fieldId } = req.body;
        if (!expenseList || !fieldId) return res.status(500).json({ message: "Invalid data" })
            const field = await ExpensesFieldModel.findById(fieldId);
            if (field.fieldType === "Primary") return res.status(404).json({ message: "Field is Primary Can't merge" })
            let totalPrice = 0;
            const createdExpenses = await Promise.all(
                expenseList.map(async (id) => {
                    const existingExpense = await expenseModal.findById(id);
                    if (!existingExpense) {
                        throw new Error(`Expense with ID ${id} not found`);
                    }
                    totalPrice += Number(existingExpense.price) || 0
                    // Destructure only the needed fields to avoid copying unwanted metadata
                    const { desc, category, date, price } = existingExpense;
        
                    // Create a new expense with a new fieldId
                    return expenseModal.create({
                        desc,
                        category,
                        date,
                        price,
                        fieldId, // new fieldId
                    });
                })
            );
            await ExpensesFieldModel.findByIdAndUpdate(fieldId, {
                balance: field.balance - totalPrice,
            });
        res.status(200).json({ message: "Expenses merged successfully", success: true })

    } catch (error) {
        console.log("error while merging expsnes", error);

        return res.status(400).json({ status: "Somthing went wrong", error: error.message })
    }
})

export default Router