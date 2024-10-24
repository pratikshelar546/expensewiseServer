import mongoose from "mongoose";


const fieldSchema = new mongoose.Schema({
    fieldName: {
        type: String,
    },
    RecivedAmount: {
        type: String,
    },
    balance: {
        type: String,
    },
        userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }
},
    { timestamps: true }
)


export const ExpensesFieldModel = mongoose.model("ExpenseField", fieldSchema) 