import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ean13 = (base11) => {
  const digits = base11.padStart(12, '0').split('').map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return digits.join('') + check;
};

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

async function main() {
  console.log('Clearing existing data...');
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating demo users...');
  const [pharmacist, assistant] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Frances Ahenkorah',
        email: 'frances@stockalert.demo',
        passwordHash: await bcrypt.hash('Pharmacist123!', 10),
        role: 'PHARMACIST',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Kojo Mensah',
        email: 'assistant@stockalert.demo',
        passwordHash: await bcrypt.hash('Assistant123!', 10),
        role: 'ASSISTANT',
      },
    }),
  ]);

  console.log('Creating suppliers...');
  const supplierData = [
    { name: 'MedPlus Distributors', contactPerson: 'Yaw Boateng', phone: '+233 24 111 2222', email: 'orders@medplus.example', address: '12 Independence Ave, Accra' },
    { name: 'PharmaCare Wholesale', contactPerson: 'Efua Asante', phone: '+233 20 333 4444', email: 'sales@pharmacare.example', address: '45 Ring Road, Kumasi' },
    { name: 'HealthFirst Supplies', contactPerson: 'Kwame Adjei', phone: '+233 27 555 6666', email: 'info@healthfirst.example', address: '7 Liberation Rd, Accra' },
    { name: 'VitaLife Imports', contactPerson: 'Abena Darko', phone: '+233 26 777 8888', email: 'contact@vitalife.example', address: '89 Airport Rd, Tema' },
  ];
  const suppliers = [];
  for (const s of supplierData) {
    suppliers.push(await prisma.supplier.create({ data: s }));
  }

  console.log('Creating products...');
  const productDefs = [
    // Analgesics
    { name: 'Paracetamol 500mg Tablets', category: 'Analgesics', unit: 'tablet', unitPrice: 0.15, reorderLevel: 200 },
    { name: 'Ibuprofen 400mg Tablets', category: 'Analgesics', unit: 'tablet', unitPrice: 0.2, reorderLevel: 150 },
    { name: 'Aspirin 300mg Tablets', category: 'Analgesics', unit: 'tablet', unitPrice: 0.12, reorderLevel: 150 },
    { name: 'Diclofenac Gel 50g', category: 'Analgesics', unit: 'box', unitPrice: 8.5, reorderLevel: 20 },
    { name: 'Tramadol 50mg Capsules', category: 'Analgesics', unit: 'tablet', unitPrice: 0.35, reorderLevel: 80 },
    // Antibiotics
    { name: 'Amoxicillin 500mg Capsules', category: 'Antibiotics', unit: 'tablet', unitPrice: 0.3, reorderLevel: 150 },
    { name: 'Ciprofloxacin 500mg Tablets', category: 'Antibiotics', unit: 'tablet', unitPrice: 0.4, reorderLevel: 100 },
    { name: 'Azithromycin 250mg Tablets', category: 'Antibiotics', unit: 'tablet', unitPrice: 0.6, reorderLevel: 60 },
    { name: 'Metronidazole 400mg Tablets', category: 'Antibiotics', unit: 'tablet', unitPrice: 0.25, reorderLevel: 100 },
    { name: 'Doxycycline 100mg Capsules', category: 'Antibiotics', unit: 'tablet', unitPrice: 0.3, reorderLevel: 60 },
    // Vitamins
    { name: 'Vitamin C 1000mg Tablets', category: 'Vitamins', unit: 'tablet', unitPrice: 0.2, reorderLevel: 150 },
    { name: 'Multivitamin Syrup 200ml', category: 'Vitamins', unit: 'bottle', unitPrice: 6.5, reorderLevel: 25 },
    { name: 'Vitamin D3 1000IU Tablets', category: 'Vitamins', unit: 'tablet', unitPrice: 0.25, reorderLevel: 100 },
    { name: 'Folic Acid 5mg Tablets', category: 'Vitamins', unit: 'tablet', unitPrice: 0.1, reorderLevel: 150 },
    { name: 'Ferrous Sulphate Tablets', category: 'Vitamins', unit: 'tablet', unitPrice: 0.1, reorderLevel: 150 },
    { name: 'Zinc 50mg Tablets', category: 'Vitamins', unit: 'tablet', unitPrice: 0.18, reorderLevel: 100 },
    // First Aid
    { name: 'Adhesive Bandages (box of 100)', category: 'First Aid', unit: 'box', unitPrice: 4.0, reorderLevel: 15 },
    { name: 'Gauze Roll 10cm', category: 'First Aid', unit: 'box', unitPrice: 2.5, reorderLevel: 20 },
    { name: 'Antiseptic Solution 100ml', category: 'First Aid', unit: 'bottle', unitPrice: 3.2, reorderLevel: 25 },
    { name: 'Cotton Wool 100g', category: 'First Aid', unit: 'box', unitPrice: 2.0, reorderLevel: 20 },
    { name: 'Elastic Crepe Bandage', category: 'First Aid', unit: 'box', unitPrice: 3.0, reorderLevel: 15 },
    { name: 'Surgical Tape 2.5cm', category: 'First Aid', unit: 'box', unitPrice: 1.5, reorderLevel: 20 },
    // Antihistamines / Respiratory
    { name: 'Cetirizine 10mg Tablets', category: 'Antihistamines', unit: 'tablet', unitPrice: 0.15, reorderLevel: 100 },
    { name: 'Loratadine 10mg Tablets', category: 'Antihistamines', unit: 'tablet', unitPrice: 0.18, reorderLevel: 100 },
    { name: 'Salbutamol Inhaler 100mcg', category: 'Respiratory', unit: 'box', unitPrice: 12.0, reorderLevel: 15 },
    { name: 'Cough Syrup 100ml', category: 'Respiratory', unit: 'bottle', unitPrice: 5.5, reorderLevel: 25 },
    // Digestive / Cardiovascular / Diabetes / Skin
    { name: 'Omeprazole 20mg Capsules', category: 'Digestive', unit: 'tablet', unitPrice: 0.28, reorderLevel: 100 },
    { name: 'Oral Rehydration Salts', category: 'Digestive', unit: 'box', unitPrice: 1.2, reorderLevel: 40 },
    { name: 'Amlodipine 5mg Tablets', category: 'Cardiovascular', unit: 'tablet', unitPrice: 0.22, reorderLevel: 100 },
    { name: 'Metformin 500mg Tablets', category: 'Diabetes Care', unit: 'tablet', unitPrice: 0.2, reorderLevel: 150 },
  ];

  const products = [];
  for (let i = 0; i < productDefs.length; i++) {
    const def = productDefs[i];
    const supplier = suppliers[i % suppliers.length];
    const barcode = ean13(String(500000000 + i * 7));
    products.push(
      await prisma.product.create({
        data: { ...def, barcode, supplierId: supplier.id },
      })
    );
  }

  console.log('Creating batches with a spread of expiry dates...');
  // Expiry offsets (days from now) to guarantee a realistic mix across the alert buckets.
  const expiryPattern = [-10, 5, 20, 45, 75, 180, 365];
  let movementCount = 0;
  let batchCount = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const batchesForProduct = 2; // ~60 batches across 30 products

    for (let b = 0; b < batchesForProduct; b++) {
      const offsetIdx = (i + b) % expiryPattern.length;
      const expiryDate = daysFromNow(expiryPattern[offsetIdx]);
      const quantity = 20 + ((i * 7 + b * 13) % 180);
      const costPrice = Math.round(product.unitPrice * 0.65 * 100) / 100;
      const dateReceived = daysFromNow(-(30 + b * 20));

      const batch = await prisma.batch.create({
        data: {
          productId: product.id,
          batchNumber: `B${String(product.id).padStart(3, '0')}-${b + 1}`,
          quantity,
          expiryDate,
          costPrice,
          dateReceived,
        },
      });
      batchCount++;

      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          batchId: batch.id,
          type: 'RECEIPT',
          quantity,
          reason: 'Initial stock receipt',
          userId: pharmacist.id,
          createdAt: dateReceived,
        },
      });
      movementCount++;
    }

    // Simulate some historical dispensing for realism (skip if it would go negative).
    if (i % 2 === 0) {
      const dispenseQty = 5 + (i % 10);
      const firstBatchQty = 20 + (i * 7) % 180;
      if (dispenseQty < firstBatchQty) {
        const batches = await prisma.batch.findMany({ where: { productId: product.id }, orderBy: { expiryDate: 'asc' } });
        const target = batches[0];
        await prisma.batch.update({ where: { id: target.id }, data: { quantity: target.quantity - dispenseQty } });
        await prisma.stockMovement.create({
          data: {
            productId: product.id,
            batchId: target.id,
            type: 'DISPENSE',
            quantity: dispenseQty,
            reason: 'Sale/dispense',
            userId: assistant.id,
            createdAt: daysFromNow(-(i % 15)),
          },
        });
        movementCount++;
      }
    }
  }

  // Push a couple of products deliberately below reorder level (but keep some stock on hand)
  // for a lively low-stock alert list that still shows a nearest-expiry batch.
  const lowStockTargets = products.slice(0, 3);
  for (const product of lowStockTargets) {
    const batches = await prisma.batch.findMany({ where: { productId: product.id }, orderBy: { expiryDate: 'asc' } });
    const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
    const target = Math.max(Math.floor(product.reorderLevel * 0.4), 1);
    let toRemove = Math.max(totalQuantity - target, 0);
    for (const batch of batches) {
      if (toRemove <= 0) break;
      const reduced = Math.min(batch.quantity - 1, toRemove);
      if (reduced > 0) {
        await prisma.batch.update({ where: { id: batch.id }, data: { quantity: batch.quantity - reduced } });
        toRemove -= reduced;
      }
    }
  }

  console.log('Creating sample purchase orders...');
  // Draft PO
  await prisma.purchaseOrder.create({
    data: {
      supplierId: suppliers[0].id,
      createdById: pharmacist.id,
      status: 'DRAFT',
      items: {
        create: [
          { productId: products[0].id, quantityOrdered: 300 },
          { productId: products[1].id, quantityOrdered: 200 },
        ],
      },
    },
  });

  // Sent PO
  await prisma.purchaseOrder.create({
    data: {
      supplierId: suppliers[1].id,
      createdById: pharmacist.id,
      status: 'SENT',
      items: {
        create: [
          { productId: products[5].id, quantityOrdered: 200 },
          { productId: products[6].id, quantityOrdered: 150 },
        ],
      },
    },
  });

  // Partially received PO
  await prisma.purchaseOrder.create({
    data: {
      supplierId: suppliers[2].id,
      createdById: pharmacist.id,
      status: 'PARTIALLY_RECEIVED',
      items: {
        create: [
          { productId: products[16].id, quantityOrdered: 30, quantityReceived: 15 },
          { productId: products[17].id, quantityOrdered: 40, quantityReceived: 40 },
        ],
      },
    },
  });

  // Fully received PO (historical)
  await prisma.purchaseOrder.create({
    data: {
      supplierId: suppliers[3].id,
      createdById: pharmacist.id,
      status: 'RECEIVED',
      items: {
        create: [
          { productId: products[10].id, quantityOrdered: 150, quantityReceived: 150 },
        ],
      },
    },
  });

  console.log(`Seed complete: 2 users, ${suppliers.length} suppliers, ${products.length} products, ${batchCount} batches, ${movementCount} movements, 4 purchase orders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
