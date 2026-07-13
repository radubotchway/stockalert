import { prisma } from '../prismaClient.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const include = {
  supplier: true,
  createdBy: { select: { id: true, name: true } },
  items: { include: { product: true } },
};

export const listPurchaseOrders = asyncHandler(async (req, res) => {
  const { status, supplierId } = req.query;
  const where = {
    ...(status ? { status } : {}),
    ...(supplierId ? { supplierId: Number(supplierId) } : {}),
  };
  const orders = await prisma.purchaseOrder.findMany({ where, include, orderBy: { createdAt: 'desc' } });
  res.json(orders);
});

export const getPurchaseOrder = asyncHandler(async (req, res) => {
  const order = await prisma.purchaseOrder.findUnique({ where: { id: Number(req.params.id) }, include });
  if (!order) throw new ApiError(404, 'Purchase order not found');
  res.json(order);
});

export const createPurchaseOrder = asyncHandler(async (req, res) => {
  const { supplierId, items } = req.body;
  if (!supplierId) throw new ApiError(400, 'supplierId is required');
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'At least one line item is required');
  }
  for (const item of items) {
    if (!item.productId || !item.quantityOrdered || Number(item.quantityOrdered) <= 0) {
      throw new ApiError(400, 'Each item requires a productId and a positive quantityOrdered');
    }
  }

  const order = await prisma.purchaseOrder.create({
    data: {
      supplierId: Number(supplierId),
      createdById: req.user.id,
      status: 'DRAFT',
      items: {
        create: items.map((i) => ({
          productId: Number(i.productId),
          quantityOrdered: Number(i.quantityOrdered),
        })),
      },
    },
    include,
  });

  res.status(201).json(order);
});

const ALLOWED_TRANSITIONS = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
  PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
};

export const updatePurchaseOrderStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;

  const order = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!order) throw new ApiError(404, 'Purchase order not found');

  if (!ALLOWED_TRANSITIONS[order.status]?.includes(status)) {
    throw new ApiError(400, `Cannot transition from ${order.status} to ${status}`);
  }

  const updated = await prisma.purchaseOrder.update({ where: { id }, data: { status }, include });
  res.json(updated);
});

export const deletePurchaseOrder = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const order = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!order) throw new ApiError(404, 'Purchase order not found');
  if (order.status !== 'DRAFT') throw new ApiError(400, 'Only draft purchase orders can be deleted');
  await prisma.purchaseOrder.delete({ where: { id } });
  res.status(204).send();
});

/**
 * One-click suggested order: groups all products currently at/below their
 * reorder level by supplier and creates a draft PO per supplier.
 */
export const generateSuggestedOrders = asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({ include: { batches: { where: { disposed: false } } } });

  const lowStock = products
    .map((p) => ({ ...p, totalQuantity: p.batches.reduce((sum, b) => sum + b.quantity, 0) }))
    .filter((p) => p.totalQuantity <= p.reorderLevel && p.supplierId);

  if (lowStock.length === 0) {
    return res.json({ created: [], message: 'No products are currently below their reorder level.' });
  }

  const bySupplier = new Map();
  for (const p of lowStock) {
    if (!bySupplier.has(p.supplierId)) bySupplier.set(p.supplierId, []);
    bySupplier.get(p.supplierId).push(p);
  }

  const created = [];
  for (const [supplierId, supplierProducts] of bySupplier) {
    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        createdById: req.user.id,
        status: 'DRAFT',
        items: {
          create: supplierProducts.map((p) => ({
            productId: p.id,
            quantityOrdered: Math.max(p.reorderLevel * 2 - p.totalQuantity, p.reorderLevel),
          })),
        },
      },
      include,
    });
    created.push(order);
  }

  res.status(201).json({ created });
});

export const receivePurchaseOrder = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { receipts } = req.body;

  if (!Array.isArray(receipts) || receipts.length === 0) {
    throw new ApiError(400, 'receipts array is required, e.g. [{ itemId, quantityReceived, batchNumber, expiryDate, costPrice }]');
  }

  const order = await prisma.purchaseOrder.findUnique({ where: { id }, include });
  if (!order) throw new ApiError(404, 'Purchase order not found');
  if (!['SENT', 'PARTIALLY_RECEIVED'].includes(order.status)) {
    throw new ApiError(400, `Cannot receive stock for a purchase order with status ${order.status}`);
  }

  for (const r of receipts) {
    const item = order.items.find((i) => i.id === Number(r.itemId));
    if (!item) throw new ApiError(400, `Item ${r.itemId} does not belong to this purchase order`);
    if (!r.batchNumber) throw new ApiError(400, 'batchNumber is required for each receipt line');
    if (!r.expiryDate || Number.isNaN(Date.parse(r.expiryDate))) throw new ApiError(400, 'A valid expiryDate is required for each receipt line');
    if (!r.quantityReceived || Number(r.quantityReceived) <= 0) throw new ApiError(400, 'quantityReceived must be greater than zero');
    if (r.costPrice === undefined || Number(r.costPrice) < 0) throw new ApiError(400, 'costPrice must be zero or greater');
    const remaining = item.quantityOrdered - item.quantityReceived;
    if (Number(r.quantityReceived) > remaining) {
      throw new ApiError(400, `Cannot receive ${r.quantityReceived} units for item ${item.id}; only ${remaining} remain outstanding`);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const r of receipts) {
      const item = order.items.find((i) => i.id === Number(r.itemId));

      const batch = await tx.batch.create({
        data: {
          productId: item.productId,
          batchNumber: r.batchNumber,
          quantity: Number(r.quantityReceived),
          expiryDate: new Date(r.expiryDate),
          costPrice: Number(r.costPrice),
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          batchId: batch.id,
          type: 'RECEIPT',
          quantity: Number(r.quantityReceived),
          reason: `Received against PO #${order.id}`,
          userId: req.user.id,
        },
      });

      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { quantityReceived: item.quantityReceived + Number(r.quantityReceived) },
      });
    }

    const refreshedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
    const allReceived = refreshedItems.every((i) => i.quantityReceived >= i.quantityOrdered);
    const anyReceived = refreshedItems.some((i) => i.quantityReceived > 0);
    const newStatus = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : order.status;

    return tx.purchaseOrder.update({ where: { id }, data: { status: newStatus }, include });
  });

  res.json(updated);
});
