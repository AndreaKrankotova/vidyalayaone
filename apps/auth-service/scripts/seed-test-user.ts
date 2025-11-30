/**
 * Seed script for creating a test user for profiling/load testing
 * This creates a dedicated user that can be used repeatedly for login benchmarks
 */

import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TEST_USER = {
  username: 'profiling_test_user',
  email: 'profiling@test.com',
  phone: '+1234567890',
  password: 'TestPassword123!',
};

async function seedTestUser() {
  try {
    console.log('🌱 Starting test user seed for profiling...\n');

    // Check if user already exists - if so, delete and recreate
    const existingUser = await prisma.user.findUnique({
      where: { username: TEST_USER.username },
    });

    if (existingUser) {
      console.log(`⚠️  Test user '${TEST_USER.username}' already exists. Deleting...`);
      await prisma.user.delete({
        where: { username: TEST_USER.username },
      });
      console.log(`✅ Old test user deleted`);
    }

    // Find or create DEFAULT role
    let defaultRole = await prisma.role.findFirst({
      where: { name: 'DEFAULT' },
    });

    if (!defaultRole) {
      console.log('⚠️  DEFAULT role not found. Creating one...');
      // You'll need to have at least one school in your database
      // For this seed, we'll just create a basic role without schoolId constraint
      // In production, you should handle this properly
      defaultRole = await prisma.role.create({
        data: {
          name: 'DEFAULT',
          description: 'Default role for test users',
          permissions: [],
          schoolId: 'default-school', // You may need to adjust this
        },
      });
      console.log(`✅ Created DEFAULT role with ID: ${defaultRole.id}`);
    }

    // Hash password with the configured salt rounds
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
    console.log(`🔐 Hashing password with ${saltRounds} salt rounds...`);
    const passwordHash = await bcrypt.hash(TEST_USER.password, saltRounds);

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        username: TEST_USER.username,
        email: TEST_USER.email,
        phone: TEST_USER.phone,
        passwordHash,
        roleId: defaultRole.id,
        schoolId: defaultRole.schoolId,
        isActive: true,
        isEmailVerified: true, // Pre-verified for easier testing
        isPhoneVerified: true,
      },
    });

    console.log('\n✅ Test user created successfully!');
    console.log(`   ID: ${testUser.id}`);
    console.log(`   Username: ${testUser.username}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`\n💡 Use these credentials for load testing:`);
    console.log(`   Username: ${TEST_USER.username}`);
    console.log(`   Password: ${TEST_USER.password}`);
    console.log(`\n📊 Current bcrypt salt rounds: ${saltRounds}`);
    console.log(`   (Change with BCRYPT_SALT_ROUNDS env var for profiling)\n`);

  } catch (error) {
    console.error('❌ Error seeding test user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestUser();
