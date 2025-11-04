// Tests for logout controller

// Prisma mock
const prismaMock: any = {
  refreshToken: {
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('../../services/database', () => ({
  __esModule: true,
  default: { prisma: prismaMock },
}));

// Mock common-utils validateInput
const validateInputMock = jest.fn();
jest.mock('@vidyalayaone/common-utils', () => ({
  validateInput: (...args: any[]) => validateInputMock(...args),
}));

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('auth-service: logout controller', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    validateInputMock.mockImplementation((_schema: any, body: any) => ({ success: true, data: body }));
    prismaMock.refreshToken.findUnique.mockReset();
    prismaMock.refreshToken.delete.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns early when validation fails', async () => {
    validateInputMock.mockReturnValueOnce({ success: false });
    const req: any = { body: { refreshToken: 't1' } };
    const res = makeRes();

    let logout: any;
    jest.isolateModules(() => {
      logout = require('../logout').logout;
    });

    await logout(req, res);
    expect(prismaMock.refreshToken.findUnique).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('when token exists it revokes and returns 200', async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValueOnce({ token: 't1' });
    prismaMock.refreshToken.delete.mockResolvedValueOnce({});

    const req: any = { body: { refreshToken: 't1' } };
    const res = makeRes();

    let logout: any;
    jest.isolateModules(() => {
      logout = require('../logout').logout;
    });

    await logout(req, res);
    expect(prismaMock.refreshToken.delete).toHaveBeenCalledWith({ where: { token: 't1' } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('when token not found returns 404', async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValueOnce(null);

    const req: any = { body: { refreshToken: 't-missing' } };
    const res = makeRes();

    let logout: any;
    jest.isolateModules(() => {
      logout = require('../logout').logout;
    });

    await logout(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('on unexpected error returns 200 (masked success)', async () => {
    prismaMock.refreshToken.findUnique.mockRejectedValueOnce(new Error('db fail'));

    const req: any = { body: { refreshToken: 't1' } };
    const res = makeRes();

    let logout: any;
    jest.isolateModules(() => {
      logout = require('../logout').logout;
    });

    await logout(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
