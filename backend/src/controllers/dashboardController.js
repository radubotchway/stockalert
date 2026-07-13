import { prisma } from '../prismaClient.js';
import { getAlerts } from '../services/alertService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const [products, pendingOrders, recentMovements, alerts] = await Promise.all([
    prisma.product.findMany({ include: { batches: { where: { disposed: false } } } }),
    prisma.purchaseOrder.count({ where: { status: { in: ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED'] } } }),
    prisma.stockMovement.findMany({
      include: { product: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    getAlerts(),
  ]);

  const stockValue = products.reduce(
    (sum, p) => sum + p.batches.reduce((bsum, b) => bsum + b.quantity, 0) * p.unitPrice,
    0
  );

  const valueByCategory = Object.values(
    products.reduce((acc, p) => {
      const qty = p.batches.reduce((s, b) => s + b.quantity, 0);
      const value = qty * p.unitPrice;
      if (!acc[p.category]) acc[p.category] = { category: p.category, value: 0 };
      acc[p.category].value += value;
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const movements30d = await prisma.stockMovement.findMany({
    where: { createdAt: { gte: since } },
    select: { type: true, quantity: true, createdAt: true },
  });

  const movementsByDay = {};
  for (const m of movements30d) {
    const day = m.createdAt.toISOString().slice(0, 10);
    if (!movementsByDay[day]) movementsByDay[day] = { date: day, RECEIPT: 0, DISPENSE: 0, ADJUSTMENT: 0, DISPOSAL: 0 };
    movementsByDay[day][m.type] += Math.abs(m.quantity);
  }
  const movementsOverTime = Object.values(movementsByDay).sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    totalStockValue: Math.round(stockValue * 100) / 100,
    totalProducts: products.length,
    activeAlertsCount:
      alerts.counts.expired + alerts.counts.expiring30 + alerts.counts.expiring90 + alerts.counts.belowReorder,
    alertCounts: alerts.counts,
    pendingOrders,
    recentMovements,
    valueByCategory,
    movementsOverTime,
  });
});
