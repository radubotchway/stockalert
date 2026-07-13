import { prisma } from '../prismaClient.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dispenseFefo } from '../services/fefoService.js';

export const dispenseProduct = asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const { quantity, reason } = req.body;

  if (quantity === undefined || Number(quantity) <= 0) {
    throw new ApiError(400, 'quantity must be greater than zero');
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new ApiError(404, 'Product not found');

  const deductions = await prisma.$transaction((tx) =>
    dispenseFefo(productId, Number(quantity), req.user.id, reason || 'Sale/dispense', tx)
  );

  res.json({ productId, quantityDispensed: Number(quantity), deductions });
});

export const listMovements = asyncHandler(async (req, res) => {
  const { productId, type, dateFrom, dateTo, limit } = req.query;

  const where = {
    ...(productId ? { productId: Number(productId) } : {}),
    ...(type ? { type } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  };

  const movements = await prisma.stockMovement.findMany({
    where,
    include: { product: true, batch: true, user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit ? Number(limit) : undefined,
  });

  res.json(movements);
});
