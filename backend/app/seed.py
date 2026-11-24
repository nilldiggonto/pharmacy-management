"""Idempotent seed script for MedGrid Pharmacy & Wholesale Management:
- 1 Head Office + 1 Uttara Main Hub & Wholesale Depot + 7 Dhaka Branches
- 8 Staff role accounts with realistic activity across all modules
- 4 Suppliers, 12 Medicines & Medical Supplies
- Rich FEFO batches across Uttara Hub and all branches (including shortages, near-expiry, expired, quarantined)
- Purchase Orders (submitted, approved, partially_received, received)
- Stock Transfers (submitted, approved, dispatched, received, under_investigation)
- Retail & Wholesale Sales, Stock Movements, Stock Adjustments, and Audit Logs
"""
import asyncio
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.audit import AuditLog
from app.models.base import utcnow
from app.models.inventory import (
    AdjustmentStatus,
    InventoryBatch,
    MovementType,
    StockAdjustment,
    StockMovement,
    StockStatus,
)
from app.models.location import Location, LocationType
from app.models.product import Product
from app.models.purchasing import (
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
)
from app.models.sales import (
    PaymentMethod,
    Sale,
    SaleItem,
    SalePayment,
    SaleStatus,
)
from app.models.supplier import Supplier
from app.models.transfer import (
    StockTransfer,
    StockTransferDispatchBatch,
    StockTransferItem,
    TransferStatus,
)
from app.models.user import User, UserLocationAccess, UserRole


DEFAULT_LOCATIONS = [
    ("Head Office (Uttara)", "HQ-01", LocationType.MAIN_OFFICE, False, "House 14, Road 7, Sector 7, Uttara, Dhaka", "+880 2-48951001"),
    ("Uttara Main Hub & Wholesale Depot", "WH-01", LocationType.CENTRAL_WAREHOUSE, True, "Plot 22, Sonargaon Janapath, Sector 7, Uttara, Dhaka", "+880 2-48951002"),
    ("Uttara Sector 7 Flagship", "BR-01", LocationType.BRANCH, True, "Sector 7 Lake Drive Road, Uttara, Dhaka", "+880 1711-100001"),
    ("Mirpur 10 Branch", "BR-02", LocationType.BRANCH, True, "Mirpur 10 Circle, Begum Rokeya Ave, Dhaka", "+880 1711-100002"),
    ("Bashundhara R/A Branch", "BR-03", LocationType.BRANCH, True, "Block C, Bashundhara R/A, Dhaka", "+880 1711-100003"),
    ("Gulshan 2 Branch", "BR-04", LocationType.BRANCH, True, "Road 71, Gulshan 2 Circle, Dhaka", "+880 1711-100004"),
    ("Banani Road 11 Branch", "BR-05", LocationType.BRANCH, True, "Road 11, Block F, Banani, Dhaka", "+880 1711-100005"),
    ("Dhanmondi 27 Branch", "BR-06", LocationType.BRANCH, True, "Satmasjid Road, Dhanmondi 27, Dhaka", "+880 1711-100006"),
    ("Motijheel Commercial Branch", "BR-07", LocationType.BRANCH, True, "Dilkusha C/A, Motijheel, Dhaka", "+880 1711-100007"),
]

DEFAULT_USERS = [
    ("owner@pharmacy.com", "System Owner", "OwnerPass123!", UserRole.OWNER, True, []),
    ("manager@pharmacy.com", "Nadia Karim", "StaffPass123!", UserRole.HEAD_OFFICE_MANAGER, True, []),
    ("branch.manager@pharmacy.com", "Rafiqul Islam", "StaffPass123!", UserRole.BRANCH_MANAGER, False, ["BR-01", "BR-02"]),
    ("pharmacist@pharmacy.com", "Dr. Samira Haque", "StaffPass123!", UserRole.PHARMACIST, False, ["BR-01", "BR-02"]),
    ("cashier@pharmacy.com", "Tanvir Ahmed", "StaffPass123!", UserRole.CASHIER, False, ["BR-01", "BR-02"]),
    ("inventory@pharmacy.com", "Farzana Yasmin", "StaffPass123!", UserRole.INVENTORY_OFFICER, True, ["WH-01"]),
    ("data.entry@pharmacy.com", "Mehedi Hasan", "StaffPass123!", UserRole.STOCK_ENTRY_OPERATOR, False, ["WH-01"]),
    ("procurement@pharmacy.com", "Imran Hossain", "StaffPass123!", UserRole.PROCUREMENT_OFFICER, True, ["WH-01"]),
    ("accountant@pharmacy.com", "Shabnam Chowdhury", "StaffPass123!", UserRole.ACCOUNTANT, True, []),
]

