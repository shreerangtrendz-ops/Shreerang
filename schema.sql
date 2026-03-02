


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "admin";


ALTER SCHEMA "admin" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."archive_profile_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  INSERT INTO public.user_profile_history (
    profile_id, 
    full_name, 
    firm_name, 
    email, 
    phone_number, 
    gst_number, 
    address, 
    delivery_address,
    transport,
    assigned_agent_id,
    changed_by,
    change_reason
  )
  VALUES (
    OLD.id,
    OLD.full_name,
    OLD.firm_name,
    OLD.email,
    OLD.phone_number,
    OLD.gst_number,
    OLD.address,
    OLD.delivery_address,
    OLD.transport,
    OLD.assigned_agent_id,
    auth.uid(),
    'Profile Updated'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."archive_profile_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_populate_company_context"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Set created_by to current user if not set
    IF NEW.created_by IS NULL THEN
        NEW.created_by := auth.uid();
    END IF;

    -- Set company_id from user profile if not set
    IF NEW.company_id IS NULL AND auth.uid() IS NOT NULL THEN
        SELECT company_id INTO NEW.company_id
        FROM user_profiles
        WHERE id = auth.uid();
    END IF;

    -- Set tenant_id from user profile if not set (assuming tenant_id is same as company_id for now)
    IF NEW.tenant_id IS NULL AND auth.uid() IS NOT NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM user_profiles
        WHERE id = auth.uid();
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_populate_company_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_gst_exists"("gst_input" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM user_profiles WHERE gst_number = gst_input);
END;
$$;


ALTER FUNCTION "public"."check_gst_exists"("gst_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_order_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
  new_number TEXT;
BEGIN
  new_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('public.order_number_seq')::TEXT, 4, '0');
  RETURN new_number;
END;
$$;


ALTER FUNCTION "public"."generate_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_sales_order_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
  new_number TEXT;
BEGIN
  new_number := 'SO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('public.sales_order_number_seq')::TEXT, 4, '0');
  RETURN new_number;
END;
$$;


ALTER FUNCTION "public"."generate_sales_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_analytics_design_stats"() RETURNS TABLE("fabric_type" "text", "design_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY 
  SELECT fm.type::text, COUNT(d.id) 
  FROM designs d 
  LEFT JOIN fabric_master fm ON d.fabric_master_id = fm.id 
  GROUP BY fm.type;
END;
$$;


ALTER FUNCTION "public"."get_analytics_design_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_analytics_fabric_count"() RETURNS TABLE("fabric_type" "text", "count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY SELECT fm.type::text, COUNT(*) FROM fabric_master fm GROUP BY fm.type;
END;
$$;


ALTER FUNCTION "public"."get_analytics_fabric_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_analytics_price_trends"() RETURNS TABLE("date" "date", "avg_price" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY SELECT effective_date::DATE, AVG(price) FROM fabric_prices GROUP BY effective_date::DATE ORDER BY effective_date::DATE;
END;
$$;


ALTER FUNCTION "public"."get_analytics_price_trends"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_analytics_unit_performance"() RETURNS TABLE("unit_name" "text", "fabric_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY 
  SELECT u.unit_name, COUNT(DISTINCT jp.fabric_master_id)
  FROM job_work_units u
  LEFT JOIN job_prices jp ON u.id = jp.job_work_unit_id
  GROUP BY u.unit_name;
END;
$$;


ALTER FUNCTION "public"."get_analytics_unit_performance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_distinct_widths"() RETURNS TABLE("width" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT (specifications->>'width')::TEXT as width
    FROM public.products
    WHERE specifications->>'width' IS NOT NULL
    ORDER BY width;
END;
$$;


ALTER FUNCTION "public"."get_distinct_widths"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role 
    FROM public.user_profiles 
    WHERE id = auth.uid();
    RETURN user_role;
END;
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recent_sales_orders"("limit_count" integer) RETURNS TABLE("id" "uuid", "order_no" "text", "party_name" "text", "final_amount" numeric, "status" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        so.id,
        so.order_no,
        so.party_details->>'name' AS party_name,
        (so.totals->>'final')::numeric AS final_amount,
        so.status,
        so.created_at
    FROM
        public.sales_orders so
    ORDER BY
        so.created_at DESC
    LIMIT
        limit_count;
END;
$$;


ALTER FUNCTION "public"."get_recent_sales_orders"("limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sales_by_category"("start_date" timestamp with time zone, "end_date" timestamp with time zone) RETURNS TABLE("id" "uuid", "name" "text", "sales" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.name,
        SUM(oi.total_price) AS sales
    FROM
        public.order_items oi
    JOIN
        public.orders o ON oi.order_id = o.id
    JOIN
        public.products p ON oi.product_id = p.id
    JOIN
        public.categories c ON p.category_id = c.id
    WHERE
        o.created_at BETWEEN start_date AND end_date
    GROUP BY
        c.id, c.name
    ORDER BY
        sales DESC;
END;
$$;


ALTER FUNCTION "public"."get_sales_by_category"("start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sales_trend"("start_date" "date", "end_date" "date") RETURNS TABLE("date" "date", "sales" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        gs::date,
        COALESCE(SUM(o.final_amount), 0) AS sales
    FROM
        generate_series(start_date, end_date, '1 day'::interval) AS gs
    LEFT JOIN
        public.orders o ON o.created_at::date = gs::date
    GROUP BY
        gs::date
    ORDER BY
        gs::date;
END;
$$;


ALTER FUNCTION "public"."get_sales_trend"("start_date" "date", "end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_customers"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "limit_count" integer) RETURNS TABLE("customer_name" "text", "total_revenue" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.customer_name,
        SUM(o.final_amount) AS total_revenue
    FROM
        public.orders o
    WHERE
        o.created_at BETWEEN start_date AND end_date
    GROUP BY
        o.customer_name
    ORDER BY
        total_revenue DESC
    LIMIT
        limit_count;
END;
$$;


ALTER FUNCTION "public"."get_top_customers"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_selling_products"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "limit_count" integer) RETURNS TABLE("product_id" "uuid", "product_name" "text", "total_quantity" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        oi.product_id,
        oi.product_name,
        SUM(oi.quantity) AS total_quantity
    FROM
        public.order_items oi
    JOIN
        public.orders o ON oi.order_id = o.id
    WHERE
        o.created_at BETWEEN start_date AND end_date
    GROUP BY
        oi.product_id, oi.product_name
    ORDER BY
        total_quantity DESC
    LIMIT
        limit_count;
END;
$$;


ALTER FUNCTION "public"."get_top_selling_products"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF new.email = 'kumarmaru7@gmail.com' THEN
      INSERT INTO public.user_profiles (id, email, full_name, role, is_approved)
      VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', 'System Admin'), 'admin', true)
      ON CONFLICT (id) DO UPDATE SET role = 'admin', is_approved = true;
  ELSE
      INSERT INTO public.user_profiles (id, email, full_name, role)
      VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'customer')
      ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_sensitive_action"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id::text, row_to_json(NEW));
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_sensitive_action"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_created_by"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.created_by = auth.uid();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_created_by"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_sales_order_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  IF NEW.order_no IS NULL OR NEW.order_no = '' THEN
    NEW.order_no := public.generate_sales_order_number();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_sales_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE whatsapp_conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_stock_summary_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    target_design_id uuid;
    total_kg numeric;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_design_id := OLD.design_id;
    ELSE
        target_design_id := NEW.design_id;
    END IF;

    -- Calculate total
    SELECT COALESCE(SUM(quantity_kg), 0) INTO total_kg
    FROM stock_rolls
    WHERE design_id = target_design_id;

    -- Update or Insert Summary
    INSERT INTO stock_summary (design_id, total_stock_kg, available_stock_kg, last_updated)
    VALUES (target_design_id, total_kg, total_kg, now()) 
    ON CONFLICT (design_id) 
    DO UPDATE SET 
        total_stock_kg = EXCLUDED.total_stock_kg,
        available_stock_kg = EXCLUDED.total_stock_kg - stock_summary.reserved_stock_kg,
        last_updated = now();
        
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_stock_summary_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "admin"."backup_metadata" (
    "id" integer NOT NULL,
    "object_type" "text",
    "object_name" "text",
    "ddl" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "admin"."backup_metadata" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "admin"."backup_metadata_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "admin"."backup_metadata_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "admin"."backup_metadata_id_seq" OWNED BY "admin"."backup_metadata"."id";



CREATE TABLE IF NOT EXISTS "public"."accessories_consumption" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "accessory_name" "text",
    "unit" "text",
    "consumption_per_piece" numeric,
    "cost_calculation" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."accessories_consumption" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key_name" "text" NOT NULL,
    "key_value" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."admin_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_commissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid",
    "sales_order_id" "uuid",
    "order_number" "text",
    "firm_name" "text",
    "order_date" "date",
    "order_total" numeric,
    "commission_percentage" numeric,
    "commission_amount" numeric,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_commissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "code" "text",
    "contact_person" "text",
    "phone" "text",
    "email" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "country" "text",
    "pincode" "text",
    "commission_percentage" numeric,
    "notes" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "agent_name" "text"
);


ALTER TABLE "public"."agents" OWNER TO "postgres";


COMMENT ON TABLE "public"."agents" IS 'Table storing agent information';



CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "appointment_date" "date" NOT NULL,
    "appointment_time" "text" NOT NULL,
    "purpose" "text" NOT NULL,
    "message" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "appointments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'cancelled'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "text",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."base_fabric_job_workers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "base_fabric_id" "uuid",
    "job_worker_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."base_fabric_job_workers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."base_fabric_suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "base_fabric_id" "uuid",
    "supplier_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."base_fabric_suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."base_fabrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "base_fabric_name" "text" NOT NULL,
    "hsn_code" "text",
    "base" "text",
    "width" "text",
    "gsm" numeric,
    "weight" numeric,
    "yarn_count" "text",
    "construction" "text",
    "stretchability" "text" DEFAULT false,
    "transparency" "text" DEFAULT false,
    "description" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "alias_names" "jsonb" DEFAULT '[]'::"jsonb",
    "is_starred" boolean DEFAULT false,
    "starred_at" timestamp with time zone,
    "supplier_id" "uuid",
    "hsn_code_description" "text",
    "gst_rate" numeric,
    "supplier_contact" "text",
    "supplier_cost" numeric,
    "notes" "text",
    "ready_stock" boolean DEFAULT false,
    "out_of_stock" boolean DEFAULT false,
    "gsm_tolerance" "text",
    "construction_code" "text",
    "base_code" "text",
    "handfeel" "text",
    "yarn_type" "text",
    "finish_type" "text",
    "sku" "text",
    "short_code" "text",
    "finish" "text" DEFAULT 'Greige'::"text",
    "fabric_name" "text",
    "process" "text",
    "generated_name" "text",
    "generated_sku" "text",
    CONSTRAINT "base_fabrics_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."base_fabrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batch_costing" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_id" "text",
    "total_grey_cost" numeric,
    "total_job_cost" numeric,
    "total_batch_cost" numeric,
    "total_saleable_mtrs" numeric,
    "factory_cost_per_mtr" numeric,
    "margin_percent" numeric,
    "base_selling_rate" numeric,
    "final_selling_price" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."batch_costing" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brokerage_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text",
    "agent_name" "text" NOT NULL,
    "bill_number" "text",
    "bill_amount" numeric,
    "percentage" numeric,
    "amount" numeric,
    "entry_date" "date" DEFAULT CURRENT_DATE,
    "notes" "text",
    "status" "text" DEFAULT 'Pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "brokerage_entries_type_check" CHECK (("type" = ANY (ARRAY['Commission'::"text", 'Brokerage'::"text"])))
);


ALTER TABLE "public"."brokerage_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bulk_bills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bill_image_url" "text",
    "bill_type" "text" NOT NULL,
    "extracted_data" "jsonb",
    "mapped_fabric_id" "uuid",
    "fabric_type" "text",
    "supplier_id" "uuid",
    "job_worker_id" "uuid",
    "bill_amount" numeric,
    "bill_date" "date",
    "status" "text" DEFAULT 'Pending'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bulk_bills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bulk_enquiries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "company_name" "text",
    "product_category" "text",
    "quantity_required" integer,
    "message" "text",
    "status" "text" DEFAULT 'new'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bulk_enquiries_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'contacted'::"text", 'quoted'::"text", 'converted'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."bulk_enquiries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bulk_item_import_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "import_id" "uuid",
    "item_name" "text" NOT NULL,
    "unique_details" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bulk_item_import_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bulk_item_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "import_name" "text" NOT NULL,
    "item_type" "text" NOT NULL,
    "common_details" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'draft'::"text",
    "total_items" integer DEFAULT 0,
    "imported_count" integer DEFAULT 0,
    "failed_count" integer DEFAULT 0,
    "error_log" "jsonb" DEFAULT '[]'::"jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bulk_item_imports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bulk_uploads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "upload_type" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text",
    "total_rows" integer DEFAULT 0,
    "successful_rows" integer DEFAULT 0,
    "failed_rows" integer DEFAULT 0,
    "status" "text" DEFAULT 'pending'::"text",
    "error_log" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bulk_uploads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "parent_id" "uuid",
    "level" integer DEFAULT 1 NOT NULL,
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."category_visibility" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_key" "text" NOT NULL,
    "is_visible" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."category_visibility" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."city_visit_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_date" "date" NOT NULL,
    "city" "text" NOT NULL,
    "salesperson_id" "uuid",
    "salesperson_name" "text" NOT NULL,
    "ai_optimized_route" "jsonb" DEFAULT '[]'::"jsonb",
    "total_customers" integer DEFAULT 0,
    "estimated_duration_hours" numeric(4,1),
    "products_to_carry" "text"[],
    "plan_notes" "text",
    "status" "text" DEFAULT 'Draft'::"text",
    "actual_customers_visited" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."city_visit_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "logo" "text",
    "address" "text",
    "contact" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "color_primary" "text",
    "color_secondary" "text"
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "customer_id" "uuid",
    "message_text" "text",
    "sender" "text",
    "message_type" "text" DEFAULT 'text'::"text",
    "attachment_url" "text",
    "status" "text" DEFAULT 'sent'::"text",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "conversations_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'document'::"text", 'price_quote'::"text", 'order_form'::"text"]))),
    CONSTRAINT "conversations_sender_check" CHECK (("sender" = ANY (ARRAY['customer'::"text", 'admin'::"text", 'bot'::"text"]))),
    CONSTRAINT "conversations_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'delivered'::"text", 'read'::"text"])))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations_extended" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "summary" "text",
    "sentiment" "text",
    "tags" "text"[],
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversations_extended" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cost_sheets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "design_id" "uuid",
    "base_fabric_cost" numeric DEFAULT 0,
    "dyeing_cost" numeric DEFAULT 0,
    "processing_cost" numeric DEFAULT 0,
    "cutting_cost" numeric DEFAULT 0,
    "transport_cost" numeric DEFAULT 0,
    "overhead_cost" numeric DEFAULT 0,
    "margin_percent" numeric DEFAULT 20,
    "cost_per_meter" numeric GENERATED ALWAYS AS (((((("base_fabric_cost" + "dyeing_cost") + "processing_cost") + "cutting_cost") + "transport_cost") + "overhead_cost")) STORED,
    "selling_price_per_meter" numeric,
    "created_by" "uuid",
    "tenant_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "fabric_type" "text",
    "costing_method" "text",
    "design_number" "text",
    "fabric_id" "uuid",
    "process_type" "text",
    "value_addition_type" "text",
    "grey_input_qty" numeric,
    "grey_rate" numeric,
    "buying_commission_percent" numeric,
    "transportation_percent" numeric,
    "print_job_charge" numeric,
    "finish_mtr_received" numeric,
    "shortage_percent" numeric,
    "basic_grey_amount" numeric,
    "buying_commission_amount" numeric,
    "transportation_amount" numeric,
    "net_grey_cost" numeric,
    "total_batch_cost" numeric,
    "final_cost_per_mtr" numeric,
    "grey_purchase_cost" numeric,
    "dyeing_job_bill" numeric,
    "schiffli_job_charge" numeric,
    "deca_washing_charge" numeric,
    "scalping_border_cut" numeric,
    "folding_packing" numeric,
    "total_saleable_mtrs" numeric,
    "profit_percent" numeric,
    "dhara_percent" numeric,
    "factory_cost_per_mtr" numeric,
    "final_selling_price" numeric,
    "notes" "text",
    "execution_order_used" "jsonb",
    "cost_breakdown_by_stage" "jsonb"
);


ALTER TABLE "public"."cost_sheets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."costing_components" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "component_name" "text",
    "cost" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."costing_components" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."costing_parameters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "parameter_name" "text" NOT NULL,
    "parameter_value" numeric NOT NULL,
    "unit" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."costing_parameters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."costing_paths" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "path_name" "text" NOT NULL,
    "path_number" integer,
    "components" "jsonb",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "execution_order" "jsonb"
);


ALTER TABLE "public"."costing_paths" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."costing_sheets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "fabric_item_id" "uuid",
    "garment_id" "uuid",
    "costing_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."costing_sheets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."country_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "country" "text" NOT NULL,
    "country_code" "text" NOT NULL,
    "phone_code" "text"
);


ALTER TABLE "public"."country_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_dropdown_values" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "value" "text" NOT NULL,
    "label" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."custom_dropdown_values" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_name" "text" NOT NULL,
    "item_sku" "text",
    "item_category" "text",
    "default_unit" "text",
    "default_price" numeric,
    "specifications" "jsonb",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."custom_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'Active'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "customer_categories_status_check" CHECK (("status" = ANY (ARRAY['Active'::"text", 'Inactive'::"text"])))
);


ALTER TABLE "public"."customer_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_delivery_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "address_nickname" "text",
    "address_line" "text" NOT NULL,
    "city" "text",
    "state" "text",
    "country" "text",
    "pincode" "text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_delivery_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "interaction_type" character varying(50) NOT NULL,
    "fabric_sku" character varying(100),
    "fabric_name" character varying(255),
    "conversation_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "customer_interactions_interaction_type_check" CHECK ((("interaction_type")::"text" = ANY ((ARRAY['viewed_fabric'::character varying, 'requested_quote'::character varying, 'placed_order'::character varying, 'inquiry'::character varying, 'follow_up'::character varying])::"text"[])))
);


ALTER TABLE "public"."customer_interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_portal_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "catalogue" boolean DEFAULT true,
    "pricing" boolean DEFAULT false,
    "orders" boolean DEFAULT true,
    "tracking" boolean DEFAULT true,
    "invoices" boolean DEFAULT false,
    "ledger" boolean DEFAULT false,
    "new_order" boolean DEFAULT false,
    "samples" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_portal_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_requirements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "customer_id" "uuid",
    "requirement_description" "text",
    "images" "jsonb" DEFAULT '[]'::"jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "supplier_id" "uuid",
    "deadline" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "customer_requirements_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'fulfilled'::"text"])))
);


ALTER TABLE "public"."customer_requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "address" "text",
    "gst_number" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "user_id" "uuid",
    "company_name" "text",
    "contact_person" "text",
    "city" "text",
    "state" "text",
    "zip_code" "text",
    "payment_terms" "text" DEFAULT 'Net 30'::"text",
    "credit_limit" numeric DEFAULT 0,
    "status" "text" DEFAULT 'active'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "country" "text" DEFAULT 'India'::"text",
    "bank_details" "text",
    "notes" "text",
    "pincode" "text",
    "country_code" "text" DEFAULT 'IN'::"text",
    "agent_id" "uuid",
    "credit_days" integer DEFAULT 0,
    "firm_name" "text",
    "billing_address" "text",
    "delivery_address" "text",
    "language_preference" "text" DEFAULT 'English'::"text",
    "communication_style" "text" DEFAULT 'Formal'::"text",
    "business_type" "text",
    "location" "text",
    "website" "text",
    "tier" "text" DEFAULT 'Standard'::"text",
    "source" "text",
    "last_contact" timestamp with time zone,
    "conversation_history" "jsonb" DEFAULT '[]'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_restricted" boolean DEFAULT false,
    "portal_access_enabled" boolean DEFAULT false
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."design_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_descriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "concept" "text",
    "style" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."design_descriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "fabric_master_id" "uuid",
    "supplier_id" "uuid",
    "product_structure" "text",
    "common_price" numeric,
    "common_stock" integer,
    "common_pattern_type" "text",
    "notes" "text",
    "created_by" "uuid",
    "tenant_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."design_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "design_id" "uuid",
    "image_url" "text" NOT NULL,
    "image_size_original" integer,
    "image_size_optimized" integer,
    "alt_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."design_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_layouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "layout_name" "text" NOT NULL
);


ALTER TABLE "public"."design_layouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_ready_stock" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "design_id" "text" NOT NULL,
    "fabric_id" "uuid",
    "quantity_available" numeric DEFAULT 0,
    "warehouse_location" "text",
    "last_updated_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."design_ready_stock" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_set_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "design_set_id" "uuid",
    "component_type" "text" NOT NULL,
    "design_number" "text" NOT NULL,
    "design_name" "text",
    "fabric_type" "text",
    "fabric_id" "uuid",
    "fabric_name" "text",
    "photo_url" "text",
    "sequence" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."design_set_components" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "master_design_number" "text" NOT NULL,
    "design_name" "text",
    "description" "text",
    "set_photo_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "design_sets_type_check" CHECK (("type" = ANY (ARRAY['Single'::"text", '2-Pc Set'::"text", '3-Pc Set'::"text", 'Combo Set'::"text"])))
);


ALTER TABLE "public"."design_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_uploads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fabric_master_id" "uuid",
    "design_number" "text" NOT NULL,
    "component_design_numbers" "jsonb",
    "design_name" "text" NOT NULL,
    "color_variants" "text"[],
    "pattern_type" "text",
    "exact_gsm" numeric,
    "exact_weight_kg" numeric,
    "price" numeric NOT NULL,
    "stock" numeric DEFAULT 0,
    "product_structure" "text" NOT NULL,
    "design_images" "jsonb",
    "notes" "text",
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "text"
);


ALTER TABLE "public"."design_uploads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."designs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "design_group_id" "uuid",
    "design_number" "text" NOT NULL,
    "design_name" "text",
    "color_variant" "text",
    "exact_gsm" numeric,
    "exact_weight_kg" numeric,
    "price_override" numeric,
    "stock_override" integer,
    "pattern_type_override" "text",
    "notes" "text",
    "status" "text" DEFAULT 'Active'::"text",
    "created_by" "uuid",
    "tenant_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "category_id" "uuid",
    "image_url" "text",
    "file_name" "text",
    "bunny_url" "text",
    "descriptions" "text"[],
    "fabric_id" "uuid"
);


ALTER TABLE "public"."designs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dispatch_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pending_order_id" "uuid",
    "bill_number" "text" NOT NULL,
    "dispatch_date" "date" NOT NULL,
    "dispatch_quantity" numeric NOT NULL,
    "future_dispatch" boolean DEFAULT false,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dispatch_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."drive_synced_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "drive_file_id" "text",
    "file_name" "text",
    "file_type" "text",
    "file_size" bigint,
    "drive_url" "text",
    "cdn_url" "text",
    "storage_path" "text",
    "synced_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."drive_synced_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dropdown_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dropdown_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dropdown_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "value" "text" NOT NULL,
    "code" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "option_name" "text",
    "option_code" "text"
);


ALTER TABLE "public"."dropdown_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body" "text",
    "status" "text" NOT NULL,
    "error_message" "text",
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "notification_type" "text",
    "reference_id" "text"
);


ALTER TABLE "public"."email_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expense_hsn_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_name" character varying NOT NULL,
    "hsn_code" character varying NOT NULL,
    "hsn_code_description" "text",
    "gst_rate" numeric NOT NULL,
    "status" character varying DEFAULT 'active'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."expense_hsn_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_aliases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fabric_id" "uuid",
    "alias_name" "text" NOT NULL
);


ALTER TABLE "public"."fabric_aliases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "tenant_id" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid"
);


ALTER TABLE "public"."fabric_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_costs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fabric_id" "uuid",
    "cost_type" "text",
    "rate" numeric DEFAULT 0,
    "moq" numeric DEFAULT 0,
    "moq_surcharge" numeric DEFAULT 10,
    "last_updated_date" timestamp with time zone DEFAULT "now"(),
    "job_worker_id" "uuid"
);


ALTER TABLE "public"."fabric_costs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_designs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fabric_id" "uuid",
    "design_number" "text",
    "design_name" "text"
);


ALTER TABLE "public"."fabric_designs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_headings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "tenant_id" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid"
);


