-- Seed Data for Smart Parking Platform

-- 1. Create a dummy password hash (e.g. 'password123')
-- For auth.users we must insert records.

DO $$
DECLARE
    v_admin_id UUID := uuid_generate_v4();
    v_manager_ids UUID[] := ARRAY[uuid_generate_v4(), uuid_generate_v4(), uuid_generate_v4(), uuid_generate_v4(), uuid_generate_v4()];
    v_customer_ids UUID[];
    v_lot_ids UUID[];
    v_slot_ids UUID[];
    v_vehicle_ids UUID[];
    
    i INT;
    j INT;
    k INT;
    v_lot_id UUID;
    v_slot_id UUID;
    v_customer_id UUID;
    v_vehicle_id UUID;
BEGIN
    -- We bypass auth.users for raw seed by inserting directly into profiles but we must satisfy FK to auth.users if RLS or triggers are active.
    -- However, local supabase allows inserting into auth.users.
    
    -- Insert Admin
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role)
    VALUES (v_admin_id, '00000000-0000-0000-0000-000000000000', 'admin@smartparking.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', 'System Admin', 'role', 'admin'), NOW(), NOW(), 'authenticated');

    -- Insert 5 Managers
    FOR i IN 1..5 LOOP
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role)
        VALUES (v_manager_ids[i], '00000000-0000-0000-0000-000000000000', 'manager'||i||'@smartparking.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', 'Manager '||i, 'role', 'parking_manager'), NOW(), NOW(), 'authenticated');
    END LOOP;

    -- Insert 20 Customers (to keep seed fast, generating 100 is similar)
    FOR i IN 1..20 LOOP
        v_customer_id := uuid_generate_v4();
        v_customer_ids := array_append(v_customer_ids, v_customer_id);
        
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role)
        VALUES (v_customer_id, '00000000-0000-0000-0000-000000000000', 'customer'||i||'@example.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', 'Customer '||i, 'role', 'customer'), NOW(), NOW(), 'authenticated');
    END LOOP;

    -- Note: auth.users insert will trigger 'handle_new_user' to create profile records.

    -- Update parking manager specific table
    FOR i IN 1..5 LOOP
        INSERT INTO parking_managers (user_id, business_name, business_phone, verification_status)
        VALUES (v_manager_ids[i], 'Parking Business '||i, '+91987654321'||i, 'approved');
    END LOOP;

    -- Create 15 Parking Lots (3 per manager)
    FOR i IN 1..5 LOOP
        FOR j IN 1..3 LOOP
            v_lot_id := uuid_generate_v4();
            v_lot_ids := array_append(v_lot_ids, v_lot_id);
            
            INSERT INTO parking_lots (
                id, manager_id, name, description, address, latitude, longitude, city, pincode, 
                opening_time, closing_time, status, total_capacity, available_capacity
            )
            VALUES (
                v_lot_id, (SELECT id FROM parking_managers WHERE user_id = v_manager_ids[i]),
                'Lot ' || j || ' (Manager ' || i || ')', 'Premium parking facility located in city center.',
                '12' || j || ' Main Street', 12.9716 + (random() * 0.1), 77.5946 + (random() * 0.1),
                'Bangalore', '560001', '06:00:00', '23:00:00', 'active', 20, 20
            );
            
            -- Create 20 Slots per Lot (total 300 slots)
            FOR k IN 1..20 LOOP
                v_slot_id := uuid_generate_v4();
                v_slot_ids := array_append(v_slot_ids, v_slot_id);
                
                INSERT INTO parking_slots (
                    id, parking_lot_id, slot_number, slot_type, vehicle_type, floor, status, hourly_price
                )
                VALUES (
                    v_slot_id, v_lot_id, 'A' || k, 
                    CASE WHEN k % 5 = 0 THEN 'ev'::slot_type WHEN k % 4 = 0 THEN 'premium'::slot_type ELSE 'regular'::slot_type END,
                    CASE WHEN k % 3 = 0 THEN 'bike'::vehicle_type ELSE 'car'::vehicle_type END,
                    '1', 'available', CASE WHEN k % 4 = 0 THEN 80.00 ELSE 50.00 END
                );
            END LOOP;
        END LOOP;
    END LOOP;

    -- Create 1 Vehicle for each Customer
    FOR i IN 1..20 LOOP
        v_vehicle_id := uuid_generate_v4();
        v_vehicle_ids := array_append(v_vehicle_ids, v_vehicle_id);
        
        INSERT INTO vehicles (id, user_id, vehicle_number, vehicle_type, vehicle_model, vehicle_color)
        VALUES (
            v_vehicle_id, v_customer_ids[i], 'TN0' || (i%9)+1 || 'AB12' || i, 
            'car'::vehicle_type, 'Sedan', 'White'
        );
    END LOOP;

    -- Create 50 Sample Bookings
    FOR i IN 1..50 LOOP
        v_customer_id := v_customer_ids[(i % 20) + 1];
        v_vehicle_id := v_vehicle_ids[(i % 20) + 1];
        v_slot_id := v_slot_ids[(i % 300) + 1];
        
        SELECT parking_lot_id INTO v_lot_id FROM parking_slots WHERE id = v_slot_id;

        INSERT INTO bookings (
            customer_id, parking_lot_id, parking_slot_id, vehicle_id, 
            date, start_time, end_time, duration_hours, base_amount, total_amount, payment_status, booking_status
        ) VALUES (
            v_customer_id, v_lot_id, v_slot_id, v_vehicle_id,
            CURRENT_DATE + ((i % 5) || ' days')::interval, 
            '10:00:00', '12:00:00', 2.0, 100.00, 100.00, 
            CASE WHEN i % 2 = 0 THEN 'paid'::payment_status ELSE 'pending'::payment_status END,
            CASE WHEN i % 2 = 0 THEN 'confirmed'::booking_status ELSE 'pending'::booking_status END
        );
    END LOOP;

END $$;
