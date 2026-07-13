import { prisma } from '../prismaClient.js';
import { getAlerts } from '../services/alertService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toCsv, sendCsv } from '../utils/csv.js';

export const expiryReport = asyncHandler(async (req, res) => {
  const { expired, expiring30, expiring90 } = await getAlerts();
  const rows = [...expired, ...expiring30, ...expiring90];

  if (req.query.format === 'csv') {
    const csv = toCsv(
      [
        { label: 'Product', value: (r) => r.product.name },
        { label: 'Barcode', value: (r) => r.product.barcode },
        { label: 'Batch Number', value: 'batchNumber' },
        { label: 'Quantity', value: 'quantity' },
        { label: 'Expiry Date', value: (r) => r.expiryDate.toISOString().slice(0, 10) },
        { label: 'Supplier', value: (r) => r.product.supplier?.name ?? '' },
      ],
      rows
    );
    return sendCsv(res, 'expiry-report.csv', csv);
  }

  res.json({ expired, expiring30, expiring90 });
});

export const lowStockReport = asyncHandler(async (req, res) => {
  const { belowReorder } = await getAlerts();

  if (req.query.format === 'csv') {
    const csv = toCsv(
      [
        { label: 'Product', value: 'name' },
        { label: 'Barcode', value: 'barcode' },
        { label: 'Category', value: 'category' },
        { label: 'Current Stock', value: 'totalQuantity' },
        { label: 'Reorder Level', value: 'reorderLevel' },
        { label: 'Supplier', value: (r) => r.supplier?.name ?? '' },
      ],
      belowReorder
    );
    return sendCsv(res, 'low-stock-report.csv', csv);
  }

  res.json(belowReorder);
});

export const movementsReport = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, type, productId } = req.query;

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
    include: { product: true, batch: true, user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  if (req.query.format === 'csv') {
    const csv = toCsv(
      [
        { label: 'Date', value: (r) => r.createdAt.toISOString() },
        { label: 'Type', value: 'type' },
        { label: 'Product', value: (r) => r.product.name },
        { label: 'Batch', value: (r) => r.batch?.batchNumber ?? '' },
        { label: 'Quantity', value: 'quantity' },
        { label: 'Reason', value: 'reason' },
        { label: 'User', value: (r) => r.user.name },
      ],
      movements
    );
    return sendCsv(res, 'movements-report.csv', csv);
  }

  res.json(movements);
});