ALTER TABLE "public"."fabric_headings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fabric_sku" character varying(100) NOT NULL,
    "fabric_name" character varying(255) NOT NULL,
    "fabric_category" character varying(50) NOT NULL,
    "image_url" "text" NOT NULL,
    "image_type" character varying(20) DEFAULT 'main'::character varying,
    "display_order" integer DEFAULT 0,
    "tier_visibility" character varying(20) DEFAULT 'REGISTERED'::character varying,
    "is_exclusive" boolean DEFAULT false,
    "width" character varying(10),
    "composition" "text",
    "weight" character varying(50),
    "care_instructions" "text",
    "design_number" character varying(100),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fabric_images_fabric_category_check" CHECK ((("fabric_category")::"text" = ANY ((ARRAY['Base'::character varying, 'Finish'::character varying, 'Fancy Base'::character varying, 'Fancy Finish'::character varying])::"text"[]))),
    CONSTRAINT "fabric_images_image_type_check" CHECK ((("image_type")::"text" = ANY ((ARRAY['main'::character varying, 'front'::character varying, 'back'::character varying, 'close_up'::character varying, 'texture'::character varying])::"text"[]))),
    CONSTRAINT "fabric_images_tier_visibility_check" CHECK ((("tier_visibility")::"text" = ANY ((ARRAY['PUBLIC'::character varying, 'REGISTERED'::character varying, 'VIP'::character varying])::"text"[])))
);


ALTER TABLE "public"."fabric_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_item_completion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fabric_item_id" "uuid",
    "field_name" "text",
    "is_filled" boolean,
    "completion_percentage" numeric,
    "missing_fields" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fabric_item_completion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_type_id" "uuid",
    "item_type_name" "text",
    "item_name" "text" NOT NULL,
    "sku" "text",
    "category" "text",
    "specifications" "jsonb" DEFAULT '{}'::"jsonb",
    "unit" "text" DEFAULT 'meters'::"text",
    "base_price" numeric,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."fabric_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_master" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid",
    "subcategory_id" "uuid",
    "fabric_type_id" "uuid",
    "heading_id" "uuid",
    "width_id" "uuid",
    "min_weight_kg" numeric NOT NULL,
    "max_weight_kg" numeric NOT NULL,
    "gsm_value" numeric,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "tenant_id" "text",
    "company_id" "uuid",
    "hsn_code" "text",
    "sku" "text",
    "specifications" "text",
    "width_options" "text",
    "type" "text"
);


ALTER TABLE "public"."fabric_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_masters" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "text",
    "name" "text",
    "sku" "text",
    "base_fabric_details" "jsonb",
    "process_spec" "jsonb",
    "va_spec" "jsonb",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fabric_masters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fabric_master_id" "uuid",
    "cost_price" numeric DEFAULT 0,
    "margin_percent" numeric DEFAULT 0,
    "discount_percent" numeric DEFAULT 0,
    "commission_percent" numeric DEFAULT 0,
    "selling_price" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "price" numeric,
    "effective_date" "date" DEFAULT CURRENT_DATE
);


ALTER TABLE "public"."fabric_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_specifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fabric_id" "uuid",
    "process_type_id" "uuid",
    "process_subtype_id" "uuid",
    "design_layout_id" "uuid",
    "std_top_consumption" numeric DEFAULT 0,
    "std_bottom_consumption" numeric DEFAULT 0,
    "std_dupatta_consumption" numeric DEFAULT 0,
    "damage_contingency_percent" numeric DEFAULT 0,
    "thread_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fabric_specifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_stock" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fabric_id" "uuid",
    "warehouse_location_id" "uuid",
    "ready_stock" numeric DEFAULT 0,
    "wip_stock" numeric DEFAULT 0,
    "damage_stock" numeric DEFAULT 0,
    "last_updated_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fabric_stock" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_subcategories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "tenant_id" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid"
);


ALTER TABLE "public"."fabric_subcategories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_terms_conditions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_name" "text" NOT NULL,
    "template_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fabric_terms_conditions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subcategory_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "tenant_id" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid",
    "gsm_min" numeric,
    "gsm_max" numeric
);


ALTER TABLE "public"."fabric_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "fabric_id" "uuid",
    "fabric_name" "text",
    "viewed_at" timestamp with time zone DEFAULT "now"(),
    "duration_seconds" integer,
    "source" "text"
);


ALTER TABLE "public"."fabric_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_widths" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "width_value" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "tenant_id" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid"
);


ALTER TABLE "public"."fabric_widths" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fabric_name" "text" NOT NULL,
    "hsn_code" "text",
    "set_type" "text",
    "base_category" "text",
    "base_type" "text",
    "width" "text",
    "gsm" numeric,
    "weight" numeric,
    "yarn_count" "text",
    "construction" "text",
    "finish" "text",
    "stretchability" "text",
    "transparency" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "design_name" "text",
    "process_type" "text",
    "sku" "text"
);


ALTER TABLE "public"."fabrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fancy_base_fabrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "base_fabric_id" "uuid",
    "fabric_name" "text",
    "sku" "text",
    "value_addition" "text",
    "thread" "text",
    "concept" "text",
    "width" "text",
    "short_code" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "process" "text",
    "generated_name" "text",
    "generated_sku" "text"
);


ALTER TABLE "public"."fancy_base_fabrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fancy_finish_fabrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "finish_fabric_id" "uuid",
    "fancy_finish_name" "text" NOT NULL,
    "value_addition_check" boolean DEFAULT true,
    "value_addition_type" "text",
    "hakoba_thread" "text",
    "hakoba_type" "text",
    "embroidery_description" "text",
    "embroidery_type" "text",
    "handwork_description" "text",
    "components" "text",
    "set_type" "text",
    "description" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "is_starred" boolean DEFAULT false,
    "starred_at" timestamp with time zone,
    "supplier_id" "uuid",
    "job_worker_id" "uuid",
    "hsn_code" character varying,
    "hsn_code_description" "text",
    "gst_rate" numeric,
    "value_addition_hsn_code" character varying,
    "value_addition_hsn_code_description" "text",
    "value_addition_gst_rate" numeric,
    "job_worker_contact" "text",
    "job_worker_cost" numeric,
    "notes" "text",
    "design_image_url" "text",
    "design_number" "text",
    "design_information" "text",
    "ready_stock" boolean DEFAULT false,
    "out_of_stock" boolean DEFAULT false,
    "thread_type" "text",
    "concept" "text",
    "concept_code" "text",
    "value_addition_code" "text",
    "fancy_finish_fabric_sku" "text",
    "fabric_name" "text",
    "finish_width" "text",
    "process_type" "text",
    "class" "text",
    "tags" "text",
    "process" "text",
    "value_addition" "text",
    "finish_type" "text",
    "generated_name" "text",
    "generated_sku" "text"
);


ALTER TABLE "public"."fancy_finish_fabrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fancy_finish_fabrics_v2" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_fabric_id" "uuid" NOT NULL,
    "source_fabric_type" "text" NOT NULL,
    "fabric_name" "text",
    "sku" "text",
    "value_addition" "text",
    "thread" "text",
    "concept" "text",
    "process_history" "jsonb" DEFAULT '[]'::"jsonb",
    "last_process_code" "text",
    "last_process_name" "text",
    "width" "text",
    "short_code" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."fancy_finish_fabrics_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."field_customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_code" "text",
    "business_name" "text" NOT NULL,
    "contact_person" "text",
    "phone" "text",
    "whatsapp" "text",
    "email" "text",
    "address" "text",
    "city" "text" NOT NULL,
    "state" "text" DEFAULT 'Gujarat'::"text",
    "pincode" "text",
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "google_maps_link" "text",
    "customer_tier" "text" DEFAULT 'Regular'::"text",
    "business_type" "text",
    "typical_requirements" "text",
    "preferred_products" "text"[],
    "payment_terms" "text" DEFAULT 'Credit 30 days'::"text",
    "credit_limit" numeric(12,2) DEFAULT 0,
    "outstanding_balance" numeric(12,2) DEFAULT 0,
    "is_restricted" boolean DEFAULT false,
    "restriction_reason" "text",
    "restriction_date" "date",
    "last_visit_date" "date",
    "last_order_date" "date",
    "total_business" numeric(14,2) DEFAULT 0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "field_customers_customer_tier_check" CHECK (("customer_tier" = ANY (ARRAY['Premium'::"text", 'Regular'::"text", 'New'::"text", 'Inactive'::"text"])))
);


ALTER TABLE "public"."field_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."field_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "salesperson_name" "text",
    "visit_type" "text" DEFAULT 'sales'::"text" NOT NULL,
    "visit_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "is_outstation" boolean DEFAULT false,
    "gps_location" "text",
    "gps_link" "text",
    "raw_notes" "text",
    "voice_transcript" "text",
    "ai_summary" "text",
    "customer_requirement" "text",
    "payment_committed_amount" numeric(12,2),
    "payment_committed_date" "date",
    "followup_date" "date",
    "status" "text" DEFAULT 'visited'::"text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "priority" "text" DEFAULT 'medium'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "field_visits_status_check" CHECK (("status" = ANY (ARRAY['visited'::"text", 'followup_scheduled'::"text", 'no_response'::"text", 'order_taken'::"text", 'payment_collected'::"text"]))),
    CONSTRAINT "field_visits_visit_type_check" CHECK (("visit_type" = ANY (ARRAY['sales'::"text", 'payment'::"text", 'followup'::"text"])))
);


ALTER TABLE "public"."field_visits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."file_compressions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "original_file_name" "text",
    "compressed_file_name" "text",
    "original_size" numeric,
    "compressed_size" numeric,
    "compression_ratio" numeric,
    "file_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."file_compressions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."filter_presets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "category" "text" NOT NULL,
    "preset_name" "text" NOT NULL,
    "filter_config" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."filter_presets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."finish_fabric_designs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "finish_fabric_id" "uuid",
    "design_number" "text" NOT NULL,
    "design_name" "text",
    "design_photo_url" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "original_filename" "text",
    "compressed_size" numeric,
    "original_size" numeric,
    "compression_ratio" numeric,
    "upload_source" "text",
    "uploaded_by" "uuid",
    "upload_timestamp" timestamp with time zone DEFAULT "now"(),
    "missing_fields" "jsonb" DEFAULT '[]'::"jsonb",
    "color_name" "text",
    "ai_description" "text",
    "design_code" "text"
);


ALTER TABLE "public"."finish_fabric_designs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."finish_fabric_job_workers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "finish_fabric_id" "uuid",
    "job_worker_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."finish_fabric_job_workers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."finish_fabric_suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "finish_fabric_id" "uuid",
    "supplier_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."finish_fabric_suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."finish_fabrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "base_fabric_id" "uuid",
    "finish_fabric_name" "text" NOT NULL,
    "class" "text",
    "process_type" "text",
    "tag" "text",
    "process" "text",
    "fabric_name_suffix" "text" DEFAULT 'Fabric'::"text",
    "description" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "design_numbers" "jsonb" DEFAULT '[]'::"jsonb",
    "design_names" "jsonb" DEFAULT '[]'::"jsonb",
    "fabric_name" "text",
    "design_concept" "text",
    "design_style" "text",
    "work_thread" "text",
    "is_starred" boolean DEFAULT false,
    "starred_at" timestamp with time zone,
    "finish" "text",
    "supplier_id" "uuid",
    "job_worker_id" "uuid",
    "hsn_code" character varying,
    "hsn_code_description" "text",
    "gst_rate" numeric,
    "process_hsn_code" character varying,
    "process_hsn_code_description" "text",
    "process_gst_rate" numeric,
    "job_worker_contact" "text",
    "job_worker_cost" numeric,
    "notes" "text",
    "design_image_url" "text",
    "design_number" "text",
    "design_information" "text",
    "ready_stock" boolean DEFAULT false,
    "out_of_stock" boolean DEFAULT false,
    "material_used" "text",
    "shortage_percent" numeric,
    "process_code" "text",
    "tags" "text",
    "finish_fabric_sku" "text",
    "process_history" "jsonb" DEFAULT '[]'::"jsonb",
    "last_process_code" "text",
    "last_process_name" "text",
    "ink_type" "text",
    "finish_width" "text",
    "finish_type" "text",
    "generated_name" "text",
    "generated_sku" "text",
    "ink_type_id" "uuid",
    CONSTRAINT "finish_fabrics_class_check" CHECK (("class" = ANY (ARRAY['Regular'::"text", 'Premium'::"text"]))),
    CONSTRAINT "finish_fabrics_process_check" CHECK (("process" = ANY (ARRAY['Printed'::"text", 'Solid(Dyed)'::"text", 'Hakoba'::"text", 'Embroidered'::"text", 'Jaguard'::"text", 'Handwork'::"text", 'Value Addition'::"text"]))),
    CONSTRAINT "finish_fabrics_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"]))),
    CONSTRAINT "finish_fabrics_tag_check" CHECK (("tag" = ANY (ARRAY['Foil'::"text", 'Without Foil'::"text"])))
);


ALTER TABLE "public"."finish_fabrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follow_up_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "customer_id" "uuid",
    "follow_up_count" integer DEFAULT 0,
    "last_follow_up_at" timestamp with time zone,
    "next_follow_up_at" timestamp with time zone,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "follow_up_tracking_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'stopped'::character varying])::"text"[])))
);


ALTER TABLE "public"."follow_up_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."garment_accessories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "readymade_garment_id" "uuid",
    "accessory_name" "text",
    "unit" "text",
    "consumption_per_piece" numeric DEFAULT 0,
    "cost_calculation" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."garment_accessories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."garment_components" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "readymade_garment_id" "uuid",
    "component_type" "text",
    "fabric_type" "text",
    "finish_fabric_id" "uuid",
    "fancy_finish_id" "uuid",
    "consumption_meters" numeric DEFAULT 0,
    "consumption_unit" "text" DEFAULT 'meters'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."garment_components" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."garment_costs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "garment_category" "text",
    "size_set" "text",
    "style" "text",
    "neckline" "text",
    "bottom_style" "text",
    "length" "text",
    "product_name" "text",
    "design_number" "text",
    "sku" "text",
    "fabric_costs" "jsonb",
    "accessory_costs" "jsonb",
    "cmt_costs" "jsonb",
    "packing_costs" "jsonb",
    "gross_cost" numeric,
    "wastage_risk" numeric,
    "landing_cost" numeric,
    "profit" numeric,
    "sales_price" numeric,
    "wholesale_price" numeric,
    "mrp" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."garment_costs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."garment_size_variants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "readymade_garment_id" "uuid",
    "size" "text",
    "consumption_multiplier" numeric DEFAULT 1.0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."garment_size_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."garment_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "garment_name" "text" NOT NULL
);


ALTER TABLE "public"."garment_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."google_drive_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "client_id" "text",
    "client_secret" "text",
    "refresh_token" "text",
    "access_token" "text",
    "token_expiry" timestamp with time zone,
    "folder_id" "text",
    "status" "text" DEFAULT 'disconnected'::"text",
    "auto_upload" boolean DEFAULT false,
    "compress_before_upload" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."google_drive_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."google_drive_sync" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "folder_id" "text" NOT NULL,
    "folder_name" "text",
    "sync_frequency" "text" DEFAULT 'daily'::"text",
    "last_sync_time" timestamp with time zone,
    "next_sync_time" timestamp with time zone,
    "sync_status" "text" DEFAULT 'idle'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."google_drive_sync" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hakoba_batch_calcs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "total_grey_cost" numeric,
    "total_job_cost" numeric,
    "total_batch_cost" numeric,
    "total_saleable_mtrs" numeric,
    "factory_cost_per_mtr" numeric,
    "margin_percent" numeric,
    "final_selling_price" numeric,
    "inputs" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hakoba_batch_calcs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hakoba_embroidery" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_thread" "text",
    "class" "text",
    "tag" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hakoba_embroidery" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hsn_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hsn_code" "text" NOT NULL,
    "description" "text",
    "gst_rate" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hsn_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."import_errors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "import_id" "uuid",
    "row_number" integer,
    "field_name" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."import_errors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "import_type" "text" NOT NULL,
    "total_items" integer DEFAULT 0,
    "successful_items" integer DEFAULT 0,
    "failed_items" integer DEFAULT 0,
    "status" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."imports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ink_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ink_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_number" "text" NOT NULL,
    "order_id" "uuid",
    "customer_id" "uuid",
    "invoice_date" "date" DEFAULT CURRENT_DATE,
    "due_date" "date",
    "total_amount" numeric NOT NULL,
    "status" "text" DEFAULT 'Draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_specifications_master" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_type" "text" NOT NULL,
    "spec_name" "text" NOT NULL,
    "spec_type" "text" NOT NULL,
    "spec_options" "jsonb",
    "is_required" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."item_specifications_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "color" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."item_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku" "text",
    "design_number" "text",
    "process_path" "jsonb",
    "cost_calculation" "jsonb",
    "selling_price" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_cards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_costing_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_name" "text" NOT NULL,
    "process_type" "text" NOT NULL,
    "costing_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_costing_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "text" NOT NULL,
    "jobwork_unit_id" "uuid",
    "process_type" "text" NOT NULL,
    "fabric_type" "text" NOT NULL,
    "sku_id" "text",
    "quantity" numeric DEFAULT 0 NOT NULL,
    "rate" numeric DEFAULT 0 NOT NULL,
    "deadline" "date",
    "status" "text" DEFAULT 'Assigned'::"text",
    "input_qty" numeric DEFAULT 0,
    "output_qty" numeric DEFAULT 0,
    "shortage_percent" numeric DEFAULT 0,
    "quality_check_status" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_prices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid",
    "price" numeric,
    "effective_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "fabric_master_id" "uuid",
    "job_work_unit_id" "uuid",
    "charge_on" "text",
    "shortage_percent" numeric DEFAULT 0
);


ALTER TABLE "public"."job_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_work_bills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bill_number" "text" NOT NULL,
    "bill_date" "date" NOT NULL,
    "job_worker_id" "uuid",
    "job_worker_name" "text",
    "design_number" "text",
    "process_type" "text",
    "quantity" numeric DEFAULT 0 NOT NULL,
    "rate" numeric DEFAULT 0 NOT NULL,
    "amount" numeric GENERATED ALWAYS AS (("quantity" * "rate")) STORED,
    "notes" "text",
    "status" "text" DEFAULT 'Pending'::"text",
    "bill_image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_work_bills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_work_units" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "unit_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "unit_code" "text",
    "contact_person" "text",
    "phone" "text",
    "email" "text",
    "address" "text"
);


ALTER TABLE "public"."job_work_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_workers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_name" "text" NOT NULL,
    "rate" numeric DEFAULT 0,
    "quality_grade" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "contact_person" "text",
    "phone" "text",
    "email" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "pincode" "text",
    "specialization" "text",
    "rate_unit" "text" DEFAULT 'Piece'::"text",
    "bank_account_number" "text",
    "bank_name" "text",
    "ifsc_code" "text",
    "account_holder_name" "text",
    "status" "text" DEFAULT 'active'::"text",
    "notes" "text"
);


