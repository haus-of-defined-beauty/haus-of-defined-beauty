const { checkPhone, phoneProblem } = require('../src/utils/validatePhone');

describe('checkPhone accepts South African numbers however they are written', () => {
  test.each([
    ['0814002859', '+27 81 400 2859'],
    ['081 400 2859', '+27 81 400 2859'],
    ['081-400-2859', '+27 81 400 2859'],
    ['(081) 400 2859', '+27 81 400 2859'],
    ['  081 400 2859  ', '+27 81 400 2859'],
    ['+27814002859', '+27 81 400 2859'],
    ['+27 81 400 2859', '+27 81 400 2859'],
    ['27814002859', '+27 81 400 2859'],
    ['0027814002859', '+27 81 400 2859'],
    ['011 234 5678', '+27 11 234 5678'], // Johannesburg landline
    ['0727654321', '+27 72 765 4321'],
  ])('%j -> %j', (input, expected) => {
    expect(checkPhone(input)).toEqual({ ok: true, phone: expected });
  });
});

describe('checkPhone accepts an explicit international number', () => {
  test.each([
    ['+44 20 7946 0958', '+442079460958'],
    ['+1 (415) 555-0132', '+14155550132'],
    ['+2641234567', '+2641234567'],
  ])('%j -> %j', (input, expected) => {
    expect(checkPhone(input)).toEqual({ ok: true, phone: expected });
  });
});

describe('checkPhone rejects blank and malformed numbers', () => {
  test.each([
    [undefined, 'Please enter'],
    [null, 'Please enter'],
    ['', 'Please enter'],
    ['   ', 'Please enter'],
    ['-- ()', 'Please enter'],
    ['081 400 285', 'incomplete'],      // one digit short
    ['081 400 28591', 'incomplete'],    // one digit long
    ['0', 'incomplete'],
    ['2781400285', 'incomplete'],       // 27… but the wrong length
    ['12345', 'valid phone number'],    // no country code, not local
    ['8140028', 'valid phone number'],
    ['+123', 'valid phone number'],     // too short even for international
    ['+1234567890123456', 'valid phone number'], // too long
    ['081 CALL ME', 'can only contain'],
    ['not a number', 'can only contain'],
    ['<script>1</script>', 'can only contain'],
    ['081+400+2859', 'can only contain'], // + is only valid as a prefix
  ])('%j is rejected (%s)', (input, fragment) => {
    const result = checkPhone(input);
    expect(result.ok).toBe(false);
    expect(result.message).toContain(fragment);
  });
});

describe('phoneProblem', () => {
  test('is null for a good number', () => {
    expect(phoneProblem('081 400 2859')).toBeNull();
  });

  test('is the message for a bad one', () => {
    expect(phoneProblem('nope')).toContain('can only contain');
  });
});
