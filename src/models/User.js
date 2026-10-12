const mongoose = require('mongoose');

const PointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: undefined,
      validate: {
        validator(v) {
          if (!v) return true;
          const [lng, lat] = v;
          return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
        },
        message: 'Invalid coordinates',
      },
    },
  },
  { _id: false },
);

const PrivacySchema = new mongoose.Schema(
  {
    showProfile: { type: Boolean, default: true },
    showGym: { type: Boolean, default: true },
    showApproxDistance: { type: Boolean, default: true },
    allowBuddyRequests: { type: Boolean, default: true },
    checkInVisible: { type: Boolean, default: true },
  },
  { _id: false },
);

const NotificationPrefsSchema = new mongoose.Schema(
  {
    buddyRequests: { type: Boolean, default: true },
    chat: { type: Boolean, default: true },
    workoutReminders: { type: Boolean, default: true },
    checkIns: { type: Boolean, default: true },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String, required: true, unique: true, lowercase: true, trim: true, index: true,
    },
    googleId: {
      type: String, required: true, unique: true, index: true, select: false,
    },
    profileImage: { type: String, default: null }, // Cloudinary secure_url
    profileImagePublicId: { type: String, default: null, select: false }, // for deletion, internal only

    age: { type: Number, min: 13, max: 100 },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'], default: 'prefer_not_to_say' },
    genderPreference: { type: String, enum: ['male', 'female', 'any'], default: 'any' },

    fitnessGoal: {
      type: String,
      enum: ['weight_loss', 'muscle_gain', 'general_fitness', 'endurance', 'strength', 'flexibility'],
      default: 'general_fitness',
    },
    experienceLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    preferredWorkoutTime: {
      type: String,
      enum: ['early_morning', 'morning', 'afternoon', 'evening', 'night', 'flexible'],
      default: 'flexible',
    },

    gym: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', default: null, index: true },
    city: { type: String, trim: true, index: true },

    // Internal-only precise location. NEVER serialized to normal API responses.
    location: { type: PointSchema, select: true },

    bio: { type: String, maxlength: 300, default: '' },

    ageRangePreference: {
      min: { type: Number, min: 13, max: 100, default: 18 },
      max: { type: Number, min: 13, max: 100, default: 60 },
    },

    privacy: { type: PrivacySchema, default: () => ({}) },
    notificationPreferences: { type: NotificationPrefsSchema, default: () => ({}) },

    deviceTokens: [{ type: String, select: false }], // FCM tokens, internal only

    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    accountStatus: { type: String, enum: ['active', 'suspended', 'deactivated'], default: 'active', index: true },

    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

userSchema.index({ location: '2dsphere' });
userSchema.index({ city: 1, gym: 1 });

// "Owner view" - safe to return to the user themselves (their own /me
// endpoint). Still strips googleId, deviceTokens, profileImagePublicId,
// and blockedUsers is left in since only the owner sees their own list.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    profileImage: this.profileImage,
    age: this.age,
    gender: this.gender,
    genderPreference: this.genderPreference,
    fitnessGoal: this.fitnessGoal,
    experienceLevel: this.experienceLevel,
    preferredWorkoutTime: this.preferredWorkoutTime,
    gym: this.gym,
    city: this.city,
    bio: this.bio,
    ageRangePreference: this.ageRangePreference,
    privacy: this.privacy,
    notificationPreferences: this.notificationPreferences,
    role: this.role,
    accountStatus: this.accountStatus,
    createdAt: this.createdAt,
    // NOTE: `location` (exact coordinates), googleId, deviceTokens, and
    // profileImagePublicId are intentionally omitted even from the
    // owner's own view of the API response DTO, because this object is
    // also reused as the base for building public-facing views - keeping
    // it minimal everywhere is safer than trying to redact per-context.
  };
};

// "Public view" - safe to return to ANOTHER user (search results,
// recommendations, buddy profile view). Never includes exact location.
userSchema.methods.toPublicJSON = function toPublicJSON({ distance, compatibilityScore, commonFactors } = {}) {
  const base = {
    id: this._id,
    name: this.name,
    profileImage: this.profileImage,
    bio: this.bio,
  };
  if (this.privacy?.showGym !== false) {
    base.gym = this.gym;
    base.city = this.city;
  }
  base.fitnessGoal = this.fitnessGoal;
  base.experienceLevel = this.experienceLevel;
  base.preferredWorkoutTime = this.preferredWorkoutTime;
  if (distance !== undefined && this.privacy?.showApproxDistance !== false) {
    base.distance = distance;
  }
  if (compatibilityScore !== undefined) base.compatibilityScore = compatibilityScore;
  if (commonFactors !== undefined) base.commonFactors = commonFactors;
  return base;
};

module.exports = mongoose.model('User', userSchema);