ALTER TABLE "public"."job_workers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."master_process" (
    "id" bigint NOT NULL,
    "entry_date" "date" DEFAULT CURRENT_DATE,
    "job_worker_id" "uuid",
    "finish_fabric_name" "text",
    "width" "text",
    "design_number" "text",
    "process_name" "text",
    "rate" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."master_process" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."master_process_entry" (
    "id" bigint NOT NULL,
    "entry_date" "date" DEFAULT CURRENT_DATE,
    "job_worker_id" "uuid",
    "finish_fabric_name" "text",
    "width" "text",
    "design_number" "text",
    "process_name" "text",
    "rate" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."master_process_entry" OWNER TO "postgres";


ALTER TABLE "public"."master_process_entry" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."master_process_entry_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."master_process" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."master_process_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."master_purchase" (
    "id" bigint NOT NULL,
    "entry_date" "date" DEFAULT CURRENT_DATE,
    "bill_number" "text",
    "supplier_id" "uuid",
    "category" "text",
    "fabric_name" "text",
    "width" "text",
    "rate" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."master_purchase" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."master_purchase_entry" (
    "id" bigint NOT NULL,
    "entry_date" "date" DEFAULT CURRENT_DATE,
    "bill_number" "text",
    "supplier_id" "uuid",
    "category" "text",
    "fabric_name" "text",
    "width" "text",
    "rate" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."master_purchase_entry" OWNER TO "postgres";


ALTER TABLE "public"."master_purchase_entry" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."master_purchase_entry_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."master_purchase" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."master_purchase_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."master_value_addition" (
    "id" bigint NOT NULL,
    "entry_date" "date" DEFAULT CURRENT_DATE,
    "job_worker_id" "uuid",
    "finish_fabric_name" "text",
    "width" "text",
    "design_number" "text",
    "value_addition_name" "text",
    "rate" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."master_value_addition" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."master_value_addition_entry" (
    "id" bigint NOT NULL,
    "entry_date" "date" DEFAULT CURRENT_DATE,
    "job_worker_id" "uuid",
    "finish_fabric_name" "text",
    "width" "text",
    "design_number" "text",
    "value_addition_name" "text",
    "rate" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."master_value_addition_entry" OWNER TO "postgres";


ALTER TABLE "public"."master_value_addition_entry" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."master_value_addition_entry_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."master_value_addition" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."master_value_addition_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."mto_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_no" "text",
    "customer_name" "text" NOT NULL,
    "customer_phone" "text",
    "product_description" "text",
    "quantity" numeric,
    "unit" "text" DEFAULT 'meters'::"text",
    "fabric_type" "text",
    "color" "text",
    "special_requirements" "text",
    "delivery_date" "date",
    "advance_paid" numeric DEFAULT 0,
    "total_amount" numeric DEFAULT 0,
    "stage" "text" DEFAULT 'inquiry'::"text",
    "priority" "text" DEFAULT 'normal'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mto_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text",
    "link" "text",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['info'::"text", 'success'::"text", 'warning'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_dispatch_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_dispatch_id" "uuid",
    "sales_order_item_id" "uuid",
    "item_name" "text",
    "design_number" "text",
    "dispatched_qty" numeric NOT NULL,
    "dispatched_unit" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."order_dispatch_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_dispatches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sales_order_id" "uuid",
    "dispatch_date" "date" DEFAULT CURRENT_DATE,
    "bill_number" "text" NOT NULL,
    "transport_id" "uuid",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."order_dispatches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_forms" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "customer_id" "uuid",
    "items" "jsonb" DEFAULT '[]'::"jsonb",
    "total_price" numeric,
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "order_forms_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'confirmed'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."order_forms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "product_id" "uuid",
    "product_name" "text" NOT NULL,
    "sku" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."order_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."order_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "old_status" "text",
    "new_status" "text",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text"
);


ALTER TABLE "public"."order_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "user_id" "uuid",
    "customer_name" "text" NOT NULL,
    "customer_phone" "text" NOT NULL,
    "customer_email" "text",
    "order_type" "text" NOT NULL,
    "order_source" "text" NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "discount_amount" numeric(10,2) DEFAULT 0,
    "final_amount" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text",
    "shipping_address" "jsonb",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "whatsapp_message_id" "text",
    "admin_notes" "text",
    "delivery_address" "text",
    CONSTRAINT "orders_order_source_check" CHECK (("order_source" = ANY (ARRAY['retail'::"text", 'wholesale'::"text"]))),
    CONSTRAINT "orders_order_type_check" CHECK (("order_type" = ANY (ARRAY['online'::"text", 'offline'::"text", 'whatsapp'::"text"]))),
    CONSTRAINT "orders_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'partial'::"text", 'refunded'::"text"]))),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'processing'::"text", 'shipped'::"text", 'delivered'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_followups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "customer_name" "text",
    "visit_id" "uuid",
    "total_outstanding" numeric(12,2),
    "committed_amount" numeric(12,2),
    "committed_date" "date",
    "payment_mode" "text",
    "actual_received" numeric(12,2) DEFAULT 0,
    "actual_date" "date",
    "status" "text" DEFAULT 'Pending'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_followups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pending_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "order_date" "date" NOT NULL,
    "customer_id" "uuid",
    "customer_name" "text" NOT NULL,
    "item_name" "text" NOT NULL,
    "design_number" "text" NOT NULL,
    "design_image_url" "text",
    "order_quantity" numeric DEFAULT 0 NOT NULL,
    "rate" numeric DEFAULT 0 NOT NULL,
    "dispatched_quantity" numeric DEFAULT 0,
    "balance_quantity" numeric GENERATED ALWAYS AS (("order_quantity" - "dispatched_quantity")) STORED,
    "status" "text" DEFAULT 'Pending'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pending_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permission_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "text" NOT NULL,
    "module" "text" NOT NULL,
    "can_view" boolean DEFAULT false,
    "can_add" boolean DEFAULT false,
    "can_edit" boolean DEFAULT false,
    "can_delete" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."permission_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pincode_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pincode" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "country" "text" NOT NULL,
    "country_code" "text" NOT NULL
);


ALTER TABLE "public"."pincode_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."price_approvals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "customer_id" "uuid",
    "product_id" "uuid",
    "quantity" integer,
    "fetched_price" numeric,
    "approved_price" numeric,
    "admin_notes" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "price_approvals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."price_approvals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."price_change_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "product_name" "text",
    "old_price" numeric,
    "new_price" numeric,
    "changed_by" "text",
    "change_reason" "text",
    "changed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."price_change_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."price_database" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku" "text",
    "fabric_name" "text",
    "component" "text",
    "width_44_price" numeric,
    "width_58_price" numeric,
    "formula_price" numeric,
    "override_price" numeric,
    "final_price" numeric,
    "margin_percent" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."price_database" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."price_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "base_price" numeric NOT NULL,
    "requested_price" numeric NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."price_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pricing_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "discount_percentage" numeric DEFAULT 0 NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pricing_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."process_charges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE,
    "jobwork_unit_name" "text",
    "design_number" "text",
    "process_type" "text",
    "fabric_type" "text",
    "sku_id" "text",
    "width" "text",
    "job_charge" numeric DEFAULT 0,
    "shortage_pct" numeric DEFAULT 0,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "stage_code" "text",
    "execution_order_number" integer
);


ALTER TABLE "public"."process_charges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."process_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entry_date" "date" DEFAULT CURRENT_DATE,
    "job_work_unit" "text",
    "process_type" "text",
    "fabric_type" "text",
    "sku" "text",
    "width" "text",
    "design_number" "text",
    "job_charge" numeric,
    "shortage_percent" numeric,
    "input_quantity" numeric,
    "costing_method" "text",
    "output_quantity" numeric,
    "total_charge" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."process_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."process_hsn_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "process_name" character varying NOT NULL,
    "hsn_code" character varying NOT NULL,
    "hsn_code_description" "text",
    "gst_rate" numeric NOT NULL,
    "status" character varying DEFAULT 'active'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."process_hsn_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."process_specifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "process_name" "text" NOT NULL,
    "process_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."process_specifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."process_specifications_master" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "process" "text" NOT NULL,
    "process_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."process_specifications_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."process_subtypes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "process_type_id" "uuid",
    "subtype_name" "text" NOT NULL
);


ALTER TABLE "public"."process_subtypes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."process_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "process_name" "text" NOT NULL
);


ALTER TABLE "public"."process_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "component_type" "text" NOT NULL,
    "fabric_id" "uuid",
    "consumption_value" numeric DEFAULT 0 NOT NULL,
    "unit" "text" DEFAULT 'meters'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_components" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_costing_sheets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "design_id" "text",
    "costing_template_id" "uuid",
    "fabric_id" "uuid",
    "component_type" "text",
    "rate_per_mtr" numeric,
    "consumption_mtrs" numeric,
    "amount" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_costing_sheets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_fabric_mapping" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "component_id" "uuid",
    "fabric_id" "uuid",
    "component_type" "text",
    "part_detail" "text",
    "consumption_value" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_fabric_mapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_master_accessories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_master_id" "uuid",
    "accessory_name" "text",
    "unit" "text",
    "consumption_per_piece" numeric DEFAULT 0,
    "cost_calculation" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."product_master_accessories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_master_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_master_id" "uuid",
    "design_set_component_id" "uuid",
    "component_type" "text",
    "design_number" "text",
    "design_name" "text",
    "fabric_name" "text",
    "consumption" numeric DEFAULT 0,
    "rate" numeric DEFAULT 0,
    "amount" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."product_master_components" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_master_size_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_master_id" "uuid",
    "size" "text",
    "consumption_multiplier" numeric DEFAULT 1.0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."product_master_size_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_masters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_name" "text" NOT NULL,
    "product_type" "text",
    "sku" "text",
    "description" "text",
    "design_set_id" "uuid",
    "master_design_number" "text",
    "set_photo_url" "text",
    "stitching_labor_cost" numeric DEFAULT 0,
    "packing_cost" numeric DEFAULT 0,
    "other_costs" numeric DEFAULT 0,
    "profit_margin_percent" numeric DEFAULT 0,
    "total_cost" numeric DEFAULT 0,
    "final_price" numeric DEFAULT 0,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."product_masters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "category_id" "uuid",
    "sku" "text" NOT NULL,
    "retail_price" numeric(10,2) NOT NULL,
    "wholesale_price" numeric(10,2),
    "stock_quantity" integer DEFAULT 0,
    "min_wholesale_quantity" integer DEFAULT 10,
    "images" "jsonb" DEFAULT '[]'::"jsonb",
    "specifications" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "is_featured" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "unit" "text",
    "product_type" "text",
    "gsm" numeric,
    "weight" numeric,
    "item_name" "text",
    "cut_length" numeric,
    "is_retail_available" boolean DEFAULT false,
    "price_agent" numeric,
    "price_wholesaler" numeric,
    "garment_type" "text",
    "set_type" "text",
    "item_category" "text" DEFAULT 'ready_made'::"text",
    CONSTRAINT "products_item_name_check" CHECK (("item_name" = ANY (ARRAY['Allover'::"text", 'Top'::"text", 'Bottom'::"text", 'Dupatta'::"text", 'Border'::"text", 'Garment'::"text"]))),
    CONSTRAINT "products_unit_check" CHECK (("unit" = ANY (ARRAY['Mtr'::"text", 'Kg'::"text", 'Pcs'::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_bills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bill_number" "text" NOT NULL,
    "bill_date" "date" NOT NULL,
    "supplier_id" "uuid",
    "supplier_name" "text",
    "fabric_type" "text",
    "item_name" "text" NOT NULL,
    "hsn_code" "text",
    "quantity" numeric DEFAULT 0 NOT NULL,
    "rate" numeric DEFAULT 0 NOT NULL,
    "amount" numeric GENERATED ALWAYS AS (("quantity" * "rate")) STORED,
    "brokerage_percent" numeric DEFAULT 0,
    "brokerage_amount" numeric DEFAULT 0,
    "total_amount" numeric,
    "notes" "text",
    "status" "text" DEFAULT 'Pending'::"text",
    "bill_image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."purchase_bills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entry_date" "date" DEFAULT CURRENT_DATE,
    "supplier_name" "text",
    "fabric_type" "text",
    "sku" "text",
    "fabric_name" "text",
    "width" "text",
    "rate" numeric,
    "discount_percent" numeric,
    "inward_quantity" numeric,
    "total_amount" numeric,
    "payment_terms" "text",
    "design_number" "text",
    "bill_number" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."purchase_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_fabric" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE,
    "supplier_name" "text",
    "fabric_type" "text",
    "sku_id" "text",
    "price" numeric DEFAULT 0,
    "discount_pct" numeric DEFAULT 0,
    "payment_terms" "text",
    "design_number" "text",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."purchase_fabric" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "po_number" "text" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "supplier_id" "uuid",
    "items" "jsonb" DEFAULT '[]'::"jsonb",
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "total_amount" numeric DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."purchase_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quantity_discounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tier_id" "uuid",
    "product_id" "uuid",
    "category_id" "uuid",
    "min_quantity" integer NOT NULL,
    "discount_percentage" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quantity_discounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quotation_number" "text" NOT NULL,
    "quotation_date" "date" NOT NULL,
    "party_id" "uuid",
    "party_name" "text",
    "party_type" "text",
    "item_type" "text",
    "item_name" "text",
    "design_number" "text",
    "quantity" numeric,
    "rate" numeric,
    "amount" numeric,
    "valid_until" "date",
    "status" "text" DEFAULT 'Active'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "quotations_item_type_check" CHECK (("item_type" = ANY (ARRAY['Purchase'::"text", 'JobWork'::"text"]))),
    CONSTRAINT "quotations_party_type_check" CHECK (("party_type" = ANY (ARRAY['Supplier'::"text", 'JobWorker'::"text"])))
);


ALTER TABLE "public"."quotations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "customer_id" "uuid",
    "fabric_sku" character varying(100),
    "fabric_name" character varying(255),
    "quantity" numeric(10,2),
    "unit" character varying(20) DEFAULT 'meters'::character varying,
    "price_per_unit" numeric(10,2),
    "total_price" numeric(10,2),
    "moq" numeric(10,2),
    "delivery_days" integer,
    "customer_tier" character varying(20),
    "discount_percentage" numeric(5,2) DEFAULT 0,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "quote_requests_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'sent'::character varying, 'accepted'::character varying, 'expired'::character varying])::"text"[])))
);


ALTER TABLE "public"."quote_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_number" "text" NOT NULL,
    "customer_id" "uuid",
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "total_amount" numeric DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'Draft'::"text",
    "valid_until" "date",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_card" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_name" "text" NOT NULL,
    "rate_value" numeric NOT NULL,
    "unit" "text",
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."rate_card" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."readymade_garment_hsn_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "garment_name" character varying NOT NULL,
    "hsn_code" character varying NOT NULL,
    "hsn_code_description" "text",
    "gst_rate" numeric NOT NULL,
    "status" character varying DEFAULT 'active'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."readymade_garment_hsn_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."readymade_garment_specs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "garment_category" "text",
    "size_set" "text",
    "style_silhouette" "text",
    "neckline_type" "text",
    "sleeve_type" "text",
    "bottom_style" "text",
    "length" "text",
    "unstitched_suits" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."readymade_garment_specs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."readymade_garments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_name" "text" NOT NULL,
    "sku" "text",
    "type" "text",
    "garment_category" "text",
    "size_set" "text",
    "style_silhouette" "text",
    "neckline_type" "text",
    "sleeve_type" "text",
    "bottom_style" "text",
    "length" "text",
    "unstitched_suits_spec" "text",
    "total_fabric_cost" numeric DEFAULT 0,
    "total_accessory_cost" numeric DEFAULT 0,
    "labor_cost" numeric DEFAULT 0,
    "packing_cost" numeric DEFAULT 0,
    "other_costs" numeric DEFAULT 0,
    "profit_margin_percent" numeric DEFAULT 0,
    "final_selling_price" numeric DEFAULT 0,
    "description" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "design_numbers" "jsonb" DEFAULT '[]'::"jsonb",
    "design_names" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."readymade_garments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "text" NOT NULL,
    "customers_view" boolean DEFAULT true,
    "customers_edit" boolean DEFAULT false,
    "customers_delete" boolean DEFAULT false,
    "orders_view" boolean DEFAULT true,
    "orders_create" boolean DEFAULT false,
    "orders_approve" boolean DEFAULT false,
    "visits_view_own" boolean DEFAULT true,
    "visits_view_all" boolean DEFAULT false,
    "visits_create" boolean DEFAULT true,
    "payments_view" boolean DEFAULT false,
    "payments_record" boolean DEFAULT false,
    "invoices_view" boolean DEFAULT false,
    "reports_financial" boolean DEFAULT false,
    "inventory_view" boolean DEFAULT true,
    "inventory_edit" boolean DEFAULT false,
    "pricing_view" boolean DEFAULT false,
    "team_manage" boolean DEFAULT false,
    "access_control" boolean DEFAULT false,
    "data_export" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_bills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bill_number" "text" NOT NULL,
    "bill_date" "date" NOT NULL,
    "customer_id" "uuid",
    "customer_name" "text" NOT NULL,
    "item_name" "text" NOT NULL,
    "quantity" numeric DEFAULT 0 NOT NULL,
    "rate" numeric DEFAULT 0 NOT NULL,
    "amount" numeric GENERATED ALWAYS AS (("quantity" * "rate")) STORED,
    "commission_percent" numeric DEFAULT 0,
    "commission_amount" numeric DEFAULT 0,
    "total_amount" numeric,
    "notes" "text",
    "status" "text" DEFAULT 'Pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sales_bills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_order_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "approval_level" "text" NOT NULL,
    "approved_by" "uuid",
    "approval_date" timestamp with time zone DEFAULT "now"(),
    "approval_status" "text" NOT NULL,
    "comments" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sales_order_approvals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_order_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sales_order_id" "uuid",
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_size" numeric,
    "file_type" "text",
    "uploaded_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sales_order_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "design_id" "text",
    "quantity" numeric,
    "rate" numeric,
    "amount" numeric,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "unit_price" numeric,
    "total_price" numeric,
    "item_type" "text" DEFAULT 'ready_made'::"text",
    "fabric_item_id" "uuid",
    "unit" "text",
    "size" "text",
    "design_number" "text",
    "dispatched_qty" numeric DEFAULT 0,
    "balance_qty" numeric GENERATED ALWAYS AS (("quantity" - "dispatched_qty")) STORED,
    "specifications" "jsonb",
    "item_sku" "text",
    "item_category" "text",
    "notes" "text",
    "status" "text" DEFAULT 'active'::"text",
    "completion_status" numeric DEFAULT 100,
    "missing_fields" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."sales_order_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sales_order_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sales_order_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_no" "text" NOT NULL,
    "party_details" "jsonb" NOT NULL,
    "order_details" "jsonb" NOT NULL,
    "items" "jsonb" NOT NULL,
    "calculations" "jsonb" NOT NULL,
    "totals" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "customer_id" "uuid",
    "delivery_date" "date",
    "shipping_address" "text",
    "payment_terms" "text",
    "notes" "text",
    "total_amount" numeric DEFAULT 0,
    "salesperson_id" "uuid",
    "order_number" "text",
    "margin_percent" numeric,
    "total_quantity" numeric,
    "approval_status" "text" DEFAULT 'Pending'::"text",
    "discount" numeric DEFAULT 0,
    "discount_type" "text" DEFAULT 'percentage'::"text",
    "fold_value" numeric DEFAULT 0,
    "pass_fold_benefit" boolean DEFAULT false,
    "brokerage" numeric DEFAULT 0,
    "brokerage_type" "text" DEFAULT 'percentage'::"text",
    "transport_cost" numeric DEFAULT 0,
    "gst_rate" numeric DEFAULT 0,
    "gst_type" "text" DEFAULT 'percentage'::"text",
    "prepared_by_user_id" "uuid",
    "prepared_by_name" "text",
    "prepared_at" timestamp with time zone DEFAULT "now"(),
    "agent_id" "uuid",
    "transport_id" "uuid",
    "fabric_terms_conditions" "text",
    "credit_days" integer DEFAULT 0,
    "fold_benefit_percentage" numeric DEFAULT 0,
    "deduct_brokerage" boolean DEFAULT false,
    "order_status" "text" DEFAULT 'draft'::"text",
    "dispatch_status" "text" DEFAULT 'pending'::"text",
    "subtotal" numeric DEFAULT 0,
    "tax" numeric DEFAULT 0,
    "shipping_cost" numeric DEFAULT 0
);


ALTER TABLE "public"."sales_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_team" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "employee_code" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sales_team" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "visit_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "visit_time" time without time zone DEFAULT CURRENT_TIME NOT NULL,
    "salesperson_id" "uuid",
    "salesperson_name" "text" NOT NULL,
    "customer_id" "uuid",
    "customer_name" "text" NOT NULL,
    "customer_city" "text",
    "visit_type" "text" NOT NULL,
    "visit_mode" "text" DEFAULT 'InCity'::"text",
    "voice_note_url" "text",
    "voice_note_hindi" "text",
    "voice_note_english" "text",
    "ai_summary" "text",
    "ai_requirements" "jsonb" DEFAULT '[]'::"jsonb",
    "ai_payment_commitment" "jsonb" DEFAULT '{}'::"jsonb",
    "ai_follow_up_action" "text",
    "ai_urgency_score" integer DEFAULT 0,
    "ai_sentiment" "text",
    "products_discussed" "text"[],
    "sample_given" boolean DEFAULT false,
    "sample_details" "text",
    "quote_given" boolean DEFAULT false,
    "quote_amount" numeric(12,2),
    "order_potential" numeric(12,2),
    "next_followup_date" "date",
    "payment_type" "text",
    "payment_amount_committed" numeric(12,2),
    "payment_date_committed" "date",
    "payment_received" numeric(12,2) DEFAULT 0,
    "payment_reference" "text",
    "outstanding_discussed" numeric(12,2),
    "gps_latitude" numeric(10,7),
    "gps_longitude" numeric(10,7),
    "gps_accuracy" numeric(8,2),
    "google_maps_visit_link" "text",
    "location_captured_at" timestamp with time zone,
    "location_address" "text",
    "status" "text" DEFAULT 'Completed'::"text",
    "is_productive" boolean DEFAULT true,
    "manual_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sales_visits_visit_mode_check" CHECK (("visit_mode" = ANY (ARRAY['InCity'::"text", 'Outstation'::"text"]))),
    CONSTRAINT "sales_visits_visit_type_check" CHECK (("visit_type" = ANY (ARRAY['Sales'::"text", 'Payment'::"text", 'Sales+Payment'::"text", 'Followup'::"text", 'New Customer'::"text"])))
);


ALTER TABLE "public"."sales_visits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_exports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_type" "text" NOT NULL,
    "frequency" "text",
    "recipients" "text"[] NOT NULL,
    "last_run_at" timestamp with time zone,
    "next_run_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "scheduled_exports_frequency_check" CHECK (("frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text"])))
);


ALTER TABLE "public"."scheduled_exports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schiffli_costing" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "fabric_id" "uuid",
    "grey_cost" numeric,
    "shortage_percentage" numeric,
    "schiffli_rate" numeric,
    "deca_rate" numeric,
    "piece_size" numeric,
    "complete_pcs" numeric,
    "incomplete_pcs" numeric,
    "wastage_mtr" numeric,
    "total_mtr" numeric,
    "total_cost" numeric,
    "cost_per_mtr" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."schiffli_costing" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."set_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "set_type" "text",
    "component_for_fabrics" "text",
    "component_for_garments" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."set_components" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "role" "text" DEFAULT 'sales'::"text",
    "department" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."staff_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fabric_id" "uuid",
    "min_stock_level" numeric DEFAULT 0,
    "alert_status" "text" DEFAULT 'Active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stock_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "movement_type" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "reference_type" "text",
    "reference_id" "uuid",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "stock_movements_movement_type_check" CHECK (("movement_type" = ANY (ARRAY['in'::"text", 'out'::"text", 'adjustment'::"text"])))
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_rolls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "design_id" "uuid",
    "supplier_id" "uuid",
    "roll_number" "text",
    "lot_number" "text",
    "quantity_kg" numeric DEFAULT 0 NOT NULL,
    "qc_status" "text" DEFAULT 'Pending'::"text",
    "received_date" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "tenant_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "quantity_meters" numeric,
    "quantity_pieces" integer
);


ALTER TABLE "public"."stock_rolls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_summary" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "design_id" "uuid",
    "total_stock_kg" numeric DEFAULT 0,
    "reserved_stock_kg" numeric DEFAULT 0,
    "available_stock_kg" numeric DEFAULT 0,
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid",
    "tenant_id" "uuid"
);


ALTER TABLE "public"."stock_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fabric_id" "uuid",
    "transaction_type" "text" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit" "text",
    "reference_id" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stock_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_price_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_name" "text",
    "product_name" "text",
    "old_price" numeric,
    "new_price" numeric,
    "effective_date" "date",
    "notes" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."supplier_price_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid",
    "base_fabric_id" "uuid",
    "rate_per_meter" numeric,
    "minimum_order_quantity" integer,
    "lead_time_days" integer,
    "notes" "text",
    "effective_from" "date",
    "effective_to" "date",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."supplier_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "supplier_name" "text" NOT NULL,
    "supplier_code" "text",
    "contact_person" "text",
    "phone" "text",
    "email" "text",
    "address" "text",
    "payment_terms" "text",
    "created_by" "uuid",
    "tenant_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "city" "text",
    "state" "text",
    "pincode" "text",
    "gst_number" "text",
    "bank_account_number" "text",
    "bank_name" "text",
    "ifsc_code" "text",
    "account_holder_name" "text",
    "notes" "text",
    "status" "text" DEFAULT 'active'::"text"
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "actor_name" "text",
    "actor_role" "text",
    "action_type" "text" NOT NULL,
    "module" "text" NOT NULL,
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."system_activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tally_sync_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sync_type" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "records_synced" integer DEFAULT 0,
    "error_message" "text",
    "raw_response" "text",
    "synced_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tally_sync_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transport_name" "text" NOT NULL,
    "contact_person" "text",
    "email" "text",
    "phone" "text",
    "address" "text",
    "pincode" "text",
    "city" "text",
    "state" "text",
    "country" "text" DEFAULT 'India'::"text",
    "country_code" "text" DEFAULT 'IN'::"text",
    "gst_number" "text",
    "vehicle_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."transports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profile_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid",
    "changed_by" "uuid",
    "full_name" "text",
    "firm_name" "text",
    "email" "text",
    "phone_number" "text",
    "gst_number" "text",
    "address" "jsonb",
    "delivery_address" "jsonb",
    "transport" "text",
    "assigned_agent_id" "uuid",
    "valid_from" timestamp with time zone DEFAULT "now"(),
    "valid_to" timestamp with time zone,
    "change_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profile_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profile_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profile_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "phone_number" "text",
    "role" "text" NOT NULL,
    "company_name" "text",
    "gst_number" "text",
    "address" "jsonb" DEFAULT '{}'::"jsonb",
    "is_approved" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "payment_terms" "text",
    "credit_limit" numeric DEFAULT 0,
    "credit_used" numeric DEFAULT 0,
    "firm_name" "text",
    "contact_person" "text",
    "billing_name" "text",
    "transport" "text",
    "delivery_address" "jsonb",
    "agency_name" "text",
    "assigned_agent_id" "uuid",
    "pricing_tier" "uuid",
    "email" "text",
    "city" "text",
    "state" "text",
    "pincode" "text",
    "country" "text",
    "whatsapp_number" "text",
    "company_id" "uuid",
    "tenant_id" "uuid",
    "created_by" "uuid",
    "verified_at" timestamp with time zone,
    "role_id" "uuid",
    "packing_type" "text",
    "customer_type" "text",
    "status" "text" DEFAULT 'active'::"text",
    "tier" "text" DEFAULT 'PUBLIC'::"text",
    "whatsapp_consent" boolean DEFAULT true,
    "language_preference" character varying(2) DEFAULT 'EN'::character varying,
    "last_interaction_at" timestamp with time zone,
    "conversation_context" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "check_valid_tier" CHECK (("tier" = ANY (ARRAY['PUBLIC'::"text", 'REGISTERED'::"text", 'VIP'::"text"]))),
    CONSTRAINT "user_profiles_language_preference_check" CHECK ((("language_preference")::"text" = ANY ((ARRAY['EN'::character varying, 'HI'::character varying, 'UR'::character varying, 'AF'::character varying, 'ES'::character varying, 'RU'::character varying, 'ZH'::character varying, 'JA'::character varying])::"text"[]))),
    CONSTRAINT "user_profiles_role_check" CHECK (("role" = ANY (ARRAY['customer'::"text", 'wholesale_customer'::"text", 'sales_team'::"text", 'store_manager'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."users" AS
 SELECT "id",
    "full_name",
    "phone_number",
    "role",
    "company_name",
    "gst_number",
    "address",
    "is_approved",
    "created_at",
    "updated_at",
    "payment_terms",
    "credit_limit",
    "credit_used",
    "firm_name",
    "contact_person",
    "billing_name",
    "transport",
    "delivery_address",
    "agency_name",
    "assigned_agent_id",
    "pricing_tier",
    "email",
    "city",
    "state",
    "pincode",
    "country",
    "whatsapp_number",
    "company_id",
    "tenant_id",
    "created_by"
   FROM "public"."user_profiles";


ALTER VIEW "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."va_prices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "va_id" "uuid",
    "price" numeric,
    "effective_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "fabric_master_id" "uuid",
    "va_unit_id" "uuid",
    "va_category" "text",
    "shortage_percent" numeric DEFAULT 0
);


ALTER TABLE "public"."va_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."va_units" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "unit_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "unit_code" "text",
    "contact_person" "text",
    "phone" "text",
    "email" "text",
    "address" "text"
);


ALTER TABLE "public"."va_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."value_addition_charges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE,
    "jobwork_unit_name" "text",
    "design_number" "text",
    "process_type" "text",
    "fabric_type" "text",
    "sku_id" "text",
    "width" "text",
    "job_charge" numeric DEFAULT 0,
    "shortage_pct" numeric DEFAULT 0,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "stage_code" "text"
);


ALTER TABLE "public"."value_addition_charges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."value_addition_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entry_date" "date" DEFAULT CURRENT_DATE,
    "job_work_unit" "text",
    "va_type" "text",
    "fabric_type" "text",
    "sku" "text",
    "width" "text",
    "design_number" "text",
    "job_charge" numeric,
    "shortage_percent" numeric,
    "input_quantity" numeric,
    "thread_type" "text",
    "dyeing_type" "text",
    "output_quantity" numeric,
    "total_charge" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."value_addition_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."value_addition_hsn_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "value_addition_name" character varying NOT NULL,
    "hsn_code" character varying NOT NULL,
    "hsn_code_description" "text",
    "gst_rate" numeric NOT NULL,
    "status" character varying DEFAULT 'active'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."value_addition_hsn_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."visit_followups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "visit_id" "uuid",
    "customer_id" "uuid",
    "customer_name" "text" NOT NULL,
    "followup_type" "text" NOT NULL,
    "scheduled_date" "date" NOT NULL,
    "assigned_to" "text",
    "priority" "text" DEFAULT 'Medium'::"text",
    "ai_suggested_action" "text",
    "status" "text" DEFAULT 'Pending'::"text",
    "completion_notes" "text",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."visit_followups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."warehouse_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_name" "text" NOT NULL,
    "capacity" numeric,
    "current_usage" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."warehouse_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_account_id" "text",
    "phone_number_id" "text",
    "access_token" "text",
    "webhook_url" "text",
    "webhook_token" "text",
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."whatsapp_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "phone_number" character varying(20) NOT NULL,
    "customer_name" character varying(255),
    "status" character varying(20) DEFAULT 'active'::character varying,
    "language" character varying(2) DEFAULT 'EN'::character varying,
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "whatsapp_conversations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'closed'::character varying, 'pending'::character varying])::"text"[])))
);


