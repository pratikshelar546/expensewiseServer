import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import crypto from "crypto";


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phoneNo: {
        type: Number,
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        validate: {
            validator: (val) => val.length >= 8,
            message: 'password should be 8 digits'
        }

    },
    expensesField: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization"
    }],
    role: {
        type: String, // accountant, co-accontant,member
        // required: true
    },
    resetPasswordToken: String,
    resetPasswordExipre: String
},
    { timestamps: true });

userSchema.methods.genrateJwtToken = function () {
    return jwt.sign({ user: this._id.toString() }, "newProject", { expiresIn: "10d" })
}

userSchema.methods.getResetToken = function () {
    const resetToken = crypto.randomBytes(15).toString("hex");
    this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.resetPasswordExipre = Date.now() + 10 * 60 * 1000;
    return resetToken;
}

userSchema.statics.findByEmail = async (req, res) => {
    const { email } = req.body

    const checkEmail = await userModel.findOne({ email });
    if (checkEmail) {
        return checkEmail

    }
    return;
}

userSchema.methods.matchPassword = function (oldPassword, callback) {
    try {
        const [salt, hash] = this.password.split(':');
        crypto.scrypt(oldPassword, salt, 64, (error, derivedKey) => {
            if (error) return callback(error);
            const isMatch = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derivedKey);
            callback(null, isMatch);
        });
    } catch (error) {
        callback(error);
    }
}

userSchema.statics.findByEmailAndPass = async function (email, password) {
    console.log("db calling");
    
    const user = await this.findOne({ email });
    console.log(user,"user");
    
    if (!user) throw new Error("USER_NOT_FOUND");

    const [salt, hash] = user.password.split(':');
    const derivedKey = await new Promise((resolve, reject) => {
        crypto.scrypt(String(password), salt, 64, (error, key) => {
            if (error) reject(error);
            else resolve(key);
        });
    });
    const isMatch = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derivedKey);
    if (!isMatch) throw new Error("INVALID_CREDENTIALS");
    return user;
};
// hashing password here
userSchema.pre("save", function (next) {
    const user = this;
    if (!user.isModified("password")) return next();

    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(user.password, salt, 64, (error, derivedKey) => {
        if (error) return next(error);

        user.password = `${salt}:${derivedKey.toString('hex')}`;
        return next();
    });
})

export const userModel = mongoose.model("User", userSchema);