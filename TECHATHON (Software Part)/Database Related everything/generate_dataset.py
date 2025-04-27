import random
from datetime import datetime, timedelta

# Define constants
START_DATE = datetime(2025, 3, 1)
DAYS = 50
TABLES = [
    {"table_id": 1, "capacity": 2}, {"table_id": 2, "capacity": 2}, {"table_id": 3, "capacity": 2},
    {"table_id": 4, "capacity": 2}, {"table_id": 5, "capacity": 2}, {"table_id": 6, "capacity": 5},
    {"table_id": 7, "capacity": 5}, {"table_id": 8, "capacity": 5}, {"table_id": 9, "capacity": 5},
    {"table_id": 10, "capacity": 10}
]
ITEMS = [
    {"item_id": 1, "name": "Kacchi", "price": 400, "type": "heavy"},
    {"item_id": 2, "name": "Pasta", "price": 200, "type": "light"},
    {"item_id": 3, "name": "Grilled Chicken", "price": 300, "type": "heavy"},
    {"item_id": 4, "name": "Milkshake", "price": 100, "type": "light"},
    {"item_id": 5, "name": "Reshmi Kabab", "price": 200, "type": "light"}
]
SQL_FILE = "bistro92_orders.sql"

# Function to generate random timestamp within a time range
def random_timestamp(date, start_hour, end_hour):
    hour = random.randint(start_hour, end_hour)
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    return datetime(date.year, date.month, date.day, hour, minute, second)

# Function to generate package_id
def generate_package_id(table_id, timestamp, counter):
    timestamp_str = timestamp.strftime("%Y%m%d%H%M%S")
    return f"{table_id:02d}{timestamp_str}{counter:02d}"

# Function to determine order count based on day and table
def get_order_count(date, table):
    is_friday = date.weekday() == 4  # Friday is holiday
    base_orders = random.randint(100, 200)  # Base orders per day
    if is_friday:
        base_orders = int(base_orders * 1.5)  # 50% more orders on holiday
    if table["capacity"] <= 2:
        table_orders = int(base_orders * 0.15)  # Small tables make more orders
    elif table["capacity"] == 5:
        table_orders = int(base_orders * 0.1)
    else:  # capacity 10
        table_orders = int(base_orders * 0.05)  # Large tables make fewer orders
    return max(1, table_orders)  # Ensure at least 1 order

# Function to determine cart item count based on table capacity
def get_cart_item_count(capacity):
    if capacity <= 2:
        return random.randint(1, 3)  # Small tables, fewer items
    elif capacity == 5:
        return random.randint(2, 5)
    else:  # capacity 10
        return random.randint(4, 8)  # Large tables, more items

# Function to select items based on time of day
def select_items(timestamp):
    hour = timestamp.hour
    selected_item_ids = set()  # Track item_ids to avoid duplicates
    items = []
    
    if 11 <= hour <= 14:  # Noon hours, prefer heavy foods
        heavy_items = [item for item in ITEMS if item["type"] == "heavy"]
        light_items = [item for item in ITEMS if item["type"] == "light"]
        # Add 1–2 heavy items
        for _ in range(random.randint(1, 2)):
            item = random.choice(heavy_items)
            if item["item_id"] not in selected_item_ids:
                items.append(item)
                selected_item_ids.add(item["item_id"])
        # 30% chance to add a light item
        if random.random() < 0.3 and light_items:
            item = random.choice(light_items)
            if item["item_id"] not in selected_item_ids:
                items.append(item)
                selected_item_ids.add(item["item_id"])
    else:  # Evening or other times, prefer light foods
        light_items = [item for item in ITEMS if item["type"] == "light"]
        heavy_items = [item for item in ITEMS if item["type"] == "heavy"]
        # Add 1–2 light items
        for _ in range(random.randint(1, 2)):
            item = random.choice(light_items)
            if item["item_id"] not in selected_item_ids:
                items.append(item)
                selected_item_ids.add(item["item_id"])
        # 30% chance to add a heavy item
        if random.random() < 0.3 and heavy_items:
            item = random.choice(heavy_items)
            if item["item_id"] not in selected_item_ids:
                items.append(item)
                selected_item_ids.add(item["item_id"])
    
    return items

