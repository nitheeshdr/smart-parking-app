-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Functions for RLS
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_manager() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'parking_manager'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins have full access to profiles" ON profiles FOR ALL USING (public.is_admin());

-- 2. Parking Managers Policies
CREATE POLICY "Managers are viewable by everyone" ON parking_managers FOR SELECT USING (true);
CREATE POLICY "Users can create their own manager profile" ON parking_managers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Managers can update their own profile" ON parking_managers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins have full access to managers" ON parking_managers FOR ALL USING (public.is_admin());

-- 3. Parking Lots Policies
CREATE POLICY "Active parking lots are viewable by everyone" ON parking_lots FOR SELECT USING (status = 'active' OR auth.uid() IN (SELECT user_id FROM parking_managers WHERE id = manager_id));
CREATE POLICY "Managers can insert their own lots" ON parking_lots FOR INSERT WITH CHECK (
  manager_id IN (SELECT id FROM parking_managers WHERE user_id = auth.uid())
);
CREATE POLICY "Managers can update their own lots" ON parking_lots FOR UPDATE USING (
  manager_id IN (SELECT id FROM parking_managers WHERE user_id = auth.uid())
);
CREATE POLICY "Admins have full access to parking lots" ON parking_lots FOR ALL USING (public.is_admin());

-- 4. Parking Slots Policies
CREATE POLICY "Parking slots are viewable by everyone" ON parking_slots FOR SELECT USING (true);
CREATE POLICY "Managers can insert slots to their own lots" ON parking_slots FOR INSERT WITH CHECK (
  parking_lot_id IN (SELECT id FROM parking_lots WHERE manager_id IN (SELECT id FROM parking_managers WHERE user_id = auth.uid()))
);
CREATE POLICY "Managers can update slots in their own lots" ON parking_slots FOR UPDATE USING (
  parking_lot_id IN (SELECT id FROM parking_lots WHERE manager_id IN (SELECT id FROM parking_managers WHERE user_id = auth.uid()))
);
CREATE POLICY "Admins have full access to parking slots" ON parking_slots FOR ALL USING (public.is_admin());

-- 5. Vehicles Policies
CREATE POLICY "Users can view their own vehicles" ON vehicles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Managers can view vehicles of their customers" ON vehicles FOR SELECT USING (
  id IN (SELECT vehicle_id FROM bookings WHERE parking_lot_id IN (SELECT id FROM parking_lots WHERE manager_id IN (SELECT id FROM parking_managers WHERE user_id = auth.uid())))
);
CREATE POLICY "Users can insert their own vehicles" ON vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vehicles" ON vehicles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vehicles" ON vehicles FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins have full access to vehicles" ON vehicles FOR ALL USING (public.is_admin());

-- 6. Time Slots Policies
CREATE POLICY "Time slots are viewable by everyone" ON time_slots FOR SELECT USING (true);
CREATE POLICY "Admins have full access to time slots" ON time_slots FOR ALL USING (public.is_admin());

-- 7. Bookings Policies
CREATE POLICY "Users can view their own bookings" ON bookings FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Managers can view bookings for their lots" ON bookings FOR SELECT USING (
  parking_lot_id IN (SELECT id FROM parking_lots WHERE manager_id IN (SELECT id FROM parking_managers WHERE user_id = auth.uid()))
);
CREATE POLICY "Users can insert own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
-- Updates to bookings are usually handled by Edge Functions with Service Role to ensure safety.
CREATE POLICY "Managers can update bookings for their lots" ON bookings FOR UPDATE USING (
  parking_lot_id IN (SELECT id FROM parking_lots WHERE manager_id IN (SELECT id FROM parking_managers WHERE user_id = auth.uid()))
);
CREATE POLICY "Users can update their own bookings (cancellations)" ON bookings FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Admins have full access to bookings" ON bookings FOR ALL USING (public.is_admin());

-- 8. Reviews Policies
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert their own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Users can update their own reviews" ON reviews FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Users can delete their own reviews" ON reviews FOR DELETE USING (auth.uid() = customer_id);
CREATE POLICY "Admins have full access to reviews" ON reviews FOR ALL USING (public.is_admin());

-- 9. Coupons Policies
CREATE POLICY "Active coupons are viewable by everyone" ON coupons FOR SELECT USING (status = 'active');
CREATE POLICY "Admins have full access to coupons" ON coupons FOR ALL USING (public.is_admin());

-- 10. Audit Logs Policies
CREATE POLICY "Audit logs are viewable only by admins" ON audit_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins have full access to audit logs" ON audit_logs FOR ALL USING (public.is_admin());
