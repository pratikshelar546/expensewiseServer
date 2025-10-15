import { userModel } from "../../DBModel/userModal/index.js";
import express from "express"
import passport from "passport";
import { organizationModel } from "../../DBModel/organizationModal/index.js";

const Router = express.Router();


async function addUSerToOrg(userID) {
  try {
    const user = await userModel.findById(userID);

    if (!user) {
      throw new Error("User not found");
    }
    if (!user.organization) {
      throw new Error("User dose not belong to any organization");
    }
    const organization = await organizationModel.findById(user.organization);

    if (!organization) {
      throw new Error("Orgnization not exist");
    }
    // console.log(user);
    if (!organization.users.includes(user._id)) {
      organization.users.push(user._id);
      await organization.save();
    } else {
      throw new Error("User already exist");
    }
  } catch (error) {
    return res.status(400).json({ message: "Somthing went wrong", error: error.message })
  }
}


Router.post("/signup", async (req, res) => {
  try {
    const emailExist = await userModel.findByEmail(req, res);
    if (emailExist !== undefined) {
      return res.status(401).json({ message: "User already exist", success: false })
    }
    const newUser = await userModel.create(req.body);

    if (newUser.organization) {
      addUSerToOrg(newUser._id);
    }

    const token = newUser.genrateJwtToken();

    return res.status(201).json({ status: "Success", token, success: true })
  } catch (error) {
    return res.status(400).json({ status: "Failed", error: error.message, success: false })
  }
})

Router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
console.log(email, password,"creds");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }
    console.log("finding user");
    
    const user = await userModel.findByEmailAndPass(email, password);

    const token = user.genrateJwtToken();

    return res.status(200).json({
      success: true,
      token,
      user: {
        name: user.name,
        email: user.email,
        phoneNo: user.phoneNo,
        userId: user._id,
      },
    });

  } catch (error) {
    const message = error.message;

    if (message === "USER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (message === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
});


Router.get("/getUser", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const { name, email, _id, organization } = req.user;
    // console.log(req.user._id);
    return res.status(201).json({ user: { name, email, _id, organization } })
  } catch (error) {
    return res.status(500).json({ status: "failed", message: error.message })
  }
})


Router.put('/chnagePassword', async (req, res) => {
  try {
    const { oldPassword, newPassowrd, confirmPassword, email } = req.body;

    const user = await userModel.findOne({ email });

    if (!user) (
      res.status(400).json({ status: "failed", message: "user not found" })
    )

    await user.matchPassword(oldPassword, (error, isMatch) => {
      if (error) {
        return res.status(400).json({ status: "failed", message: "Something went wrong please refresh the page or try later" })
      } if (isMatch) {
        if (newPassowrd === confirmPassword) {
          user.password = confirmPassword;
          user.save();
          return res.status(200).json({ status: "success", message: "Password changed successfully" })
        } else {
          return res.status(404).json({ status: "not matched", message: "Pelase enter the same password that  can matched" })
        }
      }
    });

  } catch (error) {
    return res.status(500).json({ status: "failed", message: error.message })

  }
})

Router.put('/AddOrg', passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const userId = req.user._id;
    const { organization: organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ status: "Add Organization ID" });
    }

    const orgExist = await organizationModel.findById(organizationId);

    if (!orgExist) {
      return res.status(400).json({ status: "Organization Not Found" });
    }

    const updatedUser = await userModel.findById(userId);
    if (!updatedUser) {
      return res.status(404).json({ status: "User not found" });
    }

    // Check if the user is already in the organization
    if (updatedUser.organization && updatedUser.organization.toString() === organizationId) {
      return res.status(400).json({ status: "User already belongs to organization" });
    }

    updatedUser.organization = organizationId;
    await updatedUser.save();

    await addUserToOrganization(userId);

    const { name, email, _id, organization } = updatedUser;
    return res.status(201).json({ status: "Organization added", updatedUser: { name, email, _id, organization } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "Internal Server Error", error: error.message });
  }
});


Router.post("/auth", async (req, res) => {
  try {
    const user = await userModel.findByEmail(req, res);
    // console.log(user);

    if (!user) {
      const newUser = await userModel.create(req.body);
      const token = newUser.genrateJwtToken();
      return res.status(200).json({ message: "Signup successfully", token })
    } else {
      const token = user.genrateJwtToken();
      return res.status(200).json({ message: "Signup successfully", token })

    }


  } catch (error) {
    return res.status(400).json({ message: "Somthing went wrong", error: error.message })

    return res.status(404).json({ message: "Somthing went wrong", error })
  }



})


export default Router;