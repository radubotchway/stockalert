import { prisma } from '../prismaClient.js';

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

/**
 * Returns batches (non-disposed, in-stock) bucketed by expiry status, plus
 * products currently below their reorder level.
 */
export const getAlerts = async () => {
  const now = new Date();
  const in30 = addDays(now, 30);
  const in90 = addDays(now, 90);

  const activeBatches = await prisma.batch.findMany({
    where: { disposed: false, quantity: { gt: 0 } },
    include: { product: { include: { supplier: true } } },
    orderBy: { expiryDate: 'asc' },
  });

  const expired = activeBatches.filter((b) => b.expiryDate < now);
  const expiring30 = activeBatches.filter((b) => b.expiryDate >= now && b.expiryDate <= in30);
  const expiring90 = activeBatches.filter((b) => b.expiryDate > in30 && b.expiryDate <= in90);

  const products = await prisma.product.findMany({
    include: { batches: { where: { disposed: false } }, supplier: true },
  });

  const belowReorder = products
    .map((p) => ({
      ...p,
      totalQuantity: p.batches.reduce((sum, b) => sum + b.quantity, 0),
    }))
    .filter((p) => p.totalQuantity <= p.reorderLevel);

  return {
    expired,
    expiring30,
    expiring90,
    belowReorder,
    counts: {
      expired: expired.length,
      expiring30: expiring30.length,
      expiring90: expiring90.length,
      belowReorder: belowReorder.length,
    },
  };
};
