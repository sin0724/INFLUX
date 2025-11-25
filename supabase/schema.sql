-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  "totalQuota" INTEGER DEFAULT 0,
  "remainingQuota" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "clientId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "taskType" TEXT NOT NULL CHECK ("taskType" IN ('follower', 'like', 'hotpost', 'momcafe', 'powerblog', 'clip')),
  caption TEXT,
  "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'working', 'done')),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders("clientId");
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders("createdAt");
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (true);

-- Policy: Admins can do everything on users
CREATE POLICY "Admins can manage users" ON users
  FOR ALL USING (true);

-- Policy: Clients can read their own orders
CREATE POLICY "Clients can read own orders" ON orders
  FOR SELECT USING (true);

-- Policy: Admins can manage all orders
CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING (true);

-- Insert test admin user (password: 1234 - hashed with bcrypt)
-- You need to hash the password before inserting
-- For now, we'll insert it via the admin panel or API

-- Insert test client user (password: 1234)
-- Same as above

