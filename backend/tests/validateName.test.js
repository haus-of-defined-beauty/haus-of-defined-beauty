const { normalizeName, checkName, isPlaceholderName } = require('../src/utils/validateName');

describe('checkName accepts real names', () => {
  test.each([
    ['Thabo', 'Thabo'],
    ['  Gabriel   Behane ', 'Gabriel Behane'],
    ['Tshenolo Du Toit', 'Tshenolo Du Toit'],
    ["O'Brien", "O'Brien"],
    ['D’Angelo', 'D’Angelo'],
    ['Jean-Luc', 'Jean-Luc'],
    ['Dr. Mbali Nkosi', 'Dr. Mbali Nkosi'],
    ['Zoë', 'Zoë'],
    ['Nomsa Khumalo\nJr', 'Nomsa Khumalo Jr'],
    ['李', '李'],
    ['A', 'A'],
    ['Nkosazana Dlamini-Zuma', 'Nkosazana Dlamini-Zuma'],
  ])('%j -> %j', (input, expected) => {
    expect(checkName(input)).toEqual({ ok: true, name: expected });
  });
});

describe('checkName rejects blank and junk names', () => {
  test.each([
    [undefined, 'Please enter'],
    [null, 'Please enter'],
    ['', 'Please enter'],
    ['   ', 'Please enter'],
    ['\t\n', 'Please enter'],
    ['...', 'letters'],
    ['---', 'letters'],
    ["'", 'letters'],
    ['12345', 'letters'],
    ['   42 ', 'letters'],
    ['Thabo123', 'only contain'],
    ['<script>alert(1)</script>', 'only contain'],
    ['Robert); DROP TABLE', 'only contain'],
    ['-Thabo', 'only contain'],
    ['Th@bo', 'only contain'],
    ['a'.repeat(81), 'too long'],
  ])('%j is refused', (input, hint) => {
    const r = checkName(input);
    expect(r.ok).toBe(false);
    expect(r.message).toEqual(expect.stringContaining(hint));
  });

  test('the message uses the field label', () => {
    expect(checkName('', 'surname').message).toBe('Please enter your surname.');
  });
});

describe('helpers', () => {
  test('normalizeName collapses whitespace', () => {
    expect(normalizeName('  a   b\t c ')).toBe('a b c');
    expect(normalizeName(undefined)).toBe('');
  });
  test('isPlaceholderName spots the auto-filled names', () => {
    expect(isPlaceholderName('Customer User')).toBe(true);
    expect(isPlaceholderName(' admin ')).toBe(true);
    expect(isPlaceholderName('')).toBe(true);
    expect(isPlaceholderName(undefined)).toBe(true);
    expect(isPlaceholderName('Gabriel')).toBe(false);
  });
});
