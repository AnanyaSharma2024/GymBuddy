const User = require('../src/models/User');
const workoutsService = require('../src/modules/workouts/workouts.service');

async function makeUser() {
  return User.create({
    name: 'Owner',
    email: `${Math.random().toString(36).slice(2)}@test.com`,
    googleId: Math.random().toString(36).slice(2),
  });
}

describe('workout ownership authorization', () => {
  test('a user cannot view, edit, or delete another user\'s workout', async () => {
    const owner = await makeUser();
    const intruder = await makeUser();

    const workout = await workoutsService.create(owner._id.toString(), { title: 'Push Day' });

    await expect(workoutsService.getOwned(intruder._id.toString(), workout._id.toString()))
      .rejects.toMatchObject({ status: 403 });

    await expect(workoutsService.update(intruder._id.toString(), workout._id.toString(), { title: 'Hacked' }))
      .rejects.toMatchObject({ status: 403 });

    await expect(workoutsService.remove(intruder._id.toString(), workout._id.toString()))
      .rejects.toMatchObject({ status: 403 });

    // owner can access their own workout fine
    const fetched = await workoutsService.getOwned(owner._id.toString(), workout._id.toString());
    expect(fetched.title).toBe('Push Day');
  });
});
