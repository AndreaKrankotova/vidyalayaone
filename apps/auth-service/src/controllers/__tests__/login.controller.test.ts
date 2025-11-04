// Tests for login controller

const bcryptCompareMock = jest.fn();
jest.mock('bcrypt', () => ({
  __esModule: true,
  default: { compare: (...args: any[]) => bcryptCompareMock(...args) },
}));

const generateAccessTokenMock = jest.fn();
const generateRefreshTokenMock = jest.fn();
jest.mock('../../utils/jwt', () => ({
  generateAccessToken: (...args: any[]) => generateAccessTokenMock(...args),
  generateRefreshToken: (...args: any[]) => generateRefreshTokenMock(...args),
}));

const fetchUserMock = jest.fn();
jest.mock('../../utils/fetchUserBasedOnContext', () => ({
  fetchUserByUsernameAndContext: (...args: any[]) => fetchUserMock(...args),
}));

// Mock config for refresh token expiration
jest.mock('../../config/config', () => ({
  __esModule: true,
  default: { jwt: { refreshExpiresIn: '7d' } },
}));

// Mock generated client DeviceType enum used by controller
jest.mock('../../generated/client', () => ({
  DeviceType: { mobile: 'mobile', tablet: 'tablet', desktop: 'desktop' },
}));

// Mock DatabaseService.prisma
const prismaMock: any = {
  role: { findUnique: jest.fn() },
  refreshToken: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
};
jest.mock('../../services/database', () => ({
  __esModule: true,
  default: { prisma: prismaMock },
}));

// Mock common-utils
const getSchoolContextMock = jest.fn();
const validateInputMock = jest.fn();
const hasPermissionMock = jest.fn();
jest.mock('@vidyalayaone/common-utils', () => ({
  getSchoolContext: (...args: any[]) => getSchoolContextMock(...args),
  validateInput: (...args: any[]) => validateInputMock(...args),
  PERMISSIONS: { PLATFORM: { LOGIN: 'perm-platform-login' } },
  hasPermission: (...args: any[]) => hasPermissionMock(...args),
}));

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const baseBody = { username: 'jdoe', password: 'secret' };

describe('auth-service: login controller', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // defaults
    validateInputMock.mockImplementation((_schema: any, body: any) => ({ success: true, data: body }));
    getSchoolContextMock.mockReturnValue({ context: 'school', schoolId: 'school-1' });
    hasPermissionMock.mockResolvedValue(true);
    prismaMock.role.findUnique.mockReset();
    prismaMock.refreshToken.create.mockReset();
    prismaMock.refreshToken.deleteMany.mockReset();
    bcryptCompareMock.mockReset();
    fetchUserMock.mockReset();
    generateAccessTokenMock.mockReset();
    generateRefreshTokenMock.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns early when validation fails', async () => {
    validateInputMock.mockReturnValueOnce({ success: false });
    const req: any = { body: { ...baseBody }, headers: {}, connection: { remoteAddress: '127.0.0.1' }, socket: {} };
    const res = makeRes();

    let login: any;
    jest.isolateModules(() => {
      login = require('../login').login;
    });

    await login(req, res);
    expect(prismaMock.role.findUnique).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 500 when role not found', async () => {
    fetchUserMock.mockResolvedValue({ id: 'u1', roleId: 'r1', username: 'jdoe', passwordHash: 'hash' });
    prismaMock.role.findUnique.mockResolvedValueOnce(null);

    const req: any = { body: { ...baseBody }, headers: {}, connection: { remoteAddress: '127.0.0.1' }, socket: {} };
    const res = makeRes();

    let login: any;
    jest.isolateModules(() => {
      login = require('../login').login;
    });

    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('returns 403 when platform login permission denied', async () => {
    getSchoolContextMock.mockReturnValue({ context: 'platform', schoolId: null });
    fetchUserMock.mockResolvedValue({ id: 'u1', roleId: 'r1', username: 'jdoe', passwordHash: 'hash' });
    prismaMock.role.findUnique.mockResolvedValueOnce({ id: 'r1', name: 'ADMIN', permissions: ['x'] });
    hasPermissionMock.mockResolvedValueOnce(false);

    const req: any = { body: { ...baseBody }, headers: {}, connection: { remoteAddress: '127.0.0.1' }, socket: {} };
    const res = makeRes();

    let login: any;
    jest.isolateModules(() => {
      login = require('../login').login;
    });

    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 401 on invalid password', async () => {
    fetchUserMock.mockResolvedValue({ id: 'u1', roleId: 'r1', username: 'jdoe', passwordHash: 'hash' });
    prismaMock.role.findUnique.mockResolvedValueOnce({ id: 'r1', name: 'ADMIN', permissions: [] });
    bcryptCompareMock.mockResolvedValueOnce(false);

    const req: any = { body: { ...baseBody }, headers: {}, connection: { remoteAddress: '127.0.0.1' }, socket: {} };
    const res = makeRes();

    let login: any;
    jest.isolateModules(() => {
      login = require('../login').login;
    });

    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 200 and tokens on success, records refresh token', async () => {
    fetchUserMock.mockResolvedValue({ id: 'u1', roleId: 'r1', username: 'jdoe', passwordHash: 'hash' });
    prismaMock.role.findUnique.mockResolvedValueOnce({ id: 'r1', name: 'ADMIN', permissions: [] });
    bcryptCompareMock.mockResolvedValueOnce(true);
    generateAccessTokenMock.mockReturnValue('access');
    generateRefreshTokenMock.mockReturnValue('refresh');
    prismaMock.refreshToken.create.mockResolvedValueOnce({ id: 'rt1' });
    prismaMock.refreshToken.deleteMany.mockResolvedValueOnce({ count: 1 });

    const req: any = { body: { ...baseBody }, headers: { 'user-agent': 'Mozilla/5.0 (iPhone; Mobile)' }, connection: { remoteAddress: '127.0.0.1' }, socket: {} };
    const res = makeRes();

    let login: any;
    jest.isolateModules(() => {
      login = require('../login').login;
    });

    await login(req, res);
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'u1',
        token: 'refresh',
        deviceType: 'mobile',
        ipAddress: expect.any(String),
        userAgent: expect.any(String),
      }),
    }));
    expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.objectContaining({ accessToken: 'access', refreshToken: 'refresh' }) }));
  });

  it('returns 500 on unexpected error', async () => {
    fetchUserMock.mockResolvedValue({ id: 'u1', roleId: 'r1', username: 'jdoe', passwordHash: 'hash' });
    prismaMock.role.findUnique.mockResolvedValueOnce({ id: 'r1', name: 'ADMIN', permissions: [] });
    bcryptCompareMock.mockResolvedValueOnce(true);
    generateAccessTokenMock.mockReturnValue('access');
    generateRefreshTokenMock.mockReturnValue('refresh');
    prismaMock.refreshToken.create.mockRejectedValueOnce(new Error('db fail'));

    const req: any = { body: { ...baseBody }, headers: {}, connection: { remoteAddress: '127.0.0.1' }, socket: {} };
    const res = makeRes();

    let login: any;
    jest.isolateModules(() => {
      login = require('../login').login;
    });

    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
