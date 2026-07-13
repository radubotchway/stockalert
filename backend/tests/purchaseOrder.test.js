import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prismaClient.js';
import { resetDb, createUser, createSupplier, createProduct, tokenFor } from './helpers.js';

const app = createApp();
const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

describe('purchase order receiving', () => {
  beforeEach(resetDb);
  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  const setupOrder = async () => {
    const pharmacist = await createUser('PHARMACIST');
    const token = tokenFor(pharmacist);
    const supplier = await createSupplier();
    const product = await createProduct({ supplierId: supplier.id });

    const createRes = await request(app)
      .post('/api/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ supplierId: supplier.id, items: [{ productId: product.id, quantityOrdered: 100 }] });
    expect(createRes.status).toBe(201);
    const order = createRes.body;

    await request(app)
      .patch(`/api/purchase-orders/${order.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SENT' })
      .expect(200);

    return { token, product, order };
  };

  it('creates a new batch and increments quantityReceived on partial receipt, moving status to PARTIALLY_RECEIVED', async () => {
    const { token, product, order } = await setupOrder();
    const item = order.items[0];

    const res = await request(app)
      .post(`/api/purchase-orders/${order.id}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        receipts: [
          { itemId: item.id, quantityReceived: 40, batchNumber: 'PO-BATCH-1', expiryDate: daysFromNow(180), costPrice: 0.4 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PARTIALLY_RECEIVED');
    expect(res.body.items[0].quantityReceived).toBe(40);

    const batch = await prisma.batch.findFirst({ where: { productId: product.id, batchNumber: 'PO-BATCH-1' } });
    expect(batch).toBeTruthy();
    expect(batch.quantity).toBe(40);

    const movement = await prisma.stockMovement.findFirst({ where: { batchId: batch.id } });
    expect(movement).toMatchObject({ type: 'RECEIPT', quantity: 40 });
  });

  it('moves status to RECEIVED once all ordered quantity has arrived, across multiple receipts', async () => {
    const { token, order } = await setupOrder();
    const item = order.items[0];

    await request(app)
      .post(`/api/purchase-orders/${order.id}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        receipts: [{ itemId: item.id, quantityReceived: 60, batchNumber: 'PO-BATCH-1', expiryDate: daysFromNow(180), costPrice: 0.4 }],
      })
      .expect(200);

    const finalRes = await request(app)
      .post(`/api/purchase-orders/${order.id}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        receipts: [{ itemId: item.id, quantityReceived: 40, batchNumber: 'PO-BATCH-2', expiryDate: daysFromNow(200), costPrice: 0.42 }],
      });

    expect(finalRes.status).toBe(200);
    expect(finalRes.body.status).toBe('RECEIVED');
    expect(finalRes.body.items[0].quantityReceived).toBe(100);
  });

  it('rejects receiving more than the outstanding quantity on a line item', async () => {
    const { token, order } = await setupOrder();
    const item = order.items[0];

    const res = await request(app)
      .post(`/api/purchase-orders/${order.id}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        receipts: [{ itemId: item.id, quantityReceived: 500, batchNumber: 'TOO-MUCH', expiryDate: daysFromNow(180), costPrice: 0.4 }],
      });

    expect(res.status).toBe(400);
  });

  it('rejects receiving stock for a draft (not yet sent) purchase order', async () => {
    const pharmacist = await createUser('PHARMACIST');
    const token = tokenFor(pharmacist);
    const supplier = await createSupplier();
    const product = await createProduct({ supplierId: supplier.id });

    const createRes = await request(app)
      .post('/api/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ supplierId: supplier.id, items: [{ productId: product.id, quantityOrdered: 10 }] });
    const order = createRes.body;

    const res = await request(app)
      .post(`/api/purchase-orders/${order.id}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        receipts: [{ itemId: order.items[0].id, quantityReceived: 5, batchNumber: 'X', expiryDate: daysFromNow(10), costPrice: 0.1 }],
      });

    expect(res.status).toBe(400);
  });

  it('forbids an assistant from receiving purchase orders', async () => {
    const { order } = await setupOrder();
    const assistant = await createUser('ASSISTANT');
    const token = tokenFor(assistant);

    const res = await request(app)
      .post(`/api/purchase-orders/${order.id}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ receipts: [] });

    expect(res.status).toBe(403);
  });
});