ALTER TABLE "public"."whatsapp_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "direction" character varying(10) NOT NULL,
    "message_text" "text",
    "media_url" "text",
    "media_type" character varying(20),
    "language_detected" character varying(2),
    "translated_text" "text",
    "message_type" character varying(20) DEFAULT 'text'::character varying,
    "whatsapp_message_id" character varying(255),
    "status" character varying(20) DEFAULT 'sent'::character varying,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "whatsapp_messages_direction_check" CHECK ((("direction")::"text" = ANY ((ARRAY['incoming'::character varying, 'outgoing'::character varying])::"text"[]))),
    CONSTRAINT "whatsapp_messages_message_type_check" CHECK ((("message_type")::"text" = ANY ((ARRAY['text'::character varying, 'image'::character varying, 'document'::character varying, 'audio'::character varying, 'video'::character varying])::"text"[]))),
    CONSTRAINT "whatsapp_messages_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['sent'::character varying, 'delivered'::character varying, 'read'::character varying, 'failed'::character varying])::"text"[])))
);


ALTER TABLE "public"."whatsapp_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "business_account_id" "text",
    "phone_number_id" "text",
    "access_token" "text",
    "phone_number" "text",
    "status" "text" DEFAULT 'disconnected'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."whatsapp_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_name" "text" NOT NULL,
    "template_text" "text" NOT NULL,
    "parameters" "jsonb",
    "language" "text" DEFAULT 'en'::"text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."whatsapp_templates" OWNER TO "postgres";


ALTER TABLE ONLY "admin"."backup_metadata" ALTER COLUMN "id" SET DEFAULT "nextval"('"admin"."backup_metadata_id_seq"'::"regclass");



ALTER TABLE ONLY "admin"."backup_metadata"
    ADD CONSTRAINT "backup_metadata_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."accessories_consumption"
    ADD CONSTRAINT "accessories_consumption_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_key_name_key" UNIQUE ("key_name");



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_commissions"
    ADD CONSTRAINT "agent_commissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_company_id_code_key" UNIQUE ("company_id", "code");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."base_fabric_job_workers"
    ADD CONSTRAINT "base_fabric_job_workers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."base_fabric_suppliers"
    ADD CONSTRAINT "base_fabric_suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."base_fabrics"
    ADD CONSTRAINT "base_fabrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."base_fabrics"
    ADD CONSTRAINT "base_fabrics_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."batch_costing"
    ADD CONSTRAINT "batch_costing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brokerage_entries"
    ADD CONSTRAINT "brokerage_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bulk_bills"
    ADD CONSTRAINT "bulk_bills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bulk_enquiries"
    ADD CONSTRAINT "bulk_enquiries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bulk_item_import_lines"
    ADD CONSTRAINT "bulk_item_import_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bulk_item_imports"
    ADD CONSTRAINT "bulk_item_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bulk_uploads"
    ADD CONSTRAINT "bulk_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."category_visibility"
    ADD CONSTRAINT "category_visibility_category_key_key" UNIQUE ("category_key");



ALTER TABLE ONLY "public"."category_visibility"
    ADD CONSTRAINT "category_visibility_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."city_visit_plans"
    ADD CONSTRAINT "city_visit_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations_extended"
    ADD CONSTRAINT "conversations_extended_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cost_sheets"
    ADD CONSTRAINT "cost_sheets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."costing_components"
    ADD CONSTRAINT "costing_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."costing_parameters"
    ADD CONSTRAINT "costing_parameters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."costing_paths"
    ADD CONSTRAINT "costing_paths_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."costing_sheets"
    ADD CONSTRAINT "costing_sheets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."country_codes"
    ADD CONSTRAINT "country_codes_country_key" UNIQUE ("country");



ALTER TABLE ONLY "public"."country_codes"
    ADD CONSTRAINT "country_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_dropdown_values"
    ADD CONSTRAINT "custom_dropdown_values_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_items"
    ADD CONSTRAINT "custom_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_categories"
    ADD CONSTRAINT "customer_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_delivery_addresses"
    ADD CONSTRAINT "customer_delivery_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_interactions"
    ADD CONSTRAINT "customer_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_portal_access"
    ADD CONSTRAINT "customer_portal_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_requirements"
    ADD CONSTRAINT "customer_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_categories"
    ADD CONSTRAINT "design_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_descriptions"
    ADD CONSTRAINT "design_descriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_groups"
    ADD CONSTRAINT "design_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_images"
    ADD CONSTRAINT "design_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_layouts"
    ADD CONSTRAINT "design_layouts_layout_name_key" UNIQUE ("layout_name");



ALTER TABLE ONLY "public"."design_layouts"
    ADD CONSTRAINT "design_layouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_ready_stock"
    ADD CONSTRAINT "design_ready_stock_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_set_components"
    ADD CONSTRAINT "design_set_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_sets"
    ADD CONSTRAINT "design_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_uploads"
    ADD CONSTRAINT "design_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."designs"
    ADD CONSTRAINT "designs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dispatch_history"
    ADD CONSTRAINT "dispatch_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drive_synced_files"
    ADD CONSTRAINT "drive_synced_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dropdown_categories"
    ADD CONSTRAINT "dropdown_categories_category_name_key" UNIQUE ("category_name");



ALTER TABLE ONLY "public"."dropdown_categories"
    ADD CONSTRAINT "dropdown_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dropdown_options"
    ADD CONSTRAINT "dropdown_options_category_value_key" UNIQUE ("category", "value");



ALTER TABLE ONLY "public"."dropdown_options"
    ADD CONSTRAINT "dropdown_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_hsn_codes"
    ADD CONSTRAINT "expense_hsn_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_aliases"
    ADD CONSTRAINT "fabric_aliases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_categories"
    ADD CONSTRAINT "fabric_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."fabric_categories"
    ADD CONSTRAINT "fabric_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_costs"
    ADD CONSTRAINT "fabric_costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_designs"
    ADD CONSTRAINT "fabric_designs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_headings"
    ADD CONSTRAINT "fabric_headings_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."fabric_headings"
    ADD CONSTRAINT "fabric_headings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_images"
    ADD CONSTRAINT "fabric_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_item_completion"
    ADD CONSTRAINT "fabric_item_completion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_items"
    ADD CONSTRAINT "fabric_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_master"
    ADD CONSTRAINT "fabric_master_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_masters"
    ADD CONSTRAINT "fabric_masters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_prices"
    ADD CONSTRAINT "fabric_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_specifications"
    ADD CONSTRAINT "fabric_specifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_stock"
    ADD CONSTRAINT "fabric_stock_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_subcategories"
    ADD CONSTRAINT "fabric_subcategories_category_id_name_key" UNIQUE ("category_id", "name");



ALTER TABLE ONLY "public"."fabric_subcategories"
    ADD CONSTRAINT "fabric_subcategories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_terms_conditions"
    ADD CONSTRAINT "fabric_terms_conditions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_types"
    ADD CONSTRAINT "fabric_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_views"
    ADD CONSTRAINT "fabric_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_widths"
    ADD CONSTRAINT "fabric_widths_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_widths"
    ADD CONSTRAINT "fabric_widths_width_value_key" UNIQUE ("width_value");



ALTER TABLE ONLY "public"."fabrics"
    ADD CONSTRAINT "fabrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fancy_base_fabrics"
    ADD CONSTRAINT "fancy_base_fabrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fancy_base_fabrics"
    ADD CONSTRAINT "fancy_base_fabrics_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."fancy_finish_fabrics"
    ADD CONSTRAINT "fancy_finish_fabrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fancy_finish_fabrics"
    ADD CONSTRAINT "fancy_finish_fabrics_sku_key" UNIQUE ("fancy_finish_fabric_sku");



ALTER TABLE ONLY "public"."fancy_finish_fabrics_v2"
    ADD CONSTRAINT "fancy_finish_fabrics_v2_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."field_customers"
    ADD CONSTRAINT "field_customers_customer_code_key" UNIQUE ("customer_code");



ALTER TABLE ONLY "public"."field_customers"
    ADD CONSTRAINT "field_customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."field_visits"
    ADD CONSTRAINT "field_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."file_compressions"
    ADD CONSTRAINT "file_compressions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."filter_presets"
    ADD CONSTRAINT "filter_presets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finish_fabric_designs"
    ADD CONSTRAINT "finish_fabric_designs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finish_fabric_job_workers"
    ADD CONSTRAINT "finish_fabric_job_workers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finish_fabric_suppliers"
    ADD CONSTRAINT "finish_fabric_suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finish_fabrics"
    ADD CONSTRAINT "finish_fabrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finish_fabrics"
    ADD CONSTRAINT "finish_fabrics_sku_key" UNIQUE ("finish_fabric_sku");



ALTER TABLE ONLY "public"."follow_up_tracking"
    ADD CONSTRAINT "follow_up_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."garment_accessories"
    ADD CONSTRAINT "garment_accessories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."garment_components"
    ADD CONSTRAINT "garment_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."garment_costs"
    ADD CONSTRAINT "garment_costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."garment_size_variants"
    ADD CONSTRAINT "garment_size_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."garment_types"
    ADD CONSTRAINT "garment_types_garment_name_key" UNIQUE ("garment_name");



ALTER TABLE ONLY "public"."garment_types"
    ADD CONSTRAINT "garment_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."google_drive_settings"
    ADD CONSTRAINT "google_drive_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."google_drive_sync"
    ADD CONSTRAINT "google_drive_sync_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hakoba_batch_calcs"
    ADD CONSTRAINT "hakoba_batch_calcs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hakoba_embroidery"
    ADD CONSTRAINT "hakoba_embroidery_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hsn_codes"
    ADD CONSTRAINT "hsn_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."import_errors"
    ADD CONSTRAINT "import_errors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."imports"
    ADD CONSTRAINT "imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ink_types"
    ADD CONSTRAINT "ink_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."ink_types"
    ADD CONSTRAINT "ink_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_specifications_master"
    ADD CONSTRAINT "item_specifications_master_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_types"
    ADD CONSTRAINT "item_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_cards"
    ADD CONSTRAINT "job_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_costing_templates"
    ADD CONSTRAINT "job_costing_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_orders"
    ADD CONSTRAINT "job_orders_job_id_key" UNIQUE ("job_id");



ALTER TABLE ONLY "public"."job_orders"
    ADD CONSTRAINT "job_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_prices"
    ADD CONSTRAINT "job_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_work_bills"
    ADD CONSTRAINT "job_work_bills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_work_units"
    ADD CONSTRAINT "job_work_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_workers"
    ADD CONSTRAINT "job_workers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."master_process_entry"
    ADD CONSTRAINT "master_process_entry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."master_process"
    ADD CONSTRAINT "master_process_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."master_purchase_entry"
    ADD CONSTRAINT "master_purchase_entry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."master_purchase"
    ADD CONSTRAINT "master_purchase_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."master_value_addition_entry"
    ADD CONSTRAINT "master_value_addition_entry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."master_value_addition"
    ADD CONSTRAINT "master_value_addition_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mto_orders"
    ADD CONSTRAINT "mto_orders_order_no_key" UNIQUE ("order_no");



ALTER TABLE ONLY "public"."mto_orders"
    ADD CONSTRAINT "mto_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_dispatch_items"
    ADD CONSTRAINT "order_dispatch_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_dispatches"
    ADD CONSTRAINT "order_dispatches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_forms"
    ADD CONSTRAINT "order_forms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_followups"
    ADD CONSTRAINT "payment_followups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_orders"
    ADD CONSTRAINT "pending_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_settings"
    ADD CONSTRAINT "permission_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_settings"
    ADD CONSTRAINT "permission_settings_role_module_key" UNIQUE ("role", "module");



ALTER TABLE ONLY "public"."pincode_data"
    ADD CONSTRAINT "pincode_data_pincode_key" UNIQUE ("pincode");



ALTER TABLE ONLY "public"."pincode_data"
    ADD CONSTRAINT "pincode_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_approvals"
    ADD CONSTRAINT "price_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_change_log"
    ADD CONSTRAINT "price_change_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_database"
    ADD CONSTRAINT "price_database_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_requests"
    ADD CONSTRAINT "price_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pricing_tiers"
    ADD CONSTRAINT "pricing_tiers_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."pricing_tiers"
    ADD CONSTRAINT "pricing_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."process_charges"
    ADD CONSTRAINT "process_charges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."process_entries"
    ADD CONSTRAINT "process_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."process_hsn_codes"
    ADD CONSTRAINT "process_hsn_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."process_specifications_master"
    ADD CONSTRAINT "process_specifications_master_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."process_specifications"
    ADD CONSTRAINT "process_specifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."process_subtypes"
    ADD CONSTRAINT "process_subtypes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."process_types"
    ADD CONSTRAINT "process_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."process_types"
    ADD CONSTRAINT "process_types_process_name_key" UNIQUE ("process_name");



ALTER TABLE ONLY "public"."product_components"
    ADD CONSTRAINT "product_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_costing_sheets"
    ADD CONSTRAINT "product_costing_sheets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_fabric_mapping"
    ADD CONSTRAINT "product_fabric_mapping_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_master_accessories"
    ADD CONSTRAINT "product_master_accessories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_master_components"
    ADD CONSTRAINT "product_master_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_master_size_variants"
    ADD CONSTRAINT "product_master_size_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_masters"
    ADD CONSTRAINT "product_masters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."purchase_bills"
    ADD CONSTRAINT "purchase_bills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_entries"
    ADD CONSTRAINT "purchase_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_fabric"
    ADD CONSTRAINT "purchase_fabric_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_po_number_key" UNIQUE ("po_number");



ALTER TABLE ONLY "public"."quantity_discounts"
    ADD CONSTRAINT "quantity_discounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quantity_discounts"
    ADD CONSTRAINT "quantity_discounts_tier_id_product_id_category_id_min_quant_key" UNIQUE ("tier_id", "product_id", "category_id", "min_quantity");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_requests"
    ADD CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_quote_number_key" UNIQUE ("quote_number");



ALTER TABLE ONLY "public"."rate_card"
    ADD CONSTRAINT "rate_card_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."readymade_garment_hsn_codes"
    ADD CONSTRAINT "readymade_garment_hsn_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."readymade_garment_specs"
    ADD CONSTRAINT "readymade_garment_specs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."readymade_garments"
    ADD CONSTRAINT "readymade_garments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_key" UNIQUE ("role");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_bills"
    ADD CONSTRAINT "sales_bills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_order_approvals"
    ADD CONSTRAINT "sales_order_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_order_attachments"
    ADD CONSTRAINT "sales_order_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_order_items"
    ADD CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_order_no_key" UNIQUE ("order_no");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_team"
    ADD CONSTRAINT "sales_team_employee_code_key" UNIQUE ("employee_code");



ALTER TABLE ONLY "public"."sales_team"
    ADD CONSTRAINT "sales_team_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_visits"
    ADD CONSTRAINT "sales_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_exports"
    ADD CONSTRAINT "scheduled_exports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schiffli_costing"
    ADD CONSTRAINT "schiffli_costing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."set_components"
    ADD CONSTRAINT "set_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_alerts"
    ADD CONSTRAINT "stock_alerts_fabric_id_key" UNIQUE ("fabric_id");



ALTER TABLE ONLY "public"."stock_alerts"
    ADD CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_rolls"
    ADD CONSTRAINT "stock_rolls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_summary"
    ADD CONSTRAINT "stock_summary_design_id_key" UNIQUE ("design_id");



ALTER TABLE ONLY "public"."stock_summary"
    ADD CONSTRAINT "stock_summary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_transactions"
    ADD CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_price_alerts"
    ADD CONSTRAINT "supplier_price_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_rates"
    ADD CONSTRAINT "supplier_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_activity_logs"
    ADD CONSTRAINT "system_activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tally_sync_log"
    ADD CONSTRAINT "tally_sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transports"
    ADD CONSTRAINT "transports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profile_history"
    ADD CONSTRAINT "user_profile_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profile_logs"
    ADD CONSTRAINT "user_profile_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."va_prices"
    ADD CONSTRAINT "va_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."va_units"
    ADD CONSTRAINT "va_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."value_addition_charges"
    ADD CONSTRAINT "value_addition_charges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."value_addition_entries"
    ADD CONSTRAINT "value_addition_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."value_addition_hsn_codes"
    ADD CONSTRAINT "value_addition_hsn_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visit_followups"
    ADD CONSTRAINT "visit_followups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."warehouse_locations"
    ADD CONSTRAINT "warehouse_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_config"
    ADD CONSTRAINT "whatsapp_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_conversations"
    ADD CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_settings"
    ADD CONSTRAINT "whatsapp_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_templates"
    ADD CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_appointments_user_id" ON "public"."appointments" USING "btree" ("user_id");



CREATE INDEX "idx_audit_logs_created_at_desc" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_base_fabrics_fabric_name" ON "public"."base_fabrics" USING "btree" ("fabric_name");



CREATE INDEX "idx_base_fabrics_sku" ON "public"."base_fabrics" USING "btree" ("sku");



CREATE INDEX "idx_categories_parent_id" ON "public"."categories" USING "btree" ("parent_id");



CREATE INDEX "idx_conversations_customer" ON "public"."conversations" USING "btree" ("customer_id");



CREATE INDEX "idx_cost_sheets_company_id" ON "public"."cost_sheets" USING "btree" ("company_id");



CREATE INDEX "idx_cost_sheets_design_id" ON "public"."cost_sheets" USING "btree" ("design_id");



CREATE INDEX "idx_custom_dropdown_values_category" ON "public"."custom_dropdown_values" USING "btree" ("category");



CREATE INDEX "idx_customer_delivery_addresses_user_id" ON "public"."customer_delivery_addresses" USING "btree" ("user_id");



CREATE INDEX "idx_customer_interactions_created" ON "public"."customer_interactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_customer_interactions_customer" ON "public"."customer_interactions" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_interactions_fabric" ON "public"."customer_interactions" USING "btree" ("fabric_sku");



CREATE INDEX "idx_customer_interactions_type" ON "public"."customer_interactions" USING "btree" ("interaction_type");



CREATE INDEX "idx_customer_requirements_status" ON "public"."customer_requirements" USING "btree" ("status");



CREATE INDEX "idx_customers_created_at" ON "public"."customers" USING "btree" ("created_at");



CREATE INDEX "idx_customers_user_id" ON "public"."customers" USING "btree" ("user_id");



CREATE INDEX "idx_design_groups_company_id" ON "public"."design_groups" USING "btree" ("company_id");



CREATE INDEX "idx_design_groups_fabric_master_id" ON "public"."design_groups" USING "btree" ("fabric_master_id");



CREATE INDEX "idx_design_groups_supplier_id" ON "public"."design_groups" USING "btree" ("supplier_id");



CREATE INDEX "idx_design_images_design_id" ON "public"."design_images" USING "btree" ("design_id");



CREATE INDEX "idx_design_set_components_number" ON "public"."design_set_components" USING "btree" ("design_number");



CREATE INDEX "idx_design_uploads_created_by" ON "public"."design_uploads" USING "btree" ("created_by");



CREATE INDEX "idx_design_uploads_fabric_master_id" ON "public"."design_uploads" USING "btree" ("fabric_master_id");



CREATE INDEX "idx_designs_category_id" ON "public"."designs" USING "btree" ("category_id");



CREATE INDEX "idx_designs_company_id" ON "public"."designs" USING "btree" ("company_id");



CREATE INDEX "idx_designs_company_status" ON "public"."designs" USING "btree" ("company_id", "status");



CREATE INDEX "idx_designs_created_at" ON "public"."designs" USING "btree" ("created_at");



CREATE INDEX "idx_designs_created_at_desc" ON "public"."designs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_designs_design_group_id" ON "public"."designs" USING "btree" ("design_group_id");



CREATE INDEX "idx_designs_design_number" ON "public"."designs" USING "btree" ("design_number");



CREATE INDEX "idx_designs_status" ON "public"."designs" USING "btree" ("status");



CREATE INDEX "idx_dropdown_category" ON "public"."dropdown_options" USING "btree" ("category");



CREATE INDEX "idx_fabric_categories_company_id" ON "public"."fabric_categories" USING "btree" ("company_id");



CREATE INDEX "idx_fabric_categories_created_by" ON "public"."fabric_categories" USING "btree" ("created_by");



CREATE INDEX "idx_fabric_headings_company_id" ON "public"."fabric_headings" USING "btree" ("company_id");



CREATE INDEX "idx_fabric_headings_created_by" ON "public"."fabric_headings" USING "btree" ("created_by");



CREATE INDEX "idx_fabric_images_category" ON "public"."fabric_images" USING "btree" ("fabric_category");



CREATE INDEX "idx_fabric_images_design" ON "public"."fabric_images" USING "btree" ("design_number");



CREATE INDEX "idx_fabric_images_exclusive" ON "public"."fabric_images" USING "btree" ("is_exclusive");



CREATE INDEX "idx_fabric_images_sku" ON "public"."fabric_images" USING "btree" ("fabric_sku");



CREATE INDEX "idx_fabric_images_tier" ON "public"."fabric_images" USING "btree" ("tier_visibility");



CREATE INDEX "idx_fabric_master_category_id" ON "public"."fabric_master" USING "btree" ("category_id");



CREATE INDEX "idx_fabric_master_company_id" ON "public"."fabric_master" USING "btree" ("company_id");



CREATE INDEX "idx_fabric_master_created_by" ON "public"."fabric_master" USING "btree" ("created_by");



CREATE INDEX "idx_fabric_master_fabric_type_id" ON "public"."fabric_master" USING "btree" ("fabric_type_id");



CREATE INDEX "idx_fabric_master_heading_id" ON "public"."fabric_master" USING "btree" ("heading_id");



CREATE INDEX "idx_fabric_master_subcategory_id" ON "public"."fabric_master" USING "btree" ("subcategory_id");



CREATE INDEX "idx_fabric_master_width_id" ON "public"."fabric_master" USING "btree" ("width_id");



CREATE INDEX "idx_fabric_subcategories_company_id" ON "public"."fabric_subcategories" USING "btree" ("company_id");



CREATE INDEX "idx_fabric_subcategories_created_by" ON "public"."fabric_subcategories" USING "btree" ("created_by");



CREATE INDEX "idx_fabric_types_company_id" ON "public"."fabric_types" USING "btree" ("company_id");



CREATE INDEX "idx_fabric_types_created_by" ON "public"."fabric_types" USING "btree" ("created_by");



CREATE INDEX "idx_fabric_types_subcategory_id" ON "public"."fabric_types" USING "btree" ("subcategory_id");



CREATE INDEX "idx_fabric_widths_company_id" ON "public"."fabric_widths" USING "btree" ("company_id");



CREATE INDEX "idx_fabric_widths_created_by" ON "public"."fabric_widths" USING "btree" ("created_by");



CREATE UNIQUE INDEX "idx_fabrics_sku" ON "public"."fabrics" USING "btree" ("sku");



CREATE INDEX "idx_fancy_finish_fabrics_sku" ON "public"."fancy_finish_fabrics" USING "btree" ("fancy_finish_fabric_sku");



