// Tests for createStudent controller: verifies email sending and non-failing on email error

// Mocks must be declared before importing the SUT
// Create shared mock fns so all requires use the same instance
const sendEmailMock = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/studentCredentialsEmail', () => ({
  sendStudentCredentialsEmail: sendEmailMock,
}));

// Mock auth service
const createUserForStudentMock = jest.fn().mockResolvedValue({ success: true, data: { user: { id: 'user-1' } } });
jest.mock('../../services/authService', () => ({
  authService: {
    createUserForStudent: createUserForStudentMock,
    deleteUser: jest.fn().mockResolvedValue({ success: true })
  }
}));

// Prepare a mutable prisma mock we can inspect
const prismaMock = {
  student: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Mock database service default export
jest.mock('../../services/database', () => ({
  __esModule: true,
  default: { prisma: prismaMock },
}));

// Mock common-utils for context/permissions/validation
jest.mock('@vidyalayaone/common-utils', () => ({
  getSchoolContext: jest.fn(() => ({ context: 'school', schoolId: 'school-1' })),
  getUser: jest.fn(() => ({ id: 'admin-1' })),
  PERMISSIONS: { STUDENT: { CREATE: 'perm-student-create' } },
  hasPermission: jest.fn(() => true),
  validateInput: jest.fn((schema: any, body: any) => ({ success: true, data: body })),
}));

// Helper to build req/res
const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const validBody = {
  firstName: 'John',
  lastName: 'Doe',
  admissionNumber: 'A-001',
  admissionDate: new Date().toISOString(),
  dateOfBirth: new Date('2010-01-01').toISOString(),
  gender: 'MALE',
  address: { street: 'Main', city: 'X', state: 'Y', pincode: '12345', country: 'Z' },
  contactInfo: { primaryPhone: '1234567890', email: 'student@example.com' },
  parentInfo: { fatherName: 'Dad Doe', motherName: 'Mom Doe' },
  documents: [],
  classId: '11111111-1111-1111-1111-111111111111',
  sectionId: '22222222-2222-2222-2222-222222222222',
  academicYear: '2025-26',
  rollNumber: '5'
};

// Get access to mocked modules after jest.mock
const { sendStudentCredentialsEmail } = require('../../services/studentCredentialsEmail');
const { authService } = require('../../services/authService');

// Build transaction behavior
function setupTransactionMocks() {
  // No existing admission number
  prismaMock.student.findUnique.mockResolvedValueOnce(null);

  // Transaction: implement the tx object methods used by controller
  prismaMock.$transaction.mockImplementation(async (callback: any) => {
    const tx = {
      student: {
        create: jest.fn().mockResolvedValue({ id: 'student-1' })
      },
      guardian: {
        create: jest.fn().mockResolvedValue({ id: 'guardian-1' })
      },
      studentGuardian: {
        create: jest.fn().mockResolvedValue({})
      },
      studentEnrollment: {
        create: jest.fn().mockResolvedValue({ id: 'enroll-1' })
      },
      document: {
        create: jest.fn().mockResolvedValue({ id: 'doc-1' })
      }
    };
    const result = await callback(tx);
    return result;
  });

  // After transaction, controller loads full student with relations
  prismaMock.student.findUnique.mockResolvedValueOnce({
    id: 'student-1',
    firstName: 'John',
    lastName: 'Doe',
    guardians: [],
    enrollments: [],
    documents: []
  });
}

describe('profile-service: createStudent controller - email flow', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
    prismaMock.student.findUnique.mockReset();
    prismaMock.$transaction.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('po úspešnom vytvorení používateľa pošle poverenia emailom a vráti 201', async () => {
    setupTransactionMocks();

    const req: any = { body: { ...validBody } };
    const res = makeRes();

    let createStudent: any;
    jest.isolateModules(() => {
      // Import SUT after setting up mocks
      createStudent = require('../createStudent').createStudent;
    });

    await createStudent(req, res);

    expect(authService.createUserForStudent).toHaveBeenCalledTimes(1);
    expect(sendStudentCredentialsEmail).toHaveBeenCalledWith(
      'student@example.com',
      expect.any(String), // username generated in the controller
      expect.any(String)  // password generated in the controller
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('if email sending fails, request still returns 201 (email is best-effort)', async () => {
    setupTransactionMocks();
  sendEmailMock.mockRejectedValueOnce(new Error('smtp fail'));

    const req: any = { body: { ...validBody } };
    const res = makeRes();

    let createStudent: any;
    jest.isolateModules(() => {
      createStudent = require('../createStudent').createStudent;
    });

    await createStudent(req, res);

    expect(authService.createUserForStudent).toHaveBeenCalledTimes(1);
    expect(sendStudentCredentialsEmail).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
