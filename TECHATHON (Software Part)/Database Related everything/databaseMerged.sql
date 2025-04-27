CREATE TABLE users (
    id SERIAL PRIMARY KEY,          -- Auto-incrementing ID as the primary key
    full_name TEXT NOT NULL,        -- Full name of the user
    email TEXT UNIQUE NOT NULL,     -- Email, unique to prevent duplicates
    password TEXT NOT NULL,         -- Password (should be hashed in a real application)
    is_verified BOOLEAN DEFAULT FALSE  -- Verification status, defaults to FALSE
);

-- Restaurant Table
CREATE TABLE Restaurant_Table (
    table_id SERIAL PRIMARY KEY,
    capacity INT NOT NULL,                -- Table's capacity (required)
    availability BOOLEAN NOT NULL DEFAULT TRUE  -- Table's availability status (defaulted to TRUE)
);

-- Item Table
CREATE TABLE Item (
    item_id SERIAL PRIMARY KEY,                           -- Automatically increments to provide unique item IDs
    item_name VARCHAR(255) NOT NULL,                       -- Item name (required)
    description TEXT,                                      -- Description of the item (optional)
    price DOUBLE PRECISION NOT NULL,                       -- Price of the item (required, with support for decimals)
    rating DOUBLE PRECISION CHECK (rating >= 0 AND rating <= 5),  -- Rating with validation between 0 and 5
    availability BOOLEAN NOT NULL DEFAULT TRUE,            -- Availability status, defaulted to TRUE
    discount_percentage DOUBLE PRECISION CHECK (discount_percentage >= 0 AND discount_percentage <= 100) -- Discount percentage (0 to 100)
);

-- OrderPackage Table (package_id is now a unique string)
CREATE TABLE OrderPackage (
    package_id VARCHAR(255) PRIMARY KEY,                    -- Unique package ID (not serial)
    order_at TIMESTAMP NOT NULL,                       -- Date and time when the order was placed
    completed_at TIMESTAMP,                            -- Date and time when the order was completed
    total_price DOUBLE PRECISION NOT NULL,             -- Total price of the package (order)
    status VARCHAR(50) CHECK (status IN ('pending', 'served')) NOT NULL, -- Package status (pending or served)
    table_id INT,                                      -- Foreign key to the Restaurant_Table
    FOREIGN KEY (table_id) REFERENCES Restaurant_Table (table_id) ON DELETE SET NULL  -- Table reference
);

-- Cart Table (referencing package_id as uniqueID is no longer necessary)
CREATE TABLE Cart (
    unique_serial SERIAL PRIMARY KEY,                  -- Unique serial number for each cart item
    package_id VARCHAR(255) NOT NULL,                   -- Unique package ID from OrderPackage table
    item_id INT NOT NULL,                               -- Foreign key to Item table (item_id)
    count INT NOT NULL,                                 -- Quantity of the item in the cart
    FOREIGN KEY (package_id) REFERENCES OrderPackage (package_id) ON DELETE SET NULL,   -- Package reference based on package_id
    FOREIGN KEY (item_id) REFERENCES Item (item_id) ON DELETE SET NULL          -- Item reference
);




-- Insert 5 items into the Item table
INSERT INTO Item (item_name, description, price, rating, availability, discount_percentage)
VALUES
    ('Kacchi', 'A traditional spicy rice dish with meat.', 400, 0, TRUE, 8),
    ('Pasta', 'A classic Italian dish with pasta and sauce.', 200, 0, TRUE, 7),
    ('Grilled Chicken', 'Succulent chicken grilled to perfection.', 300, 0, TRUE, 5),
    ('Milkshake', 'A sweet and creamy milkshake with flavor options.', 100, 0, TRUE, 10),
    ('Reshmi Kabab', 'Tender chicken kababs marinated with spices.', 200, 0, TRUE, 6);


