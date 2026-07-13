import { prisma } from '../prismaClient.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const withComputed = (product) => {
  const totalQuantity = product.batches.reduce((sum, b) => (b.disposed ? sum : sum + b.quantity), 0);
  const nonDisposed = product.batches.filter((b) => !b.disposed && b.quantity > 0);
  const nearestExpiry = nonDisposed.length
    ? nonDisposed.reduce((min, b) => (b.expiryDate < min ? b.expiryDate : min), nonDisposed[0].expiryDate)
    : null;
  return { ...product, totalQuantity, nearestExpiry };
};

export const listProducts = asyncHandler(async (req, res) => {
  const { search, category, sortBy = 'name', sortDir = 'asc' } = req.query;

  const where = {
    AND: [
      search
        ? {
            OR: [
              { name: { contains: search } },
              { barcode: { contains: search } },
            ],
          }
        : {},
      category ? { category } : {},
    ],
  };

  const allowedSort = ['name', 'category', 'unitPrice', 'reorderLevel', 'createdAt'];
  const orderBy = { [allowedSort.includes(sortBy) ? sortBy : 'name']: sortDir === 'desc' ? 'desc' : 'asc' };

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: { batches: true, supplier: true },
  });

  res.json(products.map(withComputed));
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: Number(req.params.id) },
    include: { batches: { orderBy: { expiryDate: 'asc' } }, supplier: true },
  });
  if (!product) throw new ApiError(404, 'Product not found');
  res.json(withComputed(product));
});

const batchInclude = { batches: { orderBy: { expiryDate: 'asc' } }, supplier: true };

export const getProductByBarcode = asyncHandler(async (req, res) => {
  const raw = req.params.barcode;
  let product = await prisma.product.findUnique({ where: { barcode: raw }, include: batchInclude });

  // A 12-digit UPC-A scan is numerically the same item as an EAN-13 with a
  // leading zero — many scanners (and this app's own image decoder) report
  // the shorter UPC-A form and drop that zero, so retry with it restored.
  if (!product && /^\d{12}$/.test(raw)) {
    product = await prisma.product.findUnique({ where: { barcode: raw.padStart(13, '0') }, include: batchInclude });
  }

  if (!product) {
    return res.status(404).json({ error: 'Product not found', barcode: raw });
  }
  res.json(withComputed(product));
});

const validateProductBody = (body, { partial = false } = {}) => {
  const errors = [];
  const required = ['name', 'barcode', 'category', 'unit', 'unitPrice', 'reorderLevel'];
  if (!partial) {
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        errors.push(`${field} is required`);
      }
    }
  }
  if (body.barcode !== undefined && !/^\d{8,13}$/.test(String(body.barcode))) {
    errors.push('barcode must be an 8-13 digit number (EAN-13 preferred)');
  }
  if (body.unitPrice !== undefined && Number(body.unitPrice) < 0) {
    errors.push('unitPrice cannot be negative');
  }
  if (body.reorderLevel !== undefined && Number(body.reorderLevel) < 0) {
    errors.push('reorderLevel cannot be negative');
  }
  return errors;
};

export const createProduct = asyncHandler(async (req, res) => {
  const errors = validateProductBody(req.body);
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);

  const { name, barcode, category, unit, unitPrice, reorderLevel, supplierId } = req.body;
  const product = await prisma.product.create({
    data: {
      name,
      barcode: String(barcode),
      category,
      unit,
      unitPrice: Number(unitPrice),
      reorderLevel: Number(reorderLevel),
      supplierId: supplierId ? Number(supplierId) : null,
    },
  });
  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const errors = validateProductBody(req.body, { partial: true });
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);

  const { name, barcode, category, unit, unitPrice, reorderLevel, supplierId } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (barcode !== undefined) data.barcode = String(barcode);
  if (category !== undefined) data.category = category;
  if (unit !== undefined) data.unit = unit;
  if (unitPrice !== undefined) data.unitPrice = Number(unitPrice);
  if (reorderLevel !== undefined) data.reorderLevel = Number(reorderLevel);
  if (supplierId !== undefined) data.supplierId = supplierId ? Number(supplierId) : null;

  const product = await prisma.product.update({ where: { id }, data });
  res.json(product);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const batchCount = await prisma.batch.count({ where: { productId: id } });
  if (batchCount > 0) {
    throw new ApiError(400, 'Cannot delete a product that has batch/stock history. Consider removing its stock instead.');
  }
  await prisma.product.delete({ where: { id } });
  res.status(204).send();
});

export const listCategories = asyncHandler(async (req, res) => {
  const rows = await prisma.product.findMany({ distinct: ['category'], select: { category: true } });
  res.json(rows.map((r) => r.category).sort());
});
