-- Add visibility range column to parking lots
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS visibility_range_km INTEGER DEFAULT 10;
