import { prisma } from '../prismaClient.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Dispense `quantity` units of a product using First-Expiry-First-Out.
 * Deducts from the batch(es) with the soonest expiry date first, splitting
 * across batches if a single batch doesn't have enough stock.
 * Returns the list of batch deductions applied.
 */
export const dispenseFefo = async (productId, quantity, userId, reason = 'Sale/dispense', tx = prisma) => {
  if (quantity <= 0) {
    throw new ApiError(400, 'Quantity must be greater than zero');
  }

  const batches = await tx.batch.findMany({
    where: { productId, disposed: false, quantity: { gt: 0 } },
    orderBy: { expiryDate: 'asc' },
  });

  const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);
  if (totalAvailable < quantity) {
    throw new ApiError(400, `Insufficient stock: only ${totalAvailable} units available`);
  }

  let remaining = quantity;
  const deductions = [];

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);

    await tx.batch.update({
      where: { id: batch.id },
      data: { quantity: batch.quantity - take },
    });

    await tx.stockMovement.create({
      data: {
        productId,
        batchId: batch.id,
        type: 'DISPENSE',
        quantity: take,
        reason,
        userId,
      },
    });

    deductions.push({ batchId: batch.id, batchNumber: batch.batchNumber, quantityTaken: take });
    remaining -= take;
  }

  return deductions;
};
