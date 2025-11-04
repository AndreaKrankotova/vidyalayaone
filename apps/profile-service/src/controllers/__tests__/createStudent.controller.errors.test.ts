// Additional error-path tests for createStudent controller

// Shared mutable mocks so we can tweak behavior per test before requiring SUT
const sendEmailMock = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/studentCredentialsEmail', () => ({
  sendStudentCredentialsEmail: sendEmailMock,
}));

const createUserForStudentMock = jest.fn();
const deleteUserMock = jest.fn();
jest.mock('../../services/authService', () => ({
  authService: {
    createUserForStudent: createUserForStudentMock,
    deleteUser: deleteUserMock,
  },
}));

// Prepare prisma mock
const prismaMock: any = {
  student: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../../services/database', () => ({
  __esModule: true,
  default: { prisma: prismaMock },
}));

// Common-utils mocked with overridable functions
const getSchoolContextMock = jest.fn();
const getUserMock = jest.fn(() => ({ id: 'admin-1' }));
const hasPermissionMock = jest.fn();
const validateInputMock = jest.fn();

jest.mock('@vidyalayaone/common-utils', () => ({
  getSchoolContext: getSchoolContextMock,
  getUser: getUserMock,
  PERMISSIONS: { STUDENT: { CREATE: 'perm-student-create' } },
  hasPermission: hasPermissionMock,
  validateInput: validateInputMock,
}));

// Helpers
const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const baseBody = {
  firstName: 'John',
  lastName: 'Doe',
  admissionNumber: 'A-001',
  admissionDate: new Date().toISOString(),
  gender: 'MALE',
  address: { street: 'Main', city: 'X', state: 'Y', pincode: '12345', country: 'Z' },
  contactInfo: { primaryPhone: '1234567890', email: 'student@example.com' },
  parentInfo: { fatherName: 'Dad Doe' },
  documents: [],
  classId: '11111111-1111-1111-1111-111111111111',
  sectionId: '22222222-2222-2222-2222-222222222222',
  academicYear: '2025-26',
  rollNumber: '5',
};

describe('profile-service: createStudent controller - error paths', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Defaults good path for common guards
    getSchoolContextMock.mockReturnValue({ context: 'school', schoolId: 'school-1' });
    hasPermissionMock.mockReturnValue(true);
    validateInputMock.mockImplementation((_schema: any, body: any) => ({ success: true, data: body }));
    prismaMock.student.findUnique.mockReset();
    prismaMock.$transaction.mockReset();
    createUserForStudentMock.mockReset();
    deleteUserMock.mockReset();
    sendEmailMock.mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns 400 when context is not school', async () => {
    getSchoolContextMock.mockReturnValue({ context: 'global', schoolId: 'school-1' });

    const req: any = { body: { ...baseBody } };
    const res = makeRes();

    let createStudent: any;
    jest.isolateModules(() => {
      createStudent = require('../createStudent').createStudent;
    });

    await createStudent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(prismaMock.student.findUnique).not.toHaveBeenCalled();
  });

  it('returns 400 when schoolId missing', async () => {
    getSchoolContextMock.mockReturnValue({ context: 'school', schoolId: null });

    const req: any = { body: { ...baseBody } };
    const res = makeRes();

    let createStudent: any;
    jest.isolateModules(() => {
      createStudent = require('../createStudent').createStudent;
    });

    await createStudent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 403 when user lacks permission', async () => {
    hasPermissionMock.mockReturnValue(false);

    const req: any = { body: { ...baseBody } };
    const res = makeRes();

    let createStudent: any;
    jest.isolateModules(() => {
      createStudent = require('../createStudent').createStudent;
    });

    await createStudent(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 400 when admission number already exists', async () => {
    prismaMock.student.findUnique.mockResolvedValueOnce({ id: 'existing' });

    const req: any = { body: { ...baseBody } };
    const res = makeRes();

    let createStudent: any;
    jest.isolateModules(() => {
      createStudent = require('../createStudent').createStudent;
    });

    await createStudent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(createUserForStudentMock).not.toHaveBeenCalled();
  });

  it('returns 400 when no guardians (parentInfo missing/empty)', async () => {
    prismaMock.student.findUnique.mockResolvedValueOnce(null);
    const req: any = { body: { ...baseBody, parentInfo: {} } };
    const res = makeRes();

    let createStudent: any;
    jest.isolateModules(() => {
      createStudent = require('../createStudent').createStudent;
    });

    await createStudent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(createUserForStudentMock).not.toHaveBeenCalled();
  });

  it('returns 400 when auth service user creation fails', async () => {
    prismaMock.student.findUnique.mockResolvedValueOnce(null);
    createUserForStudentMock.mockResolvedValueOnce({ success: false, error: { message: 'auth fail' } });

    const req: any = { body: { ...baseBody } };
    const res = makeRes();

    let createStudent: any;
    jest.isolateModules(() => {
      createStudent = require('../createStudent').createStudent;
    });

    await createStudent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('on transaction P2002 returns 400 and rolls back auth user', async () => {
    prismaMock.student.findUnique.mockResolvedValueOnce(null); // no duplicate initially
    createUserForStudentMock.mockResolvedValueOnce({ success: true, data: { user: { id: 'user-1' } } });

    const p2002: any = new Error('Unique');
    p2002.code = 'P2002';
    prismaMock.$transaction.mockRejectedValueOnce(p2002);

    const req: any = { body: { ...baseBody } };
    const res = makeRes();

    let createStudent: any;
    jest.isolateModules(() => {
      createStudent = require('../createStudent').createStudent;
    });

    await createStudent(req, res);
    expect(deleteUserMock).toHaveBeenCalledWith('user-1');
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('on transaction generic error returns 500 and rolls back auth user', async () => {
    prismaMock.student.findUnique.mockResolvedValueOnce(null);
    createUserForStudentMock.mockResolvedValueOnce({ success: true, data: { user: { id: 'user-1' } } });
    prismaMock.$transaction.mockRejectedValueOnce(new Error('db fail'));

    const req: any = { body: { ...baseBody } };
    const res = makeRes();

    let createStudent: any;
    jest.isolateModules(() => {
      createStudent = require('../createStudent').createStudent;
    });

    await createStudent(req, res);
    expect(deleteUserMock).toHaveBeenCalledWith('user-1');
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns early when validation fails (no DB or auth calls)', async () => {
    validateInputMock.mockReturnValueOnce({ success: false });

    const req: any = { body: { ...baseBody } };
    const res = makeRes();

    let createStudent: any;
    jest.isolateModules(() => {
      createStudent = require('../createStudent').createStudent;
    });

    await createStudent(req, res);
    expect(prismaMock.student.findUnique).not.toHaveBeenCalled();
    expect(createUserForStudentMock).not.toHaveBeenCalled();
  });
});
