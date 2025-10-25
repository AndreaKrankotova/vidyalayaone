// Tests for acceptStudentApplication controller: verifies email sending and non-failing on email error

// Mock email sender with a shared mock fn
const sendEmailMock2 = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/studentCredentialsEmail', () => ({
  sendStudentCredentialsEmail: sendEmailMock2,
}));

// Mock auth service with a shared mock fn
const createUserForStudentMock2 = jest.fn().mockResolvedValue({ success: true, data: { user: { id: 'user-1' } } });
jest.mock('../../services/authService', () => ({
  authService: {
    createUserForStudent: createUserForStudentMock2
  }
}));

// Prepare a mutable prisma mock we can inspect (use unique name to avoid tooling collisions)
const prismaMock2 = {
  student: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Mock database service default export
jest.mock('../../services/database', () => ({
  __esModule: true,
  default: { prisma: prismaMock2 },
}));

// Mock common-utils for context/permissions
jest.mock('@vidyalayaone/common-utils', () => ({
  getSchoolContext: jest.fn(() => ({ context: 'school', schoolId: 'school-1' })),
  getUser: jest.fn(() => ({ id: 'admin-1' })),
  PERMISSIONS: { ADMISSION: { APPROVE: 'perm-admission-approve' } },
  hasPermission: jest.fn(() => true),
}));

// Mock validation schema to ensure body validation passes deterministically
jest.mock('../../validations/validationSchemas', () => ({
  acceptStudentApplicationSchema: {
    safeParse: jest.fn((body: any) => ({ success: true, data: body }))
  }
}));

// Helper to build req/res
const makeRes2 = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const validParams = { id: 'student-1' };
const validBody2 = {
  admissionNumber: 'A-100',
  admissionDate: new Date().toISOString(),
  classId: '11111111-1111-1111-1111-111111111111',
  sectionId: '22222222-2222-2222-2222-222222222222',
  rollNumber: '10'
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

// We'll still resolve instances inside isolateModules if needed, but assertions use shared mocks above
let sendStudentCredentialsEmail: any;
let authService: any;

function setupFindsForHappyPath() {
  // First findFirst: fetch pending student
  prismaMock2.student.findFirst
    .mockResolvedValueOnce(pendingStudent) // pending student by id + status
    .mockResolvedValueOnce(null); // existing admission number check returns null

  // Transaction to update student and create enrollment
  prismaMock2.$transaction.mockImplementation(async (callback: any) => {
    const tx = {
      student: {
        update: jest.fn().mockResolvedValue({ ...pendingStudent, status: 'ACCEPTED', userId: 'user-1' })
      },
      studentEnrollment: {
        create: jest.fn().mockResolvedValue({ id: 'enroll-1' })
      }
    };
    const result = await callback(tx);
    return result;
  });
}

describe('profile-service: acceptStudentApplication controller - email flow', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
    prismaMock2.student.findFirst.mockReset();
    prismaMock2.$transaction.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('after approval sends credentials by email and returns 200', async () => {
    setupFindsForHappyPath();

  const req: any = { params: { ...validParams }, body: { ...validBody2 } };
  const res = makeRes2();

    let acceptStudentApplication: any;
    jest.isolateModules(() => {
      authService = require('../../services/authService').authService;
      sendStudentCredentialsEmail = require('../../services/studentCredentialsEmail').sendStudentCredentialsEmail;
      acceptStudentApplication = require('../acceptStudentApplication').acceptStudentApplication;
    });

    await acceptStudentApplication(req, res);

    expect(createUserForStudentMock2).toHaveBeenCalledTimes(1);
    expect(sendEmailMock2).toHaveBeenCalledWith(
      'student@example.com',
      expect.any(String),
      expect.any(String)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('email sending failure does not fail the request (still 200)', async () => {
    setupFindsForHappyPath();
    let acceptStudentApplication: any;
    jest.isolateModules(() => {
      acceptStudentApplication = require('../acceptStudentApplication').acceptStudentApplication;
      sendEmailMock2.mockRejectedValueOnce(new Error('smtp fail'));
    });

    const req: any = { params: { ...validParams }, body: { ...validBody2 } };
    const res = makeRes2();

    await acceptStudentApplication(req, res);

  expect(createUserForStudentMock2).toHaveBeenCalledTimes(1);
  expect(sendEmailMock2).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
