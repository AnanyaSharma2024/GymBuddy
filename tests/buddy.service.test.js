const User = require('../src/models/User');
const buddyService = require('../src/modules/buddy/buddy.service');
const ApiError = require('../src/utils/apiError');

async function makeUser(overrides = {}) {
  return User.create({
    name: 'Test User',
    email: `${Math.random().toString(36).slice(2)}@test.com`,
    googleId: Math.random().toString(36).slice(2),
    city: 'Meerut',
    fitnessGoal: 'muscle_gain',
    experienceLevel: 'intermediate',
    preferredWorkoutTime: 'evening',
    ...overrides,
  });
}

describe('buddy request authorization', () => {
  test('a user cannot send a request to themselves', async () => {
    const user = await makeUser();
    await expect(buddyService.sendRequest(user._id.toString(), user._id.toString()))
      .rejects.toMatchObject({ status: 400 });
  });

  test('sending a duplicate pending request is rejected', async () => {
    const a = await makeUser();
    const b = await makeUser();
    await buddyService.sendRequest(a._id.toString(), b._id.toString());
    await expect(buddyService.sendRequest(a._id.toString(), b._id.toString()))
      .rejects.toMatchObject({ status: 409 });
  });

  test('a blocked recipient cannot receive a request', async () => {
    const a = await makeUser();
    const b = await makeUser();
    b.blockedUsers.push(a._id);
    await b.save();
    await expect(buddyService.sendRequest(a._id.toString(), b._id.toString()))
      .rejects.toMatchObject({ status: 403 });
  });

  test('only the recipient can accept a request (IDOR protection)', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const outsider = await makeUser();
    const request = await buddyService.sendRequest(a._id.toString(), b._id.toString());

    await expect(buddyService.respondToRequest(request._id.toString(), outsider._id.toString(), 'accepted'))
      .rejects.toMatchObject({ status: 403 });
    await expect(buddyService.respondToRequest(request._id.toString(), a._id.toString(), 'accepted'))
      .rejects.toMatchObject({ status: 403 }); // sender is not the recipient either

    const accepted = await buddyService.respondToRequest(request._id.toString(), b._id.toString(), 'accepted');
    expect(accepted.status).toBe('accepted');
  });

  test('only the original sender can cancel a request', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const request = await buddyService.sendRequest(a._id.toString(), b._id.toString());

    await expect(buddyService.cancelRequest(request._id.toString(), b._id.toString()))
      .rejects.toMatchObject({ status: 403 });

    const cancelled = await buddyService.cancelRequest(request._id.toString(), a._id.toString());
    expect(cancelled.status).toBe('cancelled');
  });
});

describe('buddy recommendations respect blocking', () => {
  test('blocked users never appear in recommendations either direction', async () => {
    const me = await makeUser({ city: 'Meerut' });
    const blockedByMe = await makeUser({ city: 'Meerut' });
    const whoBlockedMe = await makeUser({ city: 'Meerut' });
    const normal = await makeUser({ city: 'Meerut' });

    me.blockedUsers.push(blockedByMe._id);
    await me.save();
    whoBlockedMe.blockedUsers.push(me._id);
    await whoBlockedMe.save();

    const results = await buddyService.getRecommendations(me._id.toString());
    const ids = results.map((r) => r.id.toString());

    expect(ids).not.toContain(blockedByMe._id.toString());
    expect(ids).not.toContain(whoBlockedMe._id.toString());
    expect(ids).toContain(normal._id.toString());
  });
});
