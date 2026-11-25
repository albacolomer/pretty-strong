import { base64UrlToBytes } from './base64Url';

describe('base64UrlToBytes', () => {
  it('reads plain base64 letters', () => {
    expect([...base64UrlToBytes('AQID')]).toEqual([1, 2, 3]);
  });

  it('reads the url-safe letters - and _', () => {
    // "+/8=" in ordinary base64.
    expect([...base64UrlToBytes('-_8')]).toEqual([0xfb, 0xff]);
  });

  it('needs no padding', () => {
    expect([...base64UrlToBytes('AQ')]).toEqual([1]);
    expect([...base64UrlToBytes('AQI')]).toEqual([1, 2]);
  });

  it('reads a 65-byte VAPID public key, which starts with 4', () => {
    const key = btoa(String.fromCharCode(4, ...new Array<number>(64).fill(7)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const bytes = base64UrlToBytes(key);
    expect(bytes).toHaveLength(65);
    expect(bytes[0]).toBe(4);
  });
});
