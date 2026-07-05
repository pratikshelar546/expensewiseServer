import moment from "moment";
import mongoose from "mongoose";

const expensesSchema = new mongoose.Schema(
    {
        desc: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            enum: [
                // Legacy
                'Transport', 'Food', 'Fixed Expense', 'Other Expenses',
                // Needs
                'Housing & Rent', 'Groceries', 'Health & Medical', 'Utilities & Bills', 'EMI',
                // Wants
                'Shopping', 'Entertainment', 'Personal Care', 'Travel',
                // Savings
                'Subscriptions', 'SIP', 'Emergency Fund', 'Fixed Deposit',
                'Other Investment', 'Education & Learning',
            ],
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        date: {
            type: Date,
            required: true,
            validate: {
                validator: (val) => moment(val, 'YYYY-MM-DD', true).isValid(),
                message: 'Invalid date format, should be YYYY-MM-DD'
            }
        },
        fieldId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "expenseField"
        },
        userId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        }
    }
)

export const expenseModal = mongoose.model("Expense", expensesSchema);  