import User from "./User.js";

export class MongoUserRepository {
  async create(userData) {
    const user = new User(userData);

    return await user.save();
  }

  async findByEmail(email) {
    return await User.findOne({ email });
  }

  async findById(id) {
    return await User.findById(id);
  }

  async findAllForAdministration() {
    return await User.find({})
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .sort({ fechaRegistro: -1, _id: 1 })
      .lean();
  }

  async updateRole(id, role) {
    return await User.findByIdAndUpdate(
      id,
      { $set: { role } },
      { new: true, runValidators: true }
    )
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .lean();
  }

  async countAdmins() {
    return await User.countDocuments({ role: "admin" });
  }

  async updateResetPasswordToken(
    userId,
    resetPasswordToken,
    resetPasswordExpires
  ) {
    return await User.findByIdAndUpdate(
      userId,
      {
        resetPasswordToken,
        resetPasswordExpires
      },
      {
        new: true
      }
    );
  }

  async findByResetToken(resetPasswordToken) {
    return await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: {
        $gt: new Date()
      }
    });
  }

  async updatePassword(userId, password) {
    return await User.findByIdAndUpdate(
      userId,
      {
        password,

        // Invalidar inmediatamente el token
        resetPasswordToken: null,
        resetPasswordExpires: null
      },
      {
        new: true
      }
    );
  }
}