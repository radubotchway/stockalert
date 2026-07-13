import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../src/prismaClient.js';
import { getAlerts } from '../src/services/alertService.js';
import { resetDb, createProduct, createBatch } from './helpers.js';

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

describe('getAlerts', () => {
  beforeEach(resetDb);
  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  it('buckets batches into expired, expiring-30 and expiring-90', async () => {
    const product = await createProduct({ reorderLevel: 0 });
    const expired = await createBatch(product.id, { expiryDate: daysFromNow(-5), batchNumber: 'EXPIRED', quantity: 5 });
    const in30 = await createBatch(product.id, { expiryDate: daysFromNow(15), batchNumber: 'IN30', quantity: 5 });
    const in90 = await createBatch(product.id, { expiryDate: daysFromNow(60), batchNumber: 'IN90', quantity: 5 });
    await createBatch(product.id, { expiryDate: daysFromNow(400), batchNumber: 'SAFE', quantity: 5 });

    const alerts = await getAlerts();

    expect(alerts.expired.map((b) => b.id)).toEqual([expired.id]);
    expect(alerts.expiring30.map((b) => b.id)).toEqual([in30.id]);
    expect(alerts.expiring90.map((b) => b.id)).toEqual([in90.id]);
    expect(alerts.counts).toEqual({ expired: 1, expiring30: 1, expiring90: 1, belowReorder: 0 });
  });

  it('excludes disposed and zero-quantity batches from expiry buckets', async () => {
    const product = await createProduct({ reorderLevel: 0 });
    await createBatch(product.id, { expiryDate: daysFromNow(-5), quantity: 0 });
    await createBatch(product.id, { expiryDate: daysFromNow(-5), quantity: 5, disposed: true });

    const alerts = await getAlerts();

    expect(alerts.expired).toHaveLength(0);
  });

  it('flags products at or below their reorder level', async () => {
    const low = await createProduct({ name: 'Low Stock Item', reorderLevel: 50 });
    await createBatch(low.id, { quantity: 20, expiryDate: daysFromNow(300) });

    const healthy = await createProduct({ name: 'Healthy Item', reorderLevel: 50 });
    await createBatch(healthy.id, { quantity: 200, expiryDate: daysFromNow(300) });

    const alerts = await getAlerts();

    const belowReorderIds = alerts.belowReorder.map((p) => p.id);
    expect(belowReorderIds).toContain(low.id);
    expect(belowReorderIds).not.toContain(healthy.id);
    expect(alerts.counts.belowReorder).toBe(1);
  });
});
