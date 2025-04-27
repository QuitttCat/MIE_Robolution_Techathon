-- -- Item Table
-- CREATE TABLE Item (
--     item_id SERIAL PRIMARY KEY,                           -- Automatically increments to provide unique item IDs
--     item_name VARCHAR(255) NOT NULL,                       -- Item name (required)
--     description TEXT,                                      -- Description of the item (optional)
--     price DOUBLE PRECISION NOT NULL,                       -- Price of the item (required, with support for decimals)
--     rating DOUBLE PRECISION CHECK (rating >= 0 AND rating <= 5),  -- Rating with validation between 0 and 5
--     availability BOOLEAN NOT NULL DEFAULT TRUE,            -- Availability status, defaulted to TRUE
--     discount_percentage DOUBLE PRECISION CHECK (discount_percentage >= 0 AND discount_percentage <= 100) -- Discount percentage (0 to 100)
-- );

-- -- Restaurant Table
-- CREATE TABLE Restaurant_Table (
--     table_id SERIAL PRIMARY KEY,
--     capacity INT NOT NULL,                -- Table's capacity (required)
--     availability BOOLEAN NOT NULL DEFAULT TRUE  -- Table's availability status (defaulted to TRUE)
-- );


-- CREATE TABLE OrderPackage (
--     package_id SERIAL PRIMARY KEY,                    -- Unique package ID (primary key)
--     order_at TIMESTAMP NOT NULL,                       -- Date and time when the order was placed
--     completed_at TIMESTAMP,                            -- Date and time when the order was completed
--     total_price DOUBLE PRECISION NOT NULL,             -- Total price of the package (order)
--     status VARCHAR(50) CHECK (status IN ('pending', 'served')) NOT NULL, -- Package status (pending or served)
--     table_id INT,                                      -- Foreign key to the Restaurant_Table
--     uniqueID VARCHAR(255) UNIQUE NOT NULL,              -- Unique ID for the package (string)
--     FOREIGN KEY (table_id) REFERENCES Restaurant_Table (table_id) ON DELETE SET NULL  -- Table reference
-- );

-- CREATE TABLE Cart (
--     unique_serial SERIAL PRIMARY KEY,                  -- Unique serial number for each cart item
--     uniqueID VARCHAR(255) NOT NULL,                     -- Unique ID from OrderPackage table
--     item_id INT NOT NULL,                               -- Foreign key to Item table (item_id)
--     count INT NOT NULL,                                 -- Quantity of the item in the cart
--     FOREIGN KEY (uniqueID) REFERENCES OrderPackage (uniqueID) ON DELETE CASCADE,   -- Package reference based on uniqueID
--     FOREIGN KEY (item_id) REFERENCES Item (item_id) ON DELETE CASCADE          -- Item reference
-- );


-- CREATE TABLE Payment (
--     payment_serial SERIAL PRIMARY KEY,            -- Unique serial for each payment
--     package_id INT NOT NULL,                      -- Foreign key to OrderPackage table (package_id)
--     payment_status VARCHAR(50) CHECK (payment_status IN ('completed', 'failed', 'pending')) NOT NULL, -- Payment status
--     payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp for when the payment was made
--     payment_amount DOUBLE PRECISION NOT NULL,     -- Amount paid
--     FOREIGN KEY (package_id) REFERENCES OrderPackage (package_id) ON DELETE CASCADE  -- Link to the OrderPackage table
-- );



-- -- OrderPackage Table
-- -- CREATE TABLE OrderPackage (
-- --     package_id SERIAL PRIMARY KEY,                    -- Unique package ID (primary key)
-- --     order_at TIMESTAMP NOT NULL,                       -- Date and time when the order was placed
-- --     completed_at TIMESTAMP,                            -- Date and time when the order was completed
-- --     total_price DOUBLE PRECISION NOT NULL,             -- Total price of the package (order)
-- --     status VARCHAR(50) CHECK (status IN ('pending', 'served')) NOT NULL, -- Package status (pending or served)
-- --     table_id INT,                                      -- Foreign key to the Restaurant_Table
-- --     FOREIGN KEY (table_id) REFERENCES Restaurant_Table (table_id) ON DELETE SET NULL  -- Table reference
-- -- );

-- -- Cart Table
-- -- CREATE TABLE Cart (
-- --     unique_serial SERIAL PRIMARY KEY,                  -- Unique serial number for each cart item
-- --     package_id INT NOT NULL,                            -- Foreign key to OrderPackage table (package_id)
-- --     item_id INT NOT NULL,                               -- Foreign key to Item table (item_id)
-- --     count INT NOT NULL,                                 -- Quantity of the item in the cart
-- --     FOREIGN KEY (package_id) REFERENCES OrderPackage (package_id) ON DELETE CASCADE,   -- Package reference
-- --     FOREIGN KEY (item_id) REFERENCES Item (item_id) ON DELETE CASCADE          -- Item reference
-- -- );

