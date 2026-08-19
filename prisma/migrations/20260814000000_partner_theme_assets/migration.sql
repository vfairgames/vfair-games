ALTER TABLE "PartnerTheme" DROP COLUMN "theme",
DROP COLUMN "logo",
ADD COLUMN "logoBytes" BYTEA,
ADD COLUMN "logoContentType" TEXT;