CREATE INDEX "idx_field_customers_city" ON "public"."field_customers" USING "btree" ("city");



CREATE INDEX "idx_field_customers_restricted" ON "public"."field_customers" USING "btree" ("is_restricted");



CREATE INDEX "idx_field_visits_customer" ON "public"."field_visits" USING "btree" ("customer_id");



CREATE INDEX "idx_field_visits_date" ON "public"."field_visits" USING "btree" ("visit_date" DESC);



CREATE INDEX "idx_field_visits_salesperson" ON "public"."field_visits" USING "btree" ("salesperson_name");



CREATE INDEX "idx_field_visits_status" ON "public"."field_visits" USING "btree" ("status");



CREATE INDEX "idx_field_visits_type" ON "public"."field_visits" USING "btree" ("visit_type");



CREATE INDEX "idx_finish_fabric_designs_number" ON "public"."finish_fabric_designs" USING "btree" ("design_number");



CREATE INDEX "idx_finish_fabrics_sku" ON "public"."finish_fabrics" USING "btree" ("finish_fabric_sku");



CREATE INDEX "idx_follow_up_tracking_conversation" ON "public"."follow_up_tracking" USING "btree" ("conversation_id");



CREATE INDEX "idx_follow_up_tracking_next" ON "public"."follow_up_tracking" USING "btree" ("next_follow_up_at");



CREATE INDEX "idx_follow_up_tracking_status" ON "public"."follow_up_tracking" USING "btree" ("status");



CREATE INDEX "idx_import_errors_import_id" ON "public"."import_errors" USING "btree" ("import_id");



CREATE INDEX "idx_imports_created_by" ON "public"."imports" USING "btree" ("created_by");



CREATE INDEX "idx_invoices_customer_id" ON "public"."invoices" USING "btree" ("customer_id");



CREATE INDEX "idx_job_orders_status" ON "public"."job_orders" USING "btree" ("status");



CREATE INDEX "idx_job_orders_unit" ON "public"."job_orders" USING "btree" ("jobwork_unit_id");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product_id" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at");



CREATE INDEX "idx_orders_created_by" ON "public"."orders" USING "btree" ("created_by");



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_payment_followups_status" ON "public"."payment_followups" USING "btree" ("status");



CREATE INDEX "idx_price_approvals_status" ON "public"."price_approvals" USING "btree" ("status");



CREATE INDEX "idx_price_requests_approved_by" ON "public"."price_requests" USING "btree" ("approved_by");



CREATE INDEX "idx_price_requests_product_id" ON "public"."price_requests" USING "btree" ("product_id");



CREATE INDEX "idx_price_requests_requested_by" ON "public"."price_requests" USING "btree" ("requested_by");



CREATE INDEX "idx_products_category_id" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "idx_purchase_orders_status" ON "public"."purchase_orders" USING "btree" ("status");



CREATE INDEX "idx_purchase_orders_supplier" ON "public"."purchase_orders" USING "btree" ("supplier_id");



CREATE INDEX "idx_quantity_discounts_category_id" ON "public"."quantity_discounts" USING "btree" ("category_id");



CREATE INDEX "idx_quantity_discounts_product_id" ON "public"."quantity_discounts" USING "btree" ("product_id");



CREATE INDEX "idx_quote_requests_conversation" ON "public"."quote_requests" USING "btree" ("conversation_id");



CREATE INDEX "idx_quote_requests_created" ON "public"."quote_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_quote_requests_customer" ON "public"."quote_requests" USING "btree" ("customer_id");



CREATE INDEX "idx_quote_requests_status" ON "public"."quote_requests" USING "btree" ("status");



CREATE INDEX "idx_sales_order_items_order_id" ON "public"."sales_order_items" USING "btree" ("order_id");



CREATE INDEX "idx_sales_orders_created_at" ON "public"."sales_orders" USING "btree" ("created_at");



CREATE INDEX "idx_sales_orders_created_by" ON "public"."sales_orders" USING "btree" ("created_by");



CREATE INDEX "idx_sales_orders_customer_id" ON "public"."sales_orders" USING "btree" ("customer_id");



CREATE INDEX "idx_sales_visits_customer" ON "public"."sales_visits" USING "btree" ("customer_id");



CREATE INDEX "idx_sales_visits_date" ON "public"."sales_visits" USING "btree" ("visit_date" DESC);



CREATE INDEX "idx_stock_movements_created_by" ON "public"."stock_movements" USING "btree" ("created_by");



CREATE INDEX "idx_stock_movements_product_id" ON "public"."stock_movements" USING "btree" ("product_id");



CREATE INDEX "idx_stock_rolls_company_id" ON "public"."stock_rolls" USING "btree" ("company_id");



CREATE INDEX "idx_stock_rolls_design_id" ON "public"."stock_rolls" USING "btree" ("design_id");



CREATE INDEX "idx_stock_rolls_design_qc" ON "public"."stock_rolls" USING "btree" ("design_id", "qc_status");



CREATE INDEX "idx_stock_rolls_received_date_desc" ON "public"."stock_rolls" USING "btree" ("received_date" DESC);



CREATE INDEX "idx_stock_rolls_supplier_id" ON "public"."stock_rolls" USING "btree" ("supplier_id");



CREATE INDEX "idx_stock_summary_company_id" ON "public"."stock_summary" USING "btree" ("company_id");



CREATE INDEX "idx_stock_summary_design_id" ON "public"."stock_summary" USING "btree" ("design_id");



CREATE INDEX "idx_suppliers_company_id" ON "public"."suppliers" USING "btree" ("company_id");



CREATE INDEX "idx_suppliers_company_name" ON "public"."suppliers" USING "btree" ("company_id", "supplier_name");



CREATE INDEX "idx_system_activity_logs_actor_id" ON "public"."system_activity_logs" USING "btree" ("actor_id");



CREATE INDEX "idx_user_profile_history_changed_by" ON "public"."user_profile_history" USING "btree" ("changed_by");



CREATE INDEX "idx_user_profile_history_profile_id" ON "public"."user_profile_history" USING "btree" ("profile_id");



CREATE INDEX "idx_user_profile_logs_admin_id" ON "public"."user_profile_logs" USING "btree" ("admin_id");



CREATE INDEX "idx_user_profile_logs_user_id" ON "public"."user_profile_logs" USING "btree" ("user_id");



CREATE INDEX "idx_user_profiles_approved" ON "public"."user_profiles" USING "btree" ("is_approved");



CREATE INDEX "idx_user_profiles_company_id" ON "public"."user_profiles" USING "btree" ("company_id");



CREATE INDEX "idx_user_profiles_created_by" ON "public"."user_profiles" USING "btree" ("created_by");



CREATE INDEX "idx_user_profiles_language" ON "public"."user_profiles" USING "btree" ("language_preference");



CREATE INDEX "idx_user_profiles_last_interaction" ON "public"."user_profiles" USING "btree" ("last_interaction_at" DESC);



CREATE INDEX "idx_user_profiles_pricing_tier" ON "public"."user_profiles" USING "btree" ("pricing_tier");



CREATE INDEX "idx_user_profiles_role" ON "public"."user_profiles" USING "btree" ("role");



CREATE INDEX "idx_user_profiles_tier" ON "public"."user_profiles" USING "btree" ("tier");



CREATE INDEX "idx_whatsapp_conversations_customer" ON "public"."whatsapp_conversations" USING "btree" ("customer_id");



CREATE INDEX "idx_whatsapp_conversations_last_message" ON "public"."whatsapp_conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_whatsapp_conversations_phone" ON "public"."whatsapp_conversations" USING "btree" ("phone_number");



CREATE INDEX "idx_whatsapp_conversations_status" ON "public"."whatsapp_conversations" USING "btree" ("status");



CREATE INDEX "idx_whatsapp_messages_conversation" ON "public"."whatsapp_messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_whatsapp_messages_created" ON "public"."whatsapp_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_whatsapp_messages_direction" ON "public"."whatsapp_messages" USING "btree" ("direction");



CREATE INDEX "idx_whatsapp_messages_wa_id" ON "public"."whatsapp_messages" USING "btree" ("whatsapp_message_id");



CREATE UNIQUE INDEX "unique_gst_number" ON "public"."user_profiles" USING "btree" ("gst_number") WHERE (("gst_number" IS NOT NULL) AND ("gst_number" <> ''::"text"));



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."price_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "on_profile_update" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."archive_profile_changes"();



CREATE OR REPLACE TRIGGER "set_company_context" BEFORE INSERT ON "public"."cost_sheets" FOR EACH ROW EXECUTE FUNCTION "public"."auto_populate_company_context"();



CREATE OR REPLACE TRIGGER "set_company_context" BEFORE INSERT ON "public"."design_groups" FOR EACH ROW EXECUTE FUNCTION "public"."auto_populate_company_context"();



CREATE OR REPLACE TRIGGER "set_company_context" BEFORE INSERT ON "public"."designs" FOR EACH ROW EXECUTE FUNCTION "public"."auto_populate_company_context"();



CREATE OR REPLACE TRIGGER "set_company_context" BEFORE INSERT ON "public"."fabric_categories" FOR EACH ROW EXECUTE FUNCTION "public"."auto_populate_company_context"();



CREATE OR REPLACE TRIGGER "set_company_context" BEFORE INSERT ON "public"."fabric_headings" FOR EACH ROW EXECUTE FUNCTION "public"."auto_populate_company_context"();



CREATE OR REPLACE TRIGGER "set_company_context" BEFORE INSERT ON "public"."fabric_master" FOR EACH ROW EXECUTE FUNCTION "public"."auto_populate_company_context"();



CREATE OR REPLACE TRIGGER "set_company_context" BEFORE INSERT ON "public"."fabric_subcategories" FOR EACH ROW EXECUTE FUNCTION "public"."auto_populate_company_context"();



CREATE OR REPLACE TRIGGER "set_company_context" BEFORE INSERT ON "public"."fabric_types" FOR EACH ROW EXECUTE FUNCTION "public"."auto_populate_company_context"();



CREATE OR REPLACE TRIGGER "set_company_context" BEFORE INSERT ON "public"."fabric_widths" FOR EACH ROW EXECUTE FUNCTION "public"."auto_populate_company_context"();



CREATE OR REPLACE TRIGGER "set_company_context" BEFORE INSERT ON "public"."stock_rolls" FOR EACH ROW EXECUTE FUNCTION "public"."auto_populate_company_context"();



CREATE OR REPLACE TRIGGER "set_company_context" BEFORE INSERT ON "public"."stock_summary" FOR EACH ROW EXECUTE FUNCTION "public"."auto_populate_company_context"();



CREATE OR REPLACE TRIGGER "set_company_context" BEFORE INSERT ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."auto_populate_company_context"();



CREATE OR REPLACE TRIGGER "set_design_uploads_created_by" BEFORE INSERT ON "public"."design_uploads" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_by"();



CREATE OR REPLACE TRIGGER "set_fabric_categories_created_by" BEFORE INSERT ON "public"."fabric_categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_by"();



CREATE OR REPLACE TRIGGER "set_fabric_headings_created_by" BEFORE INSERT ON "public"."fabric_headings" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_by"();



CREATE OR REPLACE TRIGGER "set_fabric_master_created_by" BEFORE INSERT ON "public"."fabric_master" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_by"();



CREATE OR REPLACE TRIGGER "set_fabric_subcategories_created_by" BEFORE INSERT ON "public"."fabric_subcategories" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_by"();



CREATE OR REPLACE TRIGGER "set_fabric_types_created_by" BEFORE INSERT ON "public"."fabric_types" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_by"();



CREATE OR REPLACE TRIGGER "set_fabric_widths_created_by" BEFORE INSERT ON "public"."fabric_widths" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_by"();



CREATE OR REPLACE TRIGGER "trigger_audit_user_profiles" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."log_sensitive_action"();



CREATE OR REPLACE TRIGGER "trigger_set_sales_order_number" BEFORE INSERT ON "public"."sales_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_sales_order_number"();



CREATE OR REPLACE TRIGGER "update_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bulk_enquiries_updated_at" BEFORE UPDATE ON "public"."bulk_enquiries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversation_on_new_message" AFTER INSERT ON "public"."whatsapp_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_last_message"();



CREATE OR REPLACE TRIGGER "update_conversations_extended_updated_at" BEFORE UPDATE ON "public"."conversations_extended" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customer_categories_updated_at" BEFORE UPDATE ON "public"."customer_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fabric_categories_updated_at" BEFORE UPDATE ON "public"."fabric_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fabric_images_updated_at" BEFORE UPDATE ON "public"."fabric_images" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fabric_subcategories_updated_at" BEFORE UPDATE ON "public"."fabric_subcategories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_follow_up_tracking_updated_at" BEFORE UPDATE ON "public"."follow_up_tracking" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quote_requests_updated_at" BEFORE UPDATE ON "public"."quote_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quotes_updated_at" BEFORE UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sales_orders_updated_at" BEFORE UPDATE ON "public"."sales_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_stock_on_roll_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."stock_rolls" FOR EACH ROW EXECUTE FUNCTION "public"."update_stock_summary_trigger"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_whatsapp_conversations_updated_at" BEFORE UPDATE ON "public"."whatsapp_conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_whatsapp_messages_updated_at" BEFORE UPDATE ON "public"."whatsapp_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."agent_commissions"
    ADD CONSTRAINT "agent_commissions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."agent_commissions"
    ADD CONSTRAINT "agent_commissions_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."base_fabric_job_workers"
    ADD CONSTRAINT "base_fabric_job_workers_base_fabric_id_fkey" FOREIGN KEY ("base_fabric_id") REFERENCES "public"."base_fabrics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."base_fabric_job_workers"
    ADD CONSTRAINT "base_fabric_job_workers_job_worker_id_fkey" FOREIGN KEY ("job_worker_id") REFERENCES "public"."job_workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."base_fabric_suppliers"
    ADD CONSTRAINT "base_fabric_suppliers_base_fabric_id_fkey" FOREIGN KEY ("base_fabric_id") REFERENCES "public"."base_fabrics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."base_fabric_suppliers"
    ADD CONSTRAINT "base_fabric_suppliers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."base_fabrics"
    ADD CONSTRAINT "base_fabrics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."base_fabrics"
    ADD CONSTRAINT "base_fabrics_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."bulk_item_import_lines"
    ADD CONSTRAINT "bulk_item_import_lines_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "public"."bulk_item_imports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bulk_item_imports"
    ADD CONSTRAINT "bulk_item_imports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bulk_uploads"
    ADD CONSTRAINT "bulk_uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."city_visit_plans"
    ADD CONSTRAINT "city_visit_plans_salesperson_id_fkey" FOREIGN KEY ("salesperson_id") REFERENCES "public"."sales_team"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations_extended"
    ADD CONSTRAINT "conversations_extended_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cost_sheets"
    ADD CONSTRAINT "cost_sheets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."cost_sheets"
    ADD CONSTRAINT "cost_sheets_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id");



ALTER TABLE ONLY "public"."costing_parameters"
    ADD CONSTRAINT "costing_parameters_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."job_costing_templates"("id");



ALTER TABLE ONLY "public"."customer_categories"
    ADD CONSTRAINT "customer_categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."customer_categories"
    ADD CONSTRAINT "customer_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."customer_delivery_addresses"
    ADD CONSTRAINT "customer_delivery_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_interactions"
    ADD CONSTRAINT "customer_interactions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."whatsapp_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_interactions"
    ADD CONSTRAINT "customer_interactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_requirements"
    ADD CONSTRAINT "customer_requirements_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_requirements"
    ADD CONSTRAINT "customer_requirements_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."design_groups"
    ADD CONSTRAINT "design_groups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."design_groups"
    ADD CONSTRAINT "design_groups_fabric_master_id_fkey" FOREIGN KEY ("fabric_master_id") REFERENCES "public"."fabric_master"("id");



ALTER TABLE ONLY "public"."design_groups"
    ADD CONSTRAINT "design_groups_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."design_images"
    ADD CONSTRAINT "design_images_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id");



ALTER TABLE ONLY "public"."design_ready_stock"
    ADD CONSTRAINT "design_ready_stock_fabric_id_fkey" FOREIGN KEY ("fabric_id") REFERENCES "public"."fabrics"("id");



ALTER TABLE ONLY "public"."design_set_components"
    ADD CONSTRAINT "design_set_components_design_set_id_fkey" FOREIGN KEY ("design_set_id") REFERENCES "public"."design_sets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."design_uploads"
    ADD CONSTRAINT "design_uploads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."design_uploads"
    ADD CONSTRAINT "design_uploads_fabric_master_id_fkey" FOREIGN KEY ("fabric_master_id") REFERENCES "public"."fabric_master"("id");



ALTER TABLE ONLY "public"."designs"
    ADD CONSTRAINT "designs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."design_categories"("id");



ALTER TABLE ONLY "public"."designs"
    ADD CONSTRAINT "designs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."designs"
    ADD CONSTRAINT "designs_design_group_id_fkey" FOREIGN KEY ("design_group_id") REFERENCES "public"."design_groups"("id");



ALTER TABLE ONLY "public"."designs"
    ADD CONSTRAINT "designs_fabric_id_fkey" FOREIGN KEY ("fabric_id") REFERENCES "public"."fabric_master"("id");



ALTER TABLE ONLY "public"."dispatch_history"
    ADD CONSTRAINT "dispatch_history_pending_order_id_fkey" FOREIGN KEY ("pending_order_id") REFERENCES "public"."pending_orders"("id");



ALTER TABLE ONLY "public"."fabric_aliases"
    ADD CONSTRAINT "fabric_aliases_fabric_id_fkey" FOREIGN KEY ("fabric_id") REFERENCES "public"."fabrics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fabric_categories"
    ADD CONSTRAINT "fabric_categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."fabric_categories"
    ADD CONSTRAINT "fabric_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."fabric_costs"
    ADD CONSTRAINT "fabric_costs_fabric_id_fkey" FOREIGN KEY ("fabric_id") REFERENCES "public"."fabrics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fabric_costs"
    ADD CONSTRAINT "fabric_costs_job_worker_id_fkey" FOREIGN KEY ("job_worker_id") REFERENCES "public"."job_workers"("id");



ALTER TABLE ONLY "public"."fabric_designs"
    ADD CONSTRAINT "fabric_designs_fabric_id_fkey" FOREIGN KEY ("fabric_id") REFERENCES "public"."fabrics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fabric_headings"
    ADD CONSTRAINT "fabric_headings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."fabric_headings"
    ADD CONSTRAINT "fabric_headings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."fabric_item_completion"
    ADD CONSTRAINT "fabric_item_completion_fabric_item_id_fkey" FOREIGN KEY ("fabric_item_id") REFERENCES "public"."fabric_items"("id");



ALTER TABLE ONLY "public"."fabric_items"
    ADD CONSTRAINT "fabric_items_item_type_id_fkey" FOREIGN KEY ("item_type_id") REFERENCES "public"."item_types"("id");



ALTER TABLE ONLY "public"."fabric_master"
    ADD CONSTRAINT "fabric_master_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."fabric_categories"("id");



ALTER TABLE ONLY "public"."fabric_master"
    ADD CONSTRAINT "fabric_master_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."fabric_master"
    ADD CONSTRAINT "fabric_master_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."fabric_master"
    ADD CONSTRAINT "fabric_master_fabric_type_id_fkey" FOREIGN KEY ("fabric_type_id") REFERENCES "public"."fabric_types"("id");



ALTER TABLE ONLY "public"."fabric_master"
    ADD CONSTRAINT "fabric_master_heading_id_fkey" FOREIGN KEY ("heading_id") REFERENCES "public"."fabric_headings"("id");



ALTER TABLE ONLY "public"."fabric_master"
    ADD CONSTRAINT "fabric_master_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."fabric_subcategories"("id");



ALTER TABLE ONLY "public"."fabric_master"
    ADD CONSTRAINT "fabric_master_width_id_fkey" FOREIGN KEY ("width_id") REFERENCES "public"."fabric_widths"("id");



ALTER TABLE ONLY "public"."fabric_prices"
    ADD CONSTRAINT "fabric_prices_fabric_master_id_fkey" FOREIGN KEY ("fabric_master_id") REFERENCES "public"."fabric_master"("id");



ALTER TABLE ONLY "public"."fabric_specifications"
    ADD CONSTRAINT "fabric_specifications_design_layout_id_fkey" FOREIGN KEY ("design_layout_id") REFERENCES "public"."design_layouts"("id");



ALTER TABLE ONLY "public"."fabric_specifications"
    ADD CONSTRAINT "fabric_specifications_fabric_id_fkey" FOREIGN KEY ("fabric_id") REFERENCES "public"."fabrics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fabric_specifications"
    ADD CONSTRAINT "fabric_specifications_process_subtype_id_fkey" FOREIGN KEY ("process_subtype_id") REFERENCES "public"."process_subtypes"("id");



ALTER TABLE ONLY "public"."fabric_specifications"
    ADD CONSTRAINT "fabric_specifications_process_type_id_fkey" FOREIGN KEY ("process_type_id") REFERENCES "public"."process_types"("id");



ALTER TABLE ONLY "public"."fabric_stock"
    ADD CONSTRAINT "fabric_stock_fabric_id_fkey" FOREIGN KEY ("fabric_id") REFERENCES "public"."fabrics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fabric_stock"
    ADD CONSTRAINT "fabric_stock_warehouse_location_id_fkey" FOREIGN KEY ("warehouse_location_id") REFERENCES "public"."warehouse_locations"("id");



ALTER TABLE ONLY "public"."fabric_subcategories"
    ADD CONSTRAINT "fabric_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."fabric_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fabric_subcategories"
    ADD CONSTRAINT "fabric_subcategories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."fabric_subcategories"
    ADD CONSTRAINT "fabric_subcategories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."fabric_types"
    ADD CONSTRAINT "fabric_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."fabric_types"
    ADD CONSTRAINT "fabric_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."fabric_types"
    ADD CONSTRAINT "fabric_types_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."fabric_subcategories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fabric_views"
    ADD CONSTRAINT "fabric_views_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fabric_widths"
    ADD CONSTRAINT "fabric_widths_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."fabric_widths"
    ADD CONSTRAINT "fabric_widths_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."fancy_base_fabrics"
    ADD CONSTRAINT "fancy_base_fabrics_base_fabric_id_fkey" FOREIGN KEY ("base_fabric_id") REFERENCES "public"."base_fabrics"("id");



ALTER TABLE ONLY "public"."fancy_base_fabrics"
    ADD CONSTRAINT "fancy_base_fabrics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."fancy_finish_fabrics"
    ADD CONSTRAINT "fancy_finish_fabrics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."fancy_finish_fabrics"
    ADD CONSTRAINT "fancy_finish_fabrics_finish_fabric_id_fkey" FOREIGN KEY ("finish_fabric_id") REFERENCES "public"."finish_fabrics"("id");



ALTER TABLE ONLY "public"."fancy_finish_fabrics"
    ADD CONSTRAINT "fancy_finish_fabrics_job_worker_id_fkey" FOREIGN KEY ("job_worker_id") REFERENCES "public"."job_workers"("id");



ALTER TABLE ONLY "public"."fancy_finish_fabrics"
    ADD CONSTRAINT "fancy_finish_fabrics_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."fancy_finish_fabrics_v2"
    ADD CONSTRAINT "fancy_finish_fabrics_v2_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."file_compressions"
    ADD CONSTRAINT "file_compressions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."filter_presets"
    ADD CONSTRAINT "filter_presets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."finish_fabric_designs"
    ADD CONSTRAINT "finish_fabric_designs_finish_fabric_id_fkey" FOREIGN KEY ("finish_fabric_id") REFERENCES "public"."finish_fabrics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."finish_fabric_designs"
    ADD CONSTRAINT "finish_fabric_designs_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."finish_fabric_job_workers"
    ADD CONSTRAINT "finish_fabric_job_workers_finish_fabric_id_fkey" FOREIGN KEY ("finish_fabric_id") REFERENCES "public"."finish_fabrics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."finish_fabric_job_workers"
    ADD CONSTRAINT "finish_fabric_job_workers_job_worker_id_fkey" FOREIGN KEY ("job_worker_id") REFERENCES "public"."job_workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."finish_fabric_suppliers"
    ADD CONSTRAINT "finish_fabric_suppliers_finish_fabric_id_fkey" FOREIGN KEY ("finish_fabric_id") REFERENCES "public"."finish_fabrics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."finish_fabric_suppliers"
    ADD CONSTRAINT "finish_fabric_suppliers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."finish_fabrics"
    ADD CONSTRAINT "finish_fabrics_base_fabric_id_fkey" FOREIGN KEY ("base_fabric_id") REFERENCES "public"."base_fabrics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."finish_fabrics"
    ADD CONSTRAINT "finish_fabrics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."finish_fabrics"
    ADD CONSTRAINT "finish_fabrics_ink_type_id_fkey" FOREIGN KEY ("ink_type_id") REFERENCES "public"."ink_types"("id");



