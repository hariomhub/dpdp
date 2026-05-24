-- CreateTable: ControlFamily
CREATE TABLE "control_families" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "icon"        TEXT,
    "color"       TEXT,
    "status"      TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "control_families_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "control_families_name_key" ON "control_families"("name");

-- CreateTable: ControlFamilyMember
CREATE TABLE "control_family_members" (
    "controlFamilyId" TEXT NOT NULL,
    "controlId"       TEXT NOT NULL,
    "addedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "control_family_members_pkey" PRIMARY KEY ("controlFamilyId","controlId")
);

-- CreateTable: ProductFamily
CREATE TABLE "product_families" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "category"    TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_families_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_families_name_key" ON "product_families"("name");

-- CreateTable: Product
CREATE TABLE "products" (
    "id"              TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "description"     TEXT,
    "vendor"          TEXT,
    "website"         TEXT,
    "logoUrl"         TEXT,
    "category"        TEXT,
    "productFamilyId" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ActionProduct
CREATE TABLE "action_products" (
    "predefinedActionId" TEXT NOT NULL,
    "productId"          TEXT NOT NULL,
    "addedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "action_products_pkey" PRIMARY KEY ("predefinedActionId","productId")
);

-- AddForeignKey
ALTER TABLE "control_family_members" ADD CONSTRAINT "control_family_members_controlFamilyId_fkey"
    FOREIGN KEY ("controlFamilyId") REFERENCES "control_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "control_family_members" ADD CONSTRAINT "control_family_members_controlId_fkey"
    FOREIGN KEY ("controlId") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products" ADD CONSTRAINT "products_productFamilyId_fkey"
    FOREIGN KEY ("productFamilyId") REFERENCES "product_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "action_products" ADD CONSTRAINT "action_products_predefinedActionId_fkey"
    FOREIGN KEY ("predefinedActionId") REFERENCES "control_predefined_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "action_products" ADD CONSTRAINT "action_products_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;