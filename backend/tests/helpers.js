import bcrypt from 'bcryptjs';
import { prisma } from '../src/prismaClient.js';
import { signToken } from '../src/utils/jwt.js';

export const resetDb = async () => {
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
};

export const createUser = async (role = 'PHARMACIST') =>
  prisma.user.create({
    data: {
      name: role === 'PHARMACIST' ? 'Test Pharmacist' : 'Test Assistant',
      email: `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
      passwordHash: await bcrypt.hash('password123', 4),
      role,
    },
  });

export const tokenFor = (user) => signToken(user);

export const createSupplier = async (overrides = {}) =>
  prisma.supplier.create({
    data: { name: 'Test Supplier', contactPerson: 'Jane Doe', phone: '123', email: 'supplier@test.local', ...overrides },
  });

let barcodeCounter = 1;
export const createProduct = async (overrides = {}) =>
  prisma.product.create({
    data: {
      name: 'Test Product',
      barcode: String(1000000000000 + barcodeCounter++),
      category: 'Analgesics',
      unit: 'tablet',
      unitPrice: 1,
      reorderLevel: 10,
      ...overrides,
    },
  });

export const createBatch = async (productId, overrides = {}) =>
  prisma.batch.create({
    data: {
      productId,
      batchNumber: `BATCH-${Math.random().toString(36).slice(2, 8)}`,
      quantity: 100,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      costPrice: 0.5,
      ...overrides,
    },
  });