ALTER TABLE ONLY "public"."finish_fabrics"
    ADD CONSTRAINT "finish_fabrics_job_worker_id_fkey" FOREIGN KEY ("job_worker_id") REFERENCES "public"."job_workers"("id");



ALTER TABLE ONLY "public"."finish_fabrics"
    ADD CONSTRAINT "finish_fabrics_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."follow_up_tracking"
    ADD CONSTRAINT "follow_up_tracking_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."whatsapp_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follow_up_tracking"
    ADD CONSTRAINT "follow_up_tracking_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."garment_accessories"
    ADD CONSTRAINT "garment_accessories_readymade_garment_id_fkey" FOREIGN KEY ("readymade_garment_id") REFERENCES "public"."readymade_garments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."garment_components"
    ADD CONSTRAINT "garment_components_fancy_finish_id_fkey" FOREIGN KEY ("fancy_finish_id") REFERENCES "public"."fancy_finish_fabrics"("id");



ALTER TABLE ONLY "public"."garment_components"
    ADD CONSTRAINT "garment_components_finish_fabric_id_fkey" FOREIGN KEY ("finish_fabric_id") REFERENCES "public"."finish_fabrics"("id");



ALTER TABLE ONLY "public"."garment_components"
    ADD CONSTRAINT "garment_components_readymade_garment_id_fkey" FOREIGN KEY ("readymade_garment_id") REFERENCES "public"."readymade_garments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."garment_size_variants"
    ADD CONSTRAINT "garment_size_variants_readymade_garment_id_fkey" FOREIGN KEY ("readymade_garment_id") REFERENCES "public"."readymade_garments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."google_drive_settings"
    ADD CONSTRAINT "google_drive_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."google_drive_sync"
    ADD CONSTRAINT "google_drive_sync_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."import_errors"
    ADD CONSTRAINT "import_errors_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."imports"
    ADD CONSTRAINT "imports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id");



ALTER TABLE ONLY "public"."job_orders"
    ADD CONSTRAINT "job_orders_jobwork_unit_id_fkey" FOREIGN KEY ("jobwork_unit_id") REFERENCES "public"."job_workers"("id");



ALTER TABLE ONLY "public"."job_prices"
    ADD CONSTRAINT "job_prices_fabric_master_id_fkey" FOREIGN KEY ("fabric_master_id") REFERENCES "public"."fabric_master"("id");



ALTER TABLE ONLY "public"."job_prices"
    ADD CONSTRAINT "job_prices_job_work_unit_id_fkey" FOREIGN KEY ("job_work_unit_id") REFERENCES "public"."job_work_units"("id");



ALTER TABLE ONLY "public"."job_work_bills"
    ADD CONSTRAINT "job_work_bills_job_worker_id_fkey" FOREIGN KEY ("job_worker_id") REFERENCES "public"."job_workers"("id");



ALTER TABLE ONLY "public"."master_process_entry"
    ADD CONSTRAINT "master_process_entry_job_worker_id_fkey" FOREIGN KEY ("job_worker_id") REFERENCES "public"."job_workers"("id");



ALTER TABLE ONLY "public"."master_process"
    ADD CONSTRAINT "master_process_job_worker_id_fkey" FOREIGN KEY ("job_worker_id") REFERENCES "public"."job_workers"("id");



ALTER TABLE ONLY "public"."master_purchase_entry"
    ADD CONSTRAINT "master_purchase_entry_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."master_purchase"
    ADD CONSTRAINT "master_purchase_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."master_value_addition_entry"
    ADD CONSTRAINT "master_value_addition_entry_job_worker_id_fkey" FOREIGN KEY ("job_worker_id") REFERENCES "public"."job_workers"("id");



ALTER TABLE ONLY "public"."master_value_addition"
    ADD CONSTRAINT "master_value_addition_job_worker_id_fkey" FOREIGN KEY ("job_worker_id") REFERENCES "public"."job_workers"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."order_dispatch_items"
    ADD CONSTRAINT "order_dispatch_items_order_dispatch_id_fkey" FOREIGN KEY ("order_dispatch_id") REFERENCES "public"."order_dispatches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_dispatch_items"
    ADD CONSTRAINT "order_dispatch_items_sales_order_item_id_fkey" FOREIGN KEY ("sales_order_item_id") REFERENCES "public"."sales_order_items"("id");



ALTER TABLE ONLY "public"."order_dispatches"
    ADD CONSTRAINT "order_dispatches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."order_dispatches"
    ADD CONSTRAINT "order_dispatches_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id");



ALTER TABLE ONLY "public"."order_dispatches"
    ADD CONSTRAINT "order_dispatches_transport_id_fkey" FOREIGN KEY ("transport_id") REFERENCES "public"."transports"("id");



ALTER TABLE ONLY "public"."order_forms"
    ADD CONSTRAINT "order_forms_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_followups"
    ADD CONSTRAINT "payment_followups_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."field_customers"("id");



ALTER TABLE ONLY "public"."payment_followups"
    ADD CONSTRAINT "payment_followups_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "public"."sales_visits"("id");



ALTER TABLE ONLY "public"."pending_orders"
    ADD CONSTRAINT "pending_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."price_approvals"
    ADD CONSTRAINT "price_approvals_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."price_approvals"
    ADD CONSTRAINT "price_approvals_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."price_requests"
    ADD CONSTRAINT "price_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."price_requests"
    ADD CONSTRAINT "price_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."price_requests"
    ADD CONSTRAINT "price_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."process_subtypes"
    ADD CONSTRAINT "process_subtypes_process_type_id_fkey" FOREIGN KEY ("process_type_id") REFERENCES "public"."process_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_components"
    ADD CONSTRAINT "product_components_fabric_id_fkey" FOREIGN KEY ("fabric_id") REFERENCES "public"."fabrics"("id");



ALTER TABLE ONLY "public"."product_components"
    ADD CONSTRAINT "product_components_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_costing_sheets"
    ADD CONSTRAINT "product_costing_sheets_costing_template_id_fkey" FOREIGN KEY ("costing_template_id") REFERENCES "public"."job_costing_templates"("id");



ALTER TABLE ONLY "public"."product_costing_sheets"
    ADD CONSTRAINT "product_costing_sheets_fabric_id_fkey" FOREIGN KEY ("fabric_id") REFERENCES "public"."fabrics"("id");



ALTER TABLE ONLY "public"."product_costing_sheets"
    ADD CONSTRAINT "product_costing_sheets_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."product_fabric_mapping"
    ADD CONSTRAINT "product_fabric_mapping_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "public"."product_components"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_fabric_mapping"
    ADD CONSTRAINT "product_fabric_mapping_fabric_id_fkey" FOREIGN KEY ("fabric_id") REFERENCES "public"."fabrics"("id");



ALTER TABLE ONLY "public"."product_fabric_mapping"
    ADD CONSTRAINT "product_fabric_mapping_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_master_accessories"
    ADD CONSTRAINT "product_master_accessories_product_master_id_fkey" FOREIGN KEY ("product_master_id") REFERENCES "public"."product_masters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_master_components"
    ADD CONSTRAINT "product_master_components_product_master_id_fkey" FOREIGN KEY ("product_master_id") REFERENCES "public"."product_masters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_master_size_variants"
    ADD CONSTRAINT "product_master_size_variants_product_master_id_fkey" FOREIGN KEY ("product_master_id") REFERENCES "public"."product_masters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_masters"
    ADD CONSTRAINT "product_masters_design_set_id_fkey" FOREIGN KEY ("design_set_id") REFERENCES "public"."design_sets"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_bills"
    ADD CONSTRAINT "purchase_bills_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."quantity_discounts"
    ADD CONSTRAINT "quantity_discounts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quantity_discounts"
    ADD CONSTRAINT "quantity_discounts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quantity_discounts"
    ADD CONSTRAINT "quantity_discounts_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."pricing_tiers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_requests"
    ADD CONSTRAINT "quote_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."quote_requests"
    ADD CONSTRAINT "quote_requests_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."whatsapp_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_requests"
    ADD CONSTRAINT "quote_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."readymade_garments"
    ADD CONSTRAINT "readymade_garments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sales_bills"
    ADD CONSTRAINT "sales_bills_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."sales_order_approvals"
    ADD CONSTRAINT "sales_order_approvals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."sales_order_approvals"
    ADD CONSTRAINT "sales_order_approvals_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id");



ALTER TABLE ONLY "public"."sales_order_attachments"
    ADD CONSTRAINT "sales_order_attachments_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_order_attachments"
    ADD CONSTRAINT "sales_order_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sales_order_items"
    ADD CONSTRAINT "sales_order_items_fabric_item_id_fkey" FOREIGN KEY ("fabric_item_id") REFERENCES "public"."fabrics"("id");



ALTER TABLE ONLY "public"."sales_order_items"
    ADD CONSTRAINT "sales_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_prepared_by_user_id_fkey" FOREIGN KEY ("prepared_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_salesperson_id_fkey" FOREIGN KEY ("salesperson_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_transport_id_fkey" FOREIGN KEY ("transport_id") REFERENCES "public"."transports"("id");



ALTER TABLE ONLY "public"."sales_visits"
    ADD CONSTRAINT "sales_visits_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."field_customers"("id");



ALTER TABLE ONLY "public"."sales_visits"
    ADD CONSTRAINT "sales_visits_salesperson_id_fkey" FOREIGN KEY ("salesperson_id") REFERENCES "public"."sales_team"("id");



ALTER TABLE ONLY "public"."stock_alerts"
    ADD CONSTRAINT "stock_alerts_fabric_id_fkey" FOREIGN KEY ("fabric_id") REFERENCES "public"."fabrics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."stock_rolls"
    ADD CONSTRAINT "stock_rolls_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."stock_rolls"
    ADD CONSTRAINT "stock_rolls_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id");



ALTER TABLE ONLY "public"."stock_rolls"
    ADD CONSTRAINT "stock_rolls_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."stock_summary"
    ADD CONSTRAINT "stock_summary_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."stock_summary"
    ADD CONSTRAINT "stock_summary_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_transactions"
    ADD CONSTRAINT "stock_transactions_fabric_id_fkey" FOREIGN KEY ("fabric_id") REFERENCES "public"."fabrics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_rates"
    ADD CONSTRAINT "supplier_rates_base_fabric_id_fkey" FOREIGN KEY ("base_fabric_id") REFERENCES "public"."fabric_master"("id");



ALTER TABLE ONLY "public"."supplier_rates"
    ADD CONSTRAINT "supplier_rates_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."system_activity_logs"
    ADD CONSTRAINT "system_activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_profile_history"
    ADD CONSTRAINT "user_profile_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_profile_history"
    ADD CONSTRAINT "user_profile_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profile_logs"
    ADD CONSTRAINT "user_profile_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_profile_logs"
    ADD CONSTRAINT "user_profile_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pricing_tier_fkey" FOREIGN KEY ("pricing_tier") REFERENCES "public"."pricing_tiers"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."va_prices"
    ADD CONSTRAINT "va_prices_fabric_master_id_fkey" FOREIGN KEY ("fabric_master_id") REFERENCES "public"."fabric_master"("id");



ALTER TABLE ONLY "public"."va_prices"
    ADD CONSTRAINT "va_prices_va_unit_id_fkey" FOREIGN KEY ("va_unit_id") REFERENCES "public"."va_units"("id");



ALTER TABLE ONLY "public"."visit_followups"
    ADD CONSTRAINT "visit_followups_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."field_customers"("id");



ALTER TABLE ONLY "public"."visit_followups"
    ADD CONSTRAINT "visit_followups_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "public"."sales_visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_conversations"
    ADD CONSTRAINT "whatsapp_conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."whatsapp_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_settings"
    ADD CONSTRAINT "whatsapp_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Admin can manage all google drive syncs" ON "public"."google_drive_sync" USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'admin'::"text")))));



CREATE POLICY "Admin delete categories" ON "public"."fabric_categories" FOR DELETE USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin delete headings" ON "public"."fabric_headings" FOR DELETE USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin delete subcategories" ON "public"."fabric_subcategories" FOR DELETE USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin delete types" ON "public"."fabric_types" FOR DELETE USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin delete widths" ON "public"."fabric_widths" FOR DELETE USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin full access headings" ON "public"."fabric_headings" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin full access subcategories" ON "public"."fabric_subcategories" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin full access types" ON "public"."fabric_types" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin full access widths" ON "public"."fabric_widths" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin insert categories" ON "public"."fabric_categories" FOR INSERT WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin insert headings" ON "public"."fabric_headings" FOR INSERT WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin insert subcategories" ON "public"."fabric_subcategories" FOR INSERT WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin insert types" ON "public"."fabric_types" FOR INSERT WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin insert widths" ON "public"."fabric_widths" FOR INSERT WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin manage accessories_consumption" ON "public"."accessories_consumption" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text"])));



CREATE POLICY "Admin manage bulk_bills" ON "public"."bulk_bills" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admin manage category_visibility" ON "public"."category_visibility" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admin manage components" ON "public"."product_components" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text", 'store_manager'::"text", 'sales_manager'::"text", 'designer'::"text"])));



CREATE POLICY "Admin manage design_descriptions" ON "public"."design_descriptions" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text"])));



CREATE POLICY "Admin manage expense HSN" ON "public"."expense_hsn_codes" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admin manage garment HSN" ON "public"."readymade_garment_hsn_codes" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admin manage garment types" ON "public"."garment_types" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text"])));



CREATE POLICY "Admin manage hakoba_embroidery" ON "public"."hakoba_embroidery" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text"])));



CREATE POLICY "Admin manage mappings" ON "public"."product_fabric_mapping" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text", 'store_manager'::"text", 'sales_manager'::"text", 'designer'::"text"])));



CREATE POLICY "Admin manage process HSN" ON "public"."process_hsn_codes" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admin manage process_specifications_master" ON "public"."process_specifications_master" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text"])));



CREATE POLICY "Admin manage readymade_garment_specs" ON "public"."readymade_garment_specs" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text"])));



CREATE POLICY "Admin manage set_components" ON "public"."set_components" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text"])));



CREATE POLICY "Admin manage value addition HSN" ON "public"."value_addition_hsn_codes" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admin update categories" ON "public"."fabric_categories" FOR UPDATE USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin update headings" ON "public"."fabric_headings" FOR UPDATE USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin update subcategories" ON "public"."fabric_subcategories" FOR UPDATE USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin update types" ON "public"."fabric_types" FOR UPDATE USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admin update widths" ON "public"."fabric_widths" FOR UPDATE USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admins and Head Managers view all logs" ON "public"."system_activity_logs" FOR SELECT USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text"])));



CREATE POLICY "Admins and store managers can manage products" ON "public"."products" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'store_manager'::"text"])));



CREATE POLICY "Admins and store managers can manage stock" ON "public"."stock_movements" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'store_manager'::"text"])));



CREATE POLICY "Admins can delete appointments" ON "public"."appointments" FOR DELETE USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admins can do everything on user_profiles" ON "public"."user_profiles" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admins can manage agents" ON "public"."agents" USING ((( SELECT "user_profiles"."role"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can manage all quotes" ON "public"."quote_requests" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."tier" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage categories" ON "public"."categories" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admins can manage conversations_extended" ON "public"."conversations_extended" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'office_team'::"text", 'sales_team'::"text"]))))));



CREATE POLICY "Admins can manage email logs" ON "public"."email_logs" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admins can manage parameters" ON "public"."costing_parameters" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage pricing tiers" ON "public"."pricing_tiers" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admins can manage quantity discounts" ON "public"."quantity_discounts" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admins can manage quotes" ON "public"."quotes" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'office_team'::"text", 'sales_team'::"text"]))))));



CREATE POLICY "Admins can manage rates" ON "public"."supplier_rates" USING ((( SELECT "user_profiles"."role"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can manage user profile logs" ON "public"."user_profile_logs" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admins can update appointments" ON "public"."appointments" FOR UPDATE USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admins can view all conversations" ON "public"."whatsapp_conversations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."tier" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can view all history" ON "public"."user_profile_history" FOR SELECT USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'office_team'::"text"])));



CREATE POLICY "Admins can view all interactions" ON "public"."customer_interactions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."tier" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can view all messages" ON "public"."whatsapp_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."tier" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can view audit logs" ON "public"."audit_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view fabric_views" ON "public"."fabric_views" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'office_team'::"text", 'sales_team'::"text"]))))));



CREATE POLICY "Admins manage all orders" ON "public"."sales_orders" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'office_team'::"text", 'sales_team'::"text", 'store_manager'::"text"]))))));



CREATE POLICY "Admins manage categories" ON "public"."customer_categories" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admins manage components" ON "public"."product_components" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text", 'store_manager'::"text"])));



CREATE POLICY "Admins manage custom items" ON "public"."custom_items" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admins manage drive settings" ON "public"."google_drive_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins manage drive sync" ON "public"."google_drive_sync" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins manage exports" ON "public"."scheduled_exports" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admins manage invoices" ON "public"."invoices" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'accountant'::"text"]))))));



CREATE POLICY "Admins manage parameters" ON "public"."costing_parameters" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text", 'accountant'::"text"])));



CREATE POLICY "Admins manage permissions" ON "public"."permission_settings" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admins manage specs" ON "public"."item_specifications_master" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Admins manage templates" ON "public"."job_costing_templates" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text", 'accountant'::"text"])));



CREATE POLICY "Admins manage uploads" ON "public"."bulk_uploads" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'head_manager'::"text"]))))));



CREATE POLICY "Admins manage whatsapp config" ON "public"."whatsapp_config" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins manage whatsapp settings" ON "public"."whatsapp_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins manage whatsapp templates" ON "public"."whatsapp_templates" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins view all customers" ON "public"."customers" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'office_team'::"text", 'sales_team'::"text", 'accountant'::"text"]))))));



CREATE POLICY "Allow DELETE for own records" ON "public"."companies" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow DELETE for own records" ON "public"."cost_sheets" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow DELETE for own records" ON "public"."design_groups" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow DELETE for own records" ON "public"."design_images" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow DELETE for own records" ON "public"."fabric_categories" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow DELETE for own records" ON "public"."fabric_headings" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow DELETE for own records" ON "public"."fabric_subcategories" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow DELETE for own records" ON "public"."fabric_types" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow DELETE for own records" ON "public"."fabric_widths" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow DELETE for own records" ON "public"."stock_rolls" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow DELETE for own records" ON "public"."stock_summary" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow DELETE for own records" ON "public"."suppliers" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow INSERT for authenticated users" ON "public"."companies" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow INSERT for authenticated users" ON "public"."cost_sheets" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow INSERT for authenticated users" ON "public"."design_groups" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow INSERT for authenticated users" ON "public"."design_images" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow INSERT for authenticated users" ON "public"."fabric_categories" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow INSERT for authenticated users" ON "public"."fabric_headings" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow INSERT for authenticated users" ON "public"."fabric_subcategories" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow INSERT for authenticated users" ON "public"."fabric_types" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow INSERT for authenticated users" ON "public"."fabric_widths" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow INSERT for authenticated users" ON "public"."stock_rolls" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow INSERT for authenticated users" ON "public"."stock_summary" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow INSERT for authenticated users" ON "public"."suppliers" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow SELECT for authenticated users" ON "public"."companies" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow SELECT for authenticated users" ON "public"."cost_sheets" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow SELECT for authenticated users" ON "public"."design_groups" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow SELECT for authenticated users" ON "public"."design_images" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow SELECT for authenticated users" ON "public"."fabric_categories" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow SELECT for authenticated users" ON "public"."fabric_headings" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow SELECT for authenticated users" ON "public"."fabric_subcategories" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow SELECT for authenticated users" ON "public"."fabric_types" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow SELECT for authenticated users" ON "public"."fabric_widths" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow SELECT for authenticated users" ON "public"."stock_rolls" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow SELECT for authenticated users" ON "public"."stock_summary" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow SELECT for authenticated users" ON "public"."suppliers" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow UPDATE for own records" ON "public"."companies" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow UPDATE for own records" ON "public"."cost_sheets" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow UPDATE for own records" ON "public"."design_groups" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow UPDATE for own records" ON "public"."design_images" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow UPDATE for own records" ON "public"."fabric_categories" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow UPDATE for own records" ON "public"."fabric_headings" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow UPDATE for own records" ON "public"."fabric_subcategories" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow UPDATE for own records" ON "public"."fabric_types" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow UPDATE for own records" ON "public"."fabric_widths" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow UPDATE for own records" ON "public"."stock_rolls" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow UPDATE for own records" ON "public"."stock_summary" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow UPDATE for own records" ON "public"."suppliers" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow all for authenticated" ON "public"."field_visits" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated admins to manage messages" ON "public"."whatsapp_messages" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow read for auth users" ON "public"."job_prices" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow read for auth users" ON "public"."job_work_units" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow read for auth users" ON "public"."va_prices" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow read for auth users" ON "public"."va_units" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow write for admins" ON "public"."job_prices" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow write for admins" ON "public"."job_work_units" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow write for admins" ON "public"."va_prices" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow write for admins" ON "public"."va_units" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Anyone can create appointments" ON "public"."appointments" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can insert logs" ON "public"."system_activity_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "actor_id"));



CREATE POLICY "Authenticated can select own or admin" ON "public"."price_requests" FOR SELECT TO "authenticated" USING (((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text") OR ("requested_by" = "auth"."uid"())));



CREATE POLICY "Authenticated full access fabric_masters" ON "public"."fabric_masters" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated full access fabric_prices" ON "public"."fabric_prices" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated manage categories" ON "public"."dropdown_categories" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated manage designs" ON "public"."designs" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated manage dropdowns" ON "public"."dropdown_options" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated read categories" ON "public"."dropdown_categories" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can create orders" ON "public"."orders" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can manage import_errors" ON "public"."import_errors" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can manage imports" ON "public"."imports" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can read dropdowns" ON "public"."dropdown_options" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can upload attachments" ON "public"."sales_order_attachments" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can view attachments" ON "public"."sales_order_attachments" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can view parameters" ON "public"."costing_parameters" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users full access fancy_base" ON "public"."fancy_base_fabrics" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users full access fancy_finish_v2" ON "public"."fancy_finish_fabrics_v2" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users view categories" ON "public"."customer_categories" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Customers can insert fabric_views" ON "public"."fabric_views" FOR INSERT WITH CHECK (("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Customers can view own quotes" ON "public"."quotes" FOR SELECT USING (("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Customers can view their conversation messages" ON "public"."whatsapp_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."whatsapp_conversations"
  WHERE (("whatsapp_conversations"."id" = "whatsapp_messages"."conversation_id") AND ("whatsapp_conversations"."customer_id" = "auth"."uid"())))));



CREATE POLICY "Customers can view their own conversations" ON "public"."whatsapp_conversations" FOR SELECT TO "authenticated" USING (("customer_id" = "auth"."uid"()));



CREATE POLICY "Customers can view their own interactions" ON "public"."customer_interactions" FOR SELECT TO "authenticated" USING (("customer_id" = "auth"."uid"()));



CREATE POLICY "Customers can view their own quotes" ON "public"."quote_requests" FOR SELECT TO "authenticated" USING (("customer_id" = "auth"."uid"()));



CREATE POLICY "Customers create own orders" ON "public"."sales_orders" FOR INSERT WITH CHECK (("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Customers view own data" ON "public"."customers" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Customers view own invoices" ON "public"."invoices" FOR SELECT USING (("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Customers view own orders" ON "public"."sales_orders" FOR SELECT USING (("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Delete designs" ON "public"."design_uploads" FOR DELETE USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Designers and Admins can update" ON "public"."design_uploads" FOR UPDATE USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text", 'designer'::"text"])));



CREATE POLICY "Designers and Admins can upload" ON "public"."design_uploads" FOR INSERT WITH CHECK (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text", 'designer'::"text"])));



CREATE POLICY "Directors can update price requests" ON "public"."price_requests" FOR UPDATE USING (("public"."get_my_role"() = 'admin'::"text")) WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Enable all access for admins" ON "public"."fabric_stock" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text", 'store_manager'::"text", 'despatch_manager'::"text"])));



CREATE POLICY "Enable all access for admins" ON "public"."stock_alerts" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text", 'store_manager'::"text"])));



CREATE POLICY "Enable all access for admins" ON "public"."warehouse_locations" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text", 'store_manager'::"text"])));



CREATE POLICY "Enable all access for authenticated users" ON "public"."bulk_item_import_lines" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users" ON "public"."bulk_item_imports" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users" ON "public"."product_master_accessories" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users" ON "public"."product_master_components" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users" ON "public"."product_master_size_variants" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users" ON "public"."product_masters" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users" ON "public"."purchase_orders" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users on base_fabrics" ON "public"."base_fabrics" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users on cost_sheets" ON "public"."cost_sheets" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users on costing_components" ON "public"."costing_components" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users on costing_paths" ON "public"."costing_paths" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users on costing_sheets" ON "public"."costing_sheets" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users on dropdown_categorie" ON "public"."dropdown_categories" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users on finish_fabrics" ON "public"."finish_fabrics" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users on job_orders" ON "public"."job_orders" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users on job_prices" ON "public"."job_prices" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users on job_work_units" ON "public"."job_work_units" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users on schiffli_costing" ON "public"."schiffli_costing" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users on va_prices" ON "public"."va_prices" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users on va_units" ON "public"."va_units" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated" ON "public"."fancy_finish_fabrics" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated" ON "public"."garment_accessories" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated" ON "public"."garment_components" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated" ON "public"."garment_size_variants" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated" ON "public"."job_workers" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated" ON "public"."readymade_garments" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."base_fabrics" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."conversations" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."costing_paths" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."customer_requirements" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."design_images" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."design_set_components" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."design_sets" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."fancy_base_fabrics" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."fancy_finish_fabrics" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."finish_fabric_designs" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."finish_fabrics" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."hsn_codes" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."job_cards" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."job_work_units" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."order_forms" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."price_approvals" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."process_charges" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."process_entries" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."purchase_entries" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."purchase_fabric" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."rate_card" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."suppliers" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."value_addition_charges" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all for authenticated users" ON "public"."value_addition_entries" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert access for authenticated users" ON "public"."order_status_history" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert for authenticated" ON "public"."stock_transactions" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert/update/delete for service_role only" ON "public"."custom_dropdown_values" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."custom_dropdown_values" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."fabric_stock" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."stock_alerts" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."stock_transactions" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."warehouse_locations" FOR SELECT USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."ink_types" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."order_status_history" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for authenticated users on process_specifica" ON "public"."process_specifications" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read for all" ON "public"."admin_settings" FOR SELECT USING (true);



CREATE POLICY "Enable write access for admins" ON "public"."ink_types" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND (("user_profiles"."role" = 'admin'::"text") OR ("user_profiles"."role" = 'head_manager'::"text"))))));