DEFAULT_SUPPLIERS = [
    ("SUP-SQR", "Square Pharmaceuticals PLC", "Mahmudul Hasan", "+880 1713-001122", "orders@squarepharma.com.bd", "Mohakhali C/A, Dhaka", "DGDA-MFG-001", 30, Decimal("18450.00")),
    ("SUP-INC", "Incepta Pharmaceuticals Ltd", "Taslima Akter", "+880 1713-002233", "supply@inceptapharma.com", "Tejgaon I/A, Dhaka", "DGDA-MFG-004", 30, Decimal("12900.00")),
    ("SUP-BEX", "Beximco Pharmaceuticals Ltd", "Kamrul Islam", "+880 1713-003344", "b2b@beximcopharma.com", "Dhanmondi, Dhaka", "DGDA-MFG-002", 45, Decimal("9650.00")),
    ("SUP-HCP", "Healthcare Pharmaceuticals", "Sadia Rahman", "+880 1713-004455", "wholesale@hplbd.com", "Banglamotor, Dhaka", "DGDA-MFG-019", 15, Decimal("6200.00")),
]

# (sku, barcode, name, generic, brand, mfg, category, strength, form, pack, base_unit, cost, retail, wholesale, min_stock, rx, storage)
DEFAULT_PRODUCTS = [
    ("MED-NAPA-500", "8941100001011", "Napa Extra 500mg Tablet", "Paracetamol + Caffeine", "Napa Extra", "Beximco Pharma", "Pain & Fever", "500mg", "Tablet", 10, "strip", Decimal("1.10"), Decimal("2.20"), Decimal("1.65"), 80, False, "Store below 30C"),
    ("MED-SECL-20", "8941100001028", "Seclo 20mg Capsule", "Omeprazole", "Seclo", "Square Pharma", "Gastro", "20mg", "Capsule", 10, "strip", Decimal("2.40"), Decimal("4.50"), Decimal("3.40"), 60, False, "Keep dry below 25C"),
    ("MED-MONA-10", "8941100001035", "Monas 10mg Tablet", "Montelukast Sodium", "Monas", "Acme / Square", "Respiratory", "10mg", "Tablet", 10, "strip", Decimal("5.50"), Decimal("9.80"), Decimal("7.60"), 40, True, "Store away from light"),
    ("MED-AMOX-500", "8941100001042", "Moxacil 500mg Capsule", "Amoxicillin Trihydrate", "Moxacil", "Square Pharma", "Antibiotic", "500mg", "Capsule", 10, "strip", Decimal("3.80"), Decimal("6.90"), Decimal("5.20"), 50, True, "Dispense with Rx only"),
    ("MED-INSG-100", "8941100001059", "Insulin Glargine 100IU Pen", "Insulin Glargine", "Vibrent", "Incepta Pharma", "Cold Chain", "100IU/mL", "Pen", 1, "pen", Decimal("14.50"), Decimal("22.00"), Decimal("18.20"), 25, True, "Refrigerate 2C to 8C"),
    ("MED-AZIT-500", "8941100001066", "Zimax 500mg Tablet", "Azithromycin", "Zimax", "Square Pharma", "Antibiotic", "500mg", "Tablet", 6, "strip", Decimal("6.20"), Decimal("10.50"), Decimal("8.10"), 45, True, "Store below 30C"),
    ("MED-LOSR-50", "8941100001073", "Angilock 50mg Tablet", "Losartan Potassium", "Angilock", "Square Pharma", "Cardiovascular", "50mg", "Tablet", 10, "strip", Decimal("3.20"), Decimal("5.80"), Decimal("4.40"), 50, True, "Store below 30C"),
    ("MED-CETZ-10", "8941100001080", "Alatrol 10mg Tablet", "Cetirizine Hydrochloride", "Alatrol", "Square Pharma", "Allergy", "10mg", "Tablet", 10, "strip", Decimal("1.40"), Decimal("2.80"), Decimal("2.05"), 60, False, "Room temperature"),
    ("MED-VITD-20K", "8941100001097", "D-Rise 20000 IU Capsule", "Cholecalciferol", "D-Rise", "Incepta Pharma", "Vitamins", "20000 IU", "Capsule", 10, "strip", Decimal("4.90"), Decimal("8.50"), Decimal("6.60"), 40, False, "Store below 25C"),
    ("MED-ORS-20", "8941100001103", "SMC Orsaline-N Sachet Box", "Oral Rehydration Salts", "Orsaline-N", "SMC Enterprise", "Hydration", "10.25g", "Sachet Box", 20, "box", Decimal("3.10"), Decimal("5.50"), Decimal("4.20"), 70, False, "Keep in dry place"),
    ("SUP-MASK-50", "8941100001110", "3-Ply Surgical Mask (Box of 50)", "Meltblown Non-Woven", "MedShield", "Healthcare Supplies", "Medical Supply", "3-Ply", "Box", 50, "box", Decimal("2.60"), Decimal("4.90"), Decimal("3.60"), 60, False, "Store in clean dry area"),
    ("SUP-BPM-01", "8941100001127", "Digital Arm BP Monitor", "Oscillometric Cuff", "Omron Care", "Healthcare Pharma", "Diagnostics", "Auto", "Unit", 1, "unit", Decimal("26.00"), Decimal("42.00"), Decimal("33.50"), 12, False, "Handle with care"),
]


