import { prisma } from '../prismaClient.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await prisma.supplier.findMany({
    include: { _count: { select: { products: true, purchaseOrders: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(suppliers);
});

export const getSupplier = asyncHandler(async (req, res) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: Number(req.params.id) },
    include: { products: true, purchaseOrders: true },
  });
  if (!supplier) throw new ApiError(404, 'Supplier not found');
  res.json(supplier);
});

const validateSupplierBody = (body) => {
  const errors = [];
  if (!body.name) errors.push('name is required');
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.push('email is invalid');
  return errors;
};

export const createSupplier = asyncHandler(async (req, res) => {
  const errors = validateSupplierBody(req.body);
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);

  const { name, contactPerson, phone, email, address } = req.body;
  const supplier = await prisma.supplier.create({
    data: { name, contactPerson, phone, email, address },
  });
  res.status(201).json(supplier);
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const errors = validateSupplierBody({ ...req.body, name: req.body.name ?? 'placeholder' });
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);

  const { name, contactPerson, phone, email, address } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (contactPerson !== undefined) data.contactPerson = contactPerson;
  if (phone !== undefined) data.phone = phone;
  if (email !== undefined) data.email = email;
  if (address !== undefined) data.address = address;

  const supplier = await prisma.supplier.update({ where: { id }, data });
  res.json(supplier);
});

export const deleteSupplier = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const productCount = await prisma.product.count({ where: { supplierId: id } });
  if (productCount > 0) {
    throw new ApiError(400, 'Cannot delete a supplier that has linked products. Reassign products first.');
  }
  await prisma.supplier.delete({ where: { id } });
  res.status(204).send();
});