CREATE POLICY "Enable write access for admins on process_specifications" ON "public"."process_specifications" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'office_team'::"text"]))))));



CREATE POLICY "Everyone reads custom items" ON "public"."custom_items" FOR SELECT USING (true);



CREATE POLICY "Everyone reads permissions" ON "public"."permission_settings" FOR SELECT USING (true);



CREATE POLICY "Everyone reads specs" ON "public"."item_specifications_master" FOR SELECT USING (true);



CREATE POLICY "Insert designs" ON "public"."design_uploads" FOR INSERT WITH CHECK (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'designer'::"text", 'head_manager'::"text", 'store_manager'::"text"])));



CREATE POLICY "Office Admin Delete Fabric Master" ON "public"."fabric_master" FOR DELETE USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text"])));



CREATE POLICY "Office Admin Insert Fabric Master" ON "public"."fabric_master" FOR INSERT WITH CHECK (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text"])));



CREATE POLICY "Office Admin Manage Categories" ON "public"."fabric_categories" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text"])));



CREATE POLICY "Office Admin Update Fabric Master" ON "public"."fabric_master" FOR UPDATE USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text"])));



CREATE POLICY "Office Admin and Staff View Fabric Master" ON "public"."fabric_master" FOR SELECT USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text", 'office_team'::"text", 'sales_manager'::"text", 'designer'::"text", 'store_manager'::"text"])));



CREATE POLICY "Office team can manage bulk enquiries" ON "public"."bulk_enquiries" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'office_team'::"text"])));



CREATE POLICY "Office team can manage order items" ON "public"."order_items" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'office_team'::"text", 'store_manager'::"text"])));



CREATE POLICY "Office team can update orders" ON "public"."orders" FOR UPDATE USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'office_team'::"text", 'store_manager'::"text"])));



CREATE POLICY "Owners can update their own price requests" ON "public"."price_requests" FOR UPDATE TO "authenticated" USING (("requested_by" = "auth"."uid"())) WITH CHECK (("requested_by" = "auth"."uid"()));



CREATE POLICY "PUBLIC tier can view public fabrics" ON "public"."fabric_images" FOR SELECT TO "authenticated" USING (((("tier_visibility")::"text" = 'PUBLIC'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."tier" = ANY (ARRAY['REGISTERED'::"text", 'VIP'::"text", 'ADMIN'::"text"])))))));



CREATE POLICY "Public Read Companies" ON "public"."companies" FOR SELECT USING (true);



CREATE POLICY "Public and retailers can view available products" ON "public"."products" FOR SELECT USING ((("is_active" = true) AND ((("public"."get_my_role"() IS NOT NULL) AND ("public"."get_my_role"() <> 'customer'::"text")) OR ((("public"."get_my_role"() IS NULL) OR ("public"."get_my_role"() = 'customer'::"text")) AND ("is_retail_available" = true)))));



CREATE POLICY "Public can create bulk enquiries" ON "public"."bulk_enquiries" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public can view categories" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "Public can view pricing tiers" ON "public"."pricing_tiers" FOR SELECT USING (true);



CREATE POLICY "Public can view quantity discounts" ON "public"."quantity_discounts" FOR SELECT USING (true);



CREATE POLICY "Public full access costs" ON "public"."fabric_costs" USING (true);



CREATE POLICY "Public full access fabrics" ON "public"."fabrics" USING (true);



CREATE POLICY "Public full access specs" ON "public"."fabric_specifications" USING (true);



CREATE POLICY "Public read accessories_consumption" ON "public"."accessories_consumption" FOR SELECT USING (true);



CREATE POLICY "Public read bulk_bills" ON "public"."bulk_bills" FOR SELECT USING (true);



CREATE POLICY "Public read category_visibility" ON "public"."category_visibility" FOR SELECT USING (true);



CREATE POLICY "Public read components" ON "public"."product_components" FOR SELECT USING (true);



CREATE POLICY "Public read country codes" ON "public"."country_codes" FOR SELECT USING (true);



CREATE POLICY "Public read design categories" ON "public"."design_categories" FOR SELECT USING (true);



CREATE POLICY "Public read design_descriptions" ON "public"."design_descriptions" FOR SELECT USING (true);



CREATE POLICY "Public read designs" ON "public"."designs" FOR SELECT USING (true);



CREATE POLICY "Public read dropdowns" ON "public"."dropdown_options" FOR SELECT USING (true);



CREATE POLICY "Public read expense HSN" ON "public"."expense_hsn_codes" FOR SELECT USING (true);



CREATE POLICY "Public read fabric metadata" ON "public"."fabric_categories" FOR SELECT USING (true);



CREATE POLICY "Public read fabric metadata head" ON "public"."fabric_headings" FOR SELECT USING (true);



CREATE POLICY "Public read fabric metadata sub" ON "public"."fabric_subcategories" FOR SELECT USING (true);



CREATE POLICY "Public read fabric metadata type" ON "public"."fabric_types" FOR SELECT USING (true);



CREATE POLICY "Public read fabric metadata width" ON "public"."fabric_widths" FOR SELECT USING (true);



CREATE POLICY "Public read garment HSN" ON "public"."readymade_garment_hsn_codes" FOR SELECT USING (true);



CREATE POLICY "Public read garment types" ON "public"."garment_types" FOR SELECT USING (true);



CREATE POLICY "Public read hakoba_embroidery" ON "public"."hakoba_embroidery" FOR SELECT USING (true);



CREATE POLICY "Public read headings" ON "public"."fabric_headings" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Public read mappings" ON "public"."product_fabric_mapping" FOR SELECT USING (true);



CREATE POLICY "Public read pincode data" ON "public"."pincode_data" FOR SELECT USING (true);



CREATE POLICY "Public read process HSN" ON "public"."process_hsn_codes" FOR SELECT USING (true);



CREATE POLICY "Public read process_specifications_master" ON "public"."process_specifications_master" FOR SELECT USING (true);



CREATE POLICY "Public read readymade_garment_specs" ON "public"."readymade_garment_specs" FOR SELECT USING (true);



CREATE POLICY "Public read set_components" ON "public"."set_components" FOR SELECT USING (true);



CREATE POLICY "Public read subcategories" ON "public"."fabric_subcategories" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Public read types" ON "public"."fabric_types" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Public read value addition HSN" ON "public"."value_addition_hsn_codes" FOR SELECT USING (true);



CREATE POLICY "Public read widths" ON "public"."fabric_widths" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "REGISTERED tier can view registered fabrics" ON "public"."fabric_images" FOR SELECT TO "authenticated" USING (((("tier_visibility")::"text" = ANY ((ARRAY['PUBLIC'::character varying, 'REGISTERED'::character varying])::"text"[])) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."tier" = ANY (ARRAY['VIP'::"text", 'ADMIN'::"text"])))))));



CREATE POLICY "Staff Full Access Brokerage" ON "public"."brokerage_entries" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff Full Access Cost Sheets" ON "public"."cost_sheets" USING (true);



CREATE POLICY "Staff Full Access Design Groups" ON "public"."design_groups" USING (true);



CREATE POLICY "Staff Full Access Design Images" ON "public"."design_images" USING (true);



CREATE POLICY "Staff Full Access Dispatch History" ON "public"."dispatch_history" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff Full Access Job Work Bills" ON "public"."job_work_bills" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff Full Access Pending Orders" ON "public"."pending_orders" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff Full Access Purchase Bills" ON "public"."purchase_bills" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff Full Access Quotations" ON "public"."quotations" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff Full Access Sales Bills" ON "public"."sales_bills" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff Full Access Stock Rolls" ON "public"."stock_rolls" USING (true);



CREATE POLICY "Staff Full Access Suppliers" ON "public"."suppliers" USING (true);



CREATE POLICY "Staff View Categories" ON "public"."fabric_categories" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff can view addresses" ON "public"."customer_delivery_addresses" FOR SELECT USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'office_team'::"text", 'store_manager'::"text", 'sales_team'::"text", 'agent'::"text"])));



CREATE POLICY "Staff can view agents" ON "public"."agents" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff can view rates" ON "public"."supplier_rates" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff can view uploads" ON "public"."design_uploads" FOR SELECT USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text", 'designer'::"text", 'store_manager'::"text", 'sales_manager'::"text"])));



CREATE POLICY "Staff full access approvals" ON "public"."sales_order_approvals" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff full access stock" ON "public"."design_ready_stock" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff manage commissions" ON "public"."agent_commissions" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff manage design categories" ON "public"."design_categories" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff manage dispatch items" ON "public"."order_dispatch_items" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff manage dispatches" ON "public"."order_dispatches" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff manage import lines" ON "public"."bulk_item_import_lines" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text", 'store_manager'::"text", 'sampling_manager'::"text"])));



CREATE POLICY "Staff manage imports" ON "public"."bulk_item_imports" USING (("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'head_manager'::"text", 'store_manager'::"text", 'sampling_manager'::"text"])));



CREATE POLICY "Staff read parameters" ON "public"."costing_parameters" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff read templates" ON "public"."job_costing_templates" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "System can insert audit logs" ON "public"."audit_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Update designs" ON "public"."design_uploads" FOR UPDATE USING ((("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'designer'::"text", 'head_manager'::"text"])) OR ("created_by" = "auth"."uid"())));



CREATE POLICY "Users and office team can view orders" ON "public"."orders" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'office_team'::"text", 'store_manager'::"text"]))));



CREATE POLICY "Users can create price requests" ON "public"."price_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "requested_by"));



CREATE POLICY "Users can delete own attachments" ON "public"."sales_order_attachments" FOR DELETE USING (("auth"."uid"() = "uploaded_by"));



CREATE POLICY "Users can delete own design uploads" ON "public"."design_uploads" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert own google drive syncs" ON "public"."google_drive_sync" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own profile." ON "public"."user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can manage their own addresses" ON "public"."customer_delivery_addresses" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own filter presets" ON "public"."filter_presets" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own design uploads" ON "public"."design_uploads" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update own google drive syncs" ON "public"."google_drive_sync" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can update their own profile, admins can update any" ON "public"."user_profiles" FOR UPDATE USING ((("auth"."uid"() = "id") OR ("public"."get_my_role"() = 'admin'::"text"))) WITH CHECK ((("auth"."uid"() = "id") OR ("public"."get_my_role"() = 'admin'::"text")));



CREATE POLICY "Users can update their own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own google drive syncs" ON "public"."google_drive_sync" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their order items" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND (("orders"."user_id" = "auth"."uid"()) OR ("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'office_team'::"text", 'store_manager'::"text"])))))));



CREATE POLICY "Users can view their own appointments" ON "public"."appointments" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("public"."get_my_role"() = 'admin'::"text")));



CREATE POLICY "Users can view their own or all profiles based on role" ON "public"."user_profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR ("public"."get_my_role"() = ANY (ARRAY['admin'::"text", 'office_team'::"text", 'store_manager'::"text"]))));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can view their own profile." ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users manage own notifications" ON "public"."notifications" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "VIP tier can view all fabrics" ON "public"."fabric_images" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."tier" = ANY (ARRAY['VIP'::"text", 'ADMIN'::"text"]))))));



CREATE POLICY "View designs" ON "public"."design_uploads" FOR SELECT USING (true);