async def run_seed() -> None:
    today = date.today()
    async with AsyncSessionLocal() as db:
        # 1. Locations (upsert names & addresses so Dhaka / Uttara Main Hub is always aligned)
        location_by_code: dict[str, Location] = {}
        for name, code, loc_type, holds_stock, address, phone in DEFAULT_LOCATIONS:
            loc = (
                await db.execute(select(Location).where(Location.code == code))
            ).scalar_one_or_none()
            if loc is None:
                loc = Location(
                    name=name,
                    code=code,
                    location_type=loc_type,
                    holds_stock=holds_stock,
                    address=address,
                    phone=phone,
                )
                db.add(loc)
                await db.flush()
            else:
                loc.name = name
                loc.address = address
                loc.phone = phone
                loc.holds_stock = holds_stock
            location_by_code[code] = loc

        # 2. Users & Location Access
        user_by_email: dict[str, User] = {}
        for email, full_name, password, role, all_locs, assigned_codes in DEFAULT_USERS:
            user = (
                await db.execute(select(User).where(User.email == email))
            ).scalar_one_or_none()
            if user is None:
                user = User(
                    email=email,
                    full_name=full_name,
                    password_hash=hash_password(password),
                    role=role,
                    can_access_all_locations=all_locs,
                )
                db.add(user)
                await db.flush()
            existing_access = set(
                (
                    await db.execute(
                        select(UserLocationAccess.location_id).where(
                            UserLocationAccess.user_id == user.id
                        )
                    )
                )
                .scalars()
                .all()
            )
            for code in assigned_codes:
                target_loc = location_by_code.get(code)
                if target_loc is not None and target_loc.id not in existing_access:
                    db.add(UserLocationAccess(user_id=user.id, location_id=target_loc.id))
            user_by_email[email] = user

        # 3. Suppliers
        supplier_by_code: dict[str, Supplier] = {}
        for code, name, contact, phone, email, addr, lic, terms, bal in DEFAULT_SUPPLIERS:
            sup = (
                await db.execute(select(Supplier).where(Supplier.code == code))
            ).scalar_one_or_none()
            if sup is None:
                sup = Supplier(
                    code=code,
                    name=name,
                    contact_person=contact,
                    phone=phone,
                    email=email,
                    address=addr,
                    license_number=lic,
                    payment_terms_days=terms,
                    opening_balance=bal,
                    current_balance=bal,
                )
                db.add(sup)
                await db.flush()
            supplier_by_code[code] = sup

        # 4. Products
        product_by_sku: dict[str, Product] = {}
        for (
            sku, barcode, name, generic, brand, mfg, cat, strength, form,
            pack, base_unit, cost, retail, wholesale, min_stock, rx, storage
        ) in DEFAULT_PRODUCTS:
            prod = (
                await db.execute(select(Product).where(Product.sku == sku))
            ).scalar_one_or_none()
            if prod is None:
                prod = Product(
                    sku=sku,
                    barcode=barcode,
                    name=name,
                    generic_name=generic,
                    brand_name=brand,
                    manufacturer=mfg,
                    category=cat,
                    strength=strength,
                    dosage_form=form,
                    pack_size=pack,
                    base_unit=base_unit,
                    purchase_unit="case",
                    purchase_cost=cost,
                    retail_price=retail,
                    wholesale_price=wholesale,
                    min_stock_level=min_stock,
                    requires_prescription=rx,
                    storage_notes=storage,
                )
                db.add(prod)
                await db.flush()
            product_by_sku[sku] = prod

        # 5. Inventory Batches (only seed if no batches exist yet, to preserve user mutations)
        existing_batches = (await db.execute(select(InventoryBatch.id).limit(1))).scalar_one_or_none()
        if existing_batches is None:
            wh = location_by_code["WH-01"]
            sqr = supplier_by_code["SUP-SQR"]
            inc = supplier_by_code["SUP-INC"]
            bex = supplier_by_code["SUP-BEX"]
            hcp = supplier_by_code["SUP-HCP"]
            inv_officer = user_by_email["inventory@pharmacy.com"]
            owner = user_by_email["owner@pharmacy.com"]
            manager = user_by_email["manager@pharmacy.com"]
            br_mgr = user_by_email["branch.manager@pharmacy.com"]
            pharm = user_by_email["pharmacist@pharmacy.com"]
            cashier = user_by_email["cashier@pharmacy.com"]
            proc = user_by_email["procurement@pharmacy.com"]
            acct = user_by_email["accountant@pharmacy.com"]

            batch_lookup: dict[tuple[str, str], InventoryBatch] = {}

            async def add_batch(
                loc_code: str,
                sku: str,
                batch_no: str,
                exp_days: int,
                qty: int,
                sup: Supplier,
                bstatus: StockStatus = StockStatus.AVAILABLE,
                notes: str | None = None,
            ) -> InventoryBatch:
                loc = location_by_code[loc_code]
                prod = product_by_sku[sku]
                b = InventoryBatch(
                    location_id=loc.id,
                    product_id=prod.id,
                    supplier_id=sup.id,
                    batch_number=batch_no,
                    expiry_date=today + timedelta(days=exp_days),
                    received_date=today - timedelta(days=18),
                    purchase_cost=prod.purchase_cost,
                    initial_quantity=qty,
                    current_quantity=qty,
                    status=bstatus,
                    notes=notes,
                )
                db.add(b)
                await db.flush()
                db.add(
                    StockMovement(
                        location_id=loc.id,
                        product_id=prod.id,
                        batch_id=b.id,
                        movement_type=MovementType.PURCHASE_RECEIPT,
                        quantity_change=qty,
                        balance_after=qty,
                        reference_type="seed_opening",
                        reference_id=batch_no,
                        reason=f"Opening stock at {loc.name}",
                        performed_by_user_id=inv_officer.id,
                    )
                )
                batch_lookup[(loc_code, sku)] = b
                return b

            # Uttara Main Hub (WH-01) holds deep wholesale & central replenishment stock for ALL 12 SKUs
            hub_stock = [
                ("MED-NAPA-500", "UTT-NP-2601", 320, 950, bex),
                ("MED-SECL-20", "UTT-SC-2602", 280, 680, sqr),
                ("MED-MONA-10", "UTT-MN-2603", 240, 420, sqr),
                ("MED-AMOX-500", "UTT-AM-2604", 190, 540, sqr),
                ("MED-INSG-100", "UTT-IN-2605", 150, 260, inc),
                ("MED-AZIT-500", "UTT-AZ-2606", 210, 480, sqr),
                ("MED-LOSR-50", "UTT-LS-2607", 295, 520, sqr),
                ("MED-CETZ-10", "UTT-CZ-2608", 340, 760, sqr),
                ("MED-VITD-20K", "UTT-VD-2609", 260, 390, inc),
                ("MED-ORS-20", "UTT-OR-2610", 310, 640, hcp),
                ("SUP-MASK-50", "UTT-MK-2611", 520, 450, hcp),
                ("SUP-BPM-01", "UTT-BP-2612", 700, 65, hcp),
            ]
            for sku, bno, exp_d, qty, sup in hub_stock:
                await add_batch("WH-01", sku, bno, exp_d, qty, sup)

            # Near-expiry batch at Uttara Hub for FEFO priority testing
            await add_batch("WH-01", "MED-SECL-20", "UTT-SC-FEFO", 28, 85, sqr, notes="Prioritize FEFO dispatch")
            # Expired batch at BR-01 to demonstrate blocked expired dispensing
            await add_batch("BR-01", "MED-CETZ-10", "EXP-CZ-2501", -12, 18, sqr, StockStatus.EXPIRED, "Awaiting disposal write-off")
            # Quarantined batch at BR-02 from customer return
            await add_batch("BR-02", "MED-NAPA-500", "QRN-NP-2604", 180, 6, bex, StockStatus.QUARANTINED, "Returned by walk-in patient")

            # Branch stock distribution across Dhaka (with deliberate realistic shortages for cross-branch lookup!)
            branch_allocations = {
                "BR-01": [
                    ("MED-NAPA-500", 240, 240), ("MED-SECL-20", 160, 210), ("MED-MONA-10", 95, 195),
                    ("MED-AMOX-500", 110, 170), ("MED-INSG-100", 52, 110), ("MED-AZIT-500", 88, 165),
                    ("MED-LOSR-50", 120, 250), ("MED-CETZ-10", 145, 290), ("MED-VITD-20K", 74, 210),
                    ("MED-ORS-20", 130, 260), ("SUP-MASK-50", 95, 480), ("SUP-BPM-01", 18, 650),
                ],
                "BR-02": [
                    ("MED-NAPA-500", 135, 220), ("MED-SECL-20", 92, 180), ("MED-MONA-10", 48, 160),
                    ("MED-AMOX-500", 64, 150),
                    # Deliberate shortage: BR-02 Mirpur has 0 Insulin & only 8 Azithromycin!
                    ("MED-AZIT-500", 8, 42),
                    ("MED-LOSR-50", 70, 240), ("MED-CETZ-10", 110, 270), ("MED-ORS-20", 85, 250),
                    ("SUP-MASK-50", 42, 410), ("SUP-BPM-01", 9, 600),
                ],
                "BR-03": [
                    ("MED-NAPA-500", 170, 260), ("MED-SECL-20", 110, 210), ("MED-AMOX-500", 72, 165),
                    ("MED-INSG-100", 34, 120), ("MED-AZIT-500", 62, 190), ("MED-VITD-20K", 65, 220),
                    ("SUP-MASK-50", 78, 450), ("SUP-BPM-01", 11, 610),
                ],
                "BR-04": [
                    ("MED-NAPA-500", 190, 280), ("MED-SECL-20", 125, 230), ("MED-MONA-10", 80, 200),
                    # Deliberate shortage: BR-04 Gulshan low on Amoxicillin (12 units)
                    ("MED-AMOX-500", 12, 38),
                    ("MED-INSG-100", 44, 130), ("MED-LOSR-50", 95, 260), ("MED-VITD-20K", 82, 235),
                    ("SUP-BPM-01", 15, 640),
                ],
                "BR-05": [
                    ("MED-NAPA-500", 140, 250), ("MED-SECL-20", 88, 200), ("MED-MONA-10", 54, 185),
                    ("MED-AMOX-500", 68, 175), ("MED-INSG-100", 29, 105), ("MED-CETZ-10", 90, 280),
                    ("MED-ORS-20", 96, 260),
                ],
                "BR-06": [
                    ("MED-NAPA-500", 210, 270), ("MED-SECL-20", 130, 220), ("MED-AMOX-500", 85, 190),
                    ("MED-INSG-100", 38, 125), ("MED-AZIT-500", 74, 180), ("MED-LOSR-50", 105, 265),
                    ("SUP-MASK-50", 64, 430),
                ],
                "BR-07": [
                    ("MED-NAPA-500", 160, 240), ("MED-SECL-20", 95, 195), ("MED-CETZ-10", 80, 260),
                    ("MED-ORS-20", 110, 250),
                    # Deliberate shortage: BR-07 Motijheel low on Surgical Masks (14 units)
                    ("SUP-MASK-50", 14, 390),
                    ("MED-LOSR-50", 62, 230),
                ],
            }
            for bcode, items in branch_allocations.items():
                for sku, qty, exp_d in items:
                    await add_batch(bcode, sku, f"{bcode}-{sku[-4:]}-26", exp_d, qty, sqr)

            # 6. Purchase Orders (all key lifecycle states for Procurement Officer, Manager, Inventory Officer, Accountant)
            po1 = PurchaseOrder(
                po_number="PO-UTT-2026-001",
                supplier_id=sqr.id,
                destination_location_id=wh.id,
                status=PurchaseOrderStatus.SUBMITTED,
                expected_date=today + timedelta(days=3),
                total_amount=Decimal("2420.00"),
                notes="Monthly antibiotic & gastro restock for Uttara Main Hub",
                created_by_user_id=proc.id,
            )
            db.add(po1)
            await db.flush()
            db.add_all([
                PurchaseOrderItem(purchase_order_id=po1.id, product_id=product_by_sku["MED-AMOX-500"].id, quantity_ordered=400, unit_cost=Decimal("3.80")),
                PurchaseOrderItem(purchase_order_id=po1.id, product_id=product_by_sku["MED-SECL-20"].id, quantity_ordered=375, unit_cost=Decimal("2.40")),
            ])

            po2 = PurchaseOrder(
                po_number="PO-UTT-2026-002",
                supplier_id=inc.id,
                destination_location_id=wh.id,
                status=PurchaseOrderStatus.APPROVED,
                expected_date=today + timedelta(days=1),
                total_amount=Decimal("2655.00"),
                notes="Cold chain Insulin Glargine + Vitamin D3 approved for dock receiving",
                created_by_user_id=proc.id,
                approved_by_user_id=manager.id,
                approved_at=utcnow() - timedelta(hours=5),
            )
            db.add(po2)
            await db.flush()
            db.add_all([
                PurchaseOrderItem(purchase_order_id=po2.id, product_id=product_by_sku["MED-INSG-100"].id, quantity_ordered=150, unit_cost=Decimal("14.50")),
                PurchaseOrderItem(purchase_order_id=po2.id, product_id=product_by_sku["MED-VITD-20K"].id, quantity_ordered=100, unit_cost=Decimal("4.80")),
            ])

            po3 = PurchaseOrder(
                po_number="PO-UTT-2026-003",
                supplier_id=hcp.id,
                destination_location_id=wh.id,
                status=PurchaseOrderStatus.RECEIVED,
                expected_date=today - timedelta(days=2),
                total_amount=Decimal("1820.00"),
                notes="Medical masks and BP monitors received at Uttara Hub",
                created_by_user_id=proc.id,
                approved_by_user_id=owner.id,
                approved_at=utcnow() - timedelta(days=4),
            )
            db.add(po3)
            await db.flush()
            db.add_all([
                PurchaseOrderItem(purchase_order_id=po3.id, product_id=product_by_sku["SUP-MASK-50"].id, quantity_ordered=300, quantity_received=300, unit_cost=Decimal("2.60")),
                PurchaseOrderItem(purchase_order_id=po3.id, product_id=product_by_sku["SUP-BPM-01"].id, quantity_ordered=40, quantity_received=40, unit_cost=Decimal("26.00")),
            ])

            # 7. Stock Transfers from Uttara Main Hub (WH-01) to Dhaka Branches (all workflow stages!)
            # Transfer 1: SUBMITTED (Mirpur 10 requesting Insulin & Azithromycin from Uttara Hub)
            t1 = StockTransfer(
                transfer_number="TRF-UTT-BR02-101",
                from_location_id=wh.id,
                to_location_id=location_by_code["BR-02"].id,
                status=TransferStatus.SUBMITTED,
                reason="Mirpur 10 out of Insulin Glargine and critically low on Azithromycin",
                requested_by_user_id=br_mgr.id,
            )
            db.add(t1)
            await db.flush()
            db.add_all([
                StockTransferItem(transfer_id=t1.id, product_id=product_by_sku["MED-INSG-100"].id, requested_quantity=35),
                StockTransferItem(transfer_id=t1.id, product_id=product_by_sku["MED-AZIT-500"].id, requested_quantity=60),
            ])

            # Transfer 2: APPROVED (Gulshan 2 ready for Uttara Hub FEFO dispatch)
            t2 = StockTransfer(
                transfer_number="TRF-UTT-BR04-102",
                from_location_id=wh.id,
                to_location_id=location_by_code["BR-04"].id,
                status=TransferStatus.APPROVED,
                reason="Gulshan 2 Amoxicillin replenishment approved by Head Office",
                requested_by_user_id=inv_officer.id,
                approved_by_user_id=manager.id,
            )
            db.add(t2)
            await db.flush()
            db.add(
                StockTransferItem(
                    transfer_id=t2.id,
                    product_id=product_by_sku["MED-AMOX-500"].id,
                    requested_quantity=90,
                    approved_quantity=90,
                )
            )

            # Transfer 3: DISPATCHED (In-transit from Uttara Main Hub to Uttara Flagship BR-01, ready to Receive!)
            t3 = StockTransfer(
                transfer_number="TRF-UTT-BR01-103",
                from_location_id=wh.id,
                to_location_id=location_by_code["BR-01"].id,
                status=TransferStatus.DISPATCHED,
                reason="Morning restock van from Uttara Main Hub to Uttara Flagship",
                requested_by_user_id=br_mgr.id,
                approved_by_user_id=manager.id,
                dispatched_by_user_id=inv_officer.id,
                dispatched_at=utcnow() - timedelta(minutes=35),
            )
            db.add(t3)
            await db.flush()
            t3_item = StockTransferItem(
                transfer_id=t3.id,
                product_id=product_by_sku["MED-NAPA-500"].id,
                requested_quantity=120,
                approved_quantity=120,
                dispatched_quantity=120,
            )
            db.add(t3_item)
            await db.flush()
            wh_napa = batch_lookup[("WH-01", "MED-NAPA-500")]
            db.add(
                StockTransferDispatchBatch(
                    transfer_item_id=t3_item.id,
                    source_batch_id=wh_napa.id,
                    batch_number=wh_napa.batch_number,
                    expiry_date=wh_napa.expiry_date,
                    unit_cost=wh_napa.purchase_cost,
                    dispatched_quantity=120,
                )
            )

            # Transfer 4: UNDER_INVESTIGATION (Motijheel shortage of 5 boxes)
            t4 = StockTransfer(
                transfer_number="TRF-UTT-BR07-104",
                from_location_id=wh.id,
                to_location_id=location_by_code["BR-07"].id,
                status=TransferStatus.UNDER_INVESTIGATION,
                reason="Weekly supply van to Motijheel Commercial Branch",
                discrepancy_notes="5 boxes of 3-Ply Surgical Masks damaged in rain during transit; courier audit opened.",
                requested_by_user_id=inv_officer.id,
                approved_by_user_id=owner.id,
                dispatched_by_user_id=inv_officer.id,
                received_by_user_id=manager.id,
                dispatched_at=utcnow() - timedelta(hours=6),
                received_at=utcnow() - timedelta(hours=2),
            )
            db.add(t4)
            await db.flush()
            db.add(
                StockTransferItem(
                    transfer_id=t4.id,
                    product_id=product_by_sku["SUP-MASK-50"].id,
                    requested_quantity=80,
                    approved_quantity=80,
                    dispatched_quantity=80,
                    received_quantity=75,
                    shortage_quantity=5,
                )
            )

            # 8. Seeded Retail & Wholesale Sales across Uttara Hub & Branches
            seed_sales = [
                ("INV-BR01-8801", "BR-01", cashier.id, "Anisur Rahman (Walk-in)", "+880 1712-334455", PaymentMethod.CASH, [("MED-NAPA-500", 4, False), ("MED-SECL-20", 2, False)]),
                ("INV-BR01-8802", "BR-01", pharm.id, "Farhana Akter (Rx Dispense)", "+880 1819-556677", PaymentMethod.MOBILE_MONEY, [("MED-INSG-100", 2, False), ("MED-LOSR-50", 3, False)]),
                ("INV-BR02-8803", "BR-02", br_mgr.id, "Tariqul Islam (Walk-in)", "+880 1911-778899", PaymentMethod.CARD, [("MED-NAPA-500", 5, False), ("MED-ORS-20", 2, False)]),
                ("INV-WH01-W901", "WH-01", owner.id, "Uttara Crescent Clinic (Wholesale)", "+880 1715-990011", PaymentMethod.BANK_TRANSFER, [("MED-NAPA-500", 100, True), ("SUP-MASK-50", 40, True), ("MED-SECL-20", 50, True)]),
                ("INV-BR04-8804", "BR-04", manager.id, "Zarif Chowdhury (Walk-in)", "+880 1711-223344", PaymentMethod.CARD, [("MED-VITD-20K", 3, False), ("SUP-BPM-01", 1, False)]),
            ]
            for inv_no, loc_code, actor_id, cust_name, cust_phone, pay_method, lines in seed_sales:
                loc = location_by_code[loc_code]
                subtotal = Decimal("0.00")
                sale_obj = Sale(
                    invoice_number=inv_no,
                    location_id=loc.id,
                    cashier_user_id=actor_id,
                    customer_name=cust_name,
                    customer_phone=cust_phone,
                    status=SaleStatus.COMPLETED,
                    subtotal=Decimal("0.00"),
                    total_amount=Decimal("0.00"),
                )
                db.add(sale_obj)
                await db.flush()
                for sku, qty, is_wholesale in lines:
                    prod = product_by_sku[sku]
                    batch = batch_lookup[(loc_code, sku)]
                    unit_p = prod.wholesale_price if is_wholesale else prod.retail_price
                    line_t = unit_p * Decimal(qty)
                    subtotal += line_t
                    batch.current_quantity = max(0, batch.current_quantity - qty)
                    db.add(
                        SaleItem(
                            sale_id=sale_obj.id,
                            product_id=prod.id,
                            batch_id=batch.id,
                            product_name_snapshot=prod.name,
                            batch_number_snapshot=batch.batch_number,
                            quantity=qty,
                            unit_price=unit_p,
                            unit_cost=batch.purchase_cost,
                            line_total=line_t,
                        )
                    )
                    db.add(
                        StockMovement(
                            location_id=loc.id,
                            product_id=prod.id,
                            batch_id=batch.id,
                            movement_type=MovementType.RETAIL_SALE,
                            quantity_change=-qty,
                            balance_after=batch.current_quantity,
                            reference_type="sale",
                            reference_id=str(sale_obj.id),
                            reason=f"{'Wholesale' if is_wholesale else 'Retail'} invoice {inv_no}",
                            performed_by_user_id=actor_id,
                        )
                    )
                sale_obj.subtotal = subtotal
                sale_obj.total_amount = subtotal
                db.add(SalePayment(sale_id=sale_obj.id, payment_method=pay_method, amount=subtotal))

            # 9. Pending Stock Adjustment (requested by Inventory Officer, awaiting Manager/Owner approval)
            seclo_wh = batch_lookup[("WH-01", "MED-SECL-20")]
            db.add(
                StockAdjustment(
                    location_id=wh.id,
                    product_id=product_by_sku["MED-SECL-20"].id,
                    batch_id=seclo_wh.id,
                    quantity_change=-4,
                    reason="Cycle count variance: 4 strips crushed during pallet stacking at Uttara Main Hub",
                    status=AdjustmentStatus.PENDING,
                    requested_by_user_id=inv_officer.id,
                    notes="Verified by warehouse shift lead; awaiting approval.",
                )
            )

            # 10. Rich Audit Trail spanning ALL 8 Staff Roles
            audit_entries = [
                (owner.id, wh.id, "wholesale.order_dispatch", "sale", 4, "Approved wholesale clinic order INV-WH01-W901 from Uttara Main Hub"),
                (manager.id, wh.id, "transfer.approve", "stock_transfer", t2.id, "Approved Gulshan 2 Amoxicillin transfer TRF-UTT-BR04-102"),
                (br_mgr.id, location_by_code["BR-02"].id, "transfer.create", "stock_transfer", t1.id, "Requested emergency Insulin & Azithromycin restock for Mirpur 10"),
                (pharm.id, location_by_code["BR-01"].id, "pos.rx_dispense", "sale", 2, "Verified prescription and dispensed Insulin Glargine via FEFO"),
                (cashier.id, location_by_code["BR-01"].id, "pos.retail_sale", "sale", 1, "Completed walk-in cash checkout INV-BR01-8801 at Uttara Flagship"),
                (inv_officer.id, wh.id, "transfer.dispatch", "stock_transfer", t3.id, "Dispatched 120 strips of Napa Extra from Uttara Hub to Uttara Flagship"),
                (proc.id, wh.id, "purchasing.po_create", "purchase_order", po1.id, "Submitted PO-UTT-2026-001 to Square Pharmaceuticals for Uttara Hub"),
                (acct.id, location_by_code["HQ-01"].id, "finance.supplier_audit", "supplier", sqr.id, "Reconciled Net 30 payable ledger for Square & Incepta Pharma"),
            ]
            for uid, lid, action, etype, eid, reason in audit_entries:
                db.add(
                    AuditLog(
                        user_id=uid,
                        location_id=lid,
                        action=action,
                        entity_type=etype,
                        entity_id=str(eid),
                        reason=reason,
                    )
                )

        await db.commit()
        print("Seed completed: Uttara Main Hub, 7 Dhaka branches, 8 staff roles, 12 SKUs, batches, POs, transfers, sales, and audit trail.")


if __name__ == "__main__":
    asyncio.run(run_seed())
