const dns = require('dns');
const { normalizeEmail, syntaxProblem, domainCanReceiveMail, checkEmail } = require('../src/utils/validateEmail');

describe('syntaxProblem', () => {
  test.each([
    'name@example.com',
    'first.last@example.co.za',
    'name+tag@gmail.com',
    'o\'brien@example.com',
    '123@sub.domain.example.org',
    'a@b.co',
    'user_name-1@my-domain.com',
    'x@xn--p1ai.xn--p1ai',
  ])('accepts %s', email => {
    expect(syntaxProblem(email)).toBeNull();
  });

  test.each([
    ['', 'Please enter'],
    ['plainaddress', '@ sign'],
    ['two@@example.com', '@ sign'],
    ['a@b@example.com', '@ sign'],
    ['@example.com', '@ sign'],
    ['name@', 'full domain'],
    ['name@example', 'full domain'],
    ['name@.com', 'valid domain'],
    ['name@example..com', 'valid domain'],
    ['name@-example.com', 'valid domain'],
    ['name@example.c', '.com'],
    ['name@example.123', '.com'],
    ['name @example.com', 'not allowed'],
    ['.name@example.com', 'not allowed'],
    ['name.@example.com', 'not allowed'],
    ['na..me@example.com', 'not allowed'],
    ['nam,e@example.com', 'not allowed'],
    ['nàme@example.com', 'not allowed'],
    [`${'a'.repeat(65)}@example.com`, 'too long'],
    [`a@${'b'.repeat(250)}.com`, 'too long'],
  ])('rejects %j', (email, hint) => {
    expect(syntaxProblem(email)).toEqual(expect.stringContaining(hint));
  });
});

describe('normalizeEmail', () => {
  test('trims and lowercases', () => {
    expect(normalizeEmail('  Gabethabo23@GMAIL.com \n')).toBe('gabethabo23@gmail.com');
  });
  test('handles missing values', () => {
    expect(normalizeEmail(undefined)).toBe('');
    expect(normalizeEmail(null)).toBe('');
  });
});

describe('domainCanReceiveMail', () => {
  afterEach(() => jest.restoreAllMocks());
  const err = code => Object.assign(new Error(code), { code });

  test('true when the domain has an MX record', async () => {
    jest.spyOn(dns.promises, 'resolveMx').mockResolvedValue([{ exchange: 'mx.example.com', priority: 10 }]);
    expect(await domainCanReceiveMail('example.com')).toBe(true);
  });

  test('false when the domain does not exist at all', async () => {
    jest.spyOn(dns.promises, 'resolveMx').mockRejectedValue(err('ENOTFOUND'));
    jest.spyOn(dns.promises, 'resolve4').mockRejectedValue(err('ENOTFOUND'));
    jest.spyOn(dns.promises, 'resolve6').mockRejectedValue(err('ENOTFOUND'));
    expect(await domainCanReceiveMail('no-such-domain.example')).toBe(false);
  });

  test('falls back to the address record when there is no MX', async () => {
    jest.spyOn(dns.promises, 'resolveMx').mockRejectedValue(err('ENODATA'));
    jest.spyOn(dns.promises, 'resolve4').mockResolvedValue(['203.0.113.7']);
    expect(await domainCanReceiveMail('a-only.example')).toBe(true);
  });

  test('a "null MX" (RFC 7505) means the domain accepts no mail', async () => {
    jest.spyOn(dns.promises, 'resolveMx').mockResolvedValue([{ exchange: '', priority: 0 }]);
    jest.spyOn(dns.promises, 'resolve4').mockRejectedValue(err('ENODATA'));
    jest.spyOn(dns.promises, 'resolve6').mockRejectedValue(err('ENODATA'));
    expect(await domainCanReceiveMail('nomail.example')).toBe(false);
  });

  test('fails OPEN on a flaky resolver so real customers are never blocked', async () => {
    jest.spyOn(dns.promises, 'resolveMx').mockRejectedValue(err('ECONNREFUSED'));
    expect(await domainCanReceiveMail('example.com')).toBe(true);
  });

  test('fails open when DNS hangs past the timeout', async () => {
    jest.useFakeTimers();
    jest.spyOn(dns.promises, 'resolveMx').mockReturnValue(new Promise(() => {}));
    const pending = domainCanReceiveMail('example.com');
    await jest.advanceTimersByTimeAsync(3500);
    expect(await pending).toBe(true);
    jest.useRealTimers();
  });
});

describe('checkEmail', () => {
  afterEach(() => jest.restoreAllMocks());

  test('returns the normalised address when valid', async () => {
    jest.spyOn(dns.promises, 'resolveMx').mockResolvedValue([{ exchange: 'mx.example.com', priority: 1 }]);
    expect(await checkEmail('  Name@Example.COM ')).toEqual({ ok: true, email: 'name@example.com' });
  });

  test('explains a syntax problem without touching DNS', async () => {
    const spy = jest.spyOn(dns.promises, 'resolveMx');
    const r = await checkEmail('not-an-email');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/@ sign/);
    expect(spy).not.toHaveBeenCalled();
  });

  test('names the domain when it cannot receive mail', async () => {
    const notFound = Object.assign(new Error('x'), { code: 'ENOTFOUND' });
    jest.spyOn(dns.promises, 'resolveMx').mockRejectedValue(notFound);
    jest.spyOn(dns.promises, 'resolve4').mockRejectedValue(notFound);
    jest.spyOn(dns.promises, 'resolve6').mockRejectedValue(notFound);
    const r = await checkEmail('me@gmial-typo.example');
    expect(r.ok).toBe(false);
    expect(r.message).toContain('gmial-typo.example');
  });

  test('checkDomain:false skips DNS entirely', async () => {
    const spy = jest.spyOn(dns.promises, 'resolveMx');
    expect((await checkEmail('me@example.com', { checkDomain: false })).ok).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });
});
