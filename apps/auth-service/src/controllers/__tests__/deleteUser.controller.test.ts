// Tests for deleteUser controller to reach full coverage for createUserForStudent.ts file

// Mock database service with prisma methods used in controller
jest.mock('../../services/database', () => {
  const prisma = {
    user: {
      delete: jest.fn(),
    },
  };
  return {
    __esModule: true,
    default: { prisma },
  };
});

// Silence console.error across tests in this file
let consoleErrorSpy: jest.SpyInstance;
beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('auth-service: deleteUser controller', () => {
  const loadController = () => {
    let ctrl: any;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ctrl = require('../createUserForStudent').deleteUser;
    });
    return ctrl as (req: any, res: any) => Promise<void>;
  };

  const makeRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it('rejects non-internal requests (403)', async () => {
    const req: any = { headers: {}, params: { userId: 'user-1' } };
    const res = makeRes();

    const deleteUser = loadController();
    await deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 400 when userId is missing', async () => {
    const req: any = { headers: { 'x-internal-request': 'true' }, params: {} };
    const res = makeRes();

    const deleteUser = loadController();
    await deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('deletes user and returns 200 on success', async () => {
    const req: any = { headers: { 'x-internal-request': 'true' }, params: { userId: 'user-1' } };
    const res = makeRes();

    const db = require('../../services/database').default;
    db.prisma.user.delete.mockResolvedValueOnce(undefined);

    const deleteUser = loadController();
    await deleteUser(req, res);

    expect(db.prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('maps P2025 (record not found) to 404', async () => {
    const req: any = { headers: { 'x-internal-request': 'true' }, params: { userId: 'missing' } };
    const res = makeRes();

    const db = require('../../services/database').default;
    const err: any = new Error('not found');
    err.code = 'P2025';
    db.prisma.user.delete.mockRejectedValueOnce(err);

    const deleteUser = loadController();
    await deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 500 on unexpected errors', async () => {
    const req: any = { headers: { 'x-internal-request': 'true' }, params: { userId: 'user-1' } };
    const res = makeRes();

    const db = require('../../services/database').default;
    db.prisma.user.delete.mockRejectedValueOnce(new Error('db down'));

    const deleteUser = loadController();
    await deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
