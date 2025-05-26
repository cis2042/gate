const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Setup test database before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

// Clean up database after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Close database connection after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Global test utilities
global.testUtils = {
  createTestUser: (overrides = {}) => ({
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPassword123',
    ...overrides
  }),
  
  createTestVerification: (userId, overrides = {}) => ({
    userId,
    channel: 'twitter',
    challengeType: 'post',
    status: 'pending',
    ...overrides
  }),
  
  createTestSBT: (userId, overrides = {}) => ({
    tokenId: 'test-token-123',
    userId,
    walletAddress: '0x1234567890123456789012345678901234567890',
    contractAddress: '0x0987654321098765432109876543210987654321',
    network: 'polygon',
    chainId: 80001,
    mintTxHash: '0x' + '1'.repeat(64),
    blockNumber: 12345,
    blockTimestamp: new Date(),
    tokenURI: 'https://api.example.com/metadata/test-token-123',
    metadata: {
      name: 'Test SBT',
      description: 'Test Soul Bound Token',
      image: 'https://api.example.com/images/test.png'
    },
    ...overrides
  })
};