-- CREATE TABLE Payment (
--     payment_serial SERIAL PRIMARY KEY,            -- Unique serial for each payment
--     package_id INT NOT NULL,                      -- Foreign key to OrderPackage table (package_id)
--     payment_status VARCHAR(50) CHECK (payment_status IN ('completed', 'failed', 'pending')) NOT NULL, -- Payment status
--     payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp for when the payment was made
--     payment_amount DOUBLE PRECISION NOT NULL,     -- Amount paid
--     FOREIGN KEY (package_id) REFERENCES OrderPackage (package_id) ON DELETE CASCADE  -- Link to the OrderPackage table
-- );


-- -- Index on OrderPackage's table_id for quick lookups based on table_id
-- CREATE INDEX idx_orderpackage_table_id ON OrderPackage(table_id);

-- -- Index on Cart's package_id and item_id for fast access to cart items per order
-- CREATE INDEX idx_cart_package_id ON Cart(package_id);
-- CREATE INDEX idx_cart_item_id ON Cart(item_id);

-- -- Index on Payment's package_id for fast lookup of payments by order
-- CREATE INDEX idx_payment_package_id ON Payment(package_id);
-- Method: POST, Route: /add-order-package, Data: {"order_at":"2025-04-25T18:00:00Z","completed_at":null,"total_price":24.97,"status":"pending","table_id":5}
-- Method: POST, Route: /add-cart-item, Data: {"package_id":1,"item_id":101,"count":2}
-- Method: POST, Route: /add-cart-item, Data: {"package_id":1,"item_id":102,"count":1}



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


CREATE INDEX idx_orderpackage_order_at ON OrderPackage (order_at);
CREATE INDEX idx_orderpackage_table_id ON OrderPackage (table_id);
CREATE INDEX idx_cart_package_id ON Cart (package_id);
CREATE INDEX idx_cart_item_id ON Cart (item_id);
-- Create Payment Table


CREATE TABLE Payment (
    payment_serial SERIAL PRIMARY KEY,             -- Unique serial for each payment
    package_id VARCHAR(255) NOT NULL,              -- Foreign key to OrderPackage table (package_id)
    payment_status VARCHAR(50) CHECK (payment_status IN ('completed', 'failed', 'pending')) NOT NULL, -- Payment status
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp for when the payment was made
    payment_amount DOUBLE PRECISION NOT NULL,      -- Amount paid
    FOREIGN KEY (package_id) REFERENCES OrderPackage (package_id) ON DELETE SET NULL -- Link to the OrderPackage table
);

CREATE INDEX idx_orderpackage_order_at ON OrderPackage (order_at);
CREATE INDEX idx_orderpackage_table_id ON OrderPackage (table_id);
CREATE INDEX idx_cart_package_id ON Cart (package_id);
CREATE INDEX idx_cart_item_id ON Cart (item_id);


DELETE FROM Cart;
DELETE FROM Payment;
DELETE FROM OrderPackage;
DELETE FROM Item;
DELETE FROM Restaurant_Table;


SELECT 
    op.package_id,
    rt.table_id,
    rt.capacity AS table_capacity,
    op.order_at,
    ARRAY_AGG(i.item_name) AS items_ordered,  -- Aggregate items ordered in a single array
    SUM(c.count * i.price) AS total_order_price -- Calculate the total price of the order
FROM 
    OrderPackage op
JOIN 
    Restaurant_Table rt ON op.table_id = rt.table_id
JOIN 
    Cart c ON c.package_id = op.package_id
JOIN 
    Item i ON c.item_id = i.item_id
WHERE 
    op.order_at > NOW() - INTERVAL '1 hour'  -- Filter for orders in the last hour
GROUP BY 
    op.package_id, rt.table_id, rt.capacity, op.order_at  -- Group by order package to aggregate items and calculate price
ORDER BY 
    op.order_at DESC;  -- Order by the most recent orders first

Method: POST, Route: /add-item, Data: {"item_name":"Spriaaaaaaaaaaaang sjufibjRolls11112222","description":"Crispy vegetable rolls2","price":5.99,"rating":4.5,"availability":true,"discount_percentage":0}
Method: POST, Route: /add-item, Data: {"item_name":"Spriaaaaaaaaaaaaang mldnsnksjfndjkRolls222233333","description":"Crispy vegetable rolls3","price":5.99,"rating":4.5,"availability":true,"discount_percentage":0}



SELECT 
    op.package_id,
    rt.table_id,
    op.order_at
FROM 
    OrderPackage op
    INNER JOIN Restaurant_Table rt ON op.table_id = rt.table_id
WHERE 
    op.status = 'pending'
ORDER BY 
    op.order_at ASC;


