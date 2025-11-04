// Additional error-path tests for acceptStudentApplication controller

const sendEmailMock = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/studentCredentialsEmail', () => ({
  sendStudentCredentialsEmail: sendEmailMock,
}));

const createUserForStudentMock = jest.fn();
jest.mock('../../services/authService', () => ({
  authService: {
    createUserForStudent: createUserForStudentMock,
  },
}));

// Prisma mock
const prismaMock: any = {
  student: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../../services/database', () => ({
  __esModule: true,
  default: { prisma: prismaMock },
}));

// Common utils mocks
const getSchoolContextMock = jest.fn();
const getUserMock = jest.fn(() => ({ id: 'admin-1' }));
const hasPermissionMock = jest.fn();

jest.mock('@vidyalayaone/common-utils', () => ({
  getSchoolContext: getSchoolContextMock,
  getUser: getUserMock,
  PERMISSIONS: { ADMISSION: { APPROVE: 'perm-admission-approve' } },
  hasPermission: hasPermissionMock,
}));

// Validation schema mock
const safeParseMock = jest.fn();
jest.mock('../../validations/validationSchemas', () => ({
  acceptStudentApplicationSchema: { safeParse: safeParseMock },
}));

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const validParams = { id: 'student-1' };
const validBody = {
  admissionNumber: 'A-100',
  admissionDate: new Date().toISOString(),
  classId: '11111111-1111-1111-1111-111111111111',
  sectionId: '22222222-2222-2222-2222-222222222222',
  rollNumber: '10',
};

const pendingStudent = {
  id: 'student-1',
  schoolId: 'school-1',
  status: 'PENDING',
  firstName: 'Jane',
  lastName: 'Doe',
  contactInfo: { email: 'student@example.com', primaryPhone: '1234567890' },
  guardians: [],
};

describe('profile-service: acceptStudentApplication controller - error paths', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    getSchoolContextMock.mockReturnValue({ context: 'school', schoolId: 'school-1' });
    hasPermissionMock.mockReturnValue(true);
    safeParseMock.mockImplementation((body: any) => ({ success: true, data: body }));
    prismaMock.student.findFirst.mockReset();
    prismaMock.$transaction.mockReset();
    createUserForStudentMock.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns 400 when id param is missing', async () => {
    const req: any = { params: {}, body: { ...validBody } };
    const res = makeRes();

    let acceptStudentApplication: any;
    jest.isolateModules(() => {
      acceptStudentApplication = require('../acceptStudentApplication').acceptStudentApplication;
    });

    await acceptStudentApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when context is not school', async () => {
    getSchoolContextMock.mockReturnValue({ context: 'global', schoolId: 'school-1' });
    const req: any = { params: { ...validParams }, body: { ...validBody } };
    const res = makeRes();

    let acceptStudentApplication: any;
    jest.isolateModules(() => {
      acceptStudentApplication = require('../acceptStudentApplication').acceptStudentApplication;
    });

    await acceptStudentApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when schoolId missing from context', async () => {
    getSchoolContextMock.mockReturnValue({ context: 'school', schoolId: null });
    const req: any = { params: { ...validParams }, body: { ...validBody } };
    const res = makeRes();

    let acceptStudentApplication: any;
    jest.isolateModules(() => {
      acceptStudentApplication = require('../acceptStudentApplication').acceptStudentApplication;
    });

    await acceptStudentApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 403 when user lacks permission', async () => {
    hasPermissionMock.mockReturnValue(false);
    const req: any = { params: { ...validParams }, body: { ...validBody } };
    const res = makeRes();

    let acceptStudentApplication: any;
    jest.isolateModules(() => {
      acceptStudentApplication = require('../acceptStudentApplication').acceptStudentApplication;
    });

    await acceptStudentApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 400 when body validation fails', async () => {
    safeParseMock.mockReturnValueOnce({ success: false, error: { issues: [] } });
    const req: any = { params: { ...validParams }, body: { ...validBody } };
    const res = makeRes();

    let acceptStudentApplication: any;
    jest.isolateModules(() => {
      acceptStudentApplication = require('../acceptStudentApplication').acceptStudentApplication;
    });

    await acceptStudentApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when pending student not found', async () => {
    // first findFirst returns null
    prismaMock.student.findFirst.mockResolvedValueOnce(null);

    const req: any = { params: { ...validParams }, body: { ...validBody } };
    const res = makeRes();

    let acceptStudentApplication: any;
    jest.isolateModules(() => {
      acceptStudentApplication = require('../acceptStudentApplication').acceptStudentApplication;
    });

    await acceptStudentApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 when admission number already exists', async () => {
    // first find pending student
    prismaMock.student.findFirst
      .mockResolvedValueOnce({ ...pendingStudent }) // pending student
      .mockResolvedValueOnce({ id: 'other' }); // duplicate admission number

    const req: any = { params: { ...validParams }, body: { ...validBody } };
    const res = makeRes();

    let acceptStudentApplication: any;
    jest.isolateModules(() => {
      acceptStudentApplication = require('../acceptStudentApplication').acceptStudentApplication;
    });

    await acceptStudentApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when email/phone missing for user creation', async () => {
    // pending student without contact info
    prismaMock.student.findFirst
      .mockResolvedValueOnce({ ...pendingStudent, contactInfo: {} }) // pending
      .mockResolvedValueOnce(null); // no duplicate admission number

    const req: any = { params: { ...validParams }, body: { ...validBody } };
    const res = makeRes();

    let acceptStudentApplication: any;
    jest.isolateModules(() => {
      acceptStudentApplication = require('../acceptStudentApplication').acceptStudentApplication;
    });

    await acceptStudentApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(createUserForStudentMock).not.toHaveBeenCalled();
  });

  it('returns 400 when auth service user creation fails', async () => {
    // pending student ok, no duplicate
    prismaMock.student.findFirst
      .mockResolvedValueOnce({ ...pendingStudent })
      .mockResolvedValueOnce(null);
    createUserForStudentMock.mockResolvedValueOnce({ success: false, error: { message: 'auth fail' } });

    const req: any = { params: { ...validParams }, body: { ...validBody } };
    const res = makeRes();

    let acceptStudentApplication: any;
    jest.isolateModules(() => {
      acceptStudentApplication = require('../acceptStudentApplication').acceptStudentApplication;
    });

    await acceptStudentApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 when transaction fails after user creation', async () => {
    prismaMock.student.findFirst
      .mockResolvedValueOnce({ ...pendingStudent }) // pending
      .mockResolvedValueOnce(null); // no duplicate
    createUserForStudentMock.mockResolvedValueOnce({ success: true, data: { user: { id: 'user-1' } } });
    prismaMock.$transaction.mockRejectedValueOnce(new Error('tx fail'));

    const req: any = { params: { ...validParams }, body: { ...validBody } };
    const res = makeRes();

    let acceptStudentApplication: any;
    jest.isolateModules(() => {
      acceptStudentApplication = require('../acceptStudentApplication').acceptStudentApplication;
    });

    await acceptStudentApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
