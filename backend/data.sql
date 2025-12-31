-- Fashion E-commerce Database Schema

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS booked_items;
DROP TABLE IF EXISTS rental_items;
DROP TABLE IF EXISTS request_lines;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS deliveries;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS wishlists;
DROP TABLE IF EXISTS sizes;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================
-- Users
-- =========================
CREATE TABLE users (
    iid VARCHAR(128) PRIMARY KEY,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    email VARCHAR(128) NOT NULL UNIQUE,
    pwd VARCHAR(128) NOT NULL,
    confirm_pwd VARCHAR(128) NOT NULL,
    user_role VARCHAR(128) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_user_role (user_role)
) ENGINE=InnoDB;

-- =========================
-- Items
-- =========================
CREATE TABLE items (
    iid VARCHAR(128) PRIMARY KEY,
    item_name VARCHAR(128) NOT NULL,
    item_category VARCHAR(128) NOT NULL,
    gender VARCHAR(128) NOT NULL,
    quantity INT DEFAULT 0,
    item_model VARCHAR(128),
    actual_price FLOAT NOT NULL,
    currency VARCHAR(128) NOT NULL,
    edited_price FLOAT,
    flash_sale INT,
    status_item VARCHAR(128),
    description VARCHAR(256),
    reference VARCHAR(128),
    item_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(128),
    INDEX idx_gender (gender),
    INDEX idx_category (item_category),
    INDEX idx_user_id (user_id),
    CONSTRAINT fk_items_user
        FOREIGN KEY (user_id) REFERENCES users(iid)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- Sizes
-- =========================
CREATE TABLE sizes (
    iid VARCHAR(128) PRIMARY KEY,
    size VARCHAR(128) NOT NULL,
    quantity INT NOT NULL,
    item_id VARCHAR(128),
    INDEX idx_item_id (item_id),
    CONSTRAINT fk_sizes_item
        FOREIGN KEY (item_id) REFERENCES items(iid)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- Wishlists
-- =========================
CREATE TABLE wishlists (
    user_id VARCHAR(128),
    item_id VARCHAR(128),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, item_id),
    CONSTRAINT fk_wishlist_user
        FOREIGN KEY (user_id) REFERENCES users(iid)
        ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_item
        FOREIGN KEY (item_id) REFERENCES items(iid)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- Deliveries
-- =========================
CREATE TABLE deliveries (
    iid VARCHAR(128) PRIMARY KEY,
    region VARCHAR(128) NOT NULL,
    addrs VARCHAR(128) NOT NULL,
    appartment VARCHAR(128) NOT NULL,
    city VARCHAR(128) NOT NULL,
    postcode VARCHAR(128),
    phone VARCHAR(128) NOT NULL,
    save_address TINYINT(1) NOT NULL DEFAULT 1,
    user_id VARCHAR(128),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    CONSTRAINT fk_delivery_user
        FOREIGN KEY (user_id) REFERENCES users(iid)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- Purchases
-- =========================
CREATE TABLE purchases (
    iid VARCHAR(128) PRIMARY KEY,
    buyer_id VARCHAR(128),
    seller_id VARCHAR(128),
    delivery_id VARCHAR(128),
    purchase_status VARCHAR(128) NOT NULL,
    purchase_item_status VARCHAR(128) NOT NULL,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_buyer_id (buyer_id),
    INDEX idx_seller_id (seller_id),
    INDEX idx_purchase_date (purchase_date),
    CONSTRAINT fk_purchase_buyer
        FOREIGN KEY (buyer_id) REFERENCES users(iid)
        ON DELETE SET NULL,
    CONSTRAINT fk_purchase_seller
        FOREIGN KEY (seller_id) REFERENCES users(iid)
        ON DELETE SET NULL,
    CONSTRAINT fk_purchase_delivery
        FOREIGN KEY (delivery_id) REFERENCES deliveries(iid)
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================
-- Request Lines
-- =========================
CREATE TABLE request_lines (
    item_id VARCHAR(128),
    size VARCHAR(128) NOT NULL,
    purchase_id VARCHAR(128),
    quantity INT NOT NULL,
    PRIMARY KEY (item_id, purchase_id),
    INDEX idx_purchase_id (purchase_id),
    CONSTRAINT fk_request_item
        FOREIGN KEY (item_id) REFERENCES items(iid)
        ON DELETE CASCADE,
    CONSTRAINT fk_request_purchase
        FOREIGN KEY (purchase_id) REFERENCES purchases(iid)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- Rental Items
-- =========================
CREATE TABLE rental_items (
    iid VARCHAR(128) PRIMARY KEY,
    item_id VARCHAR(128),
    rental_price_by_days INT NOT NULL,
    currency VARCHAR(128) NOT NULL,
    number_of_days INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_item_id (item_id),
    CONSTRAINT fk_rental_item
        FOREIGN KEY (item_id) REFERENCES items(iid)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- Booked Items
-- =========================
CREATE TABLE booked_items (
    iid VARCHAR(128) PRIMARY KEY,
    rental_item_id VARCHAR(128),
    size_id VARCHAR(128),
    requested_start_date TIMESTAMP NOT NULL,
    duration INT NOT NULL,
    user_id VARCHAR(128),
    owner_id VARCHAR(128),
    delivery_id VARCHAR(128),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_owner_id (owner_id),
    INDEX idx_rental_item_id (rental_item_id),
    CONSTRAINT fk_booked_rental
        FOREIGN KEY (rental_item_id) REFERENCES rental_items(iid)
        ON DELETE CASCADE,
    CONSTRAINT fk_booked_size
        FOREIGN KEY (size_id) REFERENCES sizes(iid)
        ON DELETE SET NULL,
    CONSTRAINT fk_booked_user
        FOREIGN KEY (user_id) REFERENCES users(iid)
        ON DELETE CASCADE,
    CONSTRAINT fk_booked_owner
        FOREIGN KEY (owner_id) REFERENCES users(iid)
        ON DELETE CASCADE,
    CONSTRAINT fk_booked_delivery
        FOREIGN KEY (delivery_id) REFERENCES deliveries(iid)
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================
-- Notifications
-- =========================
CREATE TABLE notifications (
    iid VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128),
    message TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id) REFERENCES users(iid)
        ON DELETE CASCADE
) ENGINE=InnoDB;
