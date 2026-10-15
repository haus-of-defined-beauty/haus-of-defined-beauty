const { adminOnly, customerOnly } = require('../src/middleware/auth');

// A stand-in for Express's res: records what the middleware replied with.
const fakeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { res.body = body; return res; };
  return res;
};

const run = (middleware, user) => {
  const res = fakeRes();
  let passed = false;
  middleware({ user }, res, () => { passed = true; });
  return { passed, ...res };
};

describe('adminOnly', () => {
  it('lets an admin through', () => {
    expect(run(adminOnly, { role: 'admin' }).passed).toBe(true);
  });

  it.each([
    [{ role: 'customer' }, 'a customer'],
    [undefined, 'nobody'],
    [{}, 'a user with no role'],
  ])('turns away %p (%s)', user => {
    const { passed, statusCode } = run(adminOnly, user);
    expect(passed).toBe(false);
    expect(statusCode).toBe(403);
  });
});

describe('customerOnly', () => {
  // An artist whose email is also a customer account was handed the booking
  // flow, and their admin id was written into the booking as the customer.
  it('turns an admin away with a reason they can act on', () => {
    const { passed, statusCode, body } = run(customerOnly, { role: 'admin' });
    expect(passed).toBe(false);
    expect(statusCode).toBe(403);
    expect(body.code).toBe('ADMIN_CANNOT_BOOK');
    expect(body.message).toMatch(/customer account/i);
  });

  it('lets a customer through', () => {
    expect(run(customerOnly, { role: 'customer' }).passed).toBe(true);
  });
});
