const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const service = require('./workouts.service');

const create = asyncHandler(async (req, res) => {
  const workout = await service.create(req.user.id, req.body);
  return success(res, { status: 201, message: 'Workout created', data: workout });
});

const list = asyncHandler(async (req, res) => {
  const result = await service.list(req.user.id, req.query);
  return success(res, { data: result.workouts, meta: { total: result.total, page: result.page, limit: result.limit } });
});

const getOne = asyncHandler(async (req, res) => {
  const workout = await service.getOwned(req.user.id, req.params.id);
  return success(res, { data: workout });
});

const update = asyncHandler(async (req, res) => {
  const workout = await service.update(req.user.id, req.params.id, req.body);
  return success(res, { message: 'Workout updated', data: workout });
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user.id, req.params.id);
  return success(res, { status: 204, message: 'Workout deleted' });
});

const createLog = asyncHandler(async (req, res) => {
  const log = await service.createLog(req.user.id, req.body);
  return success(res, { status: 201, message: 'Workout logged', data: log });
});

const listLogs = asyncHandler(async (req, res) => {
  const result = await service.listLogs(req.user.id, req.query);
  return success(res, { data: result.logs, meta: { total: result.total, page: result.page, limit: result.limit } });
});

module.exports = {
  create, list, getOne, update, remove, createLog, listLogs,
};
