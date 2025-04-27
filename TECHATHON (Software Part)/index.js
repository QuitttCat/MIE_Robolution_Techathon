const express = require('express');
const fs = require('fs').promises; // Use promises for cleaner async/await
const app = express();
const PORT = 3000;
const path = require('path');
const { Pool } = require('pg');
const session = require('express-session');
const nodemailer = require('nodemailer');


// Static Files
app.use(express.static('public'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // For JSON body parsing

// Database
const pool = new Pool({
  connectionString: 'postgresql://postgres.acpamataaqxxvttmcrwq:GeRuBrQ3mQFjDA5u@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

// Test database connection
pool.connect()
  .then(() => console.log("PostgreSQL database connected successfully."))
  .catch((err) => console.error("Error connecting to PostgreSQL database:", err.stack));

// Sessions
app.use(session({
  secret: 'espelliarmus-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'espelliarmus123@gmail.com',
    pass: 'wewl wvkp yqob vetm'
  }
});

const otpStore = {};
let latestEmail = '';

// Registration
app.post('/register', async (req, res) => {
  const { fullname, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.send("❌ Passwords do not match.");
  }

  const strongEnough = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
  if (!strongEnough) {
    return res.send("❌ Password must be at least 8 characters, include a number and an uppercase letter.");
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  otpStore[email] = { otp, fullname, email, password };
  latestEmail = email;

  const mailOptions = {
    from: 'espelliarmus123@gmail.com',
    to: email,
    subject: 'Your OTP Code - EspelliARMus 🍽️',
    text: `Hello ${fullname},\n\nYour OTP code is: ${otp}\n\nEnter it to verify your account.`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ OTP sent to:", email, "→", otp);
    res.send(`✅ OTP sent to your email (${email})!<br><a href="/verify.html">Click here to enter OTP and verify</a>`);
  } catch (err) {
    console.error("❌ Error sending email:", err);
    res.status(500).send("❌ Failed to send OTP email.");
  }  
});

// OTP Verification
app.post('/verify-otp', async (req, res) => {
  const { otp } = req.body;
  const email = latestEmail;
  const stored = otpStore[email];

  if (!stored || stored.otp != otp) {
    return res.send("❌ Invalid OTP. Please try again.");
  }

  try {
    await pool.query(
      'INSERT INTO users (fullname, email, password, is_verified) VALUES ($1, $2, $3, $4)',
      [stored.fullname, stored.email, stored.password, true]
    );
    delete otpStore[email];
    res.redirect('/auth.html?success=1');
  } catch (err) {
    console.error("❌ DB Error:", err);
    res.status(500).send("❌ Failed to save user to database.");
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.send("❌ No account found with that email.");
    }

    const user = result.rows[0];
    if (user.password !== password) {
      return res.send("❌ Incorrect password.");
    }

    req.session.user = {
      id: user.id,
      fullname: user.fullname,
      email: user.email
    };

    res.redirect('/dashboard');
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).send("❌ Something went wrong during login.");
  }
});

// Dashboard Route
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth.html');
  }
  if (req.session.user.fullname.toLowerCase() === 'admin') {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  } else {
    res.send(`Hello, ${req.session.user.fullname}! Welcome to EspelliARMus.`);
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.send("❌ Error logging out");
    }
    res.redirect('/auth.html');
  });
});

// Orders Route (admin view)
app.get('/orders', (req, res) => {
  if (!req.session.user || req.session.user.email !== 'admin') {
    return res.status(403).send("❌ Unauthorized. Admins only.");
  }
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html')); // Show same dashboard.html for orders too
});

