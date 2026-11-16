const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const gymsService = require('./gyms.service');

const list = asyncHandler(async (req, res) => {
  const result = await gymsService.listGyms(req.query);

  return success(res, {
    data: result.gyms,
    meta: {
      total: result.total,
      page: result.page,
      limit: result.limit,
    },
  });
});

const nearby = asyncHandler(async (req, res) => {
  const { lng, lat, radius } = req.query;

  const gyms = await gymsService.findNearby({
    lng,
    lat,
    radiusKm: radius,
  });

  return success(res, { data: gyms });
});

const getOne = asyncHandler(async (req, res) => {
  const gym = await gymsService.getById(req.params.id);

  return success(res, { data: gym });
});

const create = asyncHandler(async (req, res) => {
  const gym = await gymsService.createGym(
    {
      name: req.body.name,
      address: req.body.address,
      city: req.body.city,
      location: {
        type: 'Point',
        coordinates: [
          req.body.location.lng,
          req.body.location.lat,
        ],
      },
      metadata: req.body.metadata,
    },
    req.user.id,
  );

  return success(res, {
    status: 201,
    message: 'Gym submitted for verification',
    data: gym,
  });
});

const listPending = asyncHandler(async (req, res) => {
  const gyms = await gymsService.listPendingGyms();

  return success(res, {
    data: gyms,
    meta: { total: gyms.length },
  });
});

const approve = asyncHandler(async (req, res) => {
  const gym = await gymsService.approveGym(req.params.id);

  return success(res, {
    message: 'Gym approved successfully',
    data: gym,
  });
});

const reject = asyncHandler(async (req, res) => {
  const gym = await gymsService.rejectGym(req.params.id);

  return success(res, {
    message: 'Gym rejected successfully',
    data: gym,
  });
});

module.exports = {
  list,
  nearby,
  getOne,
  create,
  listPending,
  approve,
  reject,
};