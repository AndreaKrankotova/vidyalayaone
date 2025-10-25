jest.mock('../emailService', () => ({
  __esModule: true,
  default: {
    sendMail: jest.fn().mockResolvedValue(undefined),
  },
}));

import EmailService from '../emailService';
import { sendStudentCredentialsEmail } from '../studentCredentialsEmail';

describe('auth-service: studentCredentialsEmail service', () => {
  const email = 'student@example.com';
  const username = 'student123';
  const password = 'P@ssw0rd!';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends email with correct subject and html content', async () => {
    await sendStudentCredentialsEmail(email, username, password);

    expect(EmailService.sendMail).toHaveBeenCalledTimes(1);
    const [to, subject, html] = (EmailService.sendMail as jest.Mock).mock.calls[0];

    expect(to).toBe(email);
    expect(subject).toBe('Your Vidyalayaone Student Account Credentials');
    expect(html).toContain(username);
    expect(html).toContain(password);
  });

  it('propagates errors from EmailService', async () => {
    (EmailService.sendMail as jest.Mock).mockRejectedValueOnce(new Error('smtp failure'));

    await expect(sendStudentCredentialsEmail(email, username, password)).rejects.toThrow('smtp failure');
  });
});
