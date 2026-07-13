import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../src/prismaClient.js';
import { dispenseFefo } from '../src/services/fefoService.js';
import { resetDb, createUser, createProduct, createBatch } from './helpers.js';

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

describe('dispenseFefo', () => {
  beforeEach(resetDb);
  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  it('deducts from the batch expiring soonest first', async () => {
    const user = await createUser();
    const product = await createProduct();
    const soon = await createBatch(product.id, { quantity: 50, expiryDate: daysFromNow(10), batchNumber: 'SOON' });
    const later = await createBatch(product.id, { quantity: 50, expiryDate: daysFromNow(200), batchNumber: 'LATER' });

    const deductions = await dispenseFefo(product.id, 20, user.id);

    expect(deductions).toEqual([{ batchId: soon.id, batchNumber: 'SOON', quantityTaken: 20 }]);

    const updatedSoon = await prisma.batch.findUnique({ where: { id: soon.id } });
    const updatedLater = await prisma.batch.findUnique({ where: { id: later.id } });
    expect(updatedSoon.quantity).toBe(30);
    expect(updatedLater.quantity).toBe(50);
  });

  it('splits across multiple batches in expiry order when one batch is insufficient', async () => {
    const user = await createUser();
    const product = await createProduct();
    const soon = await createBatch(product.id, { quantity: 10, expiryDate: daysFromNow(5), batchNumber: 'SOON' });
    const mid = await createBatch(product.id, { quantity: 30, expiryDate: daysFromNow(60), batchNumber: 'MID' });
    const later = await createBatch(product.id, { quantity: 100, expiryDate: daysFromNow(300), batchNumber: 'LATER' });

    const deductions = await dispenseFefo(product.id, 25, user.id);

    expect(deductions).toEqual([
      { batchId: soon.id, batchNumber: 'SOON', quantityTaken: 10 },
      { batchId: mid.id, batchNumber: 'MID', quantityTaken: 15 },
    ]);

    const updatedSoon = await prisma.batch.findUnique({ where: { id: soon.id } });
    const updatedMid = await prisma.batch.findUnique({ where: { id: mid.id } });
    const updatedLater = await prisma.batch.findUnique({ where: { id: later.id } });
    expect(updatedSoon.quantity).toBe(0);
    expect(updatedMid.quantity).toBe(15);
    expect(updatedLater.quantity).toBe(100);
  });

  it('ignores disposed and empty batches', async () => {
    const user = await createUser();
    const product = await createProduct();
    await createBatch(product.id, {
      quantity: 0,
      expiryDate: daysFromNow(1),
      batchNumber: 'DISPOSED',
      disposed: true,
    });
    const usable = await createBatch(product.id, { quantity: 40, expiryDate: daysFromNow(50), batchNumber: 'USABLE' });

    const deductions = await dispenseFefo(product.id, 15, user.id);

    expect(deductions).toEqual([{ batchId: usable.id, batchNumber: 'USABLE', quantityTaken: 15 }]);
  });

  it('throws when requested quantity exceeds total available stock', async () => {
    const user = await createUser();
    const product = await createProduct();
    await createBatch(product.id, { quantity: 10, expiryDate: daysFromNow(10) });

    await expect(dispenseFefo(product.id, 999, user.id)).rejects.toThrow(/Insufficient stock/);
  });

  it('records a stock movement of type DISPENSE for each batch touched', async () => {
    const user = await createUser();
    const product = await createProduct();
    const batch = await createBatch(product.id, { quantity: 40, expiryDate: daysFromNow(10) });

    await dispenseFefo(product.id, 12, user.id, 'Sold to walk-in customer');

    const movements = await prisma.stockMovement.findMany({ where: { productId: product.id } });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      type: 'DISPENSE',
      quantity: 12,
      batchId: batch.id,
      reason: 'Sold to walk-in customer',
      userId: user.id,
    });
  });
});
