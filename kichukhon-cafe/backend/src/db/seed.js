import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
const client = await pool.connect();
try {
 await client.query('BEGIN');
 const adminHash = await bcrypt.hash('Admin123!', 12);
 const userHash = await bcrypt.hash('Customer123!', 12);
 await client.query(`INSERT INTO users(name,email,password_hash,role) VALUES
 ('Kichukhon Admin','admin@kichukhoncafe.com',$1,'admin')
 ON CONFLICT(email) DO NOTHING`, [adminHash]);
 await client.query(`INSERT INTO users(name,email,password_hash,role) VALUES
 ('Demo Customer','customer@example.com',$1,'customer')
 ON CONFLICT(email) DO NOTHING`, [userHash]);
 const cats = ['Burgers','Pizza','Chicken','Biryani','Fast Food','Chinese Food','Desserts','Drinks','Traditional Bangladeshi Food'];
 for (const name of cats) await client.query(
  'INSERT INTO categories(name,slug) VALUES($1,$2) ON CONFLICT(slug) DO NOTHING',
  [name,name.toLowerCase().replaceAll(' ','-')]);
 const r = await client.query(`INSERT INTO restaurants(name,description,address,phone)
 VALUES('Kichukhon Cafe','Fresh food, happy moments','Chattogram, Bangladesh','+8801XXXXXXXXX')
 RETURNING id`);
 const foods = [
 ['Classic Beef Burger','Juicy beef patty, lettuce and house sauce',280,'burgers'],
 ['Smoky Chicken Pizza','Chicken, mozzarella and smoky sauce',650,'pizza'],
 ['Crispy Fried Chicken','Golden crispy chicken pieces',220,'chicken'],
 ['Kacchi Biryani','Aromatic Bangladeshi kacchi biryani',320,'biryani'],
 ['Chicken Chow Mein','Stir-fried noodles with vegetables',260,'chinese-food'],
 ['Chocolate Brownie','Rich chocolate brownie',150,'desserts'],
 ['Fresh Lemonade','Freshly squeezed lemon drink',90,'drinks'],
 ['Beef Tehari','Traditional spicy beef tehari',240,'traditional-bangladeshi-food']
 ];
 for (const [name,description,price,slug] of foods) await client.query(
  `INSERT INTO foods(restaurant_id,category_id,name,description,price,featured)
   SELECT $1,id,$2,$3,$4,TRUE FROM categories WHERE slug=$5
   ON CONFLICT DO NOTHING`,[r.rows[0].id,name,description,price,slug]);
 await client.query('COMMIT');
 console.log('Seed data inserted.');
} catch(e) { await client.query('ROLLBACK'); console.error(e); process.exitCode=1; }
finally { client.release(); await pool.end(); }
