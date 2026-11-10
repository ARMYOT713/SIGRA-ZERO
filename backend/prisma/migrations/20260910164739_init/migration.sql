-- CreateEnum
CREATE TYPE "RolEnum" AS ENUM ('ADMINISTRADOR', 'SOPORTE_TECNICO');

-- CreateTable
CREATE TABLE "postes" (
    "poste_id" SERIAL NOT NULL,
    "codigo" VARCHAR(100) NOT NULL,
    "latitud" DECIMAL(10,8) NOT NULL,
    "longitud" DECIMAL(10,8) NOT NULL,
    "fecha_instalacion" DATE NOT NULL,
    "archivo_kmz" VARCHAR(100),

    CONSTRAINT "postes_pkey" PRIMARY KEY ("poste_id")
);

-- CreateTable
CREATE TABLE "nap" (
    "id_nap" SERIAL NOT NULL,
    "poste_id" INTEGER,
    "codigo_nap" VARCHAR(100) NOT NULL,
    "no_serie" VARCHAR(100),
    "potencia" DECIMAL(5,2),
    "latitud" DECIMAL(10,8) NOT NULL,
    "longitud" DECIMAL(10,8) NOT NULL,
    "capacidad_puertos" SMALLINT,
    "puertos_usados" SMALLINT,
    "archivo_kmz" VARCHAR(100),

    CONSTRAINT "nap_pkey" PRIMARY KEY ("id_nap")
);

-- CreateTable
CREATE TABLE "onus" (
    "id_onus" SERIAL NOT NULL,
    "codigo" VARCHAR(100) NOT NULL,
    "no_serie" VARCHAR(100),
    "cliente_ref" VARCHAR(150),
    "potencia" DECIMAL(5,2),
    "latitud" DECIMAL(10,8) NOT NULL,
    "longitud" DECIMAL(10,8) NOT NULL,
    "fecha_instalacion" DATE NOT NULL,
    "distancia_nap" DECIMAL(8,2),
    "id_nap" INTEGER,

    CONSTRAINT "onus_pkey" PRIMARY KEY ("id_onus")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id_cliente" SERIAL NOT NULL,
    "nombre_completo" VARCHAR(100) NOT NULL,
    "apellido_paterno" VARCHAR(25) NOT NULL,
    "apellido_materno" VARCHAR(25) NOT NULL,
    "contacto" VARCHAR(15) NOT NULL,
    "estatus" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "reportes" (
    "id_reporte" SERIAL NOT NULL,
    "id_onus" INTEGER NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "falla_presentada" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(200) NOT NULL,
    "estatus" BOOLEAN NOT NULL DEFAULT true,
    "fecha_reporte" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_resolucion" TIMESTAMP(6),

    CONSTRAINT "reportes_pkey" PRIMARY KEY ("id_reporte")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id_usuario" SERIAL NOT NULL,
    "nombre_completo" VARCHAR(100) NOT NULL,
    "rol" "RolEnum" NOT NULL DEFAULT 'SOPORTE_TECNICO',
    "password" VARCHAR(255) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- AddForeignKey
ALTER TABLE "nap" ADD CONSTRAINT "nap_poste_id_fkey" FOREIGN KEY ("poste_id") REFERENCES "postes"("poste_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onus" ADD CONSTRAINT "onus_id_nap_fkey" FOREIGN KEY ("id_nap") REFERENCES "nap"("id_nap") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_id_onus_fkey" FOREIGN KEY ("id_onus") REFERENCES "onus"("id_onus") ON DELETE CASCADE ON UPDATE CASCADE;