# Function to calculate completion time based on order density, holiday, and time of day
def calculate_completed_at(order_at, order_density, is_friday, is_noon, is_evening):
    base_minutes = random.randint(30, 45)  # Base completion time: 30–45 minutes
    
    # Adjustments for specific conditions
    if is_friday:
        base_minutes += random.randint(5, 10)  # Add 5–10 minutes on holidays
    if is_noon or is_evening:
        base_minutes += random.randint(3, 7)  # Add 3–7 minutes during noon or evening
    
    # Adjustments for order density
    if order_density > 10:  # High density increases time
        base_minutes += random.randint(5, 10)
    elif order_density < 5:  # Low density decreases time
        base_minutes -= random.randint(5, 10)
    
    # Ensure completion time stays between 15–60 minutes
    base_minutes = max(15, min(60, base_minutes))
    return order_at + timedelta(minutes=base_minutes)

# Main function to generate SQL
def generate_sql():
    with open(SQL_FILE, "w") as f:
        f.write("-- SQL Insert Statements for OrderPackage and Cart\n\n")
        
        current_date = START_DATE
        for day in range(DAYS):
            date = current_date + timedelta(days=day)
            is_friday = date.weekday() == 4  # Check if it's a Friday (holiday)
            
            for table in TABLES:
                order_count = get_order_count(date, table)
                # Cluster orders: 50% noon (11–14), 40% evening (18–22), 10% other
                noon_orders = int(order_count * 0.5)
                evening_orders = int(order_count * 0.4)
                other_orders = order_count - noon_orders - evening_orders
                
                # Track orders per hour to estimate density
                orders_by_hour = {h: [] for h in range(24)}
                
                # Noon orders (11–14)
                for _ in range(noon_orders):
                    timestamp = random_timestamp(date, 11, 14)
                    orders_by_hour[timestamp.hour].append(timestamp)
                
                # Evening orders (18–22)
                for _ in range(evening_orders):
                    timestamp = random_timestamp(date, 18, 22)
                    orders_by_hour[timestamp.hour].append(timestamp)
                
                # Other times (8–23, excluding noon and evening)
                other_hours = [h for h in range(8, 24) if h not in range(11, 15) and h not in range(18, 23)]
                for _ in range(other_orders):
                    timestamp = random_timestamp(date, min(other_hours), max(other_hours))
                    orders_by_hour[timestamp.hour].append(timestamp)
                
                # Generate orders
                counter = 0
                for hour in orders_by_hour:
                    for timestamp in sorted(orders_by_hour[hour]):
                        counter += 1
                        package_id = generate_package_id(table["table_id"], timestamp, counter)
                        order_density = len(orders_by_hour[hour])
                        is_noon = 11 <= timestamp.hour <= 14
                        is_evening = 18 <= timestamp.hour <= 22
                        
                        # Calculate completion time with adjustments
                        completed_at = calculate_completed_at(
                            timestamp, order_density, is_friday, is_noon, is_evening
                        )
                        status = "served"  # All orders are served
                        completed_at_str = f"'{completed_at.strftime('%Y-%m-%d %H:%M:%S')}'"
                        
                        # Insert OrderPackage
                        f.write(f"""INSERT INTO OrderPackage (package_id, order_at, completed_at, total_price, status, table_id)
VALUES ('{package_id}', '{timestamp.strftime('%Y-%m-%d %H:%M:%S')}', {completed_at_str}, 0.0, '{status}', {table["table_id"]});\n""")
                        
                        # Insert Cart items
                        cart_item_count = get_cart_item_count(table["capacity"])
                        selected_items = select_items(timestamp)
                        for _ in range(min(cart_item_count, len(selected_items))):
                            item = random.choice(selected_items)
                            count = random.randint(1, 3) if table["capacity"] <= 5 else random.randint(2, 5)
                            f.write(f"""INSERT INTO Cart (package_id, item_id, count)
VALUES ('{package_id}', {item["item_id"]}, {count});\n""")
                
                f.write("\n")
    
    print(f"SQL file generated: {SQL_FILE}")

if __name__ == "__main__":
    generate_sql()