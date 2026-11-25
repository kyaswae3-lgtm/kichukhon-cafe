CREATE TABLE IF NOT EXISTS users (
 id BIGSERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL, email VARCHAR(180) UNIQUE NOT NULL,
 phone VARCHAR(30), password_hash TEXT NOT NULL, role VARCHAR(20) NOT NULL DEFAULT 'customer'
 CHECK (role IN ('customer','admin')), is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS admins (
 id BIGSERIAL PRIMARY KEY, user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS restaurants (
 id BIGSERIAL PRIMARY KEY, name VARCHAR(160) NOT NULL, description TEXT,
 address TEXT, phone VARCHAR(30), image_url TEXT, is_active BOOLEAN DEFAULT TRUE,
 created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS categories (
 id BIGSERIAL PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL, slug VARCHAR(120) UNIQUE NOT NULL,
 image_url TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS foods (
 id BIGSERIAL PRIMARY KEY, restaurant_id BIGINT REFERENCES restaurants(id) ON DELETE SET NULL,
 category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL, name VARCHAR(180) NOT NULL,
 description TEXT, price NUMERIC(10,2) NOT NULL CHECK(price >= 0), image_url TEXT,
 is_available BOOLEAN NOT NULL DEFAULT TRUE, featured BOOLEAN DEFAULT FALSE,
 created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS foods_category_idx ON foods(category_id);
CREATE INDEX IF NOT EXISTS foods_name_idx ON foods USING GIN (to_tsvector('simple', name));
CREATE TABLE IF NOT EXISTS carts (
 id BIGSERIAL PRIMARY KEY, user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS cart_items (
 id BIGSERIAL PRIMARY KEY, cart_id BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
 food_id BIGINT NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
 quantity INT NOT NULL CHECK(quantity > 0), UNIQUE(cart_id,food_id)
);
CREATE TABLE IF NOT EXISTS addresses (
 id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 label VARCHAR(60), recipient_name VARCHAR(120) NOT NULL, phone VARCHAR(30) NOT NULL,
 address_line TEXT NOT NULL, area VARCHAR(120), city VARCHAR(120) NOT NULL,
 is_default BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS coupons (
 id BIGSERIAL PRIMARY KEY, code VARCHAR(40) UNIQUE NOT NULL, discount_type VARCHAR(20) NOT NULL
 CHECK(discount_type IN ('percent','fixed')), discount_value NUMERIC(10,2) NOT NULL CHECK(discount_value > 0),
 min_order NUMERIC(10,2) DEFAULT 0, max_discount NUMERIC(10,2), usage_limit INT,
 used_count INT DEFAULT 0, expires_at TIMESTAMPTZ, is_active BOOLEAN DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS orders (
 id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id),
 address_id BIGINT REFERENCES addresses(id) ON DELETE SET NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'Pending' CHECK(status IN
 ('Pending','Confirmed','Preparing','Ready for Pickup','Out for Delivery','Delivered','Cancelled')),
 subtotal NUMERIC(10,2) NOT NULL, discount NUMERIC(10,2) NOT NULL DEFAULT 0,
 delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0, total NUMERIC(10,2) NOT NULL,
 coupon_code VARCHAR(40), payment_method VARCHAR(30) NOT NULL,
 payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending'
 CHECK(payment_status IN ('Pending','Paid','Failed','Refunded')),
 delivery_notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE TABLE IF NOT EXISTS order_items (
 id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 food_id BIGINT REFERENCES foods(id) ON DELETE SET NULL, food_name VARCHAR(180) NOT NULL,
 unit_price NUMERIC(10,2) NOT NULL, quantity INT NOT NULL CHECK(quantity > 0),
 line_total NUMERIC(10,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
 id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 provider VARCHAR(30) NOT NULL, provider_transaction_id VARCHAR(180),
 amount NUMERIC(10,2) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'Pending',
 raw_reference TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS reviews (
 id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 food_id BIGINT NOT NULL REFERENCES foods(id) ON DELETE CASCADE, order_id BIGINT REFERENCES orders(id),
 rating INT NOT NULL CHECK(rating BETWEEN 1 AND 5), comment TEXT,
 created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id,food_id,order_id)
);
CREATE TABLE IF NOT EXISTS favorites (
 id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 food_id BIGINT NOT NULL REFERENCES foods(id) ON DELETE CASCADE, created_at TIMESTAMPTZ DEFAULT NOW(),
 UNIQUE(user_id,food_id)
);