// API to get all orders
app.get('/api/orders', async (req, res) => {
  try {
    // const ordersResult = await pool.query('SELECT * FROM "orderpackage" ORDER BY order_at ASC');
    const ordersResult = await pool.query(`
      SELECT * 
      FROM "orderpackage" 
      WHERE order_at >= NOW() - INTERVAL '24 hours'
      ORDER BY order_at DESC
      LIMIT 20
    `); 
    const orders = ordersResult.rows;
    console.log(orders.length);
    


    const fullOrders = [];

    for (const order of orders) {
      const cartResult = await pool.query(
        'SELECT c.count, i.item_name FROM "cart" c JOIN "item" i ON c.item_id = i.item_id WHERE c.package_id = $1',
        [order.package_id]
      );
      const items = cartResult.rows.map(row => ({
        food: row.item_name,
        count: row.count
      }));

      let tableInfo = null;
      if (order.table_id) {
        const tableResult = await pool.query('SELECT * FROM "restaurant_table" WHERE table_id = $1', [order.table_id]);
        tableInfo = tableResult.rows[0];
      }

      fullOrders.push({
        package_id: order.package_id,
        order_at: order.order_at,
        completed_at: order.completed_at,
        status: order.status,
        total_price: order.total_price,
        table: tableInfo ? `Table ${tableInfo.table_id}` : 'N/A',
        items: items
      });
    }

    res.json(fullOrders);
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// API to mark order as served
app.post('/api/mark-served', async (req, res) => {
  const { package_id } = req.body;

  try {
    await pool.query('UPDATE "orderpackage" SET status = $1, completed_at = NOW() WHERE package_id = $2', ['served', package_id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error updating order status:", err);
    res.status(500).json({ error: 'Failed to update order.' });
  }
});


// Fetch items and write to items.txt
async function fetchItemsAndWriteToFile() {
  try {
    const res = await pool.query('SELECT * FROM Item');
    const items = res.rows;

    // Create a string with all item details, including item_id
    let itemsData = new Date().toISOString().slice(0, 19).replace('T', ' ') + '\n';
    console.log(itemsData)



    
    items.forEach(item => {
      itemsData += `Item ID: ${item.item_id}, Item: ${item.item_name}, Price: ${item.price}, Rating: ${item.rating}, Availability: ${item.availability}, Discount: ${item.discount_percentage}%\n`;
    });

    // Write the items data to items.txt
    await fs.writeFile('./items.txt', itemsData);
    console.log('Items written to items.txt');
  } catch (err) {
    console.error('Error fetching items and writing to file:', err.stack);
  }
}

// Call fetchItemsAndWriteToFile at startup
fetchItemsAndWriteToFile();

// POST method for adding an item
app.post('/add-item', async (req, res) => {
  const { item_name, description, price, rating, availability, discount_percentage } = req.body;
  const query = 'INSERT INTO item (item_name, description, price, rating, availability, discount_percentage) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
  try {
    const result = await pool.query(query, [item_name, description, price, rating, availability, discount_percentage]);
    await fetchItemsAndWriteToFile();
    res.json({ message: 'Item added successfully', item: result.rows[0] });
  } catch (err) {
    console.error('Error inserting item:', err.stack);
    res.status(500).send('Error inserting item');
  }
});

// POST method for adding a restaurant table
app.post('/add-restaurant-table', async (req, res) => {
  const { capacity, availability } = req.body;
  const query = 'INSERT INTO restaurant_table (capacity, availability) VALUES ($1, $2) RETURNING *';
  try {
    const result = await pool.query(query, [capacity, availability]);
    res.json({ message: 'Restaurant table added successfully', table: result.rows[0] });
  } catch (err) {
    console.error('Error inserting restaurant table:', err.stack);
    res.status(500).send('Error inserting restaurant table');
  }
});

// POST method for adding an order package
app.post('/add-order-package', async (req, res) => {
  const { package_id, order_at, completed_at, total_price, status, table_id } = req.body;
  const query = 'INSERT INTO orderpackage (package_id, order_at, completed_at, total_price, status, table_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
  try {
    const result = await pool.query(query, [package_id, order_at, completed_at, total_price, status, table_id]);
    res.json({ message: 'Order package added successfully', order: result.rows[0] });
  } catch (err) {
    console.error('Error inserting order package:', err.stack);
    res.status(500).send('Error inserting order package');
  }
});

// POST method for adding a cart item
app.post('/add-cart-item', async (req, res) => {
  const { package_id, item_id, count } = req.body;
  const query = 'INSERT INTO cart (package_id, item_id, count) VALUES ($1, $2, $3) RETURNING *';
  try {
    const result = await pool.query(query, [package_id, item_id, count]);
    res.json({ message: 'Cart item added successfully', cart: result.rows[0] });
  } catch (err) {
    console.error('Error inserting cart item:', err.stack);
    res.status(500).send('Error inserting cart item');
  }
});

// POST method for adding payment
app.post('/add-payment', async (req, res) => {
  const { package_id, payment_status, payment_amount } = req.body;
  const query = 'INSERT INTO Payment (package_id, payment_status, payment_amount) VALUES ($1, $2, $3) RETURNING *';
  try {
    const result = await pool.query(query, [package_id, payment_status, payment_amount]);
    res.json({ message: 'Payment added successfully', payment: result.rows[0] });
  } catch (err) {
    console.error('Error inserting payment:', err.stack);
    res.status(500).send('Error inserting payment');
  }
});


// API to get statistics
app.get('/api/stats', async (req, res) => {
  try {
    // Average fulfillment time for served orders
    const avgTimeResult = await pool.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (completed_at - order_at))) AS avg_fulfillment_seconds
      FROM "orderpackage"
      WHERE status = 'served' AND completed_at IS NOT NULL
    `);

    const avgFulfillmentSeconds = avgTimeResult.rows[0].avg_fulfillment_seconds || 0;
    const avgMinutes = (avgFulfillmentSeconds / 60).toFixed(2);

    // Total sales in last 24 hours
    const salesResult = await pool.query(`
      SELECT COALESCE(SUM(total_price), 0) AS total_sales
      FROM "orderpackage"
      WHERE status = 'served' AND completed_at >= NOW() - INTERVAL '24 hours'
    `);

    const totalSales = salesResult.rows[0].total_sales.toFixed(2);

    res.json({
      avgMinutes,
      totalSales
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});




// API to get orders placed within the last hour
app.get('/api/last-hour-orders', async (req, res) => {
  try {
      const lastHourResult = await pool.query(`
          SELECT * 
          FROM "orderpackage" 
          WHERE order_at >= NOW() - INTERVAL '1 hour' 
          ORDER BY order_at DESC
      `);

      const orders = lastHourResult.rows;

      const fullOrders = [];

      // Fetch additional data like cart items and table info
      for (const order of orders) {
          const cartResult = await pool.query(
              'SELECT c.count, i.item_name FROM "cart" c JOIN "item" i ON c.item_id = i.item_id WHERE c.package_id = $1',
              [order.package_id]
          );
          const items = cartResult.rows.map(row => ({
              food: row.item_name,
              count: row.count
          }));

          let tableInfo = null;
          if (order.table_id) {
              const tableResult = await pool.query('SELECT * FROM "restaurant_table" WHERE table_id = $1', [order.table_id]);
              tableInfo = tableResult.rows[0];
          }

          fullOrders.push({
              package_id: order.package_id,
              order_at: order.order_at,
              completed_at: order.completed_at,
              status: order.status,
              total_price: order.total_price,
              table: tableInfo ? `Table ${tableInfo.table_id}` : 'N/A',
              items: items
          });
      }

      res.json(fullOrders);
  } catch (err) {
      console.error('❌ Error fetching last hour orders:', err);
      res.status(500).json({ error: 'Failed to fetch last hour orders' });
  }
});





// Helper functions for database operations
async function addItem(parsedData) {
  const { item_name, description, price, rating, availability, discount_percentage } = parsedData;
  const query = 'INSERT INTO item (item_name, description, price, rating, availability, discount_percentage) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
  try {
    const result = await pool.query(query, [item_name, description, price, rating, availability, discount_percentage]);
    await fetchItemsAndWriteToFile();
    console.log('Item added successfully:', result.rows[0]);
  } catch (err) {
    console.error('Error inserting item:', err.stack);
  }
}

async function addRestaurantTable(parsedData) {
  const { capacity, availability } = parsedData;
  const query = 'INSERT INTO restaurant_table (capacity, availability) VALUES ($1, $2) RETURNING *';
  try {
    const result = await pool.query(query, [capacity, availability]);
    console.log('Restaurant table added successfully:', result.rows[0]);
  } catch (err) {
    console.error('Error inserting restaurant table:', err.stack);
  }
}



async function addOrderPackage(parsedData) {
  const { package_id, order_at, completed_at, total_price, status, table_id } = parsedData;
  const query = 'INSERT INTO OrderPackage (package_id, order_at, completed_at, total_price, status, table_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
  try {
    const result = await pool.query(query, [package_id, order_at, completed_at, total_price, status, table_id]);
    console.log('Order package added successfully:', result.rows[0]);
  } catch (err) {
    console.error('Error inserting order package:', err.stack);
  }
}

async function addCartItem(parsedData) {
  const { package_id, item_id, count } = parsedData;
  const query = 'INSERT INTO Cart (package_id, item_id, count) VALUES ($1, $2, $3) RETURNING *';
  try {
    const result = await pool.query(query, [package_id, item_id, count]);
    console.log('Cart item added successfully:', result.rows[0]);
  } catch (err) {
    console.error('Error inserting cart item:', err.stack);
  }
}

async function addPayment(parsedData) {
  const { package_id, payment_status, payment_amount } = parsedData;
  const query = 'INSERT INTO Payment (package_id, payment_status, payment_amount) VALUES ($1, $2, $3) RETURNING *';
  try {
    const result = await pool.query(query, [package_id, payment_status, payment_amount]);
    console.log('Payment added successfully:', result.rows[0]);
  } catch (err) {
    console.error('Error inserting payment:', err.stack);
  }
}

// Debounce function to prevent multiple triggers for the same file change
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Function to process data from the text file
const processFile = async () => {
  const filePath = './data.txt';

  try {
    // Read the file content
    const data = await fs.readFile(filePath, 'utf8');

    // Skip if file is empty
    if (!data.trim()) {
      console.log('File is empty, skipping processing.');
      return;
    }

    // Split the file content into lines
    const lines = data.split('\n').filter(line => line.trim());

    // Process each line
    for (let line of lines) {
      const match = line.match(/Method: (\w+), Route: (\S+), Data: (.+)/);
      if (match) {
        const method = match[1];
        const route = match[2];
        const data = match[3];

        // Parse JSON data
        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch (err) {
          console.error('Error parsing JSON data:', err, 'Line:', line);
          continue;
        }

        // Call the appropriate method based on the route
        if (route === '/add-item' && method === 'POST') {
          await addItem(parsedData);
        } else if (route === '/add-restaurant-table' && method === 'POST') {
          await addRestaurantTable(parsedData);
        } else if (route === '/add-order-package' && method === 'POST') {
          await addOrderPackage(parsedData);
        } else if (route === '/add-cart-item' && method === 'POST') {
          await addCartItem(parsedData);
        } else if (route === '/add-payment' && method === 'POST') {
          await addPayment(parsedData);
        } else {
          console.log(`Unsupported route or method: ${method} ${route}`);
        }
      } else {
        console.log('Invalid line format:', line);
      }
    }

    // Clear the file after processing
    await fs.writeFile(filePath, '');
    console.log('File processed and cleared successfully.');
  } catch (err) {
    console.error('Error processing file:', err);
  }
};

// Watch file with debouncing
const watchFile = () => {
  const filePath = './data.txt';

  // Debounced processFile to avoid multiple triggers
  const debouncedProcessFile = debounce(processFile, 500); // 500ms debounce

  // Watch the file for changes
  const watcher = require('fs').watch(filePath, (eventType, filename) => {
    if (eventType === 'change' && filename) {
      console.log(`File ${filename} changed. Triggering processing...`);
      debouncedProcessFile();
    }
  });

  // Handle errors in the watcher
  watcher.on('error', (err) => {
    console.error('Error watching file:', err);
  });
};

// Start watching the file
watchFile();



// API to get payment receipt for a specific order
app.get('/api/paymentreceipt/:package_id', async (req, res) => {
  const { package_id } = req.params;

  try {
    // Fetch order details
    const orderResult = await pool.query(
      'SELECT op.package_id, op.order_at, op.completed_at, op.total_price, op.status, rt.table_id ' +
      'FROM "orderpackage" op ' +
      'LEFT JOIN "restaurant_table" rt ON op.table_id = rt.table_id ' +
      'WHERE op.package_id = $1',
      [package_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Fetch cart items
    const cartResult = await pool.query(
      'SELECT c.unique_serial AS cart_id, c.item_id, c.count AS quantity, i.item_name, i.price, i.discount_percentage ' +
      'FROM "cart" c ' +
      'LEFT JOIN "item" i ON c.item_id = i.item_id ' +
      'WHERE c.package_id = $1',
      [package_id]
    );
    let grandTotal = 0;
    // Format items list
    const items = cartResult.rows.map(row => {
      const total = (row.price || 0) * row.quantity; // Price * Count
      const discount = row.discount_percentage || 0;
      const totalAfterDiscount = total * (1 - discount / 100); // Total after discount
      grandTotal += totalAfterDiscount;
      return {
        item_name: row.item_name || 'Unknown Item',
        count: row.quantity,
        total: total.toFixed(2),
        total_after_discount: totalAfterDiscount.toFixed(2)
      };
    });
    await pool.query(
      'UPDATE "orderpackage" SET total_price = $1 WHERE package_id = $2',
      [grandTotal, package_id]
    );

    // Construct receipt
    const receipt = {
      package_id: order.package_id,
      order_time: new Date(order.order_at).toLocaleString(),
      completion_time: order.completed_at ? new Date(order.completed_at).toLocaleString() : 'N/A',
      table_no: order.table_id ? `Table ${order.table_id}` : 'N/A',
      items: items,
      grand_total: grandTotal.toFixed(2)
    };

    res.json(receipt);
    console.log('Payment receipt fetched successfully:', receipt);
  } catch (err) {
    console.error('❌ Error fetching payment receipt:', err);
    res.status(500).json({ error: 'Failed to fetch payment receipt' });
  }
});
async function getAdvancedSalesReport() {
  try {
      // Top-Selling Items Query
      const topSellingItemsQuery = `
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
      `;

      // Peak Order Times Query
      const peakOrderTimesQuery = `
          SELECT 
              EXTRACT(HOUR FROM order_at) AS order_hour,
              COUNT(DISTINCT package_id) AS total_orders,
              SUM(total_price) AS total_revenue
          FROM OrderPackage
          WHERE status = 'served'
          GROUP BY order_hour
          ORDER BY total_orders DESC
          LIMIT 5;
      `;

      // Table Utilization Query
      const tableUtilizationQuery = `
          SELECT 
              rt.table_id,
              rt.capacity,
              COUNT(op.package_id) AS total_orders,
              SUM(op.total_price) AS total_revenue
          FROM Restaurant_Table rt
          LEFT JOIN OrderPackage op ON rt.table_id = op.table_id AND op.status = 'served'
          GROUP BY rt.table_id, rt.capacity
          ORDER BY total_orders DESC;
      `;

      // Items for Discount Query
      const itemsForDiscountQuery = `
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
              WHERE total_quantity_sold > 0
          )
          SELECT 
              item_id,
              item_name,
              price,
              discount_percentage,
              total_quantity_sold,
              total_revenue
          FROM RankedItems
          WHERE sales_rank <= 3
          AND discount_percentage < 15
          AND price BETWEEN 150 AND 300
          ORDER BY total_quantity_sold ASC
          LIMIT 2
      `;

      // Execute all queries concurrently
      const [topSellingItemsResult, peakOrderTimesResult, tableUtilizationResult, itemsForDiscountResult] = await Promise.all([
          pool.query(topSellingItemsQuery),
          pool.query(peakOrderTimesQuery),
          pool.query(tableUtilizationQuery),
          pool.query(itemsForDiscountQuery),
      ]);

      // Return results with descriptions
      return {
          topSellingItems: {
              description: "Top 5 items generating the highest revenue, useful for promoting high-margin products or optimizing pricing.",
              data: topSellingItemsResult.rows
          },
          peakOrderTimes: {
              description: "Hours with the highest order volume, ideal for scheduling staff and preparing inventory.",
              data: peakOrderTimesResult.rows
          },
          tableUtilization: {
              description: "Table usage by capacity, helping optimize seating arrangements and increase turnover.",
              data: tableUtilizationResult.rows
          },
          itemsForDiscount: {
              description: "Underperforming mid-priced items recommended for discounts to boost sales volume.",
              data: itemsForDiscountResult.rows
          }
      };
  } catch (error) {
      console.error('Error fetching advanced sales report:', error);
      throw new Error('Failed to fetch advanced sales report');
  }
} 
 
// API Endpoint
app.get('/api/reports/advanced-sales', async (req, res) => {
  try {
      const report = await getAdvancedSalesReport();
      console.log(report);
      res.json(report);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});












