const Workout = require('../../models/Workout');
const WorkoutLog = require('../../models/WorkoutLog');
const ApiError = require('../../utils/apiError');

async function create(userId, data) {
  return Workout.create({ ...data, owner: userId });
}

async function list(userId, { page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const [workouts, total] = await Promise.all([
    Workout.find({ owner: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Workout.countDocuments({ owner: userId }),
  ]);
  return { workouts, total, page, limit };
}

async function getOwned(userId, workoutId) {
  const workout = await Workout.findById(workoutId);
  if (!workout) throw ApiError.notFound('Workout not found');
  // Ownership check - a user may only view/modify their own workouts.
  if (workout.owner.toString() !== userId) throw ApiError.forbidden('You do not own this workout');
  return workout;
}

async function update(userId, workoutId, updates) {
  const workout = await getOwned(userId, workoutId);
  Object.assign(workout, updates);
  await workout.save();
  return workout;
}

async function remove(userId, workoutId) {
  await getOwned(userId, workoutId);
  await Workout.deleteOne({ _id: workoutId });
  await WorkoutLog.deleteMany({ workout: workoutId });
}

async function createLog(userId, data) {
  await getOwned(userId, data.workout); // ensures the workout being logged belongs to the user
  return WorkoutLog.create({ ...data, owner: userId });
}

async function listLogs(userId, { page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    WorkoutLog.find({ owner: userId }).populate('workout', 'title category').sort({ completedAt: -1 }).skip(skip).limit(limit),
    WorkoutLog.countDocuments({ owner: userId }),
  ]);
  return { logs, total, page, limit };
}

module.exports = {
  create, list, getOwned, update, remove, createLog, listLogs,
};
