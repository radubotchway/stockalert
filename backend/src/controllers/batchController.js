import { prisma } from '../prismaClient.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const receiveBatch = asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const { batchNumber, quantity, expiryDate, costPrice, dateReceived } = req.body;

  const errors = [];
  if (!batchNumber) errors.push('batchNumber is required');
  if (quantity === undefined || Number(quantity) <= 0) errors.push('quantity must be greater than zero');
  if (!expiryDate) errors.push('expiryDate is required');
  if (expiryDate && Number.isNaN(Date.parse(expiryDate))) errors.push('expiryDate must be a valid date');
  if (costPrice === undefined || Number(costPrice) < 0) errors.push('costPrice must be zero or greater');
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new ApiError(404, 'Product not found');

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.batch.create({
      data: {
        productId,
        batchNumber,
        quantity: Number(quantity),
        expiryDate: new Date(expiryDate),
        costPrice: Number(costPrice),
        dateReceived: dateReceived ? new Date(dateReceived) : new Date(),
      },
    });
    await tx.stockMovement.create({
      data: {
        productId,
        batchId: created.id,
        type: 'RECEIPT',
        quantity: Number(quantity),
        reason: 'Stock received',
        userId: req.user.id,
      },
    });
    return created;
  });

  res.status(201).json(batch);
});

export const disposeBatch = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { reason } = req.body;
  if (!reason) throw new ApiError(400, 'A reason is required to dispose a batch');

  const batch = await prisma.batch.findUnique({ where: { id } });
  if (!batch) throw new ApiError(404, 'Batch not found');
  if (batch.disposed) throw new ApiError(400, 'Batch is already disposed');

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.batch.update({
      where: { id },
      data: { disposed: true, disposedReason: reason, disposedAt: new Date(), quantity: 0 },
    });
    if (batch.quantity > 0) {
      await tx.stockMovement.create({
        data: {
          productId: batch.productId,
          batchId: id,
          type: 'DISPOSAL',
          quantity: batch.quantity,
          reason,
          userId: req.user.id,
        },
      });
    }
    return result;
  });

  res.json(updated);
});

export const adjustBatch = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { quantityDelta, reason } = req.body;
  if (!reason) throw new ApiError(400, 'A reason is required for stock adjustments');
  if (quantityDelta === undefined || Number(quantityDelta) === 0) {
    throw new ApiError(400, 'quantityDelta must be a non-zero number');
  }

  const batch = await prisma.batch.findUnique({ where: { id } });
  if (!batch) throw new ApiError(404, 'Batch not found');

  const delta = Number(quantityDelta);
  const newQuantity = batch.quantity + delta;
  if (newQuantity < 0) throw new ApiError(400, 'Adjustment would result in negative stock');

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.batch.update({ where: { id }, data: { quantity: newQuantity } });
    await tx.stockMovement.create({
      data: {
        productId: batch.productId,
        batchId: id,
        type: 'ADJUSTMENT',
        quantity: delta,
        reason,
        userId: req.user.id,
      },
    });
    return result;
  });

  res.json(updated);
});
