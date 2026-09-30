-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- useful if we add distance calculations later

-- Custom Types / Enums
CREATE TYPE user_role AS ENUM ('customer', 'parking_manager', 'admin');
CREATE TYPE slot_type AS ENUM ('regular', 'disabled', 'ev', 'premium', 'reserved');
CREATE TYPE vehicle_type AS ENUM ('bike', 'car', 'suv', 'ev');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired', 'no_show');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE manager_verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE lot_status AS ENUM ('active', 'inactive', 'maintenance');
CREATE TYPE slot_status AS ENUM ('available', 'occupied', 'reserved', 'maintenance', 'disabled');

-- 1. Profiles (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'customer'::user_role NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Parking Managers
CREATE TABLE parking_managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_phone TEXT NOT NULL,
    verification_status manager_verification_status DEFAULT 'pending'::manager_verification_status,
    documents JSONB, -- Array of document URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 3. Parking Lots
CREATE TABLE parking_lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES parking_managers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    city TEXT NOT NULL,
    pincode TEXT NOT NULL,
    opening_time TIME NOT NULL,
    closing_time TIME NOT NULL,
    status lot_status DEFAULT 'inactive'::lot_status,
    total_capacity INTEGER NOT NULL DEFAULT 0,
    available_capacity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Parking Slots
CREATE TABLE parking_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parking_lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    slot_number TEXT NOT NULL,
    slot_type slot_type DEFAULT 'regular'::slot_type NOT NULL,
    vehicle_type vehicle_type DEFAULT 'car'::vehicle_type NOT NULL,
    floor TEXT DEFAULT '1',
    status slot_status DEFAULT 'available'::slot_status,
    hourly_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parking_lot_id, slot_number) -- Prevent duplicate slot numbers per lot
);

-- 5. Vehicles
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vehicle_number TEXT NOT NULL,
    vehicle_type vehicle_type NOT NULL,
    vehicle_model TEXT,
    vehicle_color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, vehicle_number) -- Prevent duplicate vehicles per user
);

-- 6. Time Slots (Dynamic Generation)
CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parking_lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    date DATE NOT NULL,
    status slot_status DEFAULT 'available'::slot_status,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parking_lot_id, date, start_time, end_time)
);

-- 7. Bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 0, 9),
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    parking_lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE RESTRICT,
    parking_slot_id UUID NOT NULL REFERENCES parking_slots(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours NUMERIC(5, 2) NOT NULL,
    base_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status payment_status DEFAULT 'pending'::payment_status NOT NULL,
    booking_status booking_status DEFAULT 'pending'::booking_status NOT NULL,
    qr_token TEXT UNIQUE,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    checked_out_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure start_time is before end_time
    CONSTRAINT valid_booking_time CHECK (start_time < end_time)
);

-- 8. Reviews
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    parking_lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(booking_id) -- Only one review per booking
);

-- 9. Coupons
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    minimum_amount DECIMAL(10,2) DEFAULT 0,
    maximum_discount DECIMAL(10,2),
    usage_limit INTEGER,
    per_user_limit INTEGER DEFAULT 1,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Functions and Triggers

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_parking_managers_updated_at BEFORE UPDATE ON parking_managers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_parking_lots_updated_at BEFORE UPDATE ON parking_lots FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_parking_slots_updated_at BEFORE UPDATE ON parking_slots FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to handle new user registration in Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
