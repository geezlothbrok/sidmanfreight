-- Sidman Freight Consult — complete database schema
--
-- Run once against a fresh Neon database:
--   psql "postgresql://user:pass@host/db?sslmode=require" -f schema.sql
--
-- Generated from the working local database, so it already includes every
-- migration applied during development (invoices, customers, and the shipment
-- regime / consignment-type classification).
--
-- Two deliberate choices carried over from the original design:
--
-- 1) The camelCase columns ("containerNo", "clientName", "fileName", "fileUrl",
--    "updatedBy", "timestamp") are QUOTED. PostgreSQL folds unquoted identifiers
--    to lowercase, which would make SELECT * return "containerno" and break the
--    React app. Anything referencing them in SQL must quote them too.
--
-- 2) The boolean-ish flags (approved, portal_access) are SMALLINT, not BOOLEAN.
--    The PHP compares them as integers; BOOLEAN would return 't'/'f' and
--    silently break those checks.


\restrict yCiwWwVlHXHR9ZsGpywuuKGE20ypiG9YBiN8rTUYhEbmJ0yZv0ZSmTy2SK0GhcH

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    actor_email character varying(150) NOT NULL,
    event_type character varying(30) NOT NULL,
    entity character varying(50),
    description text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;

CREATE TABLE public.customers (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    phone character varying(60),
    email character varying(150),
    gender character varying(20),
    marital_status character varying(20),
    religion character varying(40),
    nationality character varying(40),
    occupation character varying(120),
    location character varying(120),
    notes text,
    created_by character varying(150),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by character varying(150),
    updated_at timestamp without time zone,
    CONSTRAINT customers_gender_chk CHECK (((gender IS NULL) OR ((gender)::text = ANY ((ARRAY['Male'::character varying, 'Female'::character varying])::text[])))),
    CONSTRAINT customers_marital_chk CHECK (((marital_status IS NULL) OR ((marital_status)::text = ANY ((ARRAY['Married'::character varying, 'Single'::character varying, 'Divorced'::character varying, 'Widowed'::character varying])::text[])))),
    CONSTRAINT customers_nationality_chk CHECK (((nationality IS NULL) OR ((nationality)::text = ANY ((ARRAY['Ghanaian'::character varying, 'Non-Ghanaian'::character varying])::text[])))),
    CONSTRAINT customers_religion_chk CHECK (((religion IS NULL) OR ((religion)::text = ANY ((ARRAY['Christianity'::character varying, 'Islam'::character varying, 'Traditional'::character varying, 'Other'::character varying])::text[]))))
);

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;

CREATE TABLE public.employees (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    phone character varying(50),
    role character varying(50) DEFAULT 'Agent'::character varying NOT NULL,
    base_salary numeric(12,2) DEFAULT 0.00 NOT NULL,
    status character varying(50) DEFAULT 'Active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    portal_access smallint DEFAULT 1 NOT NULL,
    password_hash character varying(255)
);

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;

CREATE TABLE public.invoice_items (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    section smallint NOT NULL,
    description character varying(200) NOT NULL,
    qty numeric(10,2),
    rate numeric(12,2),
    sort_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT invoice_items_section_check CHECK ((section = ANY (ARRAY[1, 2])))
);

CREATE SEQUENCE public.invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.invoice_items_id_seq OWNED BY public.invoice_items.id;

CREATE TABLE public.invoices (
    id integer NOT NULL,
    invoice_no character varying(60) NOT NULL,
    invoice_date date DEFAULT CURRENT_DATE NOT NULL,
    client_name character varying(200) NOT NULL,
    client_address text,
    client_phone character varying(60),
    subject character varying(200),
    mode character varying(60),
    bl_no character varying(100),
    consolidation character varying(30),
    vat_rate numeric(5,2) DEFAULT 20.00 NOT NULL,
    deposit numeric(12,2) DEFAULT 0 NOT NULL,
    status character varying(30) DEFAULT 'Draft'::character varying NOT NULL,
    notes text,
    created_by character varying(150),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by character varying(150),
    updated_at timestamp without time zone
);

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;

