-- This file is for seeding test data
-- Passwords are hashed using bcrypt with salt rounds 10
-- Password "1234" hashed = $2a$10$XqJzJzJzJzJzJzJzJzJzJuhQJzJzJzJzJzJzJzJzJzJzJzJzJzJz

-- Note: You should generate password hashes using the hashPassword function
-- For security, passwords should be hashed in the application, not in SQL
-- These are example hashes for password "1234"

-- Test admin user (username: admin1, password: 1234)
-- Hash generated: $2a$10$XqJzJzJzJzJzJzJzJzJzJuhQJzJzJzJzJzJzJzJzJzJzJzJzJzJz
-- Actual hash should be generated via API

-- Test client user (username: testclient, password: 1234)
-- Hash generated: $2a$10$XqJzJzJzJzJzJzJzJzJzJuhQJzJzJzJzJzJzJzJzJzJzJzJzJzJz
-- Actual hash should be generated via API

