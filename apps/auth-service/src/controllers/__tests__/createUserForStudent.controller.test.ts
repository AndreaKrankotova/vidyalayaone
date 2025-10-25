// Controller will be required inside tests after mocks are set up

// Mock bcrypt to avoid heavy hashing
jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    hash: jest.fn().mockResolvedValue('hashed-password'),
  },
}));

// Mock validateInput from common-utils to control validation outcomes per test
const validateInputMock = { validateInput: jest.fn() } as any;
jest.mock('@vidyalayaone/common-utils', () => ({
  __esModule: true,
  validateInput: (...args: any[]) => validateInputMock.validateInput(...args),
}));

// Mock database service with prisma methods used in controller
jest.mock('../../services/database', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
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

describe('auth-service: createUserForStudent controller', () => {
  const loadController = () => {
    let ctrl: any;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ctrl = require('../createUserForStudent').createUserForStudent;
    });
    return ctrl as (req: any, res: any) => Promise<void>;
  };
  const makeRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const validBody = {
    username: 'student123',
    email: 'student@example.com',
    phone: '1234567890',
    password: 'P@ssw0rd!',
    firstName: 'John',
    lastName: 'Doe',
    schoolId: '11111111-1111-1111-1111-111111111111',
    roleName: 'STUDENT',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects non-internal requests (403)', async () => {
    // Force validation to succeed so we hit the header guard
    validateInputMock.validateInput.mockReturnValueOnce({ success: true, data: validBody });
    const req: any = { headers: {}, body: validBody };
    const res = makeRes();

    const createUserForStudent = loadController();
    await createUserForStudent(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 400 on invalid body', async () => {
    // Force validation to fail and simulate it writing 400 to response
    validateInputMock.validateInput.mockImplementationOnce((_schema: any, _body: any, res: any) => {
      res.status(400).json({ success: false, error: { message: 'Invalid input' } });
      return { success: false };
    });
    const req: any = { headers: { 'x-internal-request': 'true' }, body: { username: 'a' } };
    const res = makeRes();

    const createUserForStudent = loadController();
    await createUserForStudent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 if username already exists', async () => {
  // Validation ok
  validateInputMock.validateInput.mockReturnValueOnce({ success: true, data: validBody });
  const db = require('../../services/database').default;
  const prismaMocks = db.prisma;
  prismaMocks.user.findUnique.mockResolvedValueOnce({ id: 'existing' });

  const req: any = { headers: { 'x-internal-request': 'true' }, body: validBody };
    const res = makeRes();

  const createUserForStudent = loadController();
  await createUserForStudent(req, res);

    expect(prismaMocks.user.findUnique).toHaveBeenCalledWith({ where: { username: validBody.username } });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 if role doesn't exist for school", async () => {
  validateInputMock.validateInput.mockReturnValueOnce({ success: true, data: validBody });
  const db = require('../../services/database').default;
  const prismaMocks = db.prisma;
  prismaMocks.user.findUnique.mockResolvedValueOnce(null);
  prismaMocks.role.findFirst.mockResolvedValueOnce(null);

    const req: any = { headers: { 'x-internal-request': 'true' }, body: validBody };
    const res = makeRes();

  const createUserForStudent = loadController();
  await createUserForStudent(req, res);

    expect(prismaMocks.role.findFirst).toHaveBeenCalledWith({
      where: { name: validBody.roleName, schoolId: validBody.schoolId },
    });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates user and returns 201; ensures isEmailVerified true', async () => {
  validateInputMock.validateInput.mockReturnValueOnce({ success: true, data: validBody });
  const db = require('../../services/database').default;
  const prismaMocks = db.prisma;
  prismaMocks.user.findUnique.mockResolvedValueOnce(null);
  prismaMocks.role.findFirst.mockResolvedValueOnce({ id: 'role-1' });
  prismaMocks.user.create.mockResolvedValueOnce({
      id: 'user-1',
      username: validBody.username,
      email: validBody.email,
      phone: validBody.phone,
      schoolId: validBody.schoolId,
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    const req: any = { headers: { 'x-internal-request': 'true' }, body: validBody };
    const res = makeRes();

  const createUserForStudent = loadController();
  await createUserForStudent(req, res);

  expect(prismaMocks.user.create).toHaveBeenCalledTimes(1);
  const arg = prismaMocks.user.create.mock.calls[0][0];
    expect(arg.data).toEqual(
      expect.objectContaining({
        username: validBody.username,
        email: validBody.email,
        phone: validBody.phone,
        schoolId: validBody.schoolId,
        roleId: 'role-1',
        isActive: true,
        isEmailVerified: true,
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ user: expect.any(Object) }) })
    );
  });

  it('maps unique constraint error (P2002) to 400', async () => {
  validateInputMock.validateInput.mockReturnValueOnce({ success: true, data: validBody });
  const db = require('../../services/database').default;
  const prismaMocks = db.prisma;
  prismaMocks.user.findUnique.mockResolvedValueOnce(null);
  prismaMocks.role.findFirst.mockResolvedValueOnce({ id: 'role-1' });
    const err: any = new Error('duplicate');
    err.code = 'P2002';
    prismaMocks.user.create.mockRejectedValueOnce(err);

    const req: any = { headers: { 'x-internal-request': 'true' }, body: validBody };
    const res = makeRes();

  const createUserForStudent = loadController();
  await createUserForStudent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 on unexpected errors', async () => {
  validateInputMock.validateInput.mockReturnValueOnce({ success: true, data: validBody });
  const db = require('../../services/database').default;
  const prismaMocks = db.prisma;
  prismaMocks.user.findUnique.mockResolvedValueOnce(null);
  prismaMocks.role.findFirst.mockResolvedValueOnce({ id: 'role-1' });
  prismaMocks.user.create.mockRejectedValueOnce(new Error('db down'));

  const req: any = { headers: { 'x-internal-request': 'true' }, body: validBody };
  const res = makeRes();

  const createUserForStudent = loadController();
  await createUserForStudent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