CREATE TABLE public.shipment_files (
    id integer NOT NULL,
    shipment_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    mime_type character varying(150),
    file_size integer,
    file_data text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE public.shipment_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.shipment_files_id_seq OWNED BY public.shipment_files.id;

CREATE TABLE public.shipments (
    id integer NOT NULL,
    "containerNo" character varying(100) NOT NULL,
    "clientName" character varying(150) NOT NULL,
    status character varying(50) DEFAULT 'Pending Customs Review'::character varying NOT NULL,
    origin character varying(150),
    destination character varying(150),
    notes text,
    "fileName" text,
    "fileUrl" text,
    "updatedBy" character varying(150),
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    edited_by character varying(150),
    edited_at timestamp without time zone,
    approved smallint DEFAULT 0 NOT NULL,
    approved_at timestamp without time zone,
    regime character varying(30),
    consignment_type character varying(30),
    customer_id integer,
    CONSTRAINT shipments_consignment_chk CHECK (((consignment_type IS NULL) OR ((consignment_type)::text = ANY ((ARRAY['Vehicles'::character varying, 'General Goods'::character varying])::text[])))),
    CONSTRAINT shipments_regime_chk CHECK (((regime IS NULL) OR ((regime)::text = ANY ((ARRAY['Import'::character varying, 'Export'::character varying, 'Warehousing'::character varying, 'Transit'::character varying, 'Freezones'::character varying])::text[]))))
);

CREATE SEQUENCE public.shipments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.shipments_id_seq OWNED BY public.shipments.id;

CREATE TABLE public.transaction_files (
    id integer NOT NULL,
    transaction_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    mime_type character varying(150),
    file_size integer,
    file_data text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE public.transaction_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.transaction_files_id_seq OWNED BY public.transaction_files.id;

CREATE TABLE public.transactions (
    id integer NOT NULL,
    type character varying(20) NOT NULL,
    amount numeric(12,2) NOT NULL,
    category character varying(150) NOT NULL,
    reference_no character varying(150),
    bill_of_lading character varying(150),
    identification_no character varying(150),
    notes text,
    file_path text,
    date_logged timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);

ALTER TABLE ONLY public.invoice_items ALTER COLUMN id SET DEFAULT nextval('public.invoice_items_id_seq'::regclass);

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);

ALTER TABLE ONLY public.shipment_files ALTER COLUMN id SET DEFAULT nextval('public.shipment_files_id_seq'::regclass);

ALTER TABLE ONLY public.shipments ALTER COLUMN id SET DEFAULT nextval('public.shipments_id_seq'::regclass);

ALTER TABLE ONLY public.transaction_files ALTER COLUMN id SET DEFAULT nextval('public.transaction_files_id_seq'::regclass);

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_email_key UNIQUE (email);

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_no_key UNIQUE (invoice_no);

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.shipment_files
    ADD CONSTRAINT shipment_files_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.transaction_files
    ADD CONSTRAINT transaction_files_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);

CREATE INDEX idx_audit_created ON public.audit_log USING btree (created_at DESC);

CREATE INDEX idx_customers_name ON public.customers USING btree (upper((name)::text));

CREATE INDEX idx_invoice_items_inv ON public.invoice_items USING btree (invoice_id, section, sort_order);

CREATE INDEX idx_invoices_created ON public.invoices USING btree (created_at DESC);

CREATE INDEX idx_invoices_no ON public.invoices USING btree (upper((invoice_no)::text));

CREATE INDEX idx_shipment_files_ship ON public.shipment_files USING btree (shipment_id);

CREATE INDEX idx_shipments_consignment ON public.shipments USING btree (consignment_type);

CREATE INDEX idx_shipments_container ON public.shipments USING btree (upper(("containerNo")::text));

CREATE INDEX idx_shipments_customer ON public.shipments USING btree (customer_id);

CREATE INDEX idx_shipments_regime ON public.shipments USING btree (regime);

CREATE INDEX idx_shipments_updatedby ON public.shipments USING btree ("updatedBy");

CREATE INDEX idx_transaction_files_tx ON public.transaction_files USING btree (transaction_id);

CREATE INDEX idx_transactions_type ON public.transactions USING btree (type);

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.shipment_files
    ADD CONSTRAINT shipment_files_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_customer_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.transaction_files
    ADD CONSTRAINT transaction_files_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;

\unrestrict yCiwWwVlHXHR9ZsGpywuuKGE20ypiG9YBiN8rTUYhEbmJ0yZv0ZSmTy2SK0GhcH
