import mongoose from "mongoose";

const fieldanduserSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
    },

    field: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExpenseField",
    },
}, {
    timestamps: true
});

export const FieldanduserModel = mongoose.model("fieldanduser", fieldanduserSchema)
