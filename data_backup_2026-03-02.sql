SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict 69Parxr9gcBXYLmnYXBmHcuPsiMvvWW3CmqIfCHDH5dRaaidgiG7YI4Ddb5WI5h

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: backup_metadata; Type: TABLE DATA; Schema: admin; Owner: postgres
--

INSERT INTO "admin"."backup_metadata" ("id", "object_type", "object_name", "ddl", "created_at") VALUES
	(1, 'function', 'public.auto_populate_company_context', 'CREATE OR REPLACE FUNCTION public.auto_populate_company_context()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
', '2025-12-10 09:41:14.576239+00'),
	(2, 'function', 'public.update_stock_summary_trigger', 'CREATE OR REPLACE FUNCTION public.update_stock_summary_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    target_design_id uuid;
    total_kg numeric;
BEGIN
    IF (TG_OP = ''DELETE'') THEN
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
$function$
', '2025-12-10 09:41:14.576239+00'),
	(3, 'function', 'public.log_sensitive_action', 'CREATE OR REPLACE FUNCTION public.log_sensitive_action()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id::text, row_to_json(NEW));
    RETURN NEW;
END;
$function$
', '2025-12-10 09:41:14.576239+00'),
	(4, 'function', 'storage.delete_leaf_prefixes', 'CREATE OR REPLACE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || ''/%''
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || ''/%''
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$function$
', '2025-12-10 09:41:14.576239+00'),
	(5, 'function', 'storage.objects_update_cleanup', 'CREATE OR REPLACE FUNCTION storage.objects_update_cleanup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> ''UPDATE'' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '''' AND position(''/'' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), ''{}'' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), ''{}'' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), ''{}'' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), ''{}'' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, ''{}'') || COALESCE(v_add_bucket_ids, ''{}'');
        v_all_names := COALESCE(v_src_names, ''{}'') || COALESCE(v_add_names, ''{}'');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won''t recurse
        IF current_setting(''storage.gc.prefixes'', true) <> ''1'' THEN
            PERFORM set_config(''storage.gc.prefixes'', ''1'', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$function$
', '2025-12-10 09:41:14.576239+00'),
	(6, 'function', 'storage.prefixes_delete_cleanup', 'CREATE OR REPLACE FUNCTION storage.prefixes_delete_cleanup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting(''storage.gc.prefixes'', true) = ''1'' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config(''storage.gc.prefixes'', ''1'', true);

    SELECT COALESCE(array_agg(d.bucket_id), ''{}''),
           COALESCE(array_agg(d.name), ''{}'')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '''';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$function$
', '2025-12-10 09:41:14.576239+00'),
	(7, 'function', 'storage.add_prefixes', 'CREATE OR REPLACE FUNCTION storage.add_prefixes(_bucket_id text, _name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$function$
', '2025-12-10 09:41:14.576239+00'),
	(8, 'function', 'storage.delete_prefix', 'CREATE OR REPLACE FUNCTION storage.delete_prefix(_bucket_id text, _name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || ''/%''
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || ''/%''
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$function$
', '2025-12-10 09:41:14.576239+00'),
	(9, 'function', 'storage.lock_top_prefixes', 'CREATE OR REPLACE FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, ''/'', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || ''/'' || v_top, 0));
        END LOOP;
END;
$function$
', '2025-12-10 09:41:14.576239+00'),
	(10, 'function', 'storage.objects_delete_cleanup', 'CREATE OR REPLACE FUNCTION storage.objects_delete_cleanup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting(''storage.gc.prefixes'', true) = ''1'' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config(''storage.gc.prefixes'', ''1'', true);

    SELECT COALESCE(array_agg(d.bucket_id), ''{}''),
           COALESCE(array_agg(d.name), ''{}'')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '''';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$function$
', '2025-12-10 09:41:14.576239+00'),
	(11, 'function', 'graphql.get_schema_version', 'CREATE OR REPLACE FUNCTION graphql.get_schema_version()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    select last_value from graphql.seq_schema_version;
$function$
', '2025-12-10 09:41:14.576239+00'),
	(12, 'function', 'graphql.increment_schema_version', 'CREATE OR REPLACE FUNCTION graphql.increment_schema_version()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
    perform pg_catalog.nextval(''graphql.seq_schema_version'');
end;
$function$
', '2025-12-10 09:41:14.576239+00');


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'a97f4e2e-76fa-46a2-9ab6-ff9af765f4d6', 'authenticated', 'authenticated', 'srtpl.sales@gmail.com', '$2a$10$yzQU4X2uAr6QfQLUPSZTKu9JP0PqL14h9pjujd4SracsxetlxxUdS', '2025-12-08 11:55:34.258273+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-12-08 11:55:34.263183+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "a97f4e2e-76fa-46a2-9ab6-ff9af765f4d6", "role": "sales_manager", "email": "srtpl.sales@gmail.com", "full_name": "Dheeraj Singh", "email_verified": true, "phone_verified": false}', NULL, '2025-12-08 11:55:34.250901+00', '2025-12-08 11:55:34.266464+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'b0d853a7-404b-4211-a3e6-96907ba73328', 'authenticated', 'authenticated', 'shreerangtrendz@gmail.com', '$2a$10$8JBMR3PMEGJlnwmEZ4GZlO9Q6hGH2VGsaFK/cYh/7FeZ62JoCTCne', '2025-12-03 08:29:03.614006+00', NULL, '', NULL, '', '2025-12-03 09:34:44.205792+00', '', '', NULL, '2025-12-03 10:57:35.58016+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "b0d853a7-404b-4211-a3e6-96907ba73328", "email": "shreerangtrendz@gmail.com", "email_verified": true, "phone_verified": false}', NULL, '2025-12-03 08:29:03.569078+00', '2025-12-03 10:57:35.628918+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'b55ff4bd-8908-403a-9054-bc6459ae9abc', 'authenticated', 'authenticated', 'karan.nanji1@gmail.com', '$2a$10$9/3OLPtEtKhtcsgQdcnza.ej99SS11eaAgoGZcwnoANXZwWzpAUB.', '2025-12-08 11:54:48.402749+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-12-08 11:54:48.411821+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "b55ff4bd-8908-403a-9054-bc6459ae9abc", "email": "karan.nanji1@gmail.com", "full_name": "Karan Gada", "email_verified": true, "phone_verified": false}', NULL, '2025-12-08 11:54:48.364857+00', '2025-12-08 11:54:48.421441+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', 'authenticated', 'authenticated', 'kumarmaru7@gmail.com', '$2a$06$ytMGP/7ymhlf5WFEYsVVhOa.wkzjlqW3AysTRuitKfdGnYr0MQHHi', '2025-12-03 12:47:20.890456+00', NULL, 'ada5a26e10569e64e125d4ff672886b095acd30bc231d288c8c156ce7afaa51b', '2026-03-01 04:45:25.487976+00', '6d6fcb2a3a0e89e0caa0dcc8a4645223e897a9fac536af2c087273c5b78a0c64', '2026-03-01 04:45:25.487976+00', '', '', NULL, '2026-03-01 17:29:34.893035+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "dcfbcf50-c3bf-4d59-917e-9a7d2974bd19", "role": "office_team", "email": "kumarmaru7@gmail.com", "full_name": "Shrikumar Maru", "email_verified": true, "phone_verified": false}', NULL, '2025-12-03 12:47:20.838029+00', '2026-03-02 10:05:18.112527+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', 'authenticated', 'authenticated', 'baltsarpe@gmail.com', '$2a$10$0l48cWBBcGF6p36Dbmhn0uKLebcXCMlQOCoC3U50pvHWVK0UPDS6S', '2025-12-07 06:50:23.601604+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-12-07 08:15:45.901439+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204", "role": "agent", "email": "baltsarpe@gmail.com", "full_name": "h", "email_verified": true, "phone_verified": false}', NULL, '2025-12-07 06:50:23.472592+00', '2025-12-21 05:23:08.206973+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('b0d853a7-404b-4211-a3e6-96907ba73328', 'b0d853a7-404b-4211-a3e6-96907ba73328', '{"sub": "b0d853a7-404b-4211-a3e6-96907ba73328", "email": "shreerangtrendz@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2025-12-03 08:29:03.606544+00', '2025-12-03 08:29:03.607167+00', '2025-12-03 08:29:03.607167+00', 'bf8d5d83-217c-4949-96a2-2746592a0507'),
	('dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '{"sub": "dcfbcf50-c3bf-4d59-917e-9a7d2974bd19", "role": "office_team", "email": "kumarmaru7@gmail.com", "full_name": "Shrikumar Maru", "email_verified": false, "phone_verified": false}', 'email', '2025-12-03 12:47:20.87828+00', '2025-12-03 12:47:20.878328+00', '2025-12-03 12:47:20.878328+00', 'f910b2c6-3c10-49c4-85df-919ee7bb0a25'),
	('e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', '{"sub": "e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204", "role": "agent", "email": "baltsarpe@gmail.com", "full_name": "h", "email_verified": false, "phone_verified": false}', 'email', '2025-12-07 06:50:23.586157+00', '2025-12-07 06:50:23.586238+00', '2025-12-07 06:50:23.586238+00', 'ee1c39b1-53c6-4ae2-ae02-ca3a5468f773'),
	('b55ff4bd-8908-403a-9054-bc6459ae9abc', 'b55ff4bd-8908-403a-9054-bc6459ae9abc', '{"sub": "b55ff4bd-8908-403a-9054-bc6459ae9abc", "email": "karan.nanji1@gmail.com", "full_name": "Karan Gada", "email_verified": false, "phone_verified": false}', 'email', '2025-12-08 11:54:48.394459+00', '2025-12-08 11:54:48.395079+00', '2025-12-08 11:54:48.395079+00', 'd6356f16-6c70-4a95-987d-aa6125f78046'),
	('a97f4e2e-76fa-46a2-9ab6-ff9af765f4d6', 'a97f4e2e-76fa-46a2-9ab6-ff9af765f4d6', '{"sub": "a97f4e2e-76fa-46a2-9ab6-ff9af765f4d6", "role": "sales_manager", "email": "srtpl.sales@gmail.com", "full_name": "Dheeraj Singh", "email_verified": false, "phone_verified": false}', 'email', '2025-12-08 11:55:34.256015+00', '2025-12-08 11:55:34.256066+00', '2025-12-08 11:55:34.256066+00', '588ca913-77c1-4db2-81b8-711a2892139a');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('2b0f43ce-7c38-447d-9c8e-94db0c1d1c69', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '2026-03-01 17:10:13.390441+00', '2026-03-02 00:52:20.043648+00', NULL, 'aal1', NULL, '2026-03-02 00:52:20.043539', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '104.28.163.47', NULL, NULL, NULL, NULL, NULL),
	('c530cf0d-190f-412b-a5b9-bc517990dbfa', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '2026-03-01 17:29:34.893131+00', '2026-03-02 10:05:18.124036+00', NULL, 'aal1', NULL, '2026-03-02 10:05:18.123926', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '104.28.155.26', NULL, NULL, NULL, NULL, NULL),
	('c10a6e62-69e4-4045-971e-e0b567bd79bf', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', '2025-12-07 08:14:20.114875+00', '2025-12-07 08:14:20.114875+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '49.43.33.80', NULL, NULL, NULL, NULL, NULL),
	('e3ad05b9-5d35-41ec-9ce1-0d93ea490f02', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', '2025-12-07 08:14:36.895628+00', '2025-12-07 08:14:36.895628+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '49.43.33.80', NULL, NULL, NULL, NULL, NULL),
	('64374b88-d644-4113-af87-424ab01c5631', 'b55ff4bd-8908-403a-9054-bc6459ae9abc', '2025-12-08 11:54:48.411932+00', '2025-12-08 11:54:48.411932+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '202.179.159.225', NULL, NULL, NULL, NULL, NULL),
	('939a88f8-1136-4b42-a974-220707924713', 'a97f4e2e-76fa-46a2-9ab6-ff9af765f4d6', '2025-12-08 11:55:34.263309+00', '2025-12-08 11:55:34.263309+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '202.179.159.225', NULL, NULL, NULL, NULL, NULL),
	('f9b0a49f-88d3-4645-b6c3-09d1814d163b', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', '2025-12-07 08:15:26.245815+00', '2025-12-07 08:15:26.245815+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '49.43.33.80', NULL, NULL, NULL, NULL, NULL),
	('eccdc3c9-fa9f-4ec1-8cdc-73837dd51792', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', '2025-12-07 08:15:45.901536+00', '2025-12-21 05:23:08.218388+00', NULL, 'aal1', NULL, '2025-12-21 05:23:08.218273', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', '49.43.33.80', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('2b0f43ce-7c38-447d-9c8e-94db0c1d1c69', '2026-03-01 17:10:13.401413+00', '2026-03-01 17:10:13.401413+00', 'password', '7982308d-7442-462c-a015-1eb80d90272f'),
	('c530cf0d-190f-412b-a5b9-bc517990dbfa', '2026-03-01 17:29:34.937232+00', '2026-03-01 17:29:34.937232+00', 'password', '76b0f3b5-a9f1-478d-a278-369243c1fd27'),
	('c10a6e62-69e4-4045-971e-e0b567bd79bf', '2025-12-07 08:14:20.143588+00', '2025-12-07 08:14:20.143588+00', 'password', '7747f357-e657-4bda-8ab8-fa7c4f90bf20'),
	('e3ad05b9-5d35-41ec-9ce1-0d93ea490f02', '2025-12-07 08:14:36.903861+00', '2025-12-07 08:14:36.903861+00', 'password', '331efdf9-cc6d-4a5a-bf8b-edd1dbfa1b37'),
	('f9b0a49f-88d3-4645-b6c3-09d1814d163b', '2025-12-07 08:15:26.248733+00', '2025-12-07 08:15:26.248733+00', 'password', '920ec11a-225b-44d4-bbe4-a601bcd6e6b7'),
	('eccdc3c9-fa9f-4ec1-8cdc-73837dd51792', '2025-12-07 08:15:45.90427+00', '2025-12-07 08:15:45.90427+00', 'password', '75a167c6-b82a-45b5-b88c-54c7c8fe8a76'),
	('64374b88-d644-4113-af87-424ab01c5631', '2025-12-08 11:54:48.422025+00', '2025-12-08 11:54:48.422025+00', 'password', '35b092b5-388b-4cd4-9e91-2411ecd3d634'),
	('939a88f8-1136-4b42-a974-220707924713', '2025-12-08 11:55:34.26744+00', '2025-12-08 11:55:34.26744+00', 'password', '04cf181b-f710-4ce5-90e4-fafaad53c0ab');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") VALUES
	('2929fbfb-4c0f-4c47-9d91-52afff76f2a5', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', 'recovery_token', 'de22f0aa1f19242f3626c163d25352a47ef4c36a257f88d4d71d68a4', 'kumarmaru7@gmail.com', '2026-03-01 04:40:44.413199', '2026-03-01 04:40:44.413199');


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 41, 'gelhxbpuwshb', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', false, '2025-12-07 08:14:20.12658+00', '2025-12-07 08:14:20.12658+00', NULL, 'c10a6e62-69e4-4045-971e-e0b567bd79bf'),
	('00000000-0000-0000-0000-000000000000', 43, 'ijq37khd7o46', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', false, '2025-12-07 08:14:36.900058+00', '2025-12-07 08:14:36.900058+00', NULL, 'e3ad05b9-5d35-41ec-9ce1-0d93ea490f02'),
	('00000000-0000-0000-0000-000000000000', 44, '4ottudxjjavq', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', false, '2025-12-07 08:15:26.24682+00', '2025-12-07 08:15:26.24682+00', NULL, 'f9b0a49f-88d3-4645-b6c3-09d1814d163b'),
	('00000000-0000-0000-0000-000000000000', 439, 'tadbfgmlym2a', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', true, '2026-03-01 17:29:34.91963+00', '2026-03-01 18:27:54.171641+00', NULL, 'c530cf0d-190f-412b-a5b9-bc517990dbfa'),
	('00000000-0000-0000-0000-000000000000', 441, 'du3yk4t2iiyt', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', false, '2026-03-02 00:52:20.001258+00', '2026-03-02 00:52:20.001258+00', '5yvz2kcmqzfa', '2b0f43ce-7c38-447d-9c8e-94db0c1d1c69'),
	('00000000-0000-0000-0000-000000000000', 443, 's6gciks2f7ng', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', false, '2026-03-02 10:05:18.103182+00', '2026-03-02 10:05:18.103182+00', 'muzyz6ttgjwb', 'c530cf0d-190f-412b-a5b9-bc517990dbfa'),
	('00000000-0000-0000-0000-000000000000', 45, '6rpaczy7yhsm', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', true, '2025-12-07 08:15:45.902954+00', '2025-12-20 07:44:54.415979+00', NULL, 'eccdc3c9-fa9f-4ec1-8cdc-73837dd51792'),
	('00000000-0000-0000-0000-000000000000', 99, 'rycwkgih4n7c', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', true, '2025-12-20 07:44:54.442117+00', '2025-12-20 09:23:27.549419+00', '6rpaczy7yhsm', 'eccdc3c9-fa9f-4ec1-8cdc-73837dd51792'),
	('00000000-0000-0000-0000-000000000000', 102, '53esrfbg5vbk', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', true, '2025-12-20 09:23:27.572608+00', '2025-12-20 10:32:40.02883+00', 'rycwkgih4n7c', 'eccdc3c9-fa9f-4ec1-8cdc-73837dd51792'),
	('00000000-0000-0000-0000-000000000000', 103, 'gfqm3e662df5', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', true, '2025-12-20 10:32:40.060685+00', '2025-12-20 11:38:01.832853+00', '53esrfbg5vbk', 'eccdc3c9-fa9f-4ec1-8cdc-73837dd51792'),
	('00000000-0000-0000-0000-000000000000', 63, 'zeuunnjzitwl', 'b55ff4bd-8908-403a-9054-bc6459ae9abc', false, '2025-12-08 11:54:48.419676+00', '2025-12-08 11:54:48.419676+00', NULL, '64374b88-d644-4113-af87-424ab01c5631'),
	('00000000-0000-0000-0000-000000000000', 64, 'pb2sgshatcu2', 'a97f4e2e-76fa-46a2-9ab6-ff9af765f4d6', false, '2025-12-08 11:55:34.264168+00', '2025-12-08 11:55:34.264168+00', NULL, '939a88f8-1136-4b42-a974-220707924713'),
	('00000000-0000-0000-0000-000000000000', 104, 'pg4g6yibeqhj', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', true, '2025-12-20 11:38:01.855374+00', '2025-12-20 12:37:47.876609+00', 'gfqm3e662df5', 'eccdc3c9-fa9f-4ec1-8cdc-73837dd51792'),
	('00000000-0000-0000-0000-000000000000', 105, '7ntu6k37gx6w', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', true, '2025-12-20 12:37:47.899963+00', '2025-12-20 13:37:14.214362+00', 'pg4g6yibeqhj', 'eccdc3c9-fa9f-4ec1-8cdc-73837dd51792'),
	('00000000-0000-0000-0000-000000000000', 106, 'zx6p5n2h4s35', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', true, '2025-12-20 13:37:14.228628+00', '2025-12-20 14:35:37.696655+00', '7ntu6k37gx6w', 'eccdc3c9-fa9f-4ec1-8cdc-73837dd51792'),
	('00000000-0000-0000-0000-000000000000', 107, 'jxrtrdaouf4n', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', true, '2025-12-20 14:35:37.711663+00', '2025-12-20 17:10:41.109665+00', 'zx6p5n2h4s35', 'eccdc3c9-fa9f-4ec1-8cdc-73837dd51792'),
	('00000000-0000-0000-0000-000000000000', 110, 'xdbech35itaf', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', true, '2025-12-20 17:10:41.138875+00', '2025-12-20 18:08:53.95412+00', 'jxrtrdaouf4n', 'eccdc3c9-fa9f-4ec1-8cdc-73837dd51792'),
	('00000000-0000-0000-0000-000000000000', 111, 'zwclyuiqf2up', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', true, '2025-12-20 18:08:53.96588+00', '2025-12-21 05:23:08.174688+00', 'xdbech35itaf', 'eccdc3c9-fa9f-4ec1-8cdc-73837dd51792'),
	('00000000-0000-0000-0000-000000000000', 438, '5yvz2kcmqzfa', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', true, '2026-03-01 17:10:13.395521+00', '2026-03-02 00:52:19.972942+00', NULL, '2b0f43ce-7c38-447d-9c8e-94db0c1d1c69'),
	('00000000-0000-0000-0000-000000000000', 440, 'd4uqrpfgau42', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', true, '2026-03-01 18:27:54.203108+00', '2026-03-02 09:06:08.610697+00', 'tadbfgmlym2a', 'c530cf0d-190f-412b-a5b9-bc517990dbfa'),
	('00000000-0000-0000-0000-000000000000', 442, 'muzyz6ttgjwb', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', true, '2026-03-02 09:06:08.625634+00', '2026-03-02 10:05:18.08841+00', 'd4uqrpfgau42', 'c530cf0d-190f-412b-a5b9-bc517990dbfa'),
	('00000000-0000-0000-0000-000000000000', 133, 'kb27k2q6i2rt', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', false, '2025-12-21 05:23:08.195915+00', '2025-12-21 05:23:08.195915+00', 'zwclyuiqf2up', 'eccdc3c9-fa9f-4ec1-8cdc-73837dd51792');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: accessories_consumption; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: admin_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."admin_settings" ("id", "key_name", "key_value", "description", "created_at", "updated_at") VALUES
	('5ea03689-1bfa-43b4-9dc1-baae9bbde0cc', 'CLAUDE_API_KEY', 'placeholder_key', 'API Key for Claude', '2026-01-22 18:11:56.05261+00', '2026-01-22 18:11:56.05261+00');


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."companies" ("id", "name", "logo", "address", "contact", "created_at", "color_primary", "color_secondary") VALUES
	('43ffeceb-2477-4ce7-a5dd-cd0f2d1cfc73', 'Shreerang Trendz', NULL, NULL, NULL, '2025-12-08 08:42:54.124126+00', NULL, NULL);


--
-- Data for Name: pricing_tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."pricing_tiers" ("id", "name", "discount_percentage", "description", "created_at") VALUES
	('ccb1ec93-ef63-4b71-8f7a-338064e54bad', 'Standard', 0, 'Standard wholesale pricing.', '2025-11-18 15:45:36.817085+00'),
	('d0dd195a-9093-4c89-a287-8eb203b205c9', 'Premium', 5, '5% off standard wholesale prices.', '2025-11-18 15:45:36.817085+00'),
	('4d491ddc-089d-4bd7-8eb5-c3707c5f1189', 'VIP', 10, '10% off standard wholesale prices.', '2025-11-18 15:45:36.817085+00');


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."roles" ("id", "name", "description", "permissions", "created_at") VALUES
	('40e2f1d9-7118-43f3-8dd1-fd5713ba5bea', 'Founder', 'Full access', '[]', '2025-12-11 17:23:19.72907+00'),
	('a0ba381a-d98b-431e-989b-9328f430e4b2', 'General Manager', 'Management access', '[]', '2025-12-11 17:23:19.72907+00'),
	('4c2d2ed7-5eae-42af-8a4b-83c66610cf71', 'Accounts Head', 'Financial access', '[]', '2025-12-11 17:23:19.72907+00'),
	('cc230dda-8d45-4e23-8ded-5e98b96dd096', 'Store Head', 'Inventory access', '[]', '2025-12-11 17:23:19.72907+00'),
	('80f713a5-72d4-4c1a-8741-d5326ad4ac7b', 'Sales Head', 'Sales access', '[]', '2025-12-11 17:23:19.72907+00'),
	('bbbc1edb-f675-4716-8a9b-6a1faf8baa64', 'Despatch Head', 'Shipping access', '[]', '2025-12-11 17:23:19.72907+00'),
	('374cd68c-97f2-415f-b45a-72cb7a188fa2', 'Collection Head', 'Design access', '[]', '2025-12-11 17:23:19.72907+00'),
	('1c0fda7f-476d-44bb-b346-2963b0758a68', 'Office Admin', 'Admin access', '[]', '2025-12-11 17:23:19.72907+00'),
	('a5d69e04-fb04-4f71-95af-0796d407aaf0', 'Office Staff', 'Restricted access', '[]', '2025-12-11 17:23:19.72907+00'),
	('867fa705-3a4a-4f65-9eb2-9714bbea7e9f', 'Sales Team', 'Sales restricted', '[]', '2025-12-11 17:23:19.72907+00'),
	('9d3b3d77-7503-469d-a119-1b09d8839fa1', 'Agent', 'Commission based', '[]', '2025-12-11 17:23:19.72907+00'),
	('86b2f726-f694-4e16-8871-5f7a68fbe458', 'Customer', 'Client access', '[]', '2025-12-11 17:23:19.72907+00');


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_profiles" ("id", "full_name", "phone_number", "role", "company_name", "gst_number", "address", "is_approved", "created_at", "updated_at", "payment_terms", "credit_limit", "credit_used", "firm_name", "contact_person", "billing_name", "transport", "delivery_address", "agency_name", "assigned_agent_id", "pricing_tier", "email", "city", "state", "pincode", "country", "whatsapp_number", "company_id", "tenant_id", "created_by", "verified_at", "role_id", "packing_type", "customer_type", "status", "tier", "whatsapp_consent", "language_preference", "last_interaction_at", "conversation_context") VALUES
	('b55ff4bd-8908-403a-9054-bc6459ae9abc', 'Karan Gada', '+91 9892775055', 'wholesale_customer', NULL, '27AKLPG2063Q1ZP', '{"city": "", "line1": "Shop No.14, Gr. Flr, Eastern Plaza, Nr. S. K. Patil Hospltal, Daftary Road,\nMalad(E), Mumbai", "state": "Maharashtra", "country": "India", "pincode": "400097"}', true, '2025-12-08 11:54:48.364505+00', '2025-12-08 11:54:48.676176+00', NULL, 0, 0, 'Shanaya Fashion', NULL, NULL, '', '{"city": "", "line1": "Shop No.14, Gr. Flr, Eastern Plaza, Nr. S. K. Patil Hospltal, Daftary Road,\nMalad(E), Mumbai", "state": "Maharashtra", "country": "India", "pincode": "400097"}', NULL, NULL, NULL, 'karan.nanji1@gmail.com', '', 'Maharashtra', '400097', 'India', '+91 9892775055', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', 'PUBLIC', true, 'EN', NULL, '{}'),
	('b0d853a7-404b-4211-a3e6-96907ba73328', 'Kunal Bathla', NULL, 'store_manager', NULL, NULL, '"4081-4084, Millenium Market 4"', true, '2025-12-03 08:29:04.073195+00', '2025-12-11 17:23:19.72907+00', NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'shreerangtrendz@gmail.com', 'Surat', 'Gujarat', '395001', 'India', '+917874200033', NULL, NULL, NULL, NULL, 'cc230dda-8d45-4e23-8ded-5e98b96dd096', NULL, NULL, 'active', 'PUBLIC', true, 'EN', NULL, '{}'),
	('dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', 'Shrikumar Maru', '7567870000', 'admin', 'Shreerang Trendz Private Limited', '', '{}', true, '2025-12-03 12:47:20.837074+00', '2025-12-11 17:23:19.72907+00', NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'kumarmaru7@gmail.com', 'Surat', 'Gujarat', '395001', NULL, NULL, NULL, NULL, NULL, NULL, '1c0fda7f-476d-44bb-b346-2963b0758a68', NULL, NULL, 'active', 'PUBLIC', true, 'EN', NULL, '{}'),
	('e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', 'h', '', 'customer', NULL, '', '{"city": "", "line1": "", "state": "", "country": "", "pincode": "395001"}', false, '2025-12-07 06:50:23.469053+00', '2025-12-11 17:23:19.72907+00', NULL, 0, 0, '', NULL, NULL, '', NULL, NULL, NULL, NULL, 'baltsarpe@gmail.com', '', '', '395001', '', '+91 ', NULL, NULL, NULL, NULL, '86b2f726-f694-4e16-8871-5f7a68fbe458', NULL, NULL, 'active', 'PUBLIC', true, 'EN', NULL, '{}'),
	('a97f4e2e-76fa-46a2-9ab6-ff9af765f4d6', 'Dheeraj Singh', NULL, 'customer', NULL, NULL, '{}', false, '2025-12-08 11:55:34.250544+00', '2025-12-11 17:23:19.72907+00', NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'srtpl.sales@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '86b2f726-f694-4e16-8871-5f7a68fbe458', NULL, NULL, 'active', 'PUBLIC', true, 'EN', NULL, '{}');


--
-- Data for Name: agents; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."customers" ("id", "name", "phone", "email", "address", "gst_number", "created_at", "user_id", "company_name", "contact_person", "city", "state", "zip_code", "payment_terms", "credit_limit", "status", "updated_at", "country", "bank_details", "notes", "pincode", "country_code", "agent_id", "credit_days", "firm_name", "billing_address", "delivery_address", "language_preference", "communication_style", "business_type", "location", "website", "tier", "source", "last_contact", "conversation_history", "metadata", "is_restricted", "portal_access_enabled") VALUES
	('4c771ae3-7351-43d4-91b5-044dfb5751ec', 'Mahesh Agarwal', '+919769539989', 'snehalcreation@gmail.com', '113/6, Maganlal House, Behind metro showroom, SV Road,
Malad(West)', '27abbpa8217b1zr', '2025-12-19 11:48:26.730082', NULL, 'Snehal Creation', '', 'Mumbai', 'Maharashtra', '400064', 'Net 60', 0, 'active', '2025-12-19 11:48:26.730082+00', 'India', '', '', NULL, 'IN', NULL, 0, NULL, NULL, NULL, 'English', 'Formal', NULL, NULL, NULL, 'Standard', NULL, NULL, '[]', '{}', false, false);


--
-- Data for Name: transports; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: sales_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."sales_orders" ("id", "order_no", "party_details", "order_details", "items", "calculations", "totals", "status", "created_by", "created_at", "updated_at", "customer_id", "delivery_date", "shipping_address", "payment_terms", "notes", "total_amount", "salesperson_id", "order_number", "margin_percent", "total_quantity", "approval_status", "discount", "discount_type", "fold_value", "pass_fold_benefit", "brokerage", "brokerage_type", "transport_cost", "gst_rate", "gst_type", "prepared_by_user_id", "prepared_by_name", "prepared_at", "agent_id", "transport_id", "fabric_terms_conditions", "credit_days", "fold_benefit_percentage", "deduct_brokerage", "order_status", "dispatch_status", "subtotal", "tax", "shipping_cost") VALUES
	('05713a1d-1cf8-4496-a55a-e7dcd2a60939', 'SO-20251219-0010', '{"name": "Mahesh Agarwal", "company": "Snehal Creation"}', '{"date": "2025-12-19"}', '[{"id": "1766144926111", "rate": 85, "size": null, "unit": "MTR", "amount": 85000, "quantity": 1000, "item_type": "fabric", "product_id": null, "fabric_name": "14kg Rayon", "product_name": null, "fabric_item_id": "867ea6b7-aa9b-4ca4-ba33-df61a05b43c6"}]', '{"gstAmt": 4250, "charges": {"gst": 5, "fold": 0, "gstType": "percentage", "discount": 0, "brokerage": 0, "transport": 0, "discountType": "percentage", "brokerageType": "percentage", "passFoldBenefit": false}, "subtotal": 85000, "finalTotal": 89250, "discountAmt": 0, "brokerageAmt": 0, "transportAmt": 0, "foldBenefitAmt": 0}', '{"final": 89250}', 'draft', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '2025-12-19 11:49:00.1985+00', '2025-12-19 11:49:00.1985+00', '4c771ae3-7351-43d4-91b5-044dfb5751ec', NULL, NULL, NULL, NULL, 89250, NULL, NULL, NULL, NULL, 'Pending', 0, 'percentage', 0, false, 0, 'percentage', 0, 5, 'percentage', NULL, NULL, '2025-12-19 12:03:31.909387+00', NULL, NULL, NULL, 0, 0, false, 'draft', 'pending', 0, 0, 0),
	('53a0c249-818e-40a8-b66f-5d22651e044e', 'SO-2025-81043', '{"id": "4c771ae3-7351-43d4-91b5-044dfb5751ec", "city": "Mumbai", "name": "Mahesh Agarwal", "email": "snehalcreation@gmail.com", "notes": "", "phone": "+919769539989", "state": "Maharashtra", "status": "active", "address": "113/6, Maganlal House, Behind metro showroom, SV Road,\nMalad(West)", "country": "India", "pincode": null, "user_id": null, "agent_id": null, "zip_code": "400064", "created_at": "2025-12-19T11:48:26.730082", "gst_number": "27abbpa8217b1zr", "updated_at": "2025-12-19T11:48:26.730082+00:00", "credit_days": 0, "bank_details": "", "company_name": "Snehal Creation", "country_code": "IN", "credit_limit": 0, "payment_terms": "Net 60", "contact_person": ""}', '{"date": "2025-12-19", "notes": "", "orderNo": "SO-2025-81043", "preparedBy": "Shrikumar Maru", "deliveryDate": "2025-12-20"}', '[{"id": "1766150818605", "qty": "1000", "rate": "100", "size": "", "unit": "Mtr", "amount": 100000, "design": null, "item_id": "867ea6b7-aa9b-4ca4-ba33-df61a05b43c6", "item_name": "14kg Rayon", "item_type": "fabric"}]', '{"gst": 5, "gstType": "percent", "discount": "7", "brokerage": "2", "foldValue": "98", "transport": "5000", "discountType": "percent", "brokerageType": "percent", "deductBrokerage": false, "passFoldBenefit": true}', '{"final": 100697, "gross": 100000, "gstAmount": 4557, "foldAmount": 1860, "transportAmt": 5000, "discountAmount": 7000, "brokerageAmount": 1822.8, "foldBenefitPercent": 2}', 'submitted', NULL, '2025-12-19 13:27:51.57434+00', '2025-12-19 13:27:51.57434+00', '4c771ae3-7351-43d4-91b5-044dfb5751ec', '2025-12-20', NULL, NULL, '', 100697, NULL, NULL, NULL, NULL, 'Pending', 0, 'percentage', 98, true, 0, 'percentage', 0, 0, 'percentage', NULL, 'Shrikumar Maru', '2025-12-19 13:27:51.57434+00', NULL, NULL, '1. Goods once sold will not be taken back.
2. Interest @ 24% p.a. will be charged if payment is not made within the due date.
3. Subject to Surat Jurisdiction only.', 0, 2, false, 'pending_dispatch', 'pending', 0, 0, 0),
	('ab6b31cf-a37a-4d26-b8de-57ae56c0695f', 'SO-2025-42326', '{"id": "4c771ae3-7351-43d4-91b5-044dfb5751ec", "city": "Mumbai", "name": "Mahesh Agarwal", "email": "snehalcreation@gmail.com", "notes": "", "phone": "+919769539989", "state": "Maharashtra", "status": "active", "address": "113/6, Maganlal House, Behind metro showroom, SV Road,\nMalad(West)", "country": "India", "pincode": null, "user_id": null, "agent_id": null, "zip_code": "400064", "created_at": "2025-12-19T11:48:26.730082", "gst_number": "27abbpa8217b1zr", "updated_at": "2025-12-19T11:48:26.730082+00:00", "credit_days": 0, "bank_details": "", "company_name": "Snehal Creation", "country_code": "IN", "credit_limit": 0, "payment_terms": "Net 60", "contact_person": ""}', '{"date": "2025-12-20", "notes": "", "orderNo": "SO-2025-42326", "preparedBy": "Shrikumar Maru", "deliveryDate": "2025-12-20"}', '[{"id": "1766255259057", "qty": "1000", "rate": "85", "size": "", "unit": "Mtr", "amount": 85000, "design": null, "item_id": "867ea6b7-aa9b-4ca4-ba33-df61a05b43c6", "item_name": "14kg Rayon", "item_type": "fabric"}]', '{"gst": 5, "gstType": "percent", "discount": "5", "brokerage": "2", "foldValue": "98", "transport": "500", "discountType": "percent", "brokerageType": "percent", "deductBrokerage": false, "passFoldBenefit": true}', '{"final": 83591.75, "gross": 85000, "gstAmount": 3956.75, "foldAmount": 1615, "transportAmt": 500, "discountAmount": 4250, "brokerageAmount": 1582.7, "foldBenefitPercent": 2}', 'submitted', NULL, '2025-12-20 18:28:17.910181+00', '2025-12-20 18:28:17.910181+00', '4c771ae3-7351-43d4-91b5-044dfb5751ec', '2025-12-20', NULL, NULL, '', 83591.75, NULL, NULL, NULL, NULL, 'Pending', 0, 'percentage', 98, true, 0, 'percentage', 0, 0, 'percentage', NULL, 'Shrikumar Maru', '2025-12-20 18:28:17.910181+00', NULL, NULL, '1. Goods once sold will not be taken back.
2. Interest @ 24% p.a. will be charged if payment is not made within the due date.
3. Subject to Surat Jurisdiction only.', 0, 2, false, 'pending_dispatch', 'pending', 0, 0, 0);


--
-- Data for Name: agent_commissions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."audit_logs" ("id", "user_id", "action", "table_name", "record_id", "old_values", "new_values", "ip_address", "user_agent", "created_at") VALUES
	('61026d27-9f2f-4501-b17b-3db275754cff', NULL, 'INSERT', 'user_profiles', 'b55ff4bd-8908-403a-9054-bc6459ae9abc', NULL, '{"id": "b55ff4bd-8908-403a-9054-bc6459ae9abc", "city": null, "role": "customer", "email": "karan.nanji1@gmail.com", "state": null, "address": {}, "country": null, "pincode": null, "firm_name": null, "full_name": "Karan Gada", "tenant_id": null, "transport": null, "company_id": null, "created_at": "2025-12-08T11:54:48.364505+00:00", "created_by": null, "gst_number": null, "updated_at": "2025-12-08T11:54:48.364505+00:00", "agency_name": null, "credit_used": 0, "is_approved": false, "verified_at": null, "billing_name": null, "company_name": null, "credit_limit": 0, "phone_number": null, "pricing_tier": null, "payment_terms": null, "contact_person": null, "whatsapp_number": null, "delivery_address": null, "assigned_agent_id": null}', NULL, NULL, '2025-12-08 11:54:48.364505+00'),
	('a7a16dab-9eca-4db1-bebf-970c887ff47b', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', 'UPDATE', 'user_profiles', 'b55ff4bd-8908-403a-9054-bc6459ae9abc', NULL, '{"id": "b55ff4bd-8908-403a-9054-bc6459ae9abc", "city": "", "role": "wholesale_customer", "email": "karan.nanji1@gmail.com", "state": "Maharashtra", "address": {"city": "", "line1": "Shop No.14, Gr. Flr, Eastern Plaza, Nr. S. K. Patil Hospltal, Daftary Road,\nMalad(E), Mumbai", "state": "Maharashtra", "country": "India", "pincode": "400097"}, "country": "India", "pincode": "400097", "firm_name": "Shanaya Fashion", "full_name": "Karan Gada", "tenant_id": null, "transport": "", "company_id": null, "created_at": "2025-12-08T11:54:48.364505+00:00", "created_by": null, "gst_number": "27AKLPG2063Q1ZP", "updated_at": "2025-12-08T11:54:48.676176+00:00", "agency_name": null, "credit_used": 0, "is_approved": true, "verified_at": null, "billing_name": null, "company_name": null, "credit_limit": 0, "phone_number": "+91 9892775055", "pricing_tier": null, "payment_terms": null, "contact_person": null, "whatsapp_number": "+91 9892775055", "delivery_address": {"city": "", "line1": "Shop No.14, Gr. Flr, Eastern Plaza, Nr. S. K. Patil Hospltal, Daftary Road,\nMalad(E), Mumbai", "state": "Maharashtra", "country": "India", "pincode": "400097"}, "assigned_agent_id": null}', NULL, NULL, '2025-12-08 11:54:48.676176+00'),
	('21cd74bf-6782-4efd-82a5-6e91e33452ef', NULL, 'INSERT', 'user_profiles', 'a97f4e2e-76fa-46a2-9ab6-ff9af765f4d6', NULL, '{"id": "a97f4e2e-76fa-46a2-9ab6-ff9af765f4d6", "city": null, "role": "customer", "email": "srtpl.sales@gmail.com", "state": null, "address": {}, "country": null, "pincode": null, "firm_name": null, "full_name": "Dheeraj Singh", "tenant_id": null, "transport": null, "company_id": null, "created_at": "2025-12-08T11:55:34.250544+00:00", "created_by": null, "gst_number": null, "updated_at": "2025-12-08T11:55:34.250544+00:00", "agency_name": null, "credit_used": 0, "is_approved": false, "verified_at": null, "billing_name": null, "company_name": null, "credit_limit": 0, "phone_number": null, "pricing_tier": null, "payment_terms": null, "contact_person": null, "whatsapp_number": null, "delivery_address": null, "assigned_agent_id": null}', NULL, NULL, '2025-12-08 11:55:34.250544+00'),
	('a0484cc8-b3bc-4e0e-8367-b7bd88f1f0c9', NULL, 'UPDATE', 'user_profiles', 'b0d853a7-404b-4211-a3e6-96907ba73328', NULL, '{"id": "b0d853a7-404b-4211-a3e6-96907ba73328", "city": "Surat", "role": "store_manager", "email": "shreerangtrendz@gmail.com", "state": "Gujarat", "status": "active", "address": "4081-4084, Millenium Market 4", "country": "India", "pincode": "395001", "role_id": "cc230dda-8d45-4e23-8ded-5e98b96dd096", "firm_name": null, "full_name": "Kunal Bathla", "tenant_id": null, "transport": null, "company_id": null, "created_at": "2025-12-03T08:29:04.073195+00:00", "created_by": null, "gst_number": null, "updated_at": "2025-12-11T17:23:19.72907+00:00", "agency_name": null, "credit_used": 0, "is_approved": true, "verified_at": null, "billing_name": null, "company_name": null, "credit_limit": 0, "packing_type": null, "phone_number": null, "pricing_tier": null, "customer_type": null, "payment_terms": null, "contact_person": null, "whatsapp_number": "+917874200033", "delivery_address": null, "assigned_agent_id": null}', NULL, NULL, '2025-12-11 17:23:19.72907+00'),
	('66b80925-b178-43e1-9c6f-676cc8e1073c', NULL, 'UPDATE', 'user_profiles', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', NULL, '{"id": "dcfbcf50-c3bf-4d59-917e-9a7d2974bd19", "city": "Surat", "role": "admin", "email": "kumarmaru7@gmail.com", "state": "Gujarat", "status": "active", "address": {}, "country": null, "pincode": "395001", "role_id": "1c0fda7f-476d-44bb-b346-2963b0758a68", "firm_name": null, "full_name": "Shrikumar Maru", "tenant_id": null, "transport": null, "company_id": null, "created_at": "2025-12-03T12:47:20.837074+00:00", "created_by": null, "gst_number": "", "updated_at": "2025-12-11T17:23:19.72907+00:00", "agency_name": null, "credit_used": 0, "is_approved": true, "verified_at": null, "billing_name": null, "company_name": "Shreerang Trendz Private Limited", "credit_limit": 0, "packing_type": null, "phone_number": "7567870000", "pricing_tier": null, "customer_type": null, "payment_terms": null, "contact_person": null, "whatsapp_number": null, "delivery_address": null, "assigned_agent_id": null}', NULL, NULL, '2025-12-11 17:23:19.72907+00'),
	('1d9ab3f6-58d8-479d-a0a5-e7c57355630c', NULL, 'UPDATE', 'user_profiles', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', NULL, '{"id": "e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204", "city": "", "role": "customer", "email": "baltsarpe@gmail.com", "state": "", "status": "active", "address": {"city": "", "line1": "", "state": "", "country": "", "pincode": "395001"}, "country": "", "pincode": "395001", "role_id": "86b2f726-f694-4e16-8871-5f7a68fbe458", "firm_name": "", "full_name": "h", "tenant_id": null, "transport": "", "company_id": null, "created_at": "2025-12-07T06:50:23.469053+00:00", "created_by": null, "gst_number": "", "updated_at": "2025-12-11T17:23:19.72907+00:00", "agency_name": null, "credit_used": 0, "is_approved": false, "verified_at": null, "billing_name": null, "company_name": null, "credit_limit": 0, "packing_type": null, "phone_number": "", "pricing_tier": null, "customer_type": null, "payment_terms": null, "contact_person": null, "whatsapp_number": "+91 ", "delivery_address": null, "assigned_agent_id": null}', NULL, NULL, '2025-12-11 17:23:19.72907+00'),
	('51b4e34e-c397-4d15-90da-657c018273ca', NULL, 'UPDATE', 'user_profiles', 'a97f4e2e-76fa-46a2-9ab6-ff9af765f4d6', NULL, '{"id": "a97f4e2e-76fa-46a2-9ab6-ff9af765f4d6", "city": null, "role": "customer", "email": "srtpl.sales@gmail.com", "state": null, "status": "active", "address": {}, "country": null, "pincode": null, "role_id": "86b2f726-f694-4e16-8871-5f7a68fbe458", "firm_name": null, "full_name": "Dheeraj Singh", "tenant_id": null, "transport": null, "company_id": null, "created_at": "2025-12-08T11:55:34.250544+00:00", "created_by": null, "gst_number": null, "updated_at": "2025-12-11T17:23:19.72907+00:00", "agency_name": null, "credit_used": 0, "is_approved": false, "verified_at": null, "billing_name": null, "company_name": null, "credit_limit": 0, "packing_type": null, "phone_number": null, "pricing_tier": null, "customer_type": null, "payment_terms": null, "contact_person": null, "whatsapp_number": null, "delivery_address": null, "assigned_agent_id": null}', NULL, NULL, '2025-12-11 17:23:19.72907+00');


--
-- Data for Name: backup_activity_log; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."suppliers" ("id", "company_id", "supplier_name", "supplier_code", "contact_person", "phone", "email", "address", "payment_terms", "created_by", "tenant_id", "created_at", "updated_at", "city", "state", "pincode", "gst_number", "bank_account_number", "bank_name", "ifsc_code", "account_holder_name", "notes", "status") VALUES
	('f71c1413-886a-48dc-873d-f11bbb76a872', NULL, 'Durga Processors', NULL, '', '999999999', '', '', NULL, 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', NULL, '2026-01-01 09:48:56.791244+00', '2026-01-01 09:48:56.791244+00', '', '', '', '', '', '', '', '', '', 'active');


--
-- Data for Name: base_fabrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."base_fabrics" ("id", "base_fabric_name", "hsn_code", "base", "width", "gsm", "weight", "yarn_count", "construction", "stretchability", "transparency", "description", "status", "created_at", "updated_at", "created_by", "alias_names", "is_starred", "starred_at", "supplier_id", "hsn_code_description", "gst_rate", "supplier_contact", "supplier_cost", "notes", "ready_stock", "out_of_stock", "gsm_tolerance", "construction_code", "base_code", "handfeel", "yarn_type", "finish_type", "sku", "short_code", "finish", "fabric_name", "process", "generated_name", "generated_sku") VALUES
	('e2484b32-df49-4d52-a543-89079405873c', '44 14kg Rayon Greige', '5407', 'Rayon', '44"', 140, 14, '', 'Plain Weave', 'Rigid', 'Opaque', NULL, 'active', '2026-01-22 09:43:47.025285+00', '2026-01-22 09:43:47.025285+00', NULL, '[]', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '', 'PL', 'RAY', 'Soft', '', 'Greige', '44RAYPL-Greige', 'RAYPL', 'Greige', NULL, NULL, NULL, NULL),
	('55aa801e-82d6-43a1-a964-5f53f830a976', '44 14kg Rayon Greige', '', 'Rayon', '44"', 140, 14, '', 'Plain Weave', '', '', NULL, 'active', '2026-01-27 08:09:26.612797+00', '2026-01-27 08:09:26.612797+00', NULL, '[]', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '5', NULL, NULL, '', '', NULL, '44-RAY-GR', 'RAY', 'Greige', '14kg Rayon', 'Greige', NULL, NULL),
	('9b6af241-6a56-4f2f-9e70-0cea290d957d', '48" Cotton Camric Greige', '', 'Cotton', '48"', 90, 10, '60', 'Plain Weave', 'Non-Stretch', '', NULL, 'active', '2026-02-24 03:00:32.169254+00', '2026-02-24 03:00:32.169254+00', NULL, '[]', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, NULL, NULL, NULL, '', '', NULL, '48-COT-GRI', 'COT', 'Greige', 'Cotton Camric', 'Greige', NULL, NULL),
	('467310ce-5172-4b7d-9bac-561950738082', '44" Rayon Greige', '5407', 'Rayon', '44"', 140, 14, '', 'Plain Weave', 'Non-Stretch', 'Opaque', NULL, 'active', '2026-02-25 06:36:29.689355+00', '2026-02-25 06:36:29.689355+00', NULL, '[]', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '4', NULL, NULL, 'Soft', '30s', NULL, '44-RAY-GRI', 'RAY', 'Greige', 'Rayon', 'Greige', NULL, NULL),
	('72eeabf0-d39a-41be-ae14-584d760ec3b3', '48" Weightless Greige', '', 'Polyester', '48"', 80, 8, '', 'Plain Weave', 'Non-Stretch', '', NULL, 'active', '2026-02-26 05:47:23.985468+00', '2026-02-26 05:47:23.985468+00', NULL, '[]', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '5', NULL, NULL, '', '', NULL, '48-WET-GRI', 'WET', 'Greige', 'Weightless', 'Greige', NULL, NULL);


--
-- Data for Name: job_workers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."job_workers" ("id", "worker_name", "rate", "quality_grade", "created_at", "contact_person", "phone", "email", "address", "city", "state", "pincode", "specialization", "rate_unit", "bank_account_number", "bank_name", "ifsc_code", "account_holder_name", "status", "notes") VALUES
	('dd897305-53b4-44c3-b814-a18a4af3b790', 'Surbhi Textile Mills Private Limited', 1, NULL, '2026-01-01 09:51:16.023398+00', '', '9999999999', '', '', '', '', '', 'Embroidery', 'Meter', '', '', '', '', 'active', '');


--
-- Data for Name: base_fabric_job_workers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: base_fabric_suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: batch_costing; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: brokerage_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: bulk_bills; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: bulk_enquiries; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: bulk_item_imports; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: bulk_item_import_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: bulk_uploads; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."bulk_uploads" ("id", "user_id", "upload_type", "file_name", "file_path", "total_rows", "successful_rows", "failed_rows", "status", "error_log", "created_at", "updated_at") VALUES
	('5cc90382-ffcf-4f35-89bd-155968b60f3d', NULL, 'fabrics', 'Base Fabric Name.xlsx', NULL, 191, 0, 191, 'completed_with_errors', '["Row 2: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 3: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 4: invalid input syntax for type numeric: \"150-160\"", "Row 5: invalid input syntax for type numeric: \"150-160\"", "Row 6: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 7: invalid input syntax for type numeric: \"170-180\"", "Row 8: invalid input syntax for type numeric: \"170-180\"", "Row 9: invalid input syntax for type numeric: \"70-80\"", "Row 10: invalid input syntax for type numeric: \"70-80\"", "Row 11: invalid input syntax for type numeric: \"80-90\"", "Row 12: invalid input syntax for type numeric: \"50-60\"", "Row 13: invalid input syntax for type numeric: \"60-70\"", "Row 14: invalid input syntax for type numeric: \"140-150\"", "Row 15: invalid input syntax for type numeric: \"130-140\"", "Row 16: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 17: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 18: invalid input syntax for type numeric: \"60-70\"", "Row 19: invalid input syntax for type numeric: \"110-120\"", "Row 20: invalid input syntax for type numeric: \"70-80\"", "Row 21: invalid input syntax for type numeric: \"80-90\"", "Row 22: invalid input syntax for type numeric: \"90-100\"", "Row 23: invalid input syntax for type numeric: \"70-80\"", "Row 24: invalid input syntax for type numeric: \"100-110\"", "Row 25: invalid input syntax for type numeric: \"40-50\"", "Row 26: invalid input syntax for type numeric: \"70-80\"", "Row 27: invalid input syntax for type numeric: \"100-110\"", "Row 28: invalid input syntax for type numeric: \"70-80\"", "Row 29: invalid input syntax for type numeric: \"70-80\"", "Row 30: invalid input syntax for type numeric: \"100-110\"", "Row 31: invalid input syntax for type numeric: \"60-70\"", "Row 32: invalid input syntax for type numeric: \"60-70\"", "Row 33: invalid input syntax for type numeric: \"40-50\"", "Row 34: invalid input syntax for type numeric: \"160-180\"", "Row 35: invalid input syntax for type numeric: \"80-90\"", "Row 36: invalid input syntax for type numeric: \"80-90\"", "Row 37: invalid input syntax for type numeric: \"60-70\"", "Row 38: invalid input syntax for type numeric: \"70-80\"", "Row 39: invalid input syntax for type numeric: \"70-80\"", "Row 40: invalid input syntax for type numeric: \"140-150\"", "Row 41: invalid input syntax for type numeric: \"50-60\"", "Row 42: invalid input syntax for type numeric: \"110-120\"", "Row 43: invalid input syntax for type numeric: \"90-100\"", "Row 44: invalid input syntax for type numeric: \"40-50\"", "Row 45: invalid input syntax for type numeric: \"40-50\"", "Row 46: invalid input syntax for type numeric: \"60-70\"", "Row 47: invalid input syntax for type numeric: \"60-70\"", "Row 48: invalid input syntax for type numeric: \"60-70\"", "Row 49: invalid input syntax for type numeric: \"50-60\"", "Row 50: invalid input syntax for type numeric: \"70-80\"", "Row 51: invalid input syntax for type numeric: \"70-80\"", "Row 52: invalid input syntax for type numeric: \"70-80\"", "Row 53: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 54: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 55: invalid input syntax for type numeric: \"80-90\"", "Row 56: invalid input syntax for type numeric: \"110-120\"", "Row 57: invalid input syntax for type numeric: \"110-120\"", "Row 58: invalid input syntax for type numeric: \"90-100\"", "Row 59: invalid input syntax for type numeric: \"100-110\"", "Row 60: invalid input syntax for type numeric: \"100-110\"", "Row 61: invalid input syntax for type numeric: \"80-90\"", "Row 62: invalid input syntax for type numeric: \"80-90\"", "Row 63: invalid input syntax for type numeric: \"90-100\"", "Row 64: invalid input syntax for type numeric: \"90-100\"", "Row 65: invalid input syntax for type numeric: \"110-120\"", "Row 66: invalid input syntax for type numeric: \"80-90\"", "Row 67: invalid input syntax for type numeric: \"80-90\"", "Row 68: invalid input syntax for type numeric: \"40-50\"", "Row 69: invalid input syntax for type numeric: \"40-50\"", "Row 70: invalid input syntax for type numeric: \"60-70\"", "Row 71: invalid input syntax for type numeric: \"60-70\"", "Row 72: invalid input syntax for type numeric: \"60-70\"", "Row 73: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 74: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 75: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 76: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 77: invalid input syntax for type numeric: \"130-140\"", "Row 78: invalid input syntax for type numeric: \"130-140\"", "Row 79: invalid input syntax for type numeric: \"50-60\"", "Row 80: invalid input syntax for type numeric: \"50-60\"", "Row 81: invalid input syntax for type numeric: \"50-60\"", "Row 82: invalid input syntax for type numeric: \"70-80\"", "Row 83: invalid input syntax for type numeric: \"70-80\"", "Row 84: invalid input syntax for type numeric: \"110-130\"", "Row 85: invalid input syntax for type numeric: \"95-100\"", "Row 86: invalid input syntax for type numeric: \"100-110\"", "Row 87: invalid input syntax for type numeric: \"80-90\"", "Row 88: invalid input syntax for type numeric: \"80-90\"", "Row 89: invalid input syntax for type numeric: \"100-110\"", "Row 90: invalid input syntax for type numeric: \"130-140\"", "Row 91: invalid input syntax for type numeric: \"70-80\"", "Row 92: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 93: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 94: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 95: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 96: invalid input syntax for type numeric: \"70-80\"", "Row 97: invalid input syntax for type numeric: \"70-80\"", "Row 98: invalid input syntax for type numeric: \"100-110\"", "Row 99: invalid input syntax for type numeric: \"100-110\"", "Row 100: invalid input syntax for type numeric: \"80-90\"", "Row 101: invalid input syntax for type numeric: \"70-80\"", "Row 102: invalid input syntax for type numeric: \"70-80\"", "Row 103: invalid input syntax for type numeric: \"50-60\"", "Row 104: invalid input syntax for type numeric: \"90-100\"", "Row 105: invalid input syntax for type numeric: \"90-100\"", "Row 106: invalid input syntax for type numeric: \"90-100\"", "Row 107: invalid input syntax for type numeric: \"100-110\"", "Row 108: invalid input syntax for type numeric: \"110-120\"", "Row 109: invalid input syntax for type numeric: \"50-60\"", "Row 110: invalid input syntax for type numeric: \"160-170\"", "Row 111: invalid input syntax for type numeric: \"100-110\"", "Row 112: invalid input syntax for type numeric: \"100-110\"", "Row 113: invalid input syntax for type numeric: \"120-130\"", "Row 114: invalid input syntax for type numeric: \"40-50\"", "Row 115: invalid input syntax for type numeric: \"140-150\"", "Row 116: invalid input syntax for type numeric: \"130-140\"", "Row 117: invalid input syntax for type numeric: \"80-90\"", "Row 118: invalid input syntax for type numeric: \"50-60\"", "Row 119: invalid input syntax for type numeric: \"120-130\"", "Row 120: invalid input syntax for type numeric: \"60-70\"", "Row 121: invalid input syntax for type numeric: \"60-70\"", "Row 122: invalid input syntax for type numeric: \"70-80\"", "Row 123: invalid input syntax for type numeric: \"60-70\"", "Row 124: invalid input syntax for type numeric: \"80-90\"", "Row 125: invalid input syntax for type numeric: \"80-90\"", "Row 126: invalid input syntax for type numeric: \"80-90\"", "Row 127: invalid input syntax for type numeric: \"100-110\"", "Row 128: invalid input syntax for type numeric: \"140-150\"", "Row 129: invalid input syntax for type numeric: \"140-150\"", "Row 130: invalid input syntax for type numeric: \"110-120\"", "Row 131: invalid input syntax for type numeric: \"110-120\"", "Row 132: invalid input syntax for type numeric: \"50-60\"", "Row 133: invalid input syntax for type numeric: \"100-110\"", "Row 134: invalid input syntax for type numeric: \"100-110\"", "Row 135: invalid input syntax for type numeric: \"110-120\"", "Row 136: invalid input syntax for type numeric: \"90-100\"", "Row 137: invalid input syntax for type numeric: \"90-100\"", "Row 138: invalid input syntax for type numeric: \"100-110\"", "Row 139: invalid input syntax for type numeric: \"100-110\"", "Row 140: invalid input syntax for type numeric: \"100-110\"", "Row 141: invalid input syntax for type numeric: \"100-110\"", "Row 142: invalid input syntax for type numeric: \"90-95\"", "Row 143: invalid input syntax for type numeric: \"90-95\"", "Row 144: invalid input syntax for type numeric: \"90-95\"", "Row 145: invalid input syntax for type numeric: \"90-95\"", "Row 146: invalid input syntax for type numeric: \"90-95\"", "Row 147: invalid input syntax for type numeric: \"90-95\"", "Row 148: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 149: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 150: invalid input syntax for type numeric: \"91-95\"", "Row 151: invalid input syntax for type numeric: \"75-80\"", "Row 152: invalid input syntax for type numeric: \"75-80\"", "Row 153: invalid input syntax for type numeric: \"96-100\"", "Row 154: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 155: new row for relation \"base_fabrics\" violates check constraint \"base_fabrics_status_check\"", "Row 156: invalid input syntax for type numeric: \"124-129\"", "Row 157: invalid input syntax for type numeric: \"124-129\"", "Row 158: invalid input syntax for type numeric: \"124-129\"", "Row 159: invalid input syntax for type numeric: \"51-55\"", "Row 160: invalid input syntax for type numeric: \"60-65\"", "Row 161: invalid input syntax for type numeric: \"69-73\"", "Row 162: invalid input syntax for type numeric: \"69-73\"", "Row 163: invalid input syntax for type numeric: \"75-80\"", "Row 164: invalid input syntax for type numeric: \"87-91\"", "Row 165: invalid input syntax for type numeric: \"87-91\"", "Row 166: invalid input syntax for type numeric: \"69-73\"", "Row 167: invalid input syntax for type numeric: \"75-80\"", "Row 168: invalid input syntax for type numeric: \"74-78\"", "Row 169: invalid input syntax for type numeric: \"72-76\"", "Row 170: invalid input syntax for type numeric: \"72-76\"", "Row 171: invalid input syntax for type numeric: \"61-65\"", "Row 172: invalid input syntax for type numeric: \"61-65\"", "Row 173: invalid input syntax for type numeric: \"100-104\"", "Row 174: invalid input syntax for type numeric: \"124-128\"", "Row 175: invalid input syntax for type numeric: \"124-128\"", "Row 176: invalid input syntax for type numeric: \"124-128\"", "Row 177: invalid input syntax for type numeric: \"33-37\"", "Row 178: invalid input syntax for type numeric: \"33-37\"", "Row 179: invalid input syntax for type numeric: \"33-37\"", "Row 180: invalid input syntax for type numeric: \"32-36\"", "Row 181: invalid input syntax for type numeric: \"32-36\"", "Row 182: invalid input syntax for type numeric: \"32-36\"", "Row 183: invalid input syntax for type numeric: \"42-48\"", "Row 184: invalid input syntax for type numeric: \"29-33\"", "Row 185: invalid input syntax for type numeric: \"29-33\"", "Row 186: invalid input syntax for type numeric: \"52-57\"", "Row 187: invalid input syntax for type numeric: \"46-50\"", "Row 188: invalid input syntax for type numeric: \"57-61\"", "Row 189: invalid input syntax for type numeric: \"31-35\"", "Row 190: invalid input syntax for type numeric: \"49-53\"", "Row 191: invalid input syntax for type numeric: \"56-60\"", "Row 192: invalid input syntax for type numeric: \"52-56\""]', '2025-12-30 11:16:23.029263+00', '2025-12-30 11:16:23.029263+00'),
	('10dc9458-25b2-4a75-82e8-23f805461a2e', NULL, 'fabrics', 'Base Fabric Name.xlsx', NULL, 191, 191, 0, 'completed', '[]', '2025-12-30 13:29:15.545408+00', '2025-12-30 13:29:15.545408+00'),
	('877cfcb8-2cb8-46ad-a183-d4d049e7aa2d', NULL, 'fabrics', 'Base Fabric Name.xlsx', NULL, 191, 191, 0, 'completed', '[]', '2025-12-30 15:36:55.658343+00', '2025-12-30 15:36:55.658343+00');


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."categories" ("id", "name", "slug", "parent_id", "level", "display_order", "is_active", "created_at", "updated_at") VALUES
	('0ba8565b-f3a9-411d-8396-bfab9bceb426', 'Printed Fabrics', 'printed-fabrics', NULL, 1, 1, true, '2025-11-18 15:26:36.735196+00', '2025-11-18 15:26:36.735196+00'),
	('4fe88e64-8b2a-4877-bcc0-cabf48fbaeb3', 'Digital Print Fabrics', 'digital-print-fabrics', NULL, 1, 2, true, '2025-11-18 15:26:36.735196+00', '2025-11-18 15:26:36.735196+00'),
	('4f00094d-67ff-445e-b064-1f6b84baa59b', 'Solid Plain Dyed', 'solid-plain-dyed', NULL, 1, 3, true, '2025-11-18 15:26:36.735196+00', '2025-11-18 15:26:36.735196+00'),
	('847c1508-35c2-45e9-8111-ef85fd9bc678', 'Hakoba Schiffli', 'hakoba-schiffli', NULL, 1, 4, true, '2025-11-18 15:26:36.735196+00', '2025-11-18 15:26:36.735196+00'),
	('5e94cb44-e2bd-4326-8d46-fa26410aca27', 'Embroidery', 'embroidery', NULL, 1, 5, true, '2025-11-18 15:26:36.735196+00', '2025-11-18 15:26:36.735196+00'),
	('68265036-f431-4e9a-b065-eb986dafe4ce', 'Ready Garments', 'ready-garments', NULL, 1, 6, true, '2025-11-18 15:26:36.735196+00', '2025-11-18 15:26:36.735196+00');


--
-- Data for Name: category_visibility; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."category_visibility" ("id", "category_key", "is_visible", "updated_at") VALUES
	('68b4f1c9-564d-4039-bc13-8b44e9d7582a', 'base_fabric', true, '2025-12-31 03:34:30.336863+00'),
	('d7a13a4f-a5f4-43ef-aacc-3c0954c5b60c', 'finish_fabric', true, '2025-12-31 03:34:30.336863+00'),
	('3aa36c4e-6bd0-49f2-9536-f8232b9d0cba', 'fancy_finish_fabric', true, '2025-12-31 03:34:30.336863+00');


--
-- Data for Name: sales_team; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: city_visit_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: conversations_extended; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: design_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: fabric_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."fabric_categories" ("id", "name", "description", "created_at", "created_by", "tenant_id", "updated_at", "company_id") VALUES
	('4954c309-91a7-452c-b228-925b63f3b1eb', 'Cotton', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('cbec5d4d-506f-4b8e-a1b6-a297d9cdad0c', 'Rayon', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('f04524a4-251d-4e60-82c2-5e1ebd073d76', 'Viscose', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('53befceb-bf11-45b8-a78e-5e1a9998a4ec', 'Polyester', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('967dff43-14e4-4589-92a3-1c51be2b893b', 'PV', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('9f8f9dce-5491-4faa-8dd3-9cd6d457133c', 'Nylon', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL);


--
-- Data for Name: fabric_headings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."fabric_headings" ("id", "name", "description", "created_at", "created_by", "tenant_id", "updated_at", "company_id") VALUES
	('90e7e376-0b99-4b6d-a8fb-43d474cb0443', 'Mill Print', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('77a3b180-db89-43bb-aef1-5e028e8ed549', 'Digital Print', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('bdb9bddf-6ff3-43fd-b990-a27ef8d82445', 'Solid Plains', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('5d0c6609-24b1-4879-bcf1-8ecf21c84f97', 'Embroidery', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('7d7f3e1a-7427-48ea-acd1-ea70bade577c', 'Hakoba/Schiffli', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('21ff0b90-ad2e-44dd-9c35-e096fbad6815', 'Value Added Fabrics', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL);


--
-- Data for Name: fabric_subcategories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."fabric_subcategories" ("id", "category_id", "name", "description", "created_at", "created_by", "tenant_id", "updated_at", "company_id") VALUES
	('baa5c90b-d099-47ef-9bb3-0d1de376d522', '4954c309-91a7-452c-b228-925b63f3b1eb', 'Cotton Cambric', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('615dcc79-8d58-46c0-ae3b-9a799266ba1b', '4954c309-91a7-452c-b228-925b63f3b1eb', 'Cotton Satin', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('e92faf9a-2030-4c07-8bd3-3eabf453284f', '4954c309-91a7-452c-b228-925b63f3b1eb', 'Jam Satin', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('92d6d149-e09e-4c35-a647-0bf2f0c0a105', '4954c309-91a7-452c-b228-925b63f3b1eb', 'Cotton Flex', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('43fe2e84-8f0e-4cf9-82a6-b0fff1463e45', '4954c309-91a7-452c-b228-925b63f3b1eb', 'Cotton Dobby', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('87e6f64b-b4b4-4564-baa1-86d053799f16', 'cbec5d4d-506f-4b8e-a1b6-a297d9cdad0c', 'Rayon', NULL, '2025-12-08 07:28:35.561597+00', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', NULL, '2025-12-08 07:28:35.561597+00', NULL);


--
-- Data for Name: fabric_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."fabric_types" ("id", "subcategory_id", "name", "description", "created_at", "created_by", "tenant_id", "updated_at", "company_id", "gsm_min", "gsm_max") VALUES
	('25739d28-ba4e-4548-b250-6cd3279aa51b', '87e6f64b-b4b4-4564-baa1-86d053799f16', 'Rayon', NULL, '2025-12-08 07:36:20.153969+00', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', NULL, '2025-12-08 07:36:20.153969+00', NULL, NULL, NULL);


--
-- Data for Name: fabric_widths; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."fabric_widths" ("id", "width_value", "description", "created_at", "created_by", "tenant_id", "updated_at", "company_id") VALUES
	('9309813c-59be-44e1-b7fc-f93663e29a55', '28"', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('20d7e827-ef85-4697-8241-84e72156cd37', '36"', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('9e3ebe82-7854-4860-a862-5850f060724a', '44"', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('0ae633bb-6998-470e-b602-ccb1f341d235', '48"', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('eab4b6e8-6d3b-4826-b27f-6235ac6fec5e', '58"', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('b4558ff1-0afe-40e1-9957-50199e2d7435', '68"', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL),
	('edc591fd-575a-4c90-9d17-328d943c685e', '72"', NULL, '2025-12-08 06:17:32.615768+00', NULL, NULL, '2025-12-08 07:15:49.60289+00', NULL);


--
-- Data for Name: fabric_master; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: design_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: designs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: cost_sheets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."cost_sheets" ("id", "company_id", "design_id", "base_fabric_cost", "dyeing_cost", "processing_cost", "cutting_cost", "transport_cost", "overhead_cost", "margin_percent", "selling_price_per_meter", "created_by", "tenant_id", "created_at", "updated_at", "fabric_type", "costing_method", "design_number", "fabric_id", "process_type", "value_addition_type", "grey_input_qty", "grey_rate", "buying_commission_percent", "transportation_percent", "print_job_charge", "finish_mtr_received", "shortage_percent", "basic_grey_amount", "buying_commission_amount", "transportation_amount", "net_grey_cost", "total_batch_cost", "final_cost_per_mtr", "grey_purchase_cost", "dyeing_job_bill", "schiffli_job_charge", "deca_washing_charge", "scalping_border_cut", "folding_packing", "total_saleable_mtrs", "profit_percent", "dhara_percent", "factory_cost_per_mtr", "final_selling_price", "notes", "execution_order_used", "cost_breakdown_by_stage") VALUES
	('9871d588-a4d5-408a-b000-9a5816b6adfe', NULL, NULL, 0, 0, 0, 0, 0, 0, 20, NULL, 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', NULL, '2025-12-31 13:14:20.571055+00', '2025-12-31 13:14:20.571055+00', 'Base', 'FinishMeters', '1001', '3a073900-b421-4b0f-916b-2deb5e9b0af5', NULL, NULL, 1000, 28, 1, 0.5, 32, 900, 10, 28000, 280, 140, 28420, 57220, 63.58, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, NULL);


--
-- Data for Name: costing_components; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: job_costing_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: costing_parameters; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: costing_paths; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."costing_paths" ("id", "path_name", "path_number", "components", "description", "created_at", "execution_order") VALUES
	('7d995b2f-8ab2-423f-acc8-e1aec521f68f', 'TRADING', 1, '[]', 'Direct Trading (Buy & Sell)', '2026-01-21 10:26:34.154919+00', '[0, 7]'),
	('b8259d9c-328d-4c72-b6d5-8a416d4a3473', 'GREY_ONLY', 2, '[]', 'Grey Fabric Sales with Margin', '2026-01-21 10:26:34.154919+00', '[0, 7]'),
	('35096772-c670-4ddb-a3f1-28c4bc12946b', 'RFD_ONLY', 3, '[]', 'Grey to Ready-For-Dyeing conversion', '2026-01-21 10:26:34.154919+00', '[0, "DP", 7]'),
	('aa4e0fe0-b281-414b-a380-b7a351187d12', 'GREY_RFD_DIGITAL', 4, '[]', 'Grey -> RFD -> Digital Printing', '2026-01-21 10:26:34.154919+00', '[0, "MP", 7]'),
	('f7b11168-20dc-4e1f-a22f-ec077624d2f4', 'GREY_MILL', 5, '[]', 'Grey -> Mill Processing (Dyeing/Printing)', '2026-01-21 10:26:34.154919+00', '[0, "SLD", 7]'),
	('9e8dfbef-7a56-4b35-93d2-64d8ebf50bcd', 'GREY_DYED', 6, '[]', 'Grey -> Standard Dyeing', '2026-01-21 10:26:34.154919+00', '[0, "STAGE1", 3, 4, 7]'),
	('a03de198-7349-4acd-86fa-6be2b51e0b21', 'GREY_MILL_SCHIFFLI_DECA', 7, '[]', 'Grey -> Mill -> Embroidery -> Finishing', '2026-01-21 10:26:34.154919+00', '[0, 3, "STAGE1", 7]'),
	('14d5c1c4-29d2-4fe5-a7e4-3b1d3ebf40a7', 'GREY_SCHIFFLI_DYED', 8, '[]', 'Grey -> Embroidery -> Dyeing', '2026-01-21 10:26:34.154919+00', '[0, 3, 4, 7]'),
	('1d27ea64-b6f8-4a1a-b606-c7fffb10c4d0', 'GREY_SCHIFFLI_DECA_WASH', 9, '[]', 'Grey -> Embroidery -> Washing', '2026-01-21 10:26:34.154919+00', '[0, 3, 0, "DP", 7]');


--
-- Data for Name: costing_sheets; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: country_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."country_codes" ("id", "country", "country_code", "phone_code") VALUES
	('07b99ed2-94b0-4446-a1fa-e0dfbd48f568', 'India', 'IN', '+91'),
	('6cee7aab-1147-4beb-ad84-9fe11b7a76a1', 'USA', 'US', '+1'),
	('ec6a858f-b4ed-4bbf-8566-19338054a18d', 'UK', 'GB', '+44'),
	('f179f11b-bed3-4f10-a91d-cb142a240ec0', 'Canada', 'CA', '+1'),
	('cb53f0d8-7f24-4061-9099-a2a06ea565c4', 'Australia', 'AU', '+61'),
	('faeea738-e874-45a2-8e0e-ec26e362e34f', 'UAE', 'AE', '+971');


--
-- Data for Name: custom_dropdown_values; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."custom_dropdown_values" ("id", "category", "value", "label", "is_active", "created_at", "updated_at") VALUES
	('3a6fd047-cc22-4b4d-919b-654daefbbb43', 'Transparency', 'Opaque', 'Opaque', true, '2026-01-22 17:21:47.376184+00', '2026-01-22 17:21:47.376184+00'),
	('e47a1009-0af5-4fd2-af8f-4f1b801acb07', 'Transparency', 'Semi Sheer', 'Semi Sheer', true, '2026-01-22 17:21:47.376184+00', '2026-01-22 17:21:47.376184+00'),
	('eca601d9-9fca-4d87-9963-9c65b228b8e1', 'Transparency', 'Sheer', 'Sheer', true, '2026-01-22 17:21:47.376184+00', '2026-01-22 17:21:47.376184+00'),
	('88fae247-d06b-4cbf-a930-4eea2ca88848', 'Transparency', 'Blackout', 'Blackout', true, '2026-01-22 17:21:47.376184+00', '2026-01-22 17:21:47.376184+00');


--
-- Data for Name: custom_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: customer_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: customer_delivery_addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."customer_delivery_addresses" ("id", "user_id", "address_nickname", "address_line", "city", "state", "country", "pincode", "is_default", "created_at") VALUES
	('e4d07c62-b813-4093-ac4b-19385c820eb2', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', 'balts', 'surat', 'surat', 'gujrat', 'India', '395007', false, '2025-12-07 07:02:37.266674+00');


--
-- Data for Name: whatsapp_conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: customer_interactions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: customer_portal_access; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: customer_requirements; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: design_descriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: design_images; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: design_layouts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."design_layouts" ("id", "layout_name") VALUES
	('73af652e-5304-4e27-bcbc-b6315fcdab89', 'Allover'),
	('7f43ffaa-3884-4659-a7fe-3360f8229596', 'Daman/Skirt'),
	('3f54ba71-e8a0-4728-bbe5-076949ba233f', 'Butti (Small)'),
	('720c27ae-aabd-4ac5-b822-ce0762bf5209', 'Butta (Big)'),
	('6a6fcdb0-43b4-4b61-97c1-eab0d7b22eb9', 'Jaal (Heavy)'),
	('4d4f158e-9e1a-4a6c-8a52-a46d5675b2b9', 'Neck/Yoke'),
	('896298e8-b69f-4ca8-9c3d-d6b7b2a7e982', 'Panel'),
	('da635492-99dd-43b9-8f45-c7f520d69fa1', 'Running Border');


--
-- Data for Name: fabrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."fabrics" ("id", "fabric_name", "hsn_code", "set_type", "base_category", "base_type", "width", "gsm", "weight", "yarn_count", "construction", "finish", "stretchability", "transparency", "created_at", "updated_at", "design_name", "process_type", "sku") VALUES
	('867ea6b7-aa9b-4ca4-ba33-df61a05b43c6', '14kg Rayon', '', 'none', 'Semi-Synthetic', 'Rayon', '44"', 140, 14, '', 'Woven', 'Bio wash', 'Rigid', 'Opaque', '2025-12-18 13:15:02.107733+00', '2025-12-18 13:15:02.107733+00', NULL, NULL, NULL),
	('3e48de18-c3d5-488e-b72c-9c2d101eaa3f', 'Rayon', NULL, NULL, 'Natural', 'Rayon', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:00:48.823308+00', '2025-12-30 17:00:48.823308+00', NULL, NULL, NULL),
	('f22e5979-79b9-43df-a7f5-00525532d943', 'Capsule Rayon', NULL, NULL, 'Natural', 'Rayon x Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:00:50.217231+00', '2025-12-30 17:00:50.217231+00', NULL, NULL, NULL),
	('7ce8174b-c4dc-4c69-b983-b3807eba4b25', 'Berlin', NULL, NULL, 'Natural', 'PV', '58"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:00:51.578569+00', '2025-12-30 17:00:51.578569+00', NULL, NULL, NULL),
	('1907cbf5-d6b2-4007-9477-5ece9892d5f6', 'Vatican', NULL, NULL, 'Natural', 'PV', '58"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:00:52.601738+00', '2025-12-30 17:00:52.601738+00', NULL, NULL, NULL),
	('8e834e86-c73f-4c27-80fe-e042c935f43a', 'Modal Chanderi', NULL, NULL, 'Natural', 'PV', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:00:53.459611+00', '2025-12-30 17:00:53.459611+00', NULL, NULL, NULL),
	('354d260f-21a7-4b8c-b064-d5af1dc2c628', 'Cotton Camric', NULL, NULL, 'Natural', 'Cotton', '58"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:00:54.745194+00', '2025-12-30 17:00:54.745194+00', NULL, NULL, NULL),
	('c98e92ba-bb5d-4d25-9922-6df433ce1a41', 'Cotton Mul', NULL, NULL, 'Natural', 'Cotton', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:00:55.670269+00', '2025-12-30 17:00:55.670269+00', NULL, NULL, NULL),
	('19808cd5-9b7c-44d9-a57c-ee33f80beecd', 'Mul Chanderi', NULL, NULL, 'Natural', 'Viscose', '58"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:00:56.560331+00', '2025-12-30 17:00:56.560331+00', NULL, NULL, NULL),
	('fa34ebae-9621-4679-ad0e-3dd28bbbd4c6', 'Cotton Flex', NULL, NULL, 'Natural', 'Cotton', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:00:57.656459+00', '2025-12-30 17:00:57.656459+00', NULL, NULL, NULL),
	('c23161a0-9e89-41ec-8960-2043bdfd0d8a', 'Cotton Slub', NULL, NULL, 'Natural', 'Cotton', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:00:58.841237+00', '2025-12-30 17:00:58.841237+00', NULL, NULL, NULL),
	('85a421f0-5cef-44ee-bfbc-39eff98155d9', 'Rayon Slub Lycra', NULL, NULL, 'Natural', 'Rayon', '50"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:00:59.802011+00', '2025-12-30 17:00:59.802011+00', NULL, NULL, NULL),
	('fda9f950-c1a0-403c-a406-837585a48502', 'Rayon Wrinkle Crape', NULL, NULL, 'Natural', 'Rayon', '56"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:00.812009+00', '2025-12-30 17:01:00.812009+00', NULL, NULL, NULL),
	('2e9cb3bd-5417-4d56-9251-57b8da3851b7', 'Weightless', NULL, NULL, 'Natural', 'Poly', '58"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:01.941338+00', '2025-12-30 17:01:01.941338+00', NULL, NULL, NULL),
	('7285ea76-a9dc-448f-9f17-03c93be3b49e', 'BSY Killer', NULL, NULL, 'Natural', 'Poly', '58"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:02.827563+00', '2025-12-30 17:01:02.827563+00', NULL, NULL, NULL),
	('1a79e24c-5990-49b6-aba8-fc59fabcdc4c', 'Orange Wrinkle Chiffon', NULL, NULL, 'Natural', 'Poly', '56"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:03.89493+00', '2025-12-30 17:01:03.89493+00', NULL, NULL, NULL),
	('ba413167-2e12-4cfb-91e5-1c0b7a0f0196', 'Delta', NULL, NULL, 'Natural', 'Poly', '58"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:04.866041+00', '2025-12-30 17:01:04.866041+00', NULL, NULL, NULL),
	('6d4c2e12-a99a-4ec9-af05-2a5897603972', 'Inbox', NULL, NULL, 'Natural', 'Poly', '58"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:05.85843+00', '2025-12-30 17:01:05.85843+00', NULL, NULL, NULL),
	('9c0c6c39-b5e1-4733-b361-e325b4f58ef8', 'Viscose Chinon', NULL, NULL, 'Natural', 'Viscose', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:06.786253+00', '2025-12-30 17:01:06.786253+00', NULL, NULL, NULL),
	('15af01c3-6568-4278-af4e-50ceeeb7eded', 'Natural Crape', NULL, NULL, 'Natural', 'Viscose', '50"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:07.726698+00', '2025-12-30 17:01:07.726698+00', NULL, NULL, NULL),
	('ef06ba7b-0e6e-4143-836e-1a1b8abd5b49', 'Viscose Organza', NULL, NULL, 'Natural', 'Viscose', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:08.672437+00', '2025-12-30 17:01:08.672437+00', NULL, NULL, NULL),
	('bef14e81-3d64-4ff7-9f37-56d2d942fbe3', 'Viscose Muslin', NULL, NULL, 'Natural', 'Viscose', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:09.61113+00', '2025-12-30 17:01:09.61113+00', NULL, NULL, NULL),
	('d2386a87-c485-4207-bfd8-f2485ba743a6', 'Viscose Georgette', NULL, NULL, 'Natural', 'Viscose', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:10.556707+00', '2025-12-30 17:01:10.556707+00', NULL, NULL, NULL),
	('3ccfa5d6-32c4-4874-9236-525e4d7779ad', 'Shimmer Tissue', NULL, NULL, 'Natural', 'Viscose', '58"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:11.520039+00', '2025-12-30 17:01:11.520039+00', NULL, NULL, NULL),
	('7cc24686-8a0b-4d3f-90a4-05834e004746', 'Glass Tissue', NULL, NULL, 'Natural', 'Viscose', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:12.456177+00', '2025-12-30 17:01:12.456177+00', NULL, NULL, NULL),
	('b9689d73-75b1-4359-a29b-3ccf34f470bf', 'Habutai Silk', NULL, NULL, 'Natural', 'Viscose', '58"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:13.369729+00', '2025-12-30 17:01:13.369729+00', NULL, NULL, NULL),
	('0dcc4246-2aa4-492d-90e5-6ea0c78d78f6', 'Gajji Silk', NULL, NULL, 'Natural', 'Viscose', '58"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:14.326503+00', '2025-12-30 17:01:14.326503+00', NULL, NULL, NULL),
	('5b4cdbbf-d0f1-426f-b8a3-1541156ceca8', 'Dola Silk', NULL, NULL, 'Natural', 'Viscose', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:15.28513+00', '2025-12-30 17:01:15.28513+00', NULL, NULL, NULL),
	('8281eb9e-45ff-4f34-98de-dc235dd3d5f0', 'Upada Silk', NULL, NULL, 'Natural', 'Viscose', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:16.267644+00', '2025-12-30 17:01:16.267644+00', NULL, NULL, NULL),
	('7b1de9fa-ea89-467c-9a39-bbd668e780a4', '60 x 60 Cotton', NULL, NULL, 'Natural', 'Cotton', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:17.220464+00', '2025-12-30 17:01:17.220464+00', NULL, NULL, NULL),
	('fae2fa98-178c-42b0-954b-a5b2b7cb20af', 'Cotton Lycra', NULL, NULL, 'Natural', 'Cotton', '58"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:18.176539+00', '2025-12-30 17:01:18.176539+00', NULL, NULL, NULL),
	('50b9080f-0713-4989-a803-9ad0b20bcccb', 'Camric Golk Jari', NULL, NULL, 'Natural', 'Cotton', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:19.10776+00', '2025-12-30 17:01:19.10776+00', NULL, NULL, NULL),
	('c150ba2c-8e40-4a29-86e6-74930329bd77', 'Cotton Mull (100x100)', NULL, NULL, 'Natural', 'Cotton', '36"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:20.007603+00', '2025-12-30 17:01:20.007603+00', NULL, NULL, NULL),
	('4f34c929-ec18-40f2-97c5-aebbcc9d6413', 'Cotton Kota Chex', NULL, NULL, 'Natural', 'Cotton', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:21.354079+00', '2025-12-30 17:01:21.354079+00', NULL, NULL, NULL),
	('b73694e0-f131-4a15-9988-e62c60050a50', 'Cotton Camric (60x60)', NULL, NULL, 'Natural', 'Cotton', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:22.309974+00', '2025-12-30 17:01:22.309974+00', NULL, NULL, NULL),
	('7fb05a17-473d-4d50-90f4-c623360b2008', 'Cora Cotton', NULL, NULL, 'Natural', 'Cotton', '47"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:23.648837+00', '2025-12-30 17:01:23.648837+00', NULL, NULL, NULL),
	('1f415278-277d-469e-a086-6285dc068d95', 'Inner Mull', NULL, NULL, 'Natural', 'Cotton', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:24.574559+00', '2025-12-30 17:01:24.574559+00', NULL, NULL, NULL),
	('c729ee2e-6385-4f7c-b39a-78366899ac5e', 'Cotton Tintin', NULL, NULL, 'Natural', 'Cotton', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:25.541634+00', '2025-12-30 17:01:25.541634+00', NULL, NULL, NULL),
	('90f1e9e3-7806-4b3f-a16f-0ec92ae7112a', 'Cotton Jam Satin', NULL, NULL, 'Natural', 'Cotton', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:26.478725+00', '2025-12-30 17:01:26.478725+00', NULL, NULL, NULL),
	('41ba2860-8be2-47b9-ad77-25ed686d571b', 'Organdi', NULL, NULL, 'Natural', 'Cotton', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:27.477812+00', '2025-12-30 17:01:27.477812+00', NULL, NULL, NULL),
	('1b95afd8-4191-4991-8e90-dd9d4697a6c8', 'Poly Linen', NULL, NULL, 'Synthetic', 'Poly', '58"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:28.401395+00', '2025-12-30 17:01:28.401395+00', NULL, NULL, NULL),
	('14861027-c7d1-4fdb-b9e7-4080dfff1025', 'Poly Cotton', NULL, NULL, 'Synthetic', 'PC', '54"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:29.441673+00', '2025-12-30 17:01:29.441673+00', NULL, NULL, NULL),
	('4142960f-3c2b-43e6-9955-7b5eb4d1d8c8', 'Poly Organza', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:30.372187+00', '2025-12-30 17:01:30.372187+00', NULL, NULL, NULL),
	('55d88852-06ac-4f5c-a469-badd4d29e051', 'Poly Chanderi', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:31.373397+00', '2025-12-30 17:01:31.373397+00', NULL, NULL, NULL),
	('3aaee1dc-4e20-4265-8027-0e440ad568a9', 'Poly Muslin', NULL, NULL, 'Synthetic', 'Poly', '36"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:32.277874+00', '2025-12-30 17:01:32.277874+00', NULL, NULL, NULL),
	('8ffc085b-e1e4-4ab9-8bb4-665fd0828ce9', 'Silk Crape', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:33.191036+00', '2025-12-30 17:01:33.191036+00', NULL, NULL, NULL),
	('88412408-6b59-4e8d-a60c-1539721941f6', 'Japan Satin', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:34.099025+00', '2025-12-30 17:01:34.099025+00', NULL, NULL, NULL),
	('8b314611-f6e0-4b46-ab8c-cecb51cdcabb', 'Satin Georgette', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:35.030561+00', '2025-12-30 17:01:35.030561+00', NULL, NULL, NULL),
	('d45d6478-8422-441b-a59c-be5bfea22125', 'French Crape', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:36.016985+00', '2025-12-30 17:01:36.016985+00', NULL, NULL, NULL),
	('58faf00e-9766-4119-a08b-ca665ad9340f', 'Regular Chanderi', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:36.909921+00', '2025-12-30 17:01:36.909921+00', NULL, NULL, NULL),
	('eb8d4adb-f1ec-44c1-b45b-ba0004453bb9', 'Tabby Silk', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:37.80851+00', '2025-12-30 17:01:37.80851+00', NULL, NULL, NULL),
	('096e7645-ae16-4125-b513-6870324729d2', 'Poly Chinon', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:38.742497+00', '2025-12-30 17:01:38.742497+00', NULL, NULL, NULL),
	('338c1495-c461-4f40-a5db-a0b7fe9d6f58', 'Magic', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:39.639074+00', '2025-12-30 17:01:39.639074+00', NULL, NULL, NULL),
	('726d5e3b-74b8-4a69-87e9-8b1ffe8dd5c4', 'Poly Camric', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:40.616796+00', '2025-12-30 17:01:40.616796+00', NULL, NULL, NULL),
	('abee5112-c7b4-4553-aadc-d268bf4c3cd6', 'Indigo Silk', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:41.539168+00', '2025-12-30 17:01:41.539168+00', NULL, NULL, NULL),
	('5b1c29db-bcc2-415f-b302-ebcbc011f547', 'Poly Rayon', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:42.484663+00', '2025-12-30 17:01:42.484663+00', NULL, NULL, NULL),
	('d4362242-3771-45dd-ab3a-4e2c6778b19c', 'Jute', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:43.375698+00', '2025-12-30 17:01:43.375698+00', NULL, NULL, NULL),
	('a917d9c5-d533-41cc-bbbb-525543a9bff3', 'Khadi Jute', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:44.296499+00', '2025-12-30 17:01:44.296499+00', NULL, NULL, NULL),
	('efaf4309-143c-40ac-9296-207f6ff643f0', 'Poly Popline', NULL, NULL, 'Synthetic', 'Poly', '58"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:45.26684+00', '2025-12-30 17:01:45.26684+00', NULL, NULL, NULL),
	('9480eccf-ec7e-4f7d-8668-42182c75305f', 'Pashmina Twill', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:46.213562+00', '2025-12-30 17:01:46.213562+00', NULL, NULL, NULL),
	('93ed3dbe-b43c-425d-8cb0-caa33e125011', 'Silver Chiffon', NULL, NULL, 'Synthetic', 'Poly', '36"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:47.121702+00', '2025-12-30 17:01:47.121702+00', NULL, NULL, NULL),
	('e177e747-f788-4800-ae11-ee73a1eedcdc', 'Flat Chiffon', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:48.154237+00', '2025-12-30 17:01:48.154237+00', NULL, NULL, NULL),
	('4fcedb0e-4979-49d1-b41b-495985f98dd4', 'African Georgette', NULL, NULL, 'Synthetic', 'Poly', '44"', 100, NULL, NULL, NULL, 'Standard', NULL, NULL, '2025-12-30 17:01:49.077787+00', '2025-12-30 17:01:49.077787+00', NULL, NULL, NULL);


--
-- Data for Name: design_ready_stock; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: design_sets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."design_sets" ("id", "type", "master_design_number", "design_name", "description", "set_photo_url", "created_at", "updated_at") VALUES
	('d8314427-f09e-4bf9-8acd-e5623b05b07e', 'Single', '5001', '', NULL, '', '2025-12-21 17:20:23.768374+00', '2025-12-21 17:20:23.768374+00');


--
-- Data for Name: design_set_components; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."design_set_components" ("id", "design_set_id", "component_type", "design_number", "design_name", "fabric_type", "fabric_id", "fabric_name", "photo_url", "sequence", "created_at", "updated_at") VALUES
	('8cffb3f5-8c72-4a47-96d7-9991c32082dd', 'd8314427-f09e-4bf9-8acd-e5623b05b07e', 'Top', '5001', '', 'Finish Fabric', '6875274a-33a0-4a07-9403-83473210593a', 'Capsule Rayon + Regular + Procion/Reactive + Foil + Printed + Fabric', 'https://zdekydcscwhuusliwqaz.supabase.co/storage/v1/object/public/design-images/1766337607849_3mvh8g.jpg', 0, '2025-12-21 17:20:24.083496+00', '2025-12-21 17:20:24.083496+00');


--
-- Data for Name: design_uploads; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pending_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: dispatch_history; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: drive_synced_files; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: dropdown_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."dropdown_categories" ("id", "category_name", "created_at") VALUES
	('33e89b9a-00c2-4400-823c-2f65af7003f2', 'process', '2026-01-30 12:34:02.852661+00'),
	('05a2d6bb-005e-42dd-bbff-2e3de5ffa433', 'width', '2026-01-30 12:34:02.852661+00'),
	('87c3cf57-3f15-46a6-879a-a433f54470fb', 'base', '2026-01-30 12:34:02.852661+00'),
	('ca682295-b177-4dea-9008-7b42970e10db', 'construction', '2026-01-30 12:34:02.852661+00');


--
-- Data for Name: dropdown_options; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."dropdown_options" ("id", "category", "value", "code", "created_at", "is_active", "option_name", "option_code") VALUES
	('3d032739-9650-478b-a4c0-7583fb8ff1bf', 'process', 'Greige', 'GRG', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('d46d5bbd-8d22-4790-a392-4d784abe7565', 'process', 'RFD', 'RFD', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('206a340a-a75a-4769-81a7-7c23820a3c6b', 'process', 'PFD', 'PFD', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('3d6066d4-f268-452c-a483-e5b0de10be89', 'base', 'Cotton', 'COT', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('1f40206c-7fec-4a00-b297-7a86791ddc4e', 'base', 'Polyester', 'POL', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('459e2adf-133e-48fe-8340-9a8ae525c91d', 'base', 'Nylon', 'NYL', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('cf4a774c-cf40-4265-89d5-65bc02f9eb7d', 'base', 'Silk', 'SLK', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('81121191-da2b-4625-885e-41d132f01880', 'base', 'Linen', 'LIN', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('8a56c34d-6b01-4b2f-b36d-4d7214b9593d', 'base', 'Viscose', 'VIS', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('6239f833-2911-4bc1-8832-1a8d33f0bc2f', 'base', 'Acrylic', 'ACR', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('057da26b-c919-4b5c-908b-12f0f19edc43', 'base', 'Wool', 'WOL', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('3148b710-93e9-4d5d-b77e-7b83b49f7ade', 'construction', 'Plain Weave', 'PW', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('111e5a14-9982-4a84-9e41-a45ed5b9272e', 'construction', 'Twill', 'TW', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('a96bfde1-aa1e-46d5-9690-2c728bb3fa84', 'construction', 'Satin', 'ST', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('eca21d92-2c23-4e67-950c-95706b3c4af4', 'construction', 'Jersey', 'JS', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('c2e8973d-0d3f-4a61-81fa-574610fe1ca6', 'construction', 'Rib', 'RB', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('dfbbf1d2-1446-4981-b958-9627bc36cee6', 'construction', 'Jacquard', 'JQ', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('946959b1-7709-4ea2-80f5-3ac7a405e51e', 'stretchability', 'Rigid', 'RGD', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('24792cc5-1d78-4153-8e1b-9e641363b18a', 'stretchability', 'Mechanical', 'MCH', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('ba42b3a7-b69f-44a3-bca4-e40ae41d4463', 'stretchability', '2 Way', '2W', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('c948a91b-692b-4134-acf5-560c8ee32fb7', 'stretchability', '4 Way', '4W', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('e2bb0f83-9f1a-4196-9723-fe0608b5f9cf', 'transparency', 'Opaque', 'OPQ', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('a3dc1825-ac6a-4687-88bd-d7a212a7d63d', 'transparency', 'Semi Sheer', 'SS', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('df087747-6d62-4b82-9d7d-caef7d1fb443', 'transparency', 'Sheer', 'SHR', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('917fee9e-3aa8-459e-878f-642ccd363a53', 'transparency', 'Blackout', 'BLK', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('ec5b76a8-9c47-41c7-9a09-e863ff23fccc', 'handfeel', 'Soft', 'SFT', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('ca327f49-db7e-4fae-b7a1-b9befcbbae18', 'handfeel', 'Crisp', 'CRP', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('e081438d-7d93-4c14-b0a4-96654ba21799', 'handfeel', 'Dry', 'DRY', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('220e6cb4-0fd8-4c11-9ad2-97d0b0fff20c', 'handfeel', 'Silky', 'SLK', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('92668fb2-9b7a-4d17-b24a-b6f7515492c7', 'handfeel', 'Rough', 'RGH', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('b6f6ef47-d770-442d-8965-a5b2a9171b59', 'handfeel', 'Paper-touch', 'PT', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('3cf009a6-148b-4b89-821f-bddb0fc045f0', 'yarn_type', 'Spin', 'SPN', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('8066c462-866a-40db-9e78-be2f1618dc82', 'yarn_type', 'Filament', 'FLM', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('68b13ad0-ab43-401b-8a1c-b943a6cac299', 'yarn_type', 'Textured', 'TXT', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('4032fe55-9a84-442c-95af-8b0791c2379b', 'yarn_count', 'Natural Base', 'NB', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('9f1ede2f-303a-4086-9350-4693b8134a08', 'yarn_count', 'Synthetic Base', 'SB', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('9b8d5bbe-6886-4aab-b42e-4c0482e3f7f2', 'yarn_count', 'Semi-Synthetic', 'SS', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('fbce9740-76d3-42c9-a995-95ba9170a0ac', 'yarn_count', 'Blend Base', 'BB', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('2c8d419d-cfb9-428f-9e07-873042342e43', 'process_type', 'Mill Print', 'MP', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('0a74f322-f380-40e0-be5d-9f69bc8d0a9d', 'process_type', 'Digital Print', 'DP', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('92c90198-ed8b-4b7b-9a17-69b9fb21bd9d', 'process_type', 'Dyed', 'DYD', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('8d86f721-e7aa-46c8-a4bb-261d03f7f585', 'process_type', 'Pigment Table', 'PT', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('e8c1c835-0762-4914-8936-7aa5a2cf8c9b', 'process_type', 'Block', 'BLK', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('52f9756c-739b-4b06-bafa-8182fe448dda', 'process_type', 'ODP', 'ODP', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('0e07996f-d2a5-413e-bb17-88defc67f349', 'process_type', 'Sublimation', 'SUB', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('b7bfa0fa-5f83-4b1f-99e6-bc528939b65c', 'process_type', 'Direct', 'DIR', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('82c2bfa9-4935-4705-8383-e3b41eb31bcb', 'dye_used', 'Dye Used', 'DU', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('6a70ab88-1da0-4f6b-b7dc-484fbbb7b3c2', 'dye_used', 'Pigment Dye', 'PD', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('5c2a7638-9741-42e0-b97a-04bf3f103f78', 'dye_used', 'Reactive Dye', 'RD', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('0e1e3880-b987-45fe-b577-6f357a83cf15', 'dye_used', 'Discharge Agent +', 'DA', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('a904c5ff-6fde-43f3-b006-d7eb2b483a91', 'dye_used', 'Disperse Dye', 'DD', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('e59f6672-9f5f-4abf-bc2f-17dfa2df4748', 'dye_used', 'Binder (Glue) + Foil', 'BF', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('2cbab956-6160-4d3f-9235-bde13b6795b1', 'class', 'Mercerized finish', 'MRC', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('54d3f18a-2047-4d61-93c9-f30d9d365ac3', 'foil_tag', 'Foil tag', 'FT', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('0d9592b0-dbcf-4b6e-b7b6-7e70f39d6f44', 'foil_tag', 'Without Foil', 'WF', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('0a272291-b42a-4d6c-a125-40a8a50ef05a', 'finish_type', 'Bio Wash', 'BW', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('7c0a991c-2b99-4480-bc32-a9f488615992', 'finish_type', 'Silicon Finish', 'SF', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('366c926e-30dc-47aa-8f4d-478c3535638d', 'finish_type', 'Wicking', 'WCK', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('64c351fc-d96e-4fc7-bde9-53a37daf9936', 'finish_type', 'Water Repellent', 'WR', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('74a442bf-29bd-4a9b-bf8a-78432804af1f', 'finish_type', 'Anti-Microbial', 'AM', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('1d554614-fa36-4ba1-8890-ba3212013418', 'finish_type', 'Peached (Sanded)', 'PCH', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('0095e6cc-a875-4c46-af20-dc876856adaa', 'finish_type', 'Lurex/Foil', 'LF', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('e252388a-cbe5-4a1d-a3a3-9f9ea76fdc60', 'va_category', 'Hakoba', 'HAK', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('89c774cb-ef32-4da0-8249-02a93b5705a9', 'va_category', 'Embroidered', 'EMB', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('72f69f1a-8c88-49e3-8337-09b163cbf8d1', 'va_category', 'Handwork', 'HND', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('2d04ed7a-ffe3-448f-b927-98f88e3803d7', 'va_category', 'Foil', 'FIL', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('9d333835-58c4-4e45-bc37-5e8b0b1d8482', 'va_category', 'Gold', 'GLD', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('20230653-7c34-4f8b-a672-63089e48ba58', 'va_category', 'Glitter', 'GLT', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('a14c4519-44e3-49fd-a715-3c4f544411f1', 'va_category', 'Crush/Pleated', 'CRP', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('2e96ed2b-b341-4f6c-adf6-080a2345de74', 'va_category', 'Pleated', 'PLT', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('0e883d88-d867-4a48-a79c-ec9899df79a8', 'va_category', 'Deca', 'DEC', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('bd820662-fd3b-46e0-92ea-92c56874ed0a', 'va_category', 'Washing', 'WSH', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('ef347859-eada-40b3-9f09-934f371ecfcb', 'class', 'Regular', 'REG', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('84cb211f-f56d-4725-b218-1d40f9734f80', 'class', 'Premium', 'PRM', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('6b216171-d1aa-4e05-bad7-42545e78fa61', 'finish_type', 'Mercerized finish', 'MRC', '2026-01-29 18:16:00.569232', true, NULL, NULL),
	('0a4bf4d6-1d40-49e0-9019-d5919a23928c', 'base', 'Blend Base', 'BLB', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('e1ec47d2-5940-4ea7-b27e-5a6d8209fd71', 'base', 'PV', 'PV', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('5990ee6a-484a-4356-a39a-395b3d89695a', 'base', 'NV', 'NV', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('151d724e-b726-4f52-ab6b-e0b7efc0baf5', 'base', 'PC', 'PC', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('05fc3fd4-4f44-4832-94b3-bfd7408bb89f', 'base', 'Rayon x Poly', 'RXP', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('23c1cf14-39c3-4ddb-becf-030817668f5e', 'base', 'Semi-Synthetic', 'SS', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('8fb563fb-3f2f-448b-8f8f-fb2e760779dc', 'base', 'Rayon', 'RAY', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('4f7434b4-0143-409a-b9a7-e8b3867acc6f', 'base', 'Modal', 'MOD', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('d930bf26-f9fb-428e-bcef-a18adf100ad2', 'base', 'Natural Base', 'NB', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('53b08b06-dd7a-4b8e-85c1-1d324c4d0f23', 'base', 'Hemp', 'HMP', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('938d7bfe-1fa9-43f1-90a0-b95322d7ca4d', 'gsm_tolerance', '±2%', 'T2', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('05741d13-e9fa-4650-acdd-0ebf1d5caad8', 'gsm_tolerance', '±3%', 'T3', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('795c5fbb-a233-4d54-9ef6-4f0c3d871fbe', 'gsm_tolerance', '±5%', 'T5', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('7e596f9d-657d-4f8b-8e7d-99a3889158af', 'gsm_tolerance', '±10%', 'T10', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('25ffb94a-e0ce-4977-89cb-9591f6644eb8', 'construction', 'Woven', 'WVN', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('20e8261f-362a-4d82-be93-4d7825e80cd4', 'construction', 'Twill/Drill', 'TWL', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('b4234fec-0d03-49ef-8288-9f2eebc3a48e', 'construction', 'Dobby', 'DOB', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('6ca86822-54e5-4fb6-834c-fa0c4ec3d37c', 'construction', 'Canvas', 'CAN', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('54ce8c7e-2656-4cc3-b52c-af127756c0d2', 'construction', 'Voile', 'VOL', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('46502424-94b9-4fe3-bf39-1c7cd6801f6e', 'construction', 'Georgette', 'GEO', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('dec2c50d-7c03-4a56-b430-43a6312ec737', 'construction', 'Crepe', 'CRP', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('8b27ce9f-96e0-415b-adbd-5addf01cd533', 'construction', 'Organza', 'ORG', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('260f7838-63f3-4d3d-a760-155fa3df3708', 'construction', 'Chiffon', 'CHF', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('c6ec1eea-669f-4491-92e6-d83244aeed01', 'construction', 'Velvet', 'VEL', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('8d8cd4b3-773c-465d-ba13-61e833d25e1b', 'construction', 'Knitted/Jersey', 'KNJ', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('796b7d70-5a29-463c-9fcc-d87611ad8306', 'construction', 'Knitted', 'KNT', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('d353ff84-b663-4fb3-a89b-794fe1f9fce2', 'construction', 'Single Jersey', 'SJ', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('c4ad96d5-dbe8-4e4c-a59d-dc20617a5af0', 'construction', 'Interlock', 'INT', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('e2aaac38-9e89-4ccb-a1ed-1f441cbdf278', 'construction', 'Pique', 'PIQ', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('8c807e57-0e6e-4606-8e3e-f047d79274d4', 'construction', 'French Terry', 'FT', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('10c5105b-d472-4383-ab87-ae904c8bf74a', 'construction', 'Fleece', 'FLC', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('09d1cb27-88ca-43e4-918e-e3674ece5e9f', 'construction', 'Non Woven', 'NW', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('cbb00a0f-9757-4acc-b80d-d2f83e539e75', 'process_type', 'RFD', 'RFD', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('0447267b-5f3b-4ed5-8504-0e98b2d6ea9d', 'va_sub_hakoba', 'Semi Dull Poly', 'SDP', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('d8a6fba4-e892-4b20-a585-6c6d73068fff', 'va_sub_hakoba', 'Full Dull Poly', 'FDP', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('06b3de5a-f43b-43b6-a4ed-27ac65134ad6', 'va_sub_hakoba', 'Cotton', 'COT', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('0949ac90-e0c5-4d8c-ba9e-5a60b7d75c74', 'va_sub_hakoba', 'Eyelet/Borer', 'EYE', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('90c22633-430a-49eb-b6de-58f42adb8cae', 'va_sub_hakoba', 'Sequins (Sitara)', 'SEQ', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('ba6e1c8a-5c32-4d38-88fc-d3699820c4f0', 'va_sub_hakoba', 'Multi Thread', 'MT', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('285aba6b-c028-4c72-a31e-31ff77cf6d54', 'va_sub_hakoba', 'GPO', 'GPO', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('42eec868-c0f2-46d5-ae78-e0adff04412c', 'va_sub_embroidered', 'Poly', 'POL', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('04977926-b9d9-42ad-bae2-3b009d8c980a', 'va_sub_embroidered', 'Nylon', 'NYL', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('be05dd4d-4f9f-401f-aac7-2f4a80ee582b', 'va_sub_embroidered', 'Viscose', 'VIS', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('1867d03c-82d2-4395-ac82-d464bac91d31', 'va_sub_embroidered', 'Cotton', 'COT', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('f8f4eb18-5cc7-47d6-8c4e-e473ea1578a5', 'va_sub_embroidered', 'Multi Thread', 'MT', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('8aa29d44-cd6e-4d71-a4f2-3f76cd2049fc', 'va_sub_embroidered', 'Sequins (Sitara)', 'SEQ', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('89799842-227a-47d0-9f3a-081adf7c0465', 'va_sub_embroidered', 'Cording', 'COR', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('1e7e7e63-c850-45ae-824a-db76dd4d036f', 'va_sub_embroidered', 'Chain Stitch', 'CHS', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('3150afd7-0361-45ac-a2a6-40237e72c8e6', 'va_sub_embroidered', 'Applique', 'APP', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('8acd80ad-5030-4dc4-a9b3-e31ab7627b94', 'va_sub_embroidered', 'Beads', 'BDS', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('8ebeab30-9daf-48df-838e-01ca1a7a29ef', 'va_sub_embroidered', 'Laser Cutting', 'LSR', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('3119c13a-e67c-4e34-b455-f011b7c45693', 'va_sub_embroidered', 'Cutwork (Scalloped Edge)', 'CUT', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('d4805d93-f5fa-4b84-a871-76a0a8b2b257', 'va_sub_embroidered', 'Flat Embroidery', 'FLT', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('f9090150-70ce-4d47-9be3-571081d7e784', 'va_sub_handwork', 'Khatli (Aari)', 'KHA', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('42637d47-df55-4384-a6ee-192722a7cdd7', 'va_sub_handwork', 'Zardosi', 'ZRD', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('a1fb4e8e-77c7-4638-bcfd-a10c7a2a881f', 'va_sub_handwork', 'Gota Patti', 'GTA', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('abb161eb-2be8-440f-b402-51ee437929c1', 'va_sub_handwork', 'Mirror (Real)', 'MRR', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('57d31c7f-c270-497b-92c2-b766753d253e', 'va_sub_handwork', 'Mirror (Foil)', 'MRF', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('4786d038-3716-4cb3-b8de-f357a1055f73', 'va_sub_handwork', 'Cutdana', 'CUT', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('4212d9d2-3172-4c63-88dd-a5f3742d1699', 'va_sub_handwork', 'Stone/Hotfix', 'STN', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('ee38c397-0616-4b54-95bd-925cf8eeb271', 'va_sub_handwork', 'Pearl/Moti', 'PRL', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('065bbea0-1e35-41a8-a359-102963e49060', 'va_sub_handwork', 'Mix Work', 'MIX', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('484b89e4-99d3-4e08-8c78-33578d54ea2f', 'va_sub_washing', 'Silicon Wash', 'SW', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('24f954b1-f5f3-4a84-a7f2-48cfac250ae7', 'va_sub_washing', 'Enzyme Wash', 'EW', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('2a91cd35-5a46-4f17-923f-cec6f341f957', 'va_sub_washing', 'Stone Wash', 'STW', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('83a11147-09c7-43bd-98ac-d55d92324dc1', 'va_sub_washing', 'Acid Wash', 'AW', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('0f565e98-138e-4b44-a051-f1181fe9ae6c', 'va_sub_washing', 'Chemical Wash', 'CHW', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('49315267-7c52-40da-ae71-57e28eb0ccb6', 'va_sub_washing', 'Soft Wash/Softener', 'SFW', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('147aba77-53b7-4398-b7a5-750550a88ce6', 'va_sub_washing', 'Garment Wash (Normal)', 'GWN', '2026-01-29 18:50:32.695796', true, NULL, NULL),
	('0208af33-df37-4bdb-a681-bc85197a20a9', 'base_width', '28"', '28', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('96a2bd69-11d2-42c8-b848-9efddc2b54fc', 'base_width', '36"', '36', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('9092a3e6-a2f0-4f76-9d21-6981581fd5a8', 'base_width', '44"', '44', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('52374f12-9712-49e9-899a-7c447af38350', 'base_width', '48"', '48', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('13d8ab0d-aa45-472b-b801-9aefb630a379', 'base_width', '54"', '54', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('a731f697-7562-4044-b73f-943b4ded3e43', 'base_width', '58"', '58', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('19c8b356-d0de-4f33-95f6-ad3d9b0b61c3', 'base_width', '68"', '68', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('87c04c1d-26ae-4cef-949e-f61a8129c7b5', 'base_width', '72"', '72', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('56c76b09-b3a0-420d-bf87-eeff88e23cd9', 'finish_width', '28"', '28', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('25f7982f-eb44-4362-b2c1-bfdabdc82f92', 'finish_width', '36"', '36', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('64ac74a5-414e-4608-ae38-45bcfcc73efd', 'finish_width', '44"', '44', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('f6a0b01f-5bd6-49e0-b380-8e9a6db20820', 'finish_width', '48"', '48', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('5be1f1a7-0630-4580-86f9-8d37907dd44e', 'finish_width', '54"', '54', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('611c4267-ec77-4318-a378-577ca5f14c31', 'finish_width', '58"', '58', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('7ee7d81e-ebad-45c7-bd41-e266b880990a', 'finish_width', '68"', '68', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('d6109d77-1401-4ecd-a520-f926bb48adee', 'finish_width', '72"', '72', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('31226195-c880-4725-986d-5b36132c0398', 'work_width', '28"', '28', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('b02a01be-47d1-4506-b633-e2f78ef3523b', 'work_width', '36"', '36', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('b5788604-87d3-4e14-8026-f73b3eb91f7a', 'work_width', '44"', '44', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('09231d5e-8042-42df-83bd-efcd6a7a2316', 'work_width', '48"', '48', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('79c20a34-ec62-43f5-a2cb-2b800d79d2d2', 'work_width', '54"', '54', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('8e8254f4-e0fe-408b-8682-b32a1379d763', 'work_width', '58"', '58', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('0e7de9d3-eda1-420b-9b8d-d61495e35511', 'work_width', '68"', '68', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('cf9045fa-eab8-4df9-88d1-07cc6569a0f5', 'work_width', '72"', '72', '2026-01-29 19:07:28.228806', true, NULL, NULL),
	('00000000-0000-0000-0000-000000000001', 'test_category', 'Test Value', 'TV', '2026-01-29 20:41:44.092905', true, NULL, NULL),
	('99b3227e-c4c4-45e6-b1ad-fa3568af1b40', 'Process', 'Greige', 'GRG', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('4a5d4af5-c7e9-45e9-ad1b-9c39da196d81', 'Process', 'RFD', 'RFD', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('b8598758-7a55-4076-88fb-e42e3c6ec16f', 'Process', 'PFD', 'PFD', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('4aeebf00-40cc-4bbf-9d5c-fd0c906a00aa', 'Width', '28"', 'W28', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('2b2fcd7c-1985-40b2-bc15-1882064c529c', 'Width', '36"', 'W36', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('988dfcb1-9303-4f24-ae3b-bed17062f540', 'Width', '44"', 'W44', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('7eaeddae-05a0-4eda-a254-e3796632da1d', 'Width', '48"', 'W48', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('f1895454-50d6-4b8f-8bb9-77315182b65d', 'Width', '54"', 'W54', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('fe07d132-d999-4a9c-9039-217257088b53', 'Width', '58"', 'W58', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('678a9ca6-10b5-4085-95f9-f730ccffa9c0', 'Width', '68"', 'W68', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('403ed4ee-e0ab-422c-be52-120fb0c8a29a', 'Width', '72"', 'W72', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('351e1e91-b8af-4209-992a-90c122dcbc6e', 'Base', 'Cotton', 'COT', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('3dbe49d0-42f7-4f64-85c0-212466ac0f8b', 'Base', 'Polyester', 'PES', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('8b76b3a1-5edb-40a7-bbee-bab9b6b94c08', 'Base', 'Nylon', 'NYL', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('75eb213e-b6c6-4756-ac2c-5ca8e2f4d9b5', 'Base', 'Viscose', 'VIS', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('b2694db7-9b72-4cf6-b2e4-93d14c610023', 'Base', 'Rayon', 'RAY', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('15d8fa79-bd96-48cb-9213-b24eedb28f42', 'Base', 'Modal', 'MOD', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('668e4c07-aa63-468f-acab-f1be4f5d0361', 'Base', 'Silk', 'SLK', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('ab9aa246-8307-42f6-ba70-68389cf934d0', 'Base', 'Wool', 'WOL', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('d7ca0420-5e80-4ae5-883f-5e18f94c8bd4', 'Base', 'Hemp', 'HMP', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('2b12ae7a-408a-405e-84cd-bf39d1c373e6', 'Base', 'Linen', 'LIN', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('51d66137-80c1-4475-b769-ef8f89841d61', 'Base', 'PV', 'PV', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('9410e1d6-97c2-4236-afb4-820eb2791c2f', 'Base', 'PC', 'PC', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('1ffe4a82-89d8-4bca-8d5b-489859b002d5', 'Base', 'NV', 'NV', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('038ee55d-5ed8-4edb-8229-3451bdbd7395', 'Base', 'Synthetic Base', 'SYN', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('45dfdbb8-0770-475e-af96-cd11d23b17f3', 'Base', 'Semi-Synthetic', 'SEMI', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('ee59c494-d992-4aa9-8f32-5842221c1b1d', 'Base', 'Blend Base', 'BLD', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('83e4faa6-7a42-49d9-8f2d-96903097cd8e', 'Base', 'Natural Base', 'NAT', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('80f9d175-83bf-4fa1-b0b5-4d7c08d8a0ab', 'Construction', 'Plain Weave', 'PW', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('ca45d584-0c4e-4322-8b32-b04cc2ebfe80', 'Construction', 'Twill', 'TWL', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('6e87d64d-21fe-4a37-9b13-e5b86028ee08', 'Construction', 'Satin', 'SAT', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('f0d1033c-9a8c-46c3-9549-ef3a20f57dce', 'Construction', 'Dobby', 'DOB', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('dde8f63f-372b-46be-88a3-82b2d9d21b25', 'Construction', 'Jacquard', 'JAC', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('15378ae9-5249-4b37-870f-832459e8eba1', 'Construction', 'Canvas', 'CAN', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('3192433c-76c4-486f-911e-b1136f361f00', 'Construction', 'Voile', 'VOL', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('831fdb58-2b41-464e-ba4a-dc4fef687c1f', 'Construction', 'Georgette', 'GEO', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('83721013-6218-417d-b8ec-872f70663e55', 'Construction', 'Crepe', 'CRP', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('69c02589-c44d-4e53-8b83-bfdc1e5bb748', 'Construction', 'Organza', 'ORG', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('26176ea0-ca7c-42f1-9c10-e0b886223981', 'Construction', 'Chiffon', 'CHF', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('bc3b6aad-733c-4fac-b484-f2409ef4e240', 'Construction', 'Velvet', 'VEL', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('e70df4e3-c691-417e-8775-2bf1b2f740fb', 'Construction', 'Knitted', 'KNT', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('357eeff7-0caf-4735-a94b-f78af91b5837', 'Construction', 'Jersey', 'JER', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('d70e2680-2793-4fa7-b75a-8e75430e5f69', 'Construction', 'Interlock', 'INT', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('30954e88-a3cb-44d5-9f24-74d3c07151ba', 'Construction', 'Rib', 'RIB', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('522bd508-9c94-42db-9415-d463646ad1b1', 'Construction', 'Pique', 'PIQ', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('3579f034-7b5d-429c-94fc-ce8f7065b8d6', 'Construction', 'French Terry', 'FT', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('8e461023-8a3f-48b4-8558-ae6ae39c660b', 'Construction', 'Fleece', 'FLC', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('316af742-f59d-40f4-89a3-114a82a37bb2', 'Construction', 'Non Woven', 'NW', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('911ee7a3-9a4d-4315-afe5-df68339fd544', 'Stretchability', 'Rigid', 'RGD', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('6ea593d9-6d92-43c8-96e2-47b54367611c', 'Stretchability', 'Mechanical', 'MEC', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('6222c7ca-6608-4ed6-923d-0f3d94261c85', 'Stretchability', '2 Way', '2W', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('6c8e4b30-4a06-46e3-8db8-b641d419e3cd', 'Stretchability', '4 Way', '4W', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('194a3e1c-361a-464c-9e50-46579ad0fbeb', 'Transparency', 'Opaque', 'OPQ', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('2203dc79-00ab-4db6-a853-b5e1d7b9aebb', 'Transparency', 'Semi Sheer', 'SS', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('162c51ed-044e-4ace-9a4c-2fd476204821', 'Transparency', 'Sheer', 'SHR', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('a7927915-ba8d-436b-8f6d-21d317eb7c8a', 'Transparency', 'Blackout', 'BLK', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('f401f610-2a1d-4941-b0b4-026485614b4b', 'Handfeel', 'Soft', 'SFT', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('58d7a2b7-b705-4a1e-8e12-0365a3a4739f', 'Handfeel', 'Crisp', 'CRP', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('b1f0dc89-41da-4189-9e74-4fd63d2aaebd', 'Handfeel', 'Dry', 'DRY', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('34c2a37d-faca-42a8-84f6-ea28d190f6fc', 'Handfeel', 'Silky', 'SLK', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('74d94b0a-a2ec-44e4-aa60-bca056e6fad2', 'Handfeel', 'Rough', 'RGH', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('d4a8f876-794b-4a9a-a18d-7818ec8b8dca', 'Handfeel', 'Paper-touch', 'PT', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('dd743f8e-8c00-4f74-abb4-ec63023e01b5', 'Yarn Type', 'Spun', 'SPN', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('6a29e569-a3bd-46de-ba67-05dc97fad5fb', 'Yarn Type', 'Filament', 'FIL', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('e5f689be-12da-43b9-9fb6-f9b5286b0dc3', 'Yarn Type', 'Textured', 'TEX', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('1907639d-e6c1-4e92-8a4d-5a293389e65f', 'Process Type', 'Mill Print', 'MP', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('7efef1da-f7e6-4e44-aaa8-c7c193bd78e2', 'Process Type', 'Digital Print', 'DP', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('9511ea69-eac7-4c23-b0ca-28e5c6a7e0b4', 'Process Type', 'Dyed', 'DYD', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('680eeb32-6a8f-4d47-b599-6c6b40d61db6', 'Process Type', 'RFD', 'RFD', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('43e278ff-2669-4d14-968e-cdf0fd18de1b', 'Process Type', 'Pigment Table', 'PGM', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('50bb6fb5-e0a5-476b-8bf7-289a28825b3a', 'Process Type', 'Block', 'BLK', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('ae8cd722-228f-47e2-a0e6-7ca752ede27b', 'Process Type', 'ODP', 'ODP', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('f0468b92-162b-46e6-866f-f93a675e6961', 'Process Type', 'Sublimation', 'SUB', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('cdfd39c7-f410-47f8-bf81-e1187a14a2ef', 'Process Type', 'Direct', 'DIR', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('a682d60a-e39e-4fda-ba43-311b9ef01a2f', 'Dye Used', 'Dye Used', 'DYE', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('2dbde48b-04aa-4048-94d3-ae42991cb293', 'Dye Used', 'Pigment Dye', 'PIG', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('4df442aa-c1a7-4616-8757-ef2b49b13558', 'Dye Used', 'Reactive Dye', 'REA', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('540753e3-e96e-4f43-8aeb-cc48b1f32b3b', 'Dye Used', 'Discharge Agent', 'DIS', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('68ce9f5f-412c-46da-848c-664538b64182', 'Dye Used', 'Disperse Dye', 'DIS', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('b10575f7-4431-4f77-b781-59b0f35a02f2', 'Dye Used', 'Binder/Foil', 'BND', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('62de18ca-0ddb-459f-806c-fb37f499966f', 'Class', 'Regular', 'REG', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('8bf6e218-66ea-4d6f-b23e-bd393613aa50', 'Class', 'Premium', 'PRM', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('209779af-11e9-4ced-b4d2-48ea9d855a44', 'Class', 'Mercerized', 'MER', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('6868e45e-6190-45fa-a06b-af10a51b26d5', 'Foil Tag', 'Foil', 'FOL', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('71488b59-5736-4a1d-8a17-c0140eb589f6', 'Foil Tag', 'Without Foil', 'WF', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('4d06f429-5d0f-43a5-985a-313b6b2b31db', 'Finish Type', 'Bio Wash', 'BW', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('f221af7f-8de0-4811-a555-7a5eb3c670c4', 'Finish Type', 'Silicon Finish', 'SF', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('e1e26091-8862-4402-8e51-804a24208f3f', 'Finish Type', 'Mercerized', 'MER', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('9cc2ddbc-5c84-4122-a7ab-6e2c579dfce0', 'Finish Type', 'Wicking', 'WCK', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('cb87da26-39f1-4ce9-b07f-1381311e14ee', 'Finish Type', 'Water Repellent', 'WR', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('1ad39318-ac13-4da8-8df7-d0c0efeee5d3', 'Finish Type', 'Anti-Microbial', 'AM', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('5109da5b-23e0-4ed2-b91f-28acf47ba593', 'Finish Type', 'Peached', 'PCH', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('b739caca-155e-40a2-9e56-50d440867de3', 'Finish Type', 'Lurex/Foil', 'LF', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('ffc15ada-b8ec-46d8-827c-d41f3d2d55d3', 'VA Category', 'Hakoba', 'SCH', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('a7b7082d-c9fc-40c0-bc54-b6bcd4e9e2d7', 'VA Category', 'Embroidered', 'EMB', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('a7febd1f-a5ec-4fb2-82c3-7729ab24091b', 'VA Category', 'Handwork', 'HW', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('ea15b536-4303-47c3-a82d-a7df7c2d53fa', 'VA Category', 'Foil', 'FOIL', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('31f0fb4e-5d46-44f3-a559-a92f23010997', 'VA Category', 'Gold', 'GLD', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('1a9bba4d-79b0-434c-b6bf-8b1d26dde39d', 'VA Category', 'Glitter', 'GLT', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('90d3d841-51d0-42a7-abec-f88299b2d48c', 'VA Category', 'Crush/Pleated', 'CRH', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('5a383428-66c9-4eef-b264-b9f5387ae7e5', 'VA Category', 'Pleated', 'PLT', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('4fb49e15-90af-49c0-bab3-3990ad1bc9cf', 'VA Category', 'Deca', 'DEC', '2026-01-30 08:46:58.107858', true, NULL, NULL),
	('09d75929-f831-4a8c-baa7-78389e5c3e91', 'VA Category', 'Washing', 'WSH', '2026-01-30 08:46:58.107858', true, NULL, NULL);


--
-- Data for Name: email_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: expense_hsn_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: fabric_aliases; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: fabric_costs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: fabric_designs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: fabric_images; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: item_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."item_types" ("id", "name", "description", "icon", "color", "status", "created_at", "updated_at") VALUES
	('500b1a1c-fafd-4241-a66d-b397e1299038', 'Base Fabric', 'Raw fabric material used as a base', 'Layers', 'blue', 'active', '2025-12-21 01:27:47.739653+00', '2025-12-21 01:27:47.739653+00'),
	('834b430b-8511-446f-aaf0-227af59b8894', 'Finish Fabric', 'Processed and finished fabric ready for sale', 'Palette', 'green', 'active', '2025-12-21 01:27:47.739653+00', '2025-12-21 01:27:47.739653+00'),
	('a879fedb-8d18-40bf-af0d-73c57d9aaae7', 'Finish Fabric with Value Addition', 'Fabric with added value like embroidery or handwork', 'Sparkles', 'purple', 'active', '2025-12-21 01:27:47.739653+00', '2025-12-21 01:27:47.739653+00');


--
-- Data for Name: fabric_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: fabric_item_completion; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: fabric_masters; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: fabric_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: process_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."process_types" ("id", "process_name") VALUES
	('6efb39c7-c801-4b54-a68e-9c51d2eb4c69', 'Solid (Dyed)'),
	('8213fdea-ac7b-4acb-a63a-74f01a660533', 'Printed'),
	('cedf60b3-c0b6-4496-9a41-29640747df3f', 'Digital'),
	('ec0abbac-c1f9-424b-b5ff-ed8cae356709', 'Hakoba'),
	('e77acd94-e774-43e1-9a9f-c5148d5a3a7f', 'Embroidery'),
	('11357ebb-d880-4c03-8907-60c3cbb08f9c', 'Jaquard'),
	('2e352f47-6150-4b46-813b-0ece9a9defc1', 'Handwork'),
	('c871b7bc-fd5a-48cc-bbb9-6afbea57d072', 'Value Addition');


--
-- Data for Name: process_subtypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."process_subtypes" ("id", "process_type_id", "subtype_name") VALUES
	('d2a701bb-a5ae-45b6-9936-ace9c8a8721a', '8213fdea-ac7b-4acb-a63a-74f01a660533', 'Procion/Reactive'),
	('089aafa4-b409-4320-94b4-5caf18dabba6', '8213fdea-ac7b-4acb-a63a-74f01a660533', 'Discharge'),
	('c9caedf5-2fd8-4dba-ab6c-88e024cfd27c', '8213fdea-ac7b-4acb-a63a-74f01a660533', 'Digital'),
	('c06a4a58-f7cb-431e-bc67-b6760edb7f0e', '8213fdea-ac7b-4acb-a63a-74f01a660533', 'Block'),
	('eab6e5e4-9db6-45e3-b37a-d9409d70e9d9', '8213fdea-ac7b-4acb-a63a-74f01a660533', 'Foil');


--
-- Data for Name: fabric_specifications; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: warehouse_locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."warehouse_locations" ("id", "location_name", "capacity", "current_usage", "created_at") VALUES
	('c8dfb00f-2460-48bb-964f-eb2af7f830a9', 'Main Warehouse', 10000, 0, '2025-12-30 17:00:48.300874+00');


--
-- Data for Name: fabric_stock; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."fabric_stock" ("id", "fabric_id", "warehouse_location_id", "ready_stock", "wip_stock", "damage_stock", "last_updated_date", "created_at") VALUES
	('dca503b7-1181-4b1a-810f-e3b5f2e5b471', '3e48de18-c3d5-488e-b72c-9c2d101eaa3f', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:00:49.348428+00', '2025-12-30 17:00:49.348428+00'),
	('3f60ac7c-3c10-41ce-b106-97a3def73592', 'f22e5979-79b9-43df-a7f5-00525532d943', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:00:50.687297+00', '2025-12-30 17:00:50.687297+00'),
	('340cd5b4-0d69-4b36-90b4-9659ef7f2c1a', '7ce8174b-c4dc-4c69-b983-b3807eba4b25', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:00:52.090277+00', '2025-12-30 17:00:52.090277+00'),
	('3bf9f663-ef8e-48df-925a-63793974dabc', '1907cbf5-d6b2-4007-9477-5ece9892d5f6', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:00:53.034104+00', '2025-12-30 17:00:53.034104+00'),
	('4c333449-6c4c-4654-874d-39fd5697f4cc', '8e834e86-c73f-4c27-80fe-e042c935f43a', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:00:53.9374+00', '2025-12-30 17:00:53.9374+00'),
	('28bdb345-68c3-4337-814c-328047c96a24', '354d260f-21a7-4b8c-b064-d5af1dc2c628', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:00:55.1913+00', '2025-12-30 17:00:55.1913+00'),
	('155a64f3-45fe-429a-9d52-e9536d2cfebf', 'c98e92ba-bb5d-4d25-9922-6df433ce1a41', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:00:56.104361+00', '2025-12-30 17:00:56.104361+00'),
	('5fad1826-6a18-41f2-b9f7-890b3825e872', '19808cd5-9b7c-44d9-a57c-ee33f80beecd', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:00:57.00778+00', '2025-12-30 17:00:57.00778+00'),
	('e302c8e5-4bba-49d9-b7c9-a8f0aab2b1c8', 'fa34ebae-9621-4679-ad0e-3dd28bbbd4c6', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:00:58.292601+00', '2025-12-30 17:00:58.292601+00'),
	('fbedb166-8ce2-4fe2-b7a6-e62188017a78', 'c23161a0-9e89-41ec-8960-2043bdfd0d8a', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:00:59.326271+00', '2025-12-30 17:00:59.326271+00'),
	('aff02933-7891-4758-90d4-0205ac985751', '85a421f0-5cef-44ee-bfbc-39eff98155d9', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:00.335532+00', '2025-12-30 17:01:00.335532+00'),
	('fa3efe4e-bcf7-4f10-a7d2-38635eeec65c', 'fda9f950-c1a0-403c-a406-837585a48502', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:01.320168+00', '2025-12-30 17:01:01.320168+00'),
	('e0cd0102-7e57-4cab-955f-0769bf521530', '2e9cb3bd-5417-4d56-9251-57b8da3851b7', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:02.392827+00', '2025-12-30 17:01:02.392827+00'),
	('9a375335-c187-46a2-97dd-59cdbedb6ba5', '7285ea76-a9dc-448f-9f17-03c93be3b49e', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:03.275379+00', '2025-12-30 17:01:03.275379+00'),
	('9c1c5e8b-a7a3-498b-96e7-045275bcc565', '1a79e24c-5990-49b6-aba8-fc59fabcdc4c', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:04.406963+00', '2025-12-30 17:01:04.406963+00'),
	('3f47ef90-57d9-43a8-832a-9cc05b365d6b', 'ba413167-2e12-4cfb-91e5-1c0b7a0f0196', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:05.313689+00', '2025-12-30 17:01:05.313689+00'),
	('a5091781-ae4c-444b-a525-fa4e7c84f181', '6d4c2e12-a99a-4ec9-af05-2a5897603972', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:06.303821+00', '2025-12-30 17:01:06.303821+00'),
	('23f72c43-6dfc-4c42-84ae-91e8ecd67b5b', '9c0c6c39-b5e1-4733-b361-e325b4f58ef8', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:07.246349+00', '2025-12-30 17:01:07.246349+00'),
	('9d728c39-17e9-4bee-86e8-a592603d94bf', '15af01c3-6568-4278-af4e-50ceeeb7eded', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:08.211427+00', '2025-12-30 17:01:08.211427+00'),
	('91cddce6-25e2-41de-a2cc-a1725b5e1af1', 'ef06ba7b-0e6e-4143-836e-1a1b8abd5b49', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:09.158375+00', '2025-12-30 17:01:09.158375+00'),
	('218e32e1-3116-4371-91ff-3bfd35fd9929', 'bef14e81-3d64-4ff7-9f37-56d2d942fbe3', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:10.078781+00', '2025-12-30 17:01:10.078781+00'),
	('90b5b8dd-f8a1-492a-a0f0-ba956ee9adfe', 'd2386a87-c485-4207-bfd8-f2485ba743a6', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:11.036689+00', '2025-12-30 17:01:11.036689+00'),
	('084c96b0-affc-4885-9a68-4a1055fc6b7d', '3ccfa5d6-32c4-4874-9236-525e4d7779ad', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:12.014704+00', '2025-12-30 17:01:12.014704+00'),
	('a598a1f8-3f0d-4acb-9ecb-290a98e32bbd', '7cc24686-8a0b-4d3f-90a4-05834e004746', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:12.924027+00', '2025-12-30 17:01:12.924027+00'),
	('6e2e0f99-8073-487e-b1a7-897a063fac7c', 'b9689d73-75b1-4359-a29b-3ccf34f470bf', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:13.824729+00', '2025-12-30 17:01:13.824729+00'),
	('699b9251-fd65-4c67-9c6a-26acb6d05b96', '0dcc4246-2aa4-492d-90e5-6ea0c78d78f6', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:14.825669+00', '2025-12-30 17:01:14.825669+00'),
	('abab763c-c26b-4482-8682-26f14420e09b', '5b4cdbbf-d0f1-426f-b8a3-1541156ceca8', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:15.798386+00', '2025-12-30 17:01:15.798386+00'),
	('63fbadd6-f69a-4aa8-9747-314c025e2ce7', '8281eb9e-45ff-4f34-98de-dc235dd3d5f0', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:16.746801+00', '2025-12-30 17:01:16.746801+00'),
	('2b1e41c8-b4a9-4cf1-b6e7-600c2d9ebbdb', '7b1de9fa-ea89-467c-9a39-bbd668e780a4', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:17.674956+00', '2025-12-30 17:01:17.674956+00'),
	('8e69b270-2643-4248-b761-068f1bbee1eb', 'fae2fa98-178c-42b0-954b-a5b2b7cb20af', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:18.655232+00', '2025-12-30 17:01:18.655232+00'),
	('d10758c5-725f-4233-a694-a640220d07c5', '50b9080f-0713-4989-a803-9ad0b20bcccb', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:19.567484+00', '2025-12-30 17:01:19.567484+00'),
	('d29f891d-a34b-4a59-8962-11adb8cb1d53', 'c150ba2c-8e40-4a29-86e6-74930329bd77', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:20.501398+00', '2025-12-30 17:01:20.501398+00'),
	('33e54d6d-5213-481a-80f5-5f9a2524c986', '4f34c929-ec18-40f2-97c5-aebbcc9d6413', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:21.798659+00', '2025-12-30 17:01:21.798659+00'),
	('0df60e62-b6cb-4162-b630-5b29e62c5c9e', 'b73694e0-f131-4a15-9988-e62c60050a50', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:22.773355+00', '2025-12-30 17:01:22.773355+00'),
	('57ac86ea-4ba8-4c87-b80f-e6b9fbd4f642', '7fb05a17-473d-4d50-90f4-c623360b2008', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:24.09944+00', '2025-12-30 17:01:24.09944+00'),
	('4bc04992-29a1-493a-8eb8-5c4c956b8612', '1f415278-277d-469e-a086-6285dc068d95', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:25.039797+00', '2025-12-30 17:01:25.039797+00'),
	('5a5762e7-72af-41c7-9bc6-3e0e89a6a6a8', 'c729ee2e-6385-4f7c-b39a-78366899ac5e', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:26.015094+00', '2025-12-30 17:01:26.015094+00'),
	('430dd16e-008e-49df-8c3a-78eec0db502a', '90f1e9e3-7806-4b3f-a16f-0ec92ae7112a', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:26.946014+00', '2025-12-30 17:01:26.946014+00'),
	('5a3701c7-0cca-436e-9dd8-dd9238d156e7', '41ba2860-8be2-47b9-ad77-25ed686d571b', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:27.93455+00', '2025-12-30 17:01:27.93455+00'),
	('7a96f399-a896-4aa9-a5c4-30812f5a0113', '1b95afd8-4191-4991-8e90-dd9d4697a6c8', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:28.846507+00', '2025-12-30 17:01:28.846507+00'),
	('9f26355c-c17c-49d5-a7a2-5cc5fb22291f', '14861027-c7d1-4fdb-b9e7-4080dfff1025', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:29.897682+00', '2025-12-30 17:01:29.897682+00'),
	('0cbacff6-373b-42bc-9aaa-5f90c8643400', '4142960f-3c2b-43e6-9955-7b5eb4d1d8c8', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:30.870683+00', '2025-12-30 17:01:30.870683+00'),
	('19438ed5-ea26-47e7-87f1-6b7b76381c1c', '55d88852-06ac-4f5c-a469-badd4d29e051', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:31.823916+00', '2025-12-30 17:01:31.823916+00'),
	('23cc056a-75e1-417b-bf77-1743b8d3f416', '3aaee1dc-4e20-4265-8027-0e440ad568a9', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:32.750021+00', '2025-12-30 17:01:32.750021+00'),
	('4832e498-20be-4a33-b780-0c2d7ca7c838', '8ffc085b-e1e4-4ab9-8bb4-665fd0828ce9', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:33.639531+00', '2025-12-30 17:01:33.639531+00'),
	('50199b85-b0f2-46c7-a27c-130fb5029078', '88412408-6b59-4e8d-a60c-1539721941f6', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:34.554631+00', '2025-12-30 17:01:34.554631+00'),
	('a84507ed-ba2b-488c-bcdd-60cf9fb75e9e', '8b314611-f6e0-4b46-ab8c-cecb51cdcabb', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:35.526773+00', '2025-12-30 17:01:35.526773+00'),
	('1ade97db-e333-4253-be7e-5ecc729313c1', 'd45d6478-8422-441b-a59c-be5bfea22125', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:36.462972+00', '2025-12-30 17:01:36.462972+00'),
	('ebf086bc-8ce1-4fe2-862d-025f0e9fa446', '58faf00e-9766-4119-a08b-ca665ad9340f', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:37.357839+00', '2025-12-30 17:01:37.357839+00'),
	('88e621b4-1ad6-4c20-a5db-4a27add38692', 'eb8d4adb-f1ec-44c1-b45b-ba0004453bb9', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:38.305738+00', '2025-12-30 17:01:38.305738+00'),
	('a70227a6-38de-4712-a712-d9dfacf6b1a6', '096e7645-ae16-4125-b513-6870324729d2', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:39.185609+00', '2025-12-30 17:01:39.185609+00'),
	('5ad69ad8-cf1c-457d-a75a-6fde20c1efc2', '338c1495-c461-4f40-a5db-a0b7fe9d6f58', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:40.174839+00', '2025-12-30 17:01:40.174839+00'),
	('33ed4674-cd51-483c-b81a-308697175c36', '726d5e3b-74b8-4a69-87e9-8b1ffe8dd5c4', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:41.064449+00', '2025-12-30 17:01:41.064449+00'),
	('9de85d19-5bb4-4c1c-a788-9acf6ee30880', 'abee5112-c7b4-4553-aadc-d268bf4c3cd6', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:42.014273+00', '2025-12-30 17:01:42.014273+00'),
	('9b34e838-fe30-4fd3-9626-fe84b515b265', '5b1c29db-bcc2-415f-b302-ebcbc011f547', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:42.92524+00', '2025-12-30 17:01:42.92524+00'),
	('26d7d115-9834-4bac-ae34-bc474bae1693', 'd4362242-3771-45dd-ab3a-4e2c6778b19c', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:43.824254+00', '2025-12-30 17:01:43.824254+00'),
	('ae35d07f-810a-4cf0-ab84-80179a5237e2', 'a917d9c5-d533-41cc-bbbb-525543a9bff3', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:44.772229+00', '2025-12-30 17:01:44.772229+00'),
	('823eaf5d-38cc-47c7-907b-da39f2ed34a3', 'efaf4309-143c-40ac-9296-207f6ff643f0', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:45.752188+00', '2025-12-30 17:01:45.752188+00'),
	('43eb8340-020f-4bd5-9a0f-a1030c4e12b9', '9480eccf-ec7e-4f7d-8668-42182c75305f', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:46.666479+00', '2025-12-30 17:01:46.666479+00'),
	('0b5e182b-3d85-4715-8d1f-df31dd12bd77', '93ed3dbe-b43c-425d-8cb0-caa33e125011', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:47.574416+00', '2025-12-30 17:01:47.574416+00'),
	('f1ee24e8-1550-4205-b556-7b167eb11dbc', 'e177e747-f788-4800-ae11-ee73a1eedcdc', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:48.599999+00', '2025-12-30 17:01:48.599999+00'),
	('c2b5c939-7dba-425b-8938-544127e9e60c', '4fcedb0e-4979-49d1-b41b-495985f98dd4', 'c8dfb00f-2460-48bb-964f-eb2af7f830a9', 0, 0, 0, '2025-12-30 17:01:49.640293+00', '2025-12-30 17:01:49.640293+00');


--
-- Data for Name: fabric_terms_conditions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."fabric_terms_conditions" ("id", "template_name", "template_text", "created_at", "updated_at") VALUES
	('0e68291d-086c-4aaf-9e84-f4e955f64ebf', 'Standard Terms', '1. Goods once sold will not be taken back.
2. Interest @ 24% p.a. will be charged if payment is not made within the due date.
3. Subject to Surat Jurisdiction only.', '2025-12-19 12:35:24.710123+00', '2025-12-19 12:35:24.710123+00'),
	('4de208e6-60db-4d15-acae-54f49f0bb722', 'Bulk Order Terms', '1. 50% Advance payment required.
2. Delivery timelines subject to raw material availability.
3. Quality checks must be performed within 2 days of receipt.', '2025-12-19 12:35:24.710123+00', '2025-12-19 12:35:24.710123+00');


--
-- Data for Name: fabric_views; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: fancy_base_fabrics; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ink_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."ink_types" ("id", "name", "description", "is_active", "created_at", "updated_at") VALUES
	('5a5a50e3-98e3-4aa0-910e-17a5b4bc1a27', 'Pigment Dye', NULL, true, '2026-01-27 16:03:33.046571+00', '2026-01-27 16:03:33.046571+00'),
	('3806b87d-e616-420d-87bc-19257ccddb3b', 'Reactive Dye', NULL, true, '2026-01-27 16:03:33.046571+00', '2026-01-27 16:03:33.046571+00'),
	('42129582-6054-4e76-9d2e-5506a9ae25ce', 'Discharge Agent + Reactive', NULL, true, '2026-01-27 16:03:33.046571+00', '2026-01-27 16:03:33.046571+00'),
	('07111aab-872a-44d0-841f-a7622700dba3', 'Disperse Dye', NULL, true, '2026-01-27 16:03:33.046571+00', '2026-01-27 16:03:33.046571+00'),
	('6bde4fe3-692e-4d18-b3ec-f8d134dd9657', 'Titanium White (Pigment)', NULL, true, '2026-01-27 16:03:33.046571+00', '2026-01-27 16:03:33.046571+00'),
	('9ad83cbc-cd22-4947-aa95-18e25d9456e2', 'Binder (Glue) + Foil', NULL, true, '2026-01-27 16:03:33.046571+00', '2026-01-27 16:03:33.046571+00');


--
-- Data for Name: finish_fabrics; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: fancy_finish_fabrics; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: fancy_finish_fabrics_v2; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: field_customers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: field_visits; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: file_compressions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: filter_presets; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: finish_fabric_designs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: finish_fabric_job_workers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: finish_fabric_suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: follow_up_tracking; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: readymade_garments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: garment_accessories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: garment_components; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: garment_costs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: garment_size_variants; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: garment_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."garment_types" ("id", "garment_name") VALUES
	('253c918b-ad59-4a98-993e-b3524aa71597', 'Kurti'),
	('e7e8f645-0540-4ff0-8669-44f980271523', 'Suit'),
	('642d2a7f-516f-4de4-8678-9eed80d2deb1', 'Saree'),
	('cb4819a4-4166-4be7-be39-bbf74e5e576f', 'Dress'),
	('6c20aa2b-fda8-4999-b9e4-cd013c5d0c90', 'Shirt'),
	('5071c102-413d-4456-8bfe-4f153dbd2bcd', 'Pants'),
	('27051c6a-046b-4f1d-97af-84b0b3a76de9', 'Lehenga'),
	('5383c650-5ba1-40fc-ae50-1abc4564562a', 'Anarkali'),
	('8a5a75b7-ca25-4bae-8503-b99b436b20d6', 'Salwar'),
	('5695c9ff-2761-4649-b2d0-b69c2c07ce25', 'Dupatta'),
	('8f100e0d-1bb1-4070-a2b5-e7e81f9dbc12', 'Co-ord Set'),
	('aa2fd851-d33c-423d-b601-7ec3d30b0f3b', 'Other');


--
-- Data for Name: google_drive_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: google_drive_sync; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: hakoba_batch_calcs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: hakoba_embroidery; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: hsn_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: imports; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: import_errors; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: item_specifications_master; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: job_cards; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: job_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: job_work_units; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: job_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: job_work_bills; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: master_process; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: master_process_entry; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: master_purchase; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: master_purchase_entry; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: master_value_addition; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: master_value_addition_entry; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: mto_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: order_dispatches; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: sales_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: order_dispatch_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: order_forms; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: order_status_history; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: sales_visits; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: payment_followups; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: permission_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."permission_settings" ("id", "role", "module", "can_view", "can_add", "can_edit", "can_delete", "created_at", "updated_at") VALUES
	('27c07ab7-596e-4378-bd94-37bfedcdb7bc', 'admin', 'dashboard', true, true, true, true, '2025-12-08 03:45:25.333054+00', '2025-12-08 03:45:25.333054+00'),
	('0e49d8d1-2284-4d40-96b7-67cef92729dd', 'admin', 'orders', true, true, true, true, '2025-12-08 03:45:25.333054+00', '2025-12-08 03:45:25.333054+00'),
	('dafe1fac-a9f5-4e63-87a9-bd3e9a73c2f0', 'admin', 'customers', true, true, true, true, '2025-12-08 03:45:25.333054+00', '2025-12-08 03:45:25.333054+00'),
	('47a129fe-d3f0-4364-bf69-8e5ab109f25c', 'admin', 'stock', true, true, true, true, '2025-12-08 03:45:25.333054+00', '2025-12-08 03:45:25.333054+00'),
	('ccb54b5d-2b6a-449c-8030-51600846d195', 'admin', 'design_upload', true, true, true, true, '2025-12-08 03:45:25.333054+00', '2025-12-08 03:45:25.333054+00'),
	('f8bb5a15-fc0e-4df3-9f15-dcb6cd88b1a9', 'admin', 'price_approval', true, true, true, true, '2025-12-08 03:45:25.333054+00', '2025-12-08 03:45:25.333054+00'),
	('d41a98fb-72c7-416f-a8e7-33741d453e31', 'admin', 'analytics', true, true, true, true, '2025-12-08 03:45:25.333054+00', '2025-12-08 03:45:25.333054+00'),
	('ce591062-2cf4-4c61-ada0-e3b41da65911', 'admin', 'appointments', true, true, true, true, '2025-12-08 03:45:25.333054+00', '2025-12-08 03:45:25.333054+00'),
	('ca1cb911-3d82-44e5-8053-ea4d1b75a822', 'admin', 'despatch', true, true, true, true, '2025-12-08 03:45:25.333054+00', '2025-12-08 03:45:25.333054+00'),
	('50cb7140-d4d1-4075-84f4-6bcb22d95789', 'admin', 'media_library', true, true, true, true, '2025-12-08 03:45:25.333054+00', '2025-12-08 03:45:25.333054+00'),
	('8f7d0bcd-7be6-4c51-9653-6d07dab92d40', 'admin', 'bulk_upload', true, true, true, true, '2025-12-08 03:45:25.333054+00', '2025-12-08 03:45:25.333054+00'),
	('8bdc01d7-b1c7-4cfc-a7d5-581ec6180396', 'admin', 'team', true, true, true, true, '2025-12-08 03:45:25.333054+00', '2025-12-08 03:45:25.333054+00'),
	('4200a101-581c-4ddb-97d1-35d2940c107a', 'admin', 'logs', true, true, true, true, '2025-12-08 03:45:25.333054+00', '2025-12-08 03:45:25.333054+00');


--
-- Data for Name: pincode_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."pincode_data" ("id", "pincode", "city", "state", "country", "country_code") VALUES
	('f69cb9b3-d81e-4678-8975-acbbfd7de723', '395001', 'Surat', 'Gujarat', 'India', 'IN'),
	('e86d98e0-35a2-47ef-b359-dbe1a28797c1', '380001', 'Ahmedabad', 'Gujarat', 'India', 'IN'),
	('248a7191-5956-49d1-a4a7-b113782c463d', '400001', 'Mumbai', 'Maharashtra', 'India', 'IN'),
	('d96a86ac-77ab-47d3-8830-dbd73ec6dc37', '110001', 'Delhi', 'Delhi', 'India', 'IN'),
	('0a866455-1332-49c6-922b-9fbf8fdbd68a', '560001', 'Bangalore', 'Karnataka', 'India', 'IN'),
	('c30d0009-09ee-43a3-a613-02ae0b71bc63', '600001', 'Chennai', 'Tamil Nadu', 'India', 'IN'),
	('96013b99-9759-4a80-bba5-0a6a55fe2f0b', '700001', 'Kolkata', 'West Bengal', 'India', 'IN');


--
-- Data for Name: price_approvals; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: price_change_log; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: price_database; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: price_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: process_charges; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: process_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: process_hsn_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: process_specifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."process_specifications" ("id", "process_name", "process_type", "created_at") VALUES
	('fb39f8f9-de77-4b22-909a-39e8c1c8d360', 'Printed', 'Procion/Reactive', '2025-12-20 15:36:44.442648+00'),
	('5e872ff1-a4aa-4b02-b664-147190e76daa', 'Printed', 'Discharge', '2025-12-20 15:36:44.442648+00'),
	('0beae327-64cc-4299-a3ae-e689ed295d64', 'Printed', 'Digital', '2025-12-20 15:36:44.442648+00'),
	('a11739aa-35d6-4c30-a0a9-f5d6c1fb4139', 'Printed', 'Block', '2025-12-20 15:36:44.442648+00'),
	('cb3205a3-24da-4806-9163-6d2315e34405', 'Printed', 'Pigment', '2025-12-20 15:36:44.442648+00'),
	('5d793746-ce85-455e-a8b8-fd0967ec281f', 'Printed', 'Table', '2025-12-20 15:36:44.442648+00'),
	('02dd0ae6-7b2d-478f-a8d6-979c7fde932b', 'Printed', 'Khadi', '2025-12-20 15:36:44.442648+00'),
	('d7ac9c55-cdbc-4971-bdb5-ce0608766409', 'Printed', 'ODP', '2025-12-20 15:36:44.442648+00'),
	('9d5385a1-ac71-420b-9329-c2d46678652f', 'Printed', 'Foil', '2025-12-20 15:36:44.442648+00'),
	('05f3f924-606b-4a78-b2a8-ab78b2dbdfcb', 'Printed', 'Glitter', '2025-12-20 15:36:44.442648+00'),
	('94b20c16-57a8-4583-b60e-590dd206e990', 'Digital', 'Sublimation', '2025-12-20 15:36:44.442648+00'),
	('49af49ce-ce62-494a-91bd-7d637b02ece3', 'Digital', 'Direct to Fabric', '2025-12-20 15:36:44.442648+00'),
	('f8f0c653-6a63-4971-8e0a-6006c1cc7eb7', 'Digital', 'Digital on Natural', '2025-12-20 15:36:44.442648+00'),
	('f83d4858-504b-409b-b99a-441854958e96', 'Solid(Dyed)', 'Ready for Dye', '2025-12-20 15:36:44.442648+00'),
	('c05c2b08-3e84-4726-b48b-13a7a24a34f6', 'Solid(Dyed)', 'Reactive Dyed', '2025-12-20 15:36:44.442648+00'),
	('eda9a25e-4bd7-407b-82fe-a747fa42cfce', 'Solid(Dyed)', 'Sulfur Dyed', '2025-12-20 15:36:44.442648+00'),
	('ad1dbae3-de2f-44cf-b83c-a055727e5c54', 'Hakoba', 'Dyed', '2025-12-20 15:36:44.442648+00'),
	('b70386a5-8c7c-4948-9422-125473455a5c', 'Hakoba', 'Dyeable', '2025-12-20 15:36:44.442648+00'),
	('0763f043-0a0b-4c3d-8f05-3ad1441b2d48', 'Embroidery', 'Eyelet/Borer', '2025-12-20 15:36:44.442648+00'),
	('a9d357e5-3a56-433e-9ae7-b98e587b3550', 'Embroidery', 'Multi Thread', '2025-12-20 15:36:44.442648+00'),
	('71f77bfc-1f4c-4f57-b577-92e3bea05353', 'Embroidery', 'Sequins (Sitara)', '2025-12-20 15:36:44.442648+00'),
	('1d68fe15-0dc3-431a-a82e-e3d717ae6597', 'Embroidery', 'Cording', '2025-12-20 15:36:44.442648+00'),
	('17fa5adf-da05-4d00-9c04-e3b541777264', 'Embroidery', 'Beads', '2025-12-20 15:36:44.442648+00'),
	('8f67b2c5-51e5-4a08-8e02-5d3d900c6383', 'Embroidery', 'Applique', '2025-12-20 15:36:44.442648+00'),
	('87be1ba1-f415-4eb9-8b6c-de6733f51272', 'Embroidery', 'Flat Embroidery', '2025-12-20 15:36:44.442648+00'),
	('01c4f35e-a7b4-47ba-add6-a013be5803ec', 'Embroidery', 'Cutwork (Scalloped Edge)', '2025-12-20 15:36:44.442648+00'),
	('d725c1e3-6b24-4869-afa3-427326f80d92', 'Embroidery', 'Chain Stitch', '2025-12-20 15:36:44.442648+00'),
	('524222ef-f549-4002-93de-4da290a4167a', 'Handwork', 'Khatli (Aari)', '2025-12-20 15:36:44.442648+00'),
	('5c156b81-f861-4f7e-a391-f51d505adf84', 'Handwork', 'Zardosi', '2025-12-20 15:36:44.442648+00'),
	('5e171357-36fb-4158-8a12-561118d00a88', 'Handwork', 'Gota Patti', '2025-12-20 15:36:44.442648+00'),
	('dc6fc022-5fe5-4f88-84f0-6b839555f8ad', 'Handwork', 'Mirror (Real)', '2025-12-20 15:36:44.442648+00'),
	('87b8efcf-8ae7-43bf-bd96-772ca54193d6', 'Handwork', 'Mirror (Foil)', '2025-12-20 15:36:44.442648+00'),
	('0eef521a-83a0-40d0-878d-e1732c15759e', 'Handwork', 'Cutdana', '2025-12-20 15:36:44.442648+00'),
	('23de25d3-0ccc-4929-a9dd-0a7b74498b5b', 'Handwork', 'Stone / Hotfix', '2025-12-20 15:36:44.442648+00'),
	('2d8218b4-2332-4f2b-81db-be3a40262f59', 'Handwork', 'Pearl / Moti', '2025-12-20 15:36:44.442648+00'),
	('9eaa24ed-2fec-4d10-85d4-2ff76dd7fe3f', 'Handwork', 'Mix Work', '2025-12-20 15:36:44.442648+00'),
	('dc46eddd-51a6-4f22-9ec4-a55bdb272765', 'Value Addition', 'Crush', '2025-12-20 15:36:44.442648+00'),
	('12c9f50b-0a7a-41f5-8b05-a4c40697754f', 'Value Addition', 'Pleated', '2025-12-20 15:36:44.442648+00'),
	('7ca8e1a1-edbb-4f1c-9940-5ad9752eef73', 'Value Addition', 'Crochet Work', '2025-12-20 15:36:44.442648+00'),
	('2d5d683a-d2a6-4182-ac2b-67748b461f52', 'Value Addition', 'Stitching', '2025-12-20 15:36:44.442648+00');


--
-- Data for Name: process_specifications_master; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."process_specifications_master" ("id", "process", "process_type", "created_at", "updated_at") VALUES
	('9a501bf4-a692-43e2-9df1-b73c7d2df7d7', 'Printed', 'Procion/Reactive', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('cc959695-5d39-4b23-9b5a-2d0690049f3a', 'Printed', 'Discharge', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('7d3bc0fb-26e8-4d91-a60f-be7bbaf91c64', 'Printed', 'Digital', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('787874b8-66d4-4f06-bba4-913286483786', 'Printed', 'Block', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('428329aa-c20c-4f09-a60d-49985c85d821', 'Printed', 'Pigment', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('fa5fe165-4711-44a6-b1cc-63cb73781702', 'Printed', 'Table', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('dd6cc1c9-861b-44b8-b5d6-d37582071a47', 'Printed', 'Khadi', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('b64393e0-5900-4a4d-bb62-d4fcd6dd546f', 'Printed', 'ODP', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('723487a4-125d-4d4b-8475-592d2c84aa2a', 'Printed', 'Foil', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('3c4741fc-cac9-4035-b819-b556584b1e5a', 'Printed', 'Glitter', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('581d752f-adad-482a-a108-c0258ae85ad7', 'Printed', 'Sublimation', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('91cee06d-bcb1-4dbe-939f-bed8ecdf4f6e', 'Printed', 'Direct to Fabric', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('b10f4334-6f93-4bb8-a489-e518f51f2be1', 'Printed', 'Digital on Natural', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('b66255e7-6651-49a5-89d8-149c6db79eec', 'Solid(Dyed)', 'Ready for Dye', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('6f01aa24-7515-453f-885e-a56db0059136', 'Solid(Dyed)', 'Reactive Dyed', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('9de37962-92fc-4eff-9dc5-8823516c6155', 'Solid(Dyed)', 'Sulfur Dyed', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('0368ccae-d44b-4603-b11a-dc4867156198', 'Solid(Dyed)', 'Dyed', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('b44bc5a0-ca6a-48cb-8661-db67c614642a', 'Solid(Dyed)', 'Dyeable', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('eeb74f5c-0235-4c23-8194-ab60225a8a20', 'Hakoba', 'Eyelet/Borer', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('c7f538fb-7b94-407e-8440-f709dc2a8f3b', 'Hakoba', 'Multi Thread', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('48ad194c-2cf9-40eb-9438-171dc19c80ca', 'Hakoba', 'Dyed', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('297fbedb-67ba-4e23-a738-18e19f3b4af7', 'Hakoba', 'Dyeable', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('0d3e6f31-da27-4901-ad3c-0daca747f6aa', 'Embroidered', 'Sequins (Sitara)', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('91cd045e-8fe3-49ab-a312-20bec5c09eca', 'Embroidered', 'Cording', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('430eaad7-3762-42aa-9ae4-28fb19a88ba0', 'Embroidered', 'Beads', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('a3f47b82-b75d-4e9f-a6cb-56c0c1b60396', 'Embroidered', 'Applique', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('c5214e6d-0cff-4900-b85a-0bf4ba7a1699', 'Embroidered', 'Flat Embroidery', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('cb3e348f-ea89-4cc6-97a9-b9783eddad23', 'Embroidered', 'Cutwork (Scalloped Edge)', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('69061bdb-69bc-4458-8576-756e1429a216', 'Embroidered', 'Chain Stitch', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('2fdc37d9-e917-4b61-9feb-0796a7e8d4a6', 'Handwork', 'Khatli (Aari)', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('cd1f381d-0dbc-49f0-97a2-53be897518d6', 'Handwork', 'Zardosi', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('0ebe61ef-32a5-41df-9505-b0ea902f1ca5', 'Handwork', 'Gota Patti', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('6519882e-c142-4651-b03a-13ca186c41dc', 'Handwork', 'Mirror (Real)', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('74ec300f-bad5-40e5-b8e2-bef8541cb436', 'Handwork', 'Mirror (Foil)', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('b9aad62f-2914-45dd-9057-3f0946e6b13b', 'Handwork', 'Cutdana', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('82af1487-929d-453b-8937-681c490beb34', 'Handwork', 'Stone / Hotfix', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('3f0e3941-a7a5-4043-9e73-d20f3d1b4499', 'Handwork', 'Pearl / Moti', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('57815c78-8ffa-4604-80c2-5664a9466c54', 'Handwork', 'Mix Work', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('01bf6c96-5431-436d-9588-d051ec1fdaba', 'Value Addition', 'Crush', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('d05095a4-21fe-4ca3-8af1-2ee08aa50277', 'Value Addition', 'Pleated', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('9b49e531-3cfc-446c-b878-307efdec1877', 'Value Addition', 'Crochet Work', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00'),
	('fcc6ca7d-38ca-4437-aee9-a0a6115e7a88', 'Value Addition', 'Stitching', '2025-12-20 15:55:25.817337+00', '2025-12-20 15:55:25.817337+00');


--
-- Data for Name: product_components; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: product_costing_sheets; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: product_fabric_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: product_masters; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: product_master_accessories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: product_master_components; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: product_master_size_variants; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: purchase_bills; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: purchase_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: purchase_fabric; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: quantity_discounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."quantity_discounts" ("id", "tier_id", "product_id", "category_id", "min_quantity", "discount_percentage", "created_at") VALUES
	('d8c6dea2-0e8b-46f3-8a31-9c9c8c83f94e', 'ccb1ec93-ef63-4b71-8f7a-338064e54bad', NULL, NULL, 100, 3, '2025-11-18 15:45:36.817085+00'),
	('a17c3f9d-c736-403a-87c0-80d831274974', 'ccb1ec93-ef63-4b71-8f7a-338064e54bad', NULL, NULL, 500, 7, '2025-11-18 15:45:36.817085+00');


--
-- Data for Name: quotations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: quote_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: rate_card; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: readymade_garment_hsn_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: readymade_garment_specs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: sales_bills; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: sales_order_approvals; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: sales_order_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: scheduled_exports; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: schiffli_costing; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: set_components; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: staff_members; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: stock_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: stock_rolls; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: stock_summary; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: stock_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: supplier_price_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: supplier_rates; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: system_activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: tally_sync_log; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_profile_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_profile_history" ("id", "profile_id", "changed_by", "full_name", "firm_name", "email", "phone_number", "gst_number", "address", "delivery_address", "transport", "assigned_agent_id", "valid_from", "valid_to", "change_reason", "created_at") VALUES
	('ef080e7f-138e-44b2-9cc3-d791154f6e22', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', 'h', NULL, 'baltsarpe@gmail.com', NULL, NULL, '{}', NULL, NULL, NULL, '2025-12-07 07:28:46.928469+00', NULL, 'Profile Updated', '2025-12-07 07:28:46.928469+00'),
	('c68644b1-c124-45c8-b1a7-ef9328b31ee1', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', 'h', '', 'baltsarpe@gmail.com', '', '', '{"city": "", "line1": "", "state": "", "country": "", "pincode": "395007"}', NULL, '', NULL, '2025-12-07 07:49:09.698696+00', NULL, 'Profile Updated', '2025-12-07 07:49:09.698696+00'),
	('4e4ad739-84a4-4c38-8cc5-ef79d426996a', 'b55ff4bd-8908-403a-9054-bc6459ae9abc', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', 'Karan Gada', NULL, 'karan.nanji1@gmail.com', NULL, NULL, '{}', NULL, NULL, NULL, '2025-12-08 11:54:48.676176+00', NULL, 'Profile Updated', '2025-12-08 11:54:48.676176+00'),
	('514f0bc6-2b0c-4c9b-af73-3a8cc4913dcb', 'b0d853a7-404b-4211-a3e6-96907ba73328', NULL, 'Kunal Bathla', NULL, 'shreerangtrendz@gmail.com', NULL, NULL, '"4081-4084, Millenium Market 4"', NULL, NULL, NULL, '2025-12-11 17:23:19.72907+00', NULL, 'Profile Updated', '2025-12-11 17:23:19.72907+00'),
	('bdb3e09f-d54b-4104-b3b7-e72303146f3e', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', NULL, 'Shrikumar Maru', NULL, 'kumarmaru7@gmail.com', '7567870000', '', '{}', NULL, NULL, NULL, '2025-12-11 17:23:19.72907+00', NULL, 'Profile Updated', '2025-12-11 17:23:19.72907+00'),
	('bb0fa5c6-232c-40f2-bcd9-3dbae17aee5c', 'e4dadc5e-ae11-4cc2-8f0c-8a0f123fc204', NULL, 'h', '', 'baltsarpe@gmail.com', '', '', '{"city": "", "line1": "", "state": "", "country": "", "pincode": "395001"}', NULL, '', NULL, '2025-12-11 17:23:19.72907+00', NULL, 'Profile Updated', '2025-12-11 17:23:19.72907+00'),
	('5179eee9-2ba6-47e0-a9bb-9d97a16425b1', 'a97f4e2e-76fa-46a2-9ab6-ff9af765f4d6', NULL, 'Dheeraj Singh', NULL, 'srtpl.sales@gmail.com', NULL, NULL, '{}', NULL, NULL, NULL, '2025-12-11 17:23:19.72907+00', NULL, 'Profile Updated', '2025-12-11 17:23:19.72907+00');


--
-- Data for Name: user_profile_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: va_units; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: va_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: value_addition_charges; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: value_addition_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: value_addition_hsn_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: visit_followups; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: whatsapp_config; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: whatsapp_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: whatsapp_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: whatsapp_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES
	('design-images', 'design-images', NULL, '2025-12-08 09:59:29.017281+00', '2025-12-08 09:59:29.017281+00', true, false, NULL, NULL, NULL, 'STANDARD'),
	('sales-order-attachments', 'sales-order-attachments', NULL, '2025-12-19 12:03:31.909387+00', '2025-12-19 12:03:31.909387+00', true, false, NULL, NULL, NULL, 'STANDARD'),
	('sales-tracker-app', 'sales-tracker-app', NULL, '2026-03-01 03:38:16.403876+00', '2026-03-01 03:38:16.403876+00', true, false, NULL, NULL, NULL, 'STANDARD'),
	('backups', 'backups', NULL, '2026-03-02 09:58:46.186129+00', '2026-03-02 09:58:46.186129+00', false, false, NULL, NULL, NULL, 'STANDARD');


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") VALUES
	('691e9d28-1768-4e0a-ad3d-7b041f56a675', 'sales-order-attachments', '1766146021424_0a1xa.jpg', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '2025-12-19 12:07:03.226382+00', '2025-12-19 12:07:03.226382+00', '2025-12-19 12:07:03.226382+00', '{"eTag": "\"3c249dec525185d93687f68a21ebb0db\"", "size": 926745, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-12-19T12:07:04.000Z", "contentLength": 926745, "httpStatusCode": 200}', '3cee53ec-ca79-4e1b-8f94-bbd8d510251e', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '{}'),
	('f6311cbc-abf8-43b2-9b30-919a1da0776c', 'sales-order-attachments', '1766146026799_pmili.jpg', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '2025-12-19 12:07:08.701476+00', '2025-12-19 12:07:08.701476+00', '2025-12-19 12:07:08.701476+00', '{"eTag": "\"363c60236787074d51e7f72094e38a6d\"", "size": 2310817, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-12-19T12:07:09.000Z", "contentLength": 2310817, "httpStatusCode": 200}', '6307ff0c-f2f6-46b7-af86-cc65b819fd1f', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '{}'),
	('8476b46b-3113-4093-8eb4-db654f8b082f', 'design-images', '1766337401334_zdp6ui.png', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '2025-12-21 17:17:05.792742+00', '2025-12-21 17:17:05.792742+00', '2025-12-21 17:17:05.792742+00', '{"eTag": "\"2e9ab709d3e61abd86cc8ac0b20d14d8-3\"", "size": 12171203, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2025-12-21T17:17:05.000Z", "contentLength": 12171203, "httpStatusCode": 200}', '06b36773-f421-4d0d-af6c-8e8d9f27a917', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '{}'),
	('bc8ff660-835c-4f20-8a08-0c956e8a2a3d', 'design-images', '1766337607849_3mvh8g.jpg', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '2025-12-21 17:20:11.809172+00', '2025-12-21 17:20:11.809172+00', '2025-12-21 17:20:11.809172+00', '{"eTag": "\"452c6b43cc4d3dc6ee131627c6d8bd1b-2\"", "size": 5826559, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-12-21T17:20:12.000Z", "contentLength": 5826559, "httpStatusCode": 200}', '19a2f8d6-f87c-4a11-a159-c5a7e34d47cc', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '{}'),
	('651aa218-79ba-42f4-bd87-297f2dfe130c', 'design-images', '1767112000957_jqivm.jpg', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '2025-12-30 16:26:44.536157+00', '2025-12-30 16:26:44.536157+00', '2025-12-30 16:26:44.536157+00', '{"eTag": "\"4dd978cea2274b5a6622819268fa70b2\"", "size": 3043997, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-12-30T16:26:45.000Z", "contentLength": 3043997, "httpStatusCode": 200}', '25ddd86b-2c3d-4d57-806f-b0f7858b3378', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '{}'),
	('a662840a-5a27-4d31-85ce-dae561d18abd', 'design-images', '1767112000957_nigxpd.jpg', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '2025-12-30 16:26:44.628739+00', '2025-12-30 16:26:44.628739+00', '2025-12-30 16:26:44.628739+00', '{"eTag": "\"176f29fdcb44bf9ec3773056d60025b3\"", "size": 2866696, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-12-30T16:26:45.000Z", "contentLength": 2866696, "httpStatusCode": 200}', '33be2397-827b-43c2-84b0-4f8371e6d54f', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '{}'),
	('0e8ee81f-1b23-44f8-96dd-605a93435e75', 'design-images', '1767112000956_6l5ha2.jpg', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '2025-12-30 16:26:44.727423+00', '2025-12-30 16:26:44.727423+00', '2025-12-30 16:26:44.727423+00', '{"eTag": "\"b1fb5e9cf3685220d12305896fa67697\"", "size": 3029823, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-12-30T16:26:45.000Z", "contentLength": 3029823, "httpStatusCode": 200}', '38fe673e-8e41-4d1b-a910-2ee627942c3c', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '{}'),
	('18883f3b-70bd-41d7-8513-bcf9f55f3cd7', 'design-images', '1767112000956_1opcx9.jpg', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '2025-12-30 16:26:44.856617+00', '2025-12-30 16:26:44.856617+00', '2025-12-30 16:26:44.856617+00', '{"eTag": "\"78753bab1e201b83b8dcd079d91ac8cb\"", "size": 3107398, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-12-30T16:26:45.000Z", "contentLength": 3107398, "httpStatusCode": 200}', '00ae0b59-e716-4d6e-b545-94d185c72649', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '{}'),
	('b263b03b-0474-4024-bfd2-2589df98df5b', 'design-images', '1767112000957_qmihkg.jpg', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '2025-12-30 16:26:44.984994+00', '2025-12-30 16:26:44.984994+00', '2025-12-30 16:26:44.984994+00', '{"eTag": "\"071f4762a054f6505d6a8bd6f6d6db9e\"", "size": 4404505, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-12-30T16:26:45.000Z", "contentLength": 4404505, "httpStatusCode": 200}', '481fc16f-bda7-4756-93d9-905169d0cfbe', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '{}'),
	('f69e8292-e655-40c8-9ad1-9cdba7c151c0', 'design-images', '1767112000957_013yw.jpg', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '2025-12-30 16:26:44.978632+00', '2025-12-30 16:26:44.978632+00', '2025-12-30 16:26:44.978632+00', '{"eTag": "\"071f4762a054f6505d6a8bd6f6d6db9e\"", "size": 4404505, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-12-30T16:26:45.000Z", "contentLength": 4404505, "httpStatusCode": 200}', '77b761f2-376c-45fe-ba8a-b790187b0abb', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '{}'),
	('3993adea-98b7-4599-979c-6b16fe2d7880', 'design-images', '1767112000957_xbs4x.jpg', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '2025-12-30 16:26:45.273002+00', '2025-12-30 16:26:45.273002+00', '2025-12-30 16:26:45.273002+00', '{"eTag": "\"a155c228175e2d0778d21aba319dc9f3-2\"", "size": 6055077, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-12-30T16:26:45.000Z", "contentLength": 6055077, "httpStatusCode": 200}', '23c1ca0a-ac1b-44a2-ac56-5a5b0843991b', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '{}'),
	('c21790c6-0b24-4f8f-a6e0-d5d80a691844', 'design-images', '1767112000957_skzk2f.jpg', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '2025-12-30 16:26:45.376954+00', '2025-12-30 16:26:45.376954+00', '2025-12-30 16:26:45.376954+00', '{"eTag": "\"90447bea81af0fd7f67ba8247888c042-2\"", "size": 6365632, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-12-30T16:26:46.000Z", "contentLength": 6365632, "httpStatusCode": 200}', 'eebfcd5e-7aaa-46bd-af72-d77481cc81ef', 'dcfbcf50-c3bf-4d59-917e-9a7d2974bd19', '{}');


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: backup_metadata_id_seq; Type: SEQUENCE SET; Schema: admin; Owner: postgres
--

SELECT pg_catalog.setval('"admin"."backup_metadata_id_seq"', 12, true);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 443, true);


--
-- Name: master_process_entry_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."master_process_entry_id_seq"', 1, false);


--
-- Name: master_process_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."master_process_id_seq"', 1, false);


--
-- Name: master_purchase_entry_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."master_purchase_entry_id_seq"', 1, false);


--
-- Name: master_purchase_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."master_purchase_id_seq"', 1, false);


--
-- Name: master_value_addition_entry_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."master_value_addition_entry_id_seq"', 1, false);


--
-- Name: master_value_addition_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."master_value_addition_id_seq"', 1, false);


--
-- Name: order_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."order_number_seq"', 1, false);


--
-- Name: sales_order_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."sales_order_number_seq"', 10, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict 69Parxr9gcBXYLmnYXBmHcuPsiMvvWW3CmqIfCHDH5dRaaidgiG7YI4Ddb5WI5h

RESET ALL;
