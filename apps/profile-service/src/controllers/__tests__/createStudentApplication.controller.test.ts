// Tests for createStudentApplication controller

// Shared mutable mocks so all imports see the same instances
const prismaMock: any = {
  $transaction: jest.fn(),
  student: {
    findUnique: jest.fn(),
  },
};

jest.mock('../../services/database', () => ({
  __esModule: true,
  default: { prisma: prismaMock },
}));

const commonUtils = {
  getSchoolContext: jest.fn(),
  validateInput: jest.fn(),
};
jest.mock('@vidyalayaone/common-utils', () => ({
  getSchoolContext: (...args: any[]) => (commonUtils.getSchoolContext as any)(...args),
  validateInput: (...args: any[]) => (commonUtils.validateInput as any)(...args),
}));

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const baseBody = {
  firstName: 'John',
  lastName: 'Doe',
  bloodGroup: 'A+',
  category: 'GEN',
  religion: 'None',
  dateOfBirth: new Date('2010-01-01').toISOString(),
  gender: 'MALE',
  address: { street: 'X', city: 'Y', state: 'Z', pincode: '12345', country: 'SK' },
  contactInfo: { primaryPhone: '1234567890', email: 'student@example.com' },
  parentInfo: undefined as any,
  documents: [] as any[],
};

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  // Default mocks
  commonUtils.getSchoolContext.mockReturnValue({ schoolId: 'school-1' });
  commonUtils.validateInput.mockImplementation((_schema: any, body: any, _res: any) => ({ success: true, data: body }));
  prismaMock.$transaction.mockReset();
  prismaMock.student.findUnique.mockReset();
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('profile-service: createStudentApplication controller', () => {
  const loadController = () => {
    let ctrl: any;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ctrl = require('../createStudentApplication').createStudentApplication;
    });
    return ctrl as (req: any, res: any) => Promise<void>;
  };

  it('returns 400 when schoolId is missing in context', async () => {
    commonUtils.getSchoolContext.mockReturnValue({});
    const req: any = { body: { ...baseBody, parentInfo: { fatherName: 'Dad Doe' } } };
    const res = makeRes();

    const createStudentApplication = loadController();
    await createStudentApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.objectContaining({ message: expect.any(String) }) })
    );
  });

  it('returns 400 when no guardians can be derived from parentInfo', async () => {
    const req: any = { body: { ...baseBody, parentInfo: undefined } };
    const res = makeRes();

    const createStudentApplication = loadController();
    await createStudentApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.objectContaining({ message: 'At least one guardian is required' }) })
    );
  });

  it('creates application with guardians/documents and returns 201', async () => {
    // Implement successful transaction
    prismaMock.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        student: {
          create: jest.fn().mockResolvedValue({ id: 'student-1' }),
        },
        guardian: {
          create: jest.fn().mockResolvedValue({ id: 'guardian-1' }),
        },
        studentGuardian: {
          create: jest.fn().mockResolvedValue({}),
        },
        document: {
          create: jest.fn().mockResolvedValue({ id: 'doc-1' }),
        },
      };
      return await callback(tx);
    });

    prismaMock.student.findUnique.mockResolvedValueOnce({
      id: 'student-1',
      guardians: [],
      documents: [{ id: 'doc-1' }],
    });

    const body = {
      ...baseBody,
      parentInfo: { fatherName: 'Dad Doe', motherName: 'Mom Doe' },
      documents: [{ name: 'ID', description: 'doc', type: 'ID', mimeType: 'image/png', base64Data: 'AAAA' }],
    };
    const req: any = { body };
    const res = makeRes();

    const createStudentApplication = loadController();
    await createStudentApplication(req, res);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.student.findUnique).toHaveBeenCalledWith({
      where: { id: 'student-1' },
      include: expect.any(Object),
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ student: expect.objectContaining({ id: 'student-1' }) }) })
    );
  });

  it('derives guardians from father/mother/guardian names and uses default relation GUARDIAN', async () => {
    const txSpies: any = {};
    prismaMock.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        student: {
          create: jest.fn().mockResolvedValue({ id: 'student-3' }),
        },
        guardian: {
          create: jest.fn().mockResolvedValue({ id: 'g1' }),
        },
        studentGuardian: {
          create: jest.fn().mockResolvedValue({}),
        },
        document: {
          create: jest.fn().mockResolvedValue({ id: 'd1' }),
        },
      };
      txSpies.tx = tx;
      return await callback(tx);
    });

    prismaMock.student.findUnique.mockResolvedValueOnce({ id: 'student-3', guardians: [], documents: [] });

    const body = {
      ...baseBody,
      dateOfBirth: undefined, // triggers null branch
      parentInfo: {
        fatherName: 'John X Doe',
        motherName: 'Jane Y Doe',
        guardianName: 'Uncle Joe',
        // guardianRelation omitted -> default 'GUARDIAN'
      },
      documents: [],
    };
    const req: any = { body };
    const res = makeRes();

    const createStudentApplication = loadController();
    await createStudentApplication(req, res);

    // Student created with null DOB and proper defaults
    expect(txSpies.tx.student.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dateOfBirth: null, status: 'PENDING', profilePhoto: null }),
      })
    );

    // Guardians created: verify name splitting and address propagation
    const guardianCreates = txSpies.tx.guardian.create.mock.calls.map((c: any) => c[0].data);
    expect(guardianCreates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ firstName: 'John', lastName: 'X Doe', address: body.address }),
        expect.objectContaining({ firstName: 'Jane', lastName: 'Y Doe', address: body.address }),
        expect.objectContaining({ firstName: 'Uncle', lastName: 'Joe', address: body.address }),
      ])
    );

    // StudentGuardian relation default for third guardian
    const relCalls = txSpies.tx.studentGuardian.create.mock.calls.map((c: any) => c[0].data.relation);
    expect(relCalls).toEqual(expect.arrayContaining(['FATHER', 'MOTHER', 'GUARDIAN']));

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('documents: handles null entry, no base64 (empty url), and BigInt fileSize', async () => {
    const txSpies: any = {};
    prismaMock.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        student: { create: jest.fn().mockResolvedValue({ id: 'student-4' }) },
        guardian: { create: jest.fn().mockResolvedValue({ id: 'g' }) },
        studentGuardian: { create: jest.fn().mockResolvedValue({}) },
        document: { create: jest.fn().mockResolvedValue({ id: 'docx' }) },
      };
      txSpies.tx = tx;
      return await callback(tx);
    });

    prismaMock.student.findUnique.mockResolvedValueOnce({ id: 'student-4', guardians: [], documents: [] });

    const body = {
      ...baseBody,
      parentInfo: { fatherName: 'Dad Doe' },
      documents: [null, { name: 'NoData', description: 'desc', type: 'ID', mimeType: 'image/png', fileSize: 1000 }],
    };
    const req: any = { body };
    const res = makeRes();

    const createStudentApplication = loadController();
    await createStudentApplication(req, res);

    // Only one document create should happen (null is skipped)
    expect(txSpies.tx.document.create).toHaveBeenCalledTimes(1);
    const docArg = txSpies.tx.document.create.mock.calls[0][0];
    expect(docArg.data).toEqual(
      expect.objectContaining({
        name: 'NoData',
        url: '', // no base64 -> empty url
        mimeType: 'image/png',
        fileSize: BigInt(1000),
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('early returns when validateInput fails', async () => {
    commonUtils.validateInput.mockImplementationOnce((_s: any, _b: any, res: any) => {
      res.status(400).json({ success: false });
      return { success: false };
    });

    const req: any = { body: { ...baseBody } };
    const res = makeRes();

    const createStudentApplication = loadController();
    await createStudentApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('maps P2002 error from transaction to 400', async () => {
    const err: any = new Error('unique');
    err.code = 'P2002';
    prismaMock.$transaction.mockRejectedValueOnce(err);

    const req: any = { body: { ...baseBody, parentInfo: { fatherName: 'Dad Doe' } } };
    const res = makeRes();

    const createStudentApplication = loadController();
    await createStudentApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('maps P2002 when thrown inside transaction callback', async () => {
    const err: any = new Error('unique');
    err.code = 'P2002';
    prismaMock.$transaction.mockImplementationOnce(async (_cb: any) => {
      throw err;
    });

    const req: any = { body: { ...baseBody, parentInfo: { fatherName: 'Dad Doe' } } };
    const res = makeRes();

    const createStudentApplication = loadController();
    await createStudentApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 on unexpected transaction error', async () => {
    prismaMock.$transaction.mockRejectedValueOnce(new Error('db down'));

    const req: any = { body: { ...baseBody, parentInfo: { fatherName: 'Dad Doe' } } };
    const res = makeRes();

    const createStudentApplication = loadController();
    await createStudentApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('outer catch returns 500 when fetching created student fails', async () => {
    // Transaction succeeds
    prismaMock.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        student: { create: jest.fn().mockResolvedValue({ id: 'student-2' }) },
        guardian: { create: jest.fn().mockResolvedValue({ id: 'g' }) },
        studentGuardian: { create: jest.fn().mockResolvedValue({}) },
        document: { create: jest.fn().mockResolvedValue({ id: 'd' }) },
      };
      return await callback(tx);
    });
    // Fetch throws → outer catch
    prismaMock.student.findUnique.mockRejectedValueOnce(new Error('fetch fail'));

    const req: any = { body: { ...baseBody, parentInfo: { fatherName: 'Dad Doe' } } };
    const res = makeRes();

    const createStudentApplication = loadController();
    await createStudentApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