-- Insert 10 tables with specified capacities
INSERT INTO Restaurant_Table (capacity, availability)
VALUES
    (2, TRUE), -- Table 1, capacity 2
    (2, TRUE), -- Table 2, capacity 2
    (2, TRUE), -- Table 3, capacity 2
    (2, TRUE), -- Table 4, capacity 2
    (2, TRUE), -- Table 5, capacity 2
    (5, TRUE), -- Table 6, capacity 5
    (5, TRUE), -- Table 7, capacity 5
    (5, TRUE), -- Table 8, capacity 5
    (5, TRUE), -- Table 9, capacity 5
    (10, TRUE); -- Table 10, capacity 10


-- Indexes for OrderPackage
CREATE INDEX idx_orderpackage_table_id ON OrderPackage (table_id);
CREATE INDEX idx_orderpackage_order_at ON OrderPackage (order_at);
CREATE INDEX idx_orderpackage_status ON OrderPackage (status);

-- Indexes for Cart
CREATE INDEX idx_cart_package_id ON Cart (package_id);
CREATE INDEX idx_cart_item_id ON Cart (item_id);
CREATE INDEX idx_cart_package_id_item_id ON Cart (package_id, item_id);



EXPLAIN ANALYZE
UPDATE OrderPackage
SET total_price = (
    SELECT COALESCE(SUM(c.count * i.price * (1 - i.discount_percentage / 100)), 0)
    FROM Cart c
    JOIN Item i ON c.item_id = i.item_id
    WHERE c.package_id = OrderPackage.package_id
)
WHERE EXISTS (
    SELECT 1
    FROM Cart c
    WHERE c.package_id = OrderPackage.package_id
);


1. Top-Selling Items by Revenue

SELECT 
    i.item_id,
    i.item_name,
    SUM(c.count) AS total_quantity_sold,
    SUM(c.count * i.price * (1 - i.discount_percentage / 100)) AS total_revenue
FROM Cart c
JOIN Item i ON c.item_id = i.item_id
JOIN OrderPackage op ON c.package_id = op.package_id
WHERE op.status = 'served'
GROUP BY i.item_id, i.item_name
ORDER BY total_revenue DESC
LIMIT 5;


2. Peak Order Times
SELECT 
    EXTRACT(HOUR FROM order_at) AS order_hour,
    COUNT(DISTINCT package_id) AS total_orders,
    SUM(total_price) AS total_revenue
FROM OrderPackage
WHERE status = 'served'
GROUP BY order_hour
ORDER BY total_orders DESC;


3. Table Utilization Report
Purpose: Analyze which table sizes are most used to optimize seating arrangements and increase turnover.

SELECT 
    rt.table_id,
    rt.capacity,
    COUNT(op.package_id) AS total_orders,
    SUM(op.total_price) AS total_revenue
FROM Restaurant_Table rt
LEFT JOIN OrderPackage op ON rt.table_id = op.table_id AND op.status = 'served'
GROUP BY rt.table_id, rt.capacity
ORDER BY total_orders DESC;


4.Discount prediction

WITH ItemSales AS (
    SELECT 
        i.item_id,
        i.item_name,
        i.price,
        i.discount_percentage,
        COALESCE(SUM(c.count), 0) AS total_quantity_sold,
        COALESCE(SUM(c.count * i.price * (1 - i.discount_percentage / 100)), 0) AS total_revenue
    FROM Item i
    LEFT JOIN Cart c ON i.item_id = c.item_id
    LEFT JOIN OrderPackage op ON c.package_id = op.package_id AND op.status = 'served'
    GROUP BY i.item_id, i.item_name, i.price, i.discount_percentage
),
RankedItems AS (
    SELECT 
        item_id,
        item_name,
        price,
        discount_percentage,
        total_quantity_sold,
        total_revenue,
        RANK() OVER (ORDER BY total_quantity_sold ASC) AS sales_rank
    FROM ItemSales
    WHERE total_quantity_sold > 0 -- Exclude items with no sales (may need separate promotion)
)
SELECT 
    item_id,
    item_name,
    price,
    discount_percentage,
    total_quantity_sold,
    total_revenue
FROM RankedItems
WHERE sales_rank <= 3 -- Focus on bottom 3 items by sales volume
AND discount_percentage < 15 -- Avoid items with already high discounts
AND price BETWEEN 150 AND 300 -- Target mid-priced items for price sensitivity
ORDER BY total_quantity_sold ASC;