ALTER TABLE "public"."accessories_consumption" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_commissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anon_all_cr" ON "public"."customer_requirements" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "anon_all_cvp" ON "public"."city_visit_plans" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "anon_all_fc" ON "public"."field_customers" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "anon_all_pf" ON "public"."payment_followups" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "anon_all_st" ON "public"."sales_team" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "anon_all_sv" ON "public"."sales_visits" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "anon_all_vf" ON "public"."visit_followups" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "anon_read_only_order_items" ON "public"."sales_order_items" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auth_all_cpa" ON "public"."customer_portal_access" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_drive" ON "public"."drive_synced_files" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_mto" ON "public"."mto_orders" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_sales_team" ON "public"."sales_team" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_spa" ON "public"."supplier_price_alerts" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_staff" ON "public"."staff_members" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_tally" ON "public"."tally_sync_log" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_wa_conv" ON "public"."whatsapp_conversations" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_wa_msg" ON "public"."whatsapp_messages" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."base_fabrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brokerage_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bulk_bills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bulk_enquiries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bulk_item_import_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bulk_item_imports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bulk_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."category_visibility" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."city_visit_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations_extended" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cost_sheets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."costing_components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."costing_parameters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."costing_paths" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."costing_sheets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."country_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_dropdown_values" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_delivery_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_portal_access" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_requirements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_descriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_ready_stock" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_set_components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_sets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."designs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dispatch_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drive_synced_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dropdown_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dropdown_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expense_hsn_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fabric_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fabric_costs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fabric_headings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fabric_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fabric_master" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fabric_masters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fabric_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fabric_specifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fabric_stock" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fabric_subcategories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fabric_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fabric_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fabric_widths" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fabrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fancy_base_fabrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fancy_finish_fabrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fancy_finish_fabrics_v2" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."field_customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."field_visits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."filter_presets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."finish_fabric_designs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."finish_fabrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."follow_up_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."garment_accessories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."garment_components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."garment_size_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."garment_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."google_drive_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."google_drive_sync" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hakoba_embroidery" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hsn_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."import_errors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."imports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ink_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_specifications_master" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_cards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_costing_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_work_bills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_work_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_workers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mto_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_dispatch_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_dispatches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_forms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_followups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permission_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pincode_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."price_approvals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."price_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pricing_tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."process_charges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."process_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."process_hsn_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."process_specifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."process_specifications_master" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_fabric_mapping" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_master_accessories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_master_components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_master_size_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_masters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_bills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_fabric" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quantity_discounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_card" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."readymade_garment_hsn_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."readymade_garment_specs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."readymade_garments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_bills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_order_approvals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_order_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_team" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_visits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduled_exports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schiffli_costing" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_all_cr" ON "public"."customer_requirements" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_cvp" ON "public"."city_visit_plans" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_fc" ON "public"."field_customers" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_pf" ON "public"."payment_followups" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_st" ON "public"."sales_team" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_sv" ON "public"."sales_visits" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_vf" ON "public"."visit_followups" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."customers" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access_order_items" ON "public"."sales_order_items" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access_orders" ON "public"."sales_orders" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."set_components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_rolls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_summary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_price_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tally_sync_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profile_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profile_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."va_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."va_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."value_addition_charges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."value_addition_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."value_addition_hsn_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."visit_followups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."warehouse_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_templates" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."quote_requests";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."whatsapp_conversations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."whatsapp_messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."archive_profile_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."archive_profile_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_profile_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_populate_company_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_populate_company_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_populate_company_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_gst_exists"("gst_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_gst_exists"("gst_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_gst_exists"("gst_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_sales_order_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_sales_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_sales_order_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analytics_design_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_analytics_design_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analytics_design_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analytics_fabric_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_analytics_fabric_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analytics_fabric_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analytics_price_trends"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_analytics_price_trends"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analytics_price_trends"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analytics_unit_performance"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_analytics_unit_performance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analytics_unit_performance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_distinct_widths"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_distinct_widths"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_distinct_widths"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recent_sales_orders"("limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_sales_orders"("limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_sales_orders"("limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sales_by_category"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_sales_by_category"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sales_by_category"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sales_trend"("start_date" "date", "end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_sales_trend"("start_date" "date", "end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sales_trend"("start_date" "date", "end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_customers"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_customers"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_customers"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_selling_products"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_selling_products"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_selling_products"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_sensitive_action"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_sensitive_action"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_sensitive_action"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_created_by"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_created_by"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_created_by"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_sales_order_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_sales_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_sales_order_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_stock_summary_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_stock_summary_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_stock_summary_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."accessories_consumption" TO "anon";
GRANT ALL ON TABLE "public"."accessories_consumption" TO "authenticated";
GRANT ALL ON TABLE "public"."accessories_consumption" TO "service_role";



GRANT ALL ON TABLE "public"."admin_settings" TO "anon";
GRANT ALL ON TABLE "public"."admin_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_settings" TO "service_role";



GRANT ALL ON TABLE "public"."agent_commissions" TO "anon";
GRANT ALL ON TABLE "public"."agent_commissions" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_commissions" TO "service_role";



GRANT ALL ON TABLE "public"."agents" TO "anon";
GRANT ALL ON TABLE "public"."agents" TO "authenticated";
GRANT ALL ON TABLE "public"."agents" TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."base_fabric_job_workers" TO "anon";
GRANT ALL ON TABLE "public"."base_fabric_job_workers" TO "authenticated";
GRANT ALL ON TABLE "public"."base_fabric_job_workers" TO "service_role";



GRANT ALL ON TABLE "public"."base_fabric_suppliers" TO "anon";
GRANT ALL ON TABLE "public"."base_fabric_suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."base_fabric_suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."base_fabrics" TO "anon";
GRANT ALL ON TABLE "public"."base_fabrics" TO "authenticated";
GRANT ALL ON TABLE "public"."base_fabrics" TO "service_role";



GRANT ALL ON TABLE "public"."batch_costing" TO "anon";
GRANT ALL ON TABLE "public"."batch_costing" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_costing" TO "service_role";



GRANT ALL ON TABLE "public"."brokerage_entries" TO "anon";
GRANT ALL ON TABLE "public"."brokerage_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."brokerage_entries" TO "service_role";



GRANT ALL ON TABLE "public"."bulk_bills" TO "anon";
GRANT ALL ON TABLE "public"."bulk_bills" TO "authenticated";
GRANT ALL ON TABLE "public"."bulk_bills" TO "service_role";



GRANT ALL ON TABLE "public"."bulk_enquiries" TO "anon";
GRANT ALL ON TABLE "public"."bulk_enquiries" TO "authenticated";
GRANT ALL ON TABLE "public"."bulk_enquiries" TO "service_role";



GRANT ALL ON TABLE "public"."bulk_item_import_lines" TO "anon";
GRANT ALL ON TABLE "public"."bulk_item_import_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."bulk_item_import_lines" TO "service_role";



GRANT ALL ON TABLE "public"."bulk_item_imports" TO "anon";
GRANT ALL ON TABLE "public"."bulk_item_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."bulk_item_imports" TO "service_role";



GRANT ALL ON TABLE "public"."bulk_uploads" TO "anon";
GRANT ALL ON TABLE "public"."bulk_uploads" TO "authenticated";
GRANT ALL ON TABLE "public"."bulk_uploads" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."category_visibility" TO "anon";
GRANT ALL ON TABLE "public"."category_visibility" TO "authenticated";
GRANT ALL ON TABLE "public"."category_visibility" TO "service_role";



GRANT ALL ON TABLE "public"."city_visit_plans" TO "anon";
GRANT ALL ON TABLE "public"."city_visit_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."city_visit_plans" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."conversations_extended" TO "anon";
GRANT ALL ON TABLE "public"."conversations_extended" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations_extended" TO "service_role";



GRANT ALL ON TABLE "public"."cost_sheets" TO "anon";
GRANT ALL ON TABLE "public"."cost_sheets" TO "authenticated";
GRANT ALL ON TABLE "public"."cost_sheets" TO "service_role";



GRANT ALL ON TABLE "public"."costing_components" TO "anon";
GRANT ALL ON TABLE "public"."costing_components" TO "authenticated";
GRANT ALL ON TABLE "public"."costing_components" TO "service_role";



GRANT ALL ON TABLE "public"."costing_parameters" TO "anon";
GRANT ALL ON TABLE "public"."costing_parameters" TO "authenticated";
GRANT ALL ON TABLE "public"."costing_parameters" TO "service_role";



GRANT ALL ON TABLE "public"."costing_paths" TO "anon";
GRANT ALL ON TABLE "public"."costing_paths" TO "authenticated";
GRANT ALL ON TABLE "public"."costing_paths" TO "service_role";



GRANT ALL ON TABLE "public"."costing_sheets" TO "anon";
GRANT ALL ON TABLE "public"."costing_sheets" TO "authenticated";
GRANT ALL ON TABLE "public"."costing_sheets" TO "service_role";



GRANT ALL ON TABLE "public"."country_codes" TO "anon";
GRANT ALL ON TABLE "public"."country_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."country_codes" TO "service_role";



GRANT ALL ON TABLE "public"."custom_dropdown_values" TO "anon";
GRANT ALL ON TABLE "public"."custom_dropdown_values" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_dropdown_values" TO "service_role";



GRANT ALL ON TABLE "public"."custom_items" TO "anon";
GRANT ALL ON TABLE "public"."custom_items" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_items" TO "service_role";



GRANT ALL ON TABLE "public"."customer_categories" TO "anon";
GRANT ALL ON TABLE "public"."customer_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_categories" TO "service_role";



GRANT ALL ON TABLE "public"."customer_delivery_addresses" TO "anon";
GRANT ALL ON TABLE "public"."customer_delivery_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_delivery_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."customer_interactions" TO "anon";
GRANT ALL ON TABLE "public"."customer_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."customer_portal_access" TO "anon";
GRANT ALL ON TABLE "public"."customer_portal_access" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_portal_access" TO "service_role";



GRANT ALL ON TABLE "public"."customer_requirements" TO "anon";
GRANT ALL ON TABLE "public"."customer_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_requirements" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."design_categories" TO "anon";
GRANT ALL ON TABLE "public"."design_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."design_categories" TO "service_role";



GRANT ALL ON TABLE "public"."design_descriptions" TO "anon";
GRANT ALL ON TABLE "public"."design_descriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."design_descriptions" TO "service_role";



GRANT ALL ON TABLE "public"."design_groups" TO "anon";
GRANT ALL ON TABLE "public"."design_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."design_groups" TO "service_role";



GRANT ALL ON TABLE "public"."design_images" TO "anon";
GRANT ALL ON TABLE "public"."design_images" TO "authenticated";
GRANT ALL ON TABLE "public"."design_images" TO "service_role";



GRANT ALL ON TABLE "public"."design_layouts" TO "anon";
GRANT ALL ON TABLE "public"."design_layouts" TO "authenticated";
GRANT ALL ON TABLE "public"."design_layouts" TO "service_role";



GRANT ALL ON TABLE "public"."design_ready_stock" TO "anon";
GRANT ALL ON TABLE "public"."design_ready_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."design_ready_stock" TO "service_role";



GRANT ALL ON TABLE "public"."design_set_components" TO "anon";
GRANT ALL ON TABLE "public"."design_set_components" TO "authenticated";
GRANT ALL ON TABLE "public"."design_set_components" TO "service_role";



GRANT ALL ON TABLE "public"."design_sets" TO "anon";
GRANT ALL ON TABLE "public"."design_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."design_sets" TO "service_role";



GRANT ALL ON TABLE "public"."design_uploads" TO "anon";
GRANT ALL ON TABLE "public"."design_uploads" TO "authenticated";
GRANT ALL ON TABLE "public"."design_uploads" TO "service_role";



GRANT ALL ON TABLE "public"."designs" TO "anon";
GRANT ALL ON TABLE "public"."designs" TO "authenticated";
GRANT ALL ON TABLE "public"."designs" TO "service_role";



GRANT ALL ON TABLE "public"."dispatch_history" TO "anon";
GRANT ALL ON TABLE "public"."dispatch_history" TO "authenticated";
GRANT ALL ON TABLE "public"."dispatch_history" TO "service_role";



GRANT ALL ON TABLE "public"."drive_synced_files" TO "anon";
GRANT ALL ON TABLE "public"."drive_synced_files" TO "authenticated";
GRANT ALL ON TABLE "public"."drive_synced_files" TO "service_role";



GRANT ALL ON TABLE "public"."dropdown_categories" TO "anon";
GRANT ALL ON TABLE "public"."dropdown_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."dropdown_categories" TO "service_role";



GRANT ALL ON TABLE "public"."dropdown_options" TO "anon";
GRANT ALL ON TABLE "public"."dropdown_options" TO "authenticated";
GRANT ALL ON TABLE "public"."dropdown_options" TO "service_role";



GRANT ALL ON TABLE "public"."email_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_logs" TO "service_role";



GRANT ALL ON TABLE "public"."expense_hsn_codes" TO "anon";
GRANT ALL ON TABLE "public"."expense_hsn_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_hsn_codes" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_aliases" TO "anon";
GRANT ALL ON TABLE "public"."fabric_aliases" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_aliases" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_categories" TO "anon";
GRANT ALL ON TABLE "public"."fabric_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_categories" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_costs" TO "anon";
GRANT ALL ON TABLE "public"."fabric_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_costs" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_designs" TO "anon";
GRANT ALL ON TABLE "public"."fabric_designs" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_designs" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_headings" TO "anon";
GRANT ALL ON TABLE "public"."fabric_headings" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_headings" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_images" TO "anon";
GRANT ALL ON TABLE "public"."fabric_images" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_images" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_item_completion" TO "anon";
GRANT ALL ON TABLE "public"."fabric_item_completion" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_item_completion" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_items" TO "anon";
GRANT ALL ON TABLE "public"."fabric_items" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_items" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_master" TO "anon";
GRANT ALL ON TABLE "public"."fabric_master" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_master" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_masters" TO "anon";
GRANT ALL ON TABLE "public"."fabric_masters" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_masters" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_prices" TO "anon";
GRANT ALL ON TABLE "public"."fabric_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_prices" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_specifications" TO "anon";
GRANT ALL ON TABLE "public"."fabric_specifications" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_specifications" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_stock" TO "anon";
GRANT ALL ON TABLE "public"."fabric_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_stock" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_subcategories" TO "anon";
GRANT ALL ON TABLE "public"."fabric_subcategories" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_subcategories" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_terms_conditions" TO "anon";
GRANT ALL ON TABLE "public"."fabric_terms_conditions" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_terms_conditions" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_types" TO "anon";
GRANT ALL ON TABLE "public"."fabric_types" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_types" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_views" TO "anon";
GRANT ALL ON TABLE "public"."fabric_views" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_views" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_widths" TO "anon";
GRANT ALL ON TABLE "public"."fabric_widths" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_widths" TO "service_role";



GRANT ALL ON TABLE "public"."fabrics" TO "anon";
GRANT ALL ON TABLE "public"."fabrics" TO "authenticated";
GRANT ALL ON TABLE "public"."fabrics" TO "service_role";



GRANT ALL ON TABLE "public"."fancy_base_fabrics" TO "anon";
GRANT ALL ON TABLE "public"."fancy_base_fabrics" TO "authenticated";
GRANT ALL ON TABLE "public"."fancy_base_fabrics" TO "service_role";



GRANT ALL ON TABLE "public"."fancy_finish_fabrics" TO "anon";
GRANT ALL ON TABLE "public"."fancy_finish_fabrics" TO "authenticated";
GRANT ALL ON TABLE "public"."fancy_finish_fabrics" TO "service_role";



GRANT ALL ON TABLE "public"."fancy_finish_fabrics_v2" TO "anon";
GRANT ALL ON TABLE "public"."fancy_finish_fabrics_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."fancy_finish_fabrics_v2" TO "service_role";



GRANT ALL ON TABLE "public"."field_customers" TO "anon";
GRANT ALL ON TABLE "public"."field_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."field_customers" TO "service_role";



GRANT ALL ON TABLE "public"."field_visits" TO "anon";
GRANT ALL ON TABLE "public"."field_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."field_visits" TO "service_role";



GRANT ALL ON TABLE "public"."file_compressions" TO "anon";
GRANT ALL ON TABLE "public"."file_compressions" TO "authenticated";
GRANT ALL ON TABLE "public"."file_compressions" TO "service_role";



GRANT ALL ON TABLE "public"."filter_presets" TO "anon";
GRANT ALL ON TABLE "public"."filter_presets" TO "authenticated";
GRANT ALL ON TABLE "public"."filter_presets" TO "service_role";



GRANT ALL ON TABLE "public"."finish_fabric_designs" TO "anon";
GRANT ALL ON TABLE "public"."finish_fabric_designs" TO "authenticated";
GRANT ALL ON TABLE "public"."finish_fabric_designs" TO "service_role";



GRANT ALL ON TABLE "public"."finish_fabric_job_workers" TO "anon";
GRANT ALL ON TABLE "public"."finish_fabric_job_workers" TO "authenticated";
GRANT ALL ON TABLE "public"."finish_fabric_job_workers" TO "service_role";



GRANT ALL ON TABLE "public"."finish_fabric_suppliers" TO "anon";
GRANT ALL ON TABLE "public"."finish_fabric_suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."finish_fabric_suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."finish_fabrics" TO "anon";
GRANT ALL ON TABLE "public"."finish_fabrics" TO "authenticated";
GRANT ALL ON TABLE "public"."finish_fabrics" TO "service_role";



GRANT ALL ON TABLE "public"."follow_up_tracking" TO "anon";
GRANT ALL ON TABLE "public"."follow_up_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."follow_up_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."garment_accessories" TO "anon";
GRANT ALL ON TABLE "public"."garment_accessories" TO "authenticated";
GRANT ALL ON TABLE "public"."garment_accessories" TO "service_role";



GRANT ALL ON TABLE "public"."garment_components" TO "anon";
GRANT ALL ON TABLE "public"."garment_components" TO "authenticated";
GRANT ALL ON TABLE "public"."garment_components" TO "service_role";



GRANT ALL ON TABLE "public"."garment_costs" TO "anon";
GRANT ALL ON TABLE "public"."garment_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."garment_costs" TO "service_role";



GRANT ALL ON TABLE "public"."garment_size_variants" TO "anon";
GRANT ALL ON TABLE "public"."garment_size_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."garment_size_variants" TO "service_role";



GRANT ALL ON TABLE "public"."garment_types" TO "anon";
GRANT ALL ON TABLE "public"."garment_types" TO "authenticated";
GRANT ALL ON TABLE "public"."garment_types" TO "service_role";



GRANT ALL ON TABLE "public"."google_drive_settings" TO "anon";
GRANT ALL ON TABLE "public"."google_drive_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."google_drive_settings" TO "service_role";



GRANT ALL ON TABLE "public"."google_drive_sync" TO "anon";
GRANT ALL ON TABLE "public"."google_drive_sync" TO "authenticated";
GRANT ALL ON TABLE "public"."google_drive_sync" TO "service_role";



GRANT ALL ON TABLE "public"."hakoba_batch_calcs" TO "anon";
GRANT ALL ON TABLE "public"."hakoba_batch_calcs" TO "authenticated";
GRANT ALL ON TABLE "public"."hakoba_batch_calcs" TO "service_role";



GRANT ALL ON TABLE "public"."hakoba_embroidery" TO "anon";
GRANT ALL ON TABLE "public"."hakoba_embroidery" TO "authenticated";
GRANT ALL ON TABLE "public"."hakoba_embroidery" TO "service_role";



GRANT ALL ON TABLE "public"."hsn_codes" TO "anon";
GRANT ALL ON TABLE "public"."hsn_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."hsn_codes" TO "service_role";



GRANT ALL ON TABLE "public"."import_errors" TO "anon";
GRANT ALL ON TABLE "public"."import_errors" TO "authenticated";
GRANT ALL ON TABLE "public"."import_errors" TO "service_role";



GRANT ALL ON TABLE "public"."imports" TO "anon";
GRANT ALL ON TABLE "public"."imports" TO "authenticated";
GRANT ALL ON TABLE "public"."imports" TO "service_role";



GRANT ALL ON TABLE "public"."ink_types" TO "anon";
GRANT ALL ON TABLE "public"."ink_types" TO "authenticated";
GRANT ALL ON TABLE "public"."ink_types" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."item_specifications_master" TO "anon";
GRANT ALL ON TABLE "public"."item_specifications_master" TO "authenticated";
GRANT ALL ON TABLE "public"."item_specifications_master" TO "service_role";



GRANT ALL ON TABLE "public"."item_types" TO "anon";
GRANT ALL ON TABLE "public"."item_types" TO "authenticated";
GRANT ALL ON TABLE "public"."item_types" TO "service_role";



GRANT ALL ON TABLE "public"."job_cards" TO "anon";
GRANT ALL ON TABLE "public"."job_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."job_cards" TO "service_role";



GRANT ALL ON TABLE "public"."job_costing_templates" TO "anon";
GRANT ALL ON TABLE "public"."job_costing_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."job_costing_templates" TO "service_role";



GRANT ALL ON TABLE "public"."job_orders" TO "anon";
GRANT ALL ON TABLE "public"."job_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."job_orders" TO "service_role";



GRANT ALL ON TABLE "public"."job_prices" TO "anon";
GRANT ALL ON TABLE "public"."job_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."job_prices" TO "service_role";



GRANT ALL ON TABLE "public"."job_work_bills" TO "anon";
GRANT ALL ON TABLE "public"."job_work_bills" TO "authenticated";
GRANT ALL ON TABLE "public"."job_work_bills" TO "service_role";



GRANT ALL ON TABLE "public"."job_work_units" TO "anon";
GRANT ALL ON TABLE "public"."job_work_units" TO "authenticated";
GRANT ALL ON TABLE "public"."job_work_units" TO "service_role";



GRANT ALL ON TABLE "public"."job_workers" TO "anon";
GRANT ALL ON TABLE "public"."job_workers" TO "authenticated";
GRANT ALL ON TABLE "public"."job_workers" TO "service_role";



GRANT ALL ON TABLE "public"."master_process" TO "anon";
GRANT ALL ON TABLE "public"."master_process" TO "authenticated";
GRANT ALL ON TABLE "public"."master_process" TO "service_role";



GRANT ALL ON TABLE "public"."master_process_entry" TO "anon";
GRANT ALL ON TABLE "public"."master_process_entry" TO "authenticated";
GRANT ALL ON TABLE "public"."master_process_entry" TO "service_role";



GRANT ALL ON SEQUENCE "public"."master_process_entry_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."master_process_entry_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."master_process_entry_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."master_process_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."master_process_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."master_process_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."master_purchase" TO "anon";
GRANT ALL ON TABLE "public"."master_purchase" TO "authenticated";
GRANT ALL ON TABLE "public"."master_purchase" TO "service_role";



GRANT ALL ON TABLE "public"."master_purchase_entry" TO "anon";
GRANT ALL ON TABLE "public"."master_purchase_entry" TO "authenticated";
GRANT ALL ON TABLE "public"."master_purchase_entry" TO "service_role";



GRANT ALL ON SEQUENCE "public"."master_purchase_entry_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."master_purchase_entry_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."master_purchase_entry_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."master_purchase_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."master_purchase_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."master_purchase_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."master_value_addition" TO "anon";
GRANT ALL ON TABLE "public"."master_value_addition" TO "authenticated";
GRANT ALL ON TABLE "public"."master_value_addition" TO "service_role";



GRANT ALL ON TABLE "public"."master_value_addition_entry" TO "anon";
GRANT ALL ON TABLE "public"."master_value_addition_entry" TO "authenticated";
GRANT ALL ON TABLE "public"."master_value_addition_entry" TO "service_role";



GRANT ALL ON SEQUENCE "public"."master_value_addition_entry_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."master_value_addition_entry_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."master_value_addition_entry_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."master_value_addition_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."master_value_addition_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."master_value_addition_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mto_orders" TO "anon";
GRANT ALL ON TABLE "public"."mto_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."mto_orders" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."order_dispatch_items" TO "anon";
GRANT ALL ON TABLE "public"."order_dispatch_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_dispatch_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_dispatches" TO "anon";
GRANT ALL ON TABLE "public"."order_dispatches" TO "authenticated";
GRANT ALL ON TABLE "public"."order_dispatches" TO "service_role";



GRANT ALL ON TABLE "public"."order_forms" TO "anon";
GRANT ALL ON TABLE "public"."order_forms" TO "authenticated";
GRANT ALL ON TABLE "public"."order_forms" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."order_status_history" TO "anon";
GRANT ALL ON TABLE "public"."order_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."payment_followups" TO "anon";
GRANT ALL ON TABLE "public"."payment_followups" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_followups" TO "service_role";



GRANT ALL ON TABLE "public"."pending_orders" TO "anon";
GRANT ALL ON TABLE "public"."pending_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_orders" TO "service_role";



GRANT ALL ON TABLE "public"."permission_settings" TO "anon";
GRANT ALL ON TABLE "public"."permission_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_settings" TO "service_role";



GRANT ALL ON TABLE "public"."pincode_data" TO "anon";
GRANT ALL ON TABLE "public"."pincode_data" TO "authenticated";
GRANT ALL ON TABLE "public"."pincode_data" TO "service_role";



GRANT ALL ON TABLE "public"."price_approvals" TO "anon";
GRANT ALL ON TABLE "public"."price_approvals" TO "authenticated";
GRANT ALL ON TABLE "public"."price_approvals" TO "service_role";



GRANT ALL ON TABLE "public"."price_change_log" TO "anon";
GRANT ALL ON TABLE "public"."price_change_log" TO "authenticated";
GRANT ALL ON TABLE "public"."price_change_log" TO "service_role";



GRANT ALL ON TABLE "public"."price_database" TO "anon";
GRANT ALL ON TABLE "public"."price_database" TO "authenticated";
GRANT ALL ON TABLE "public"."price_database" TO "service_role";



GRANT ALL ON TABLE "public"."price_requests" TO "anon";
GRANT ALL ON TABLE "public"."price_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."price_requests" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_tiers" TO "anon";
GRANT ALL ON TABLE "public"."pricing_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."process_charges" TO "anon";
GRANT ALL ON TABLE "public"."process_charges" TO "authenticated";
GRANT ALL ON TABLE "public"."process_charges" TO "service_role";



GRANT ALL ON TABLE "public"."process_entries" TO "anon";
GRANT ALL ON TABLE "public"."process_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."process_entries" TO "service_role";



GRANT ALL ON TABLE "public"."process_hsn_codes" TO "anon";
GRANT ALL ON TABLE "public"."process_hsn_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."process_hsn_codes" TO "service_role";



GRANT ALL ON TABLE "public"."process_specifications" TO "anon";
GRANT ALL ON TABLE "public"."process_specifications" TO "authenticated";
GRANT ALL ON TABLE "public"."process_specifications" TO "service_role";



GRANT ALL ON TABLE "public"."process_specifications_master" TO "anon";
GRANT ALL ON TABLE "public"."process_specifications_master" TO "authenticated";
GRANT ALL ON TABLE "public"."process_specifications_master" TO "service_role";



GRANT ALL ON TABLE "public"."process_subtypes" TO "anon";
GRANT ALL ON TABLE "public"."process_subtypes" TO "authenticated";
GRANT ALL ON TABLE "public"."process_subtypes" TO "service_role";



GRANT ALL ON TABLE "public"."process_types" TO "anon";
GRANT ALL ON TABLE "public"."process_types" TO "authenticated";
GRANT ALL ON TABLE "public"."process_types" TO "service_role";



GRANT ALL ON TABLE "public"."product_components" TO "anon";
GRANT ALL ON TABLE "public"."product_components" TO "authenticated";
GRANT ALL ON TABLE "public"."product_components" TO "service_role";



GRANT ALL ON TABLE "public"."product_costing_sheets" TO "anon";
GRANT ALL ON TABLE "public"."product_costing_sheets" TO "authenticated";
GRANT ALL ON TABLE "public"."product_costing_sheets" TO "service_role";



GRANT ALL ON TABLE "public"."product_fabric_mapping" TO "anon";
GRANT ALL ON TABLE "public"."product_fabric_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."product_fabric_mapping" TO "service_role";



GRANT ALL ON TABLE "public"."product_master_accessories" TO "anon";
GRANT ALL ON TABLE "public"."product_master_accessories" TO "authenticated";
GRANT ALL ON TABLE "public"."product_master_accessories" TO "service_role";



GRANT ALL ON TABLE "public"."product_master_components" TO "anon";
GRANT ALL ON TABLE "public"."product_master_components" TO "authenticated";
GRANT ALL ON TABLE "public"."product_master_components" TO "service_role";



GRANT ALL ON TABLE "public"."product_master_size_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_master_size_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_master_size_variants" TO "service_role";



GRANT ALL ON TABLE "public"."product_masters" TO "anon";
GRANT ALL ON TABLE "public"."product_masters" TO "authenticated";
GRANT ALL ON TABLE "public"."product_masters" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_bills" TO "anon";
GRANT ALL ON TABLE "public"."purchase_bills" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_bills" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_entries" TO "anon";
GRANT ALL ON TABLE "public"."purchase_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_entries" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_fabric" TO "anon";
GRANT ALL ON TABLE "public"."purchase_fabric" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_fabric" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_orders" TO "anon";
GRANT ALL ON TABLE "public"."purchase_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_orders" TO "service_role";



GRANT ALL ON TABLE "public"."quantity_discounts" TO "anon";
GRANT ALL ON TABLE "public"."quantity_discounts" TO "authenticated";
GRANT ALL ON TABLE "public"."quantity_discounts" TO "service_role";



GRANT ALL ON TABLE "public"."quotations" TO "anon";
GRANT ALL ON TABLE "public"."quotations" TO "authenticated";
GRANT ALL ON TABLE "public"."quotations" TO "service_role";



GRANT ALL ON TABLE "public"."quote_requests" TO "anon";
GRANT ALL ON TABLE "public"."quote_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_requests" TO "service_role";



GRANT ALL ON TABLE "public"."quotes" TO "anon";
GRANT ALL ON TABLE "public"."quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."quotes" TO "service_role";



GRANT ALL ON TABLE "public"."rate_card" TO "anon";
GRANT ALL ON TABLE "public"."rate_card" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_card" TO "service_role";



GRANT ALL ON TABLE "public"."readymade_garment_hsn_codes" TO "anon";
GRANT ALL ON TABLE "public"."readymade_garment_hsn_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."readymade_garment_hsn_codes" TO "service_role";



GRANT ALL ON TABLE "public"."readymade_garment_specs" TO "anon";
GRANT ALL ON TABLE "public"."readymade_garment_specs" TO "authenticated";
GRANT ALL ON TABLE "public"."readymade_garment_specs" TO "service_role";



GRANT ALL ON TABLE "public"."readymade_garments" TO "anon";
GRANT ALL ON TABLE "public"."readymade_garments" TO "authenticated";
GRANT ALL ON TABLE "public"."readymade_garments" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."sales_bills" TO "anon";
GRANT ALL ON TABLE "public"."sales_bills" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_bills" TO "service_role";



GRANT ALL ON TABLE "public"."sales_order_approvals" TO "anon";
GRANT ALL ON TABLE "public"."sales_order_approvals" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_order_approvals" TO "service_role";



GRANT ALL ON TABLE "public"."sales_order_attachments" TO "anon";
GRANT ALL ON TABLE "public"."sales_order_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_order_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."sales_order_items" TO "anon";
GRANT ALL ON TABLE "public"."sales_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_order_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sales_order_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sales_order_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sales_order_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sales_orders" TO "anon";
GRANT ALL ON TABLE "public"."sales_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_orders" TO "service_role";



GRANT ALL ON TABLE "public"."sales_team" TO "anon";
GRANT ALL ON TABLE "public"."sales_team" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_team" TO "service_role";



GRANT ALL ON TABLE "public"."sales_visits" TO "anon";
GRANT ALL ON TABLE "public"."sales_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_visits" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_exports" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_exports" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_exports" TO "service_role";



GRANT ALL ON TABLE "public"."schiffli_costing" TO "anon";
GRANT ALL ON TABLE "public"."schiffli_costing" TO "authenticated";
GRANT ALL ON TABLE "public"."schiffli_costing" TO "service_role";



GRANT ALL ON TABLE "public"."set_components" TO "anon";
GRANT ALL ON TABLE "public"."set_components" TO "authenticated";
GRANT ALL ON TABLE "public"."set_components" TO "service_role";



GRANT ALL ON TABLE "public"."staff_members" TO "anon";
GRANT ALL ON TABLE "public"."staff_members" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_members" TO "service_role";



GRANT ALL ON TABLE "public"."stock_alerts" TO "anon";
GRANT ALL ON TABLE "public"."stock_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."stock_rolls" TO "anon";
GRANT ALL ON TABLE "public"."stock_rolls" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_rolls" TO "service_role";



GRANT ALL ON TABLE "public"."stock_summary" TO "anon";
GRANT ALL ON TABLE "public"."stock_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_summary" TO "service_role";



GRANT ALL ON TABLE "public"."stock_transactions" TO "anon";
GRANT ALL ON TABLE "public"."stock_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_price_alerts" TO "anon";
GRANT ALL ON TABLE "public"."supplier_price_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_price_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_rates" TO "anon";
GRANT ALL ON TABLE "public"."supplier_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_rates" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."system_activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."system_activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."system_activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."tally_sync_log" TO "anon";
GRANT ALL ON TABLE "public"."tally_sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."tally_sync_log" TO "service_role";



GRANT ALL ON TABLE "public"."transports" TO "anon";
GRANT ALL ON TABLE "public"."transports" TO "authenticated";
GRANT ALL ON TABLE "public"."transports" TO "service_role";



GRANT ALL ON TABLE "public"."user_profile_history" TO "anon";
GRANT ALL ON TABLE "public"."user_profile_history" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profile_history" TO "service_role";



GRANT ALL ON TABLE "public"."user_profile_logs" TO "anon";
GRANT ALL ON TABLE "public"."user_profile_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profile_logs" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."va_prices" TO "anon";
GRANT ALL ON TABLE "public"."va_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."va_prices" TO "service_role";



GRANT ALL ON TABLE "public"."va_units" TO "anon";
GRANT ALL ON TABLE "public"."va_units" TO "authenticated";
GRANT ALL ON TABLE "public"."va_units" TO "service_role";



GRANT ALL ON TABLE "public"."value_addition_charges" TO "anon";
GRANT ALL ON TABLE "public"."value_addition_charges" TO "authenticated";
GRANT ALL ON TABLE "public"."value_addition_charges" TO "service_role";



GRANT ALL ON TABLE "public"."value_addition_entries" TO "anon";
GRANT ALL ON TABLE "public"."value_addition_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."value_addition_entries" TO "service_role";



GRANT ALL ON TABLE "public"."value_addition_hsn_codes" TO "anon";
GRANT ALL ON TABLE "public"."value_addition_hsn_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."value_addition_hsn_codes" TO "service_role";



GRANT ALL ON TABLE "public"."visit_followups" TO "anon";
GRANT ALL ON TABLE "public"."visit_followups" TO "authenticated";
GRANT ALL ON TABLE "public"."visit_followups" TO "service_role";



GRANT ALL ON TABLE "public"."warehouse_locations" TO "anon";
GRANT ALL ON TABLE "public"."warehouse_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."warehouse_locations" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_config" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_config" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_config" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_conversations" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_messages" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_messages" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_settings" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_settings" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_templates" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_templates" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































