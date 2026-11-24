import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { auth, adminOnly } from '../middleware/auth.js';
const router=Router();
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const sign=user=>jwt.sign({sub:user.id,role:user.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'1d'});
const money=n=>Number(Number(n).toFixed(2));

router.get('/health',(req,res)=>res.json({status:'ok',service:'kichukhon-cafe-api'}));
router.post('/auth/register',asyncRoute(async(req,res)=>{
 const data=z.object({name:z.string().min(2).max(120),email:z.string().email(),password:z.string().min(8),phone:z.string().optional()}).parse(req.body);
 const hash=await bcrypt.hash(data.password,12);
 const {rows}=await pool.query('INSERT INTO users(name,email,password_hash,phone) VALUES($1,$2,$3,$4) RETURNING id,name,email,role',
 [data.name,data.email.toLowerCase(),hash,data.phone||null]);
 res.status(201).json({token:sign(rows[0]),user:rows[0]});
}));
router.post('/auth/login',asyncRoute(async(req,res)=>{
 const d=z.object({email:z.string().email(),password:z.string().min(1)}).parse(req.body);
 const q=await pool.query('SELECT id,name,email,role,password_hash,is_active FROM users WHERE email=$1',[d.email.toLowerCase()]);
 const u=q.rows[0];
 if(!u||!u.is_active||!(await bcrypt.compare(d.password,u.password_hash))) return res.status(401).json({message:'Email or password is incorrect'});
 const {password_hash,is_active,...user}=u; res.json({token:sign(user),user});
}));
router.get('/auth/me',auth,(req,res)=>res.json({user:req.user}));
router.patch('/users/me',auth,asyncRoute(async(req,res)=>{
 const d=z.object({name:z.string().min(2).max(120).optional(),phone:z.string().max(30).optional()}).parse(req.body);
 const {rows}=await pool.query('UPDATE users SET name=COALESCE($1,name),phone=COALESCE($2,phone),updated_at=NOW() WHERE id=$3 RETURNING id,name,email,phone,role',
 [d.name??null,d.phone??null,req.user.id]);res.json({user:rows[0]});
}));
router.get('/categories',asyncRoute(async(req,res)=>{const {rows}=await pool.query('SELECT * FROM categories WHERE is_active ORDER BY name');res.json({categories:rows});}));
router.get('/foods',asyncRoute(async(req,res)=>{
 const {q,category,featured}=req.query;
 const {rows}=await pool.query(`SELECT f.*,c.name AS category_name,COALESCE(AVG(rv.rating),0)::numeric(2,1) AS rating
 FROM foods f LEFT JOIN categories c ON c.id=f.category_id LEFT JOIN reviews rv ON rv.food_id=f.id
 WHERE f.is_available AND ($1::text IS NULL OR f.name ILIKE '%'||$1||'%' OR f.description ILIKE '%'||$1||'%')
 AND ($2::text IS NULL OR c.slug=$2) AND ($3::boolean IS NULL OR f.featured=$3)
 GROUP BY f.id,c.name ORDER BY f.featured DESC,f.id DESC`,[q||null,category||null,featured==='true'?true:null]);
 res.json({foods:rows});
}));
router.get('/foods/:id',asyncRoute(async(req,res)=>{
 const {rows}=await pool.query(`SELECT f.*,c.name category_name,COALESCE(AVG(r.rating),0)::numeric(2,1) rating
 FROM foods f LEFT JOIN categories c ON c.id=f.category_id LEFT JOIN reviews r ON r.food_id=f.id
 WHERE f.id=$1 GROUP BY f.id,c.name`,[req.params.id]);
 if(!rows[0])return res.status(404).json({message:'Food not found'});res.json({food:rows[0]});
}));
router.post('/admin/foods',auth,adminOnly,asyncRoute(async(req,res)=>{
 const d=z.object({name:z.string().min(2),description:z.string().optional(),price:z.number().positive(),category_id:z.number().int().optional(),image_url:z.string().url().optional(),is_available:z.boolean().optional(),featured:z.boolean().optional()}).parse(req.body);
 const {rows}=await pool.query(`INSERT INTO foods(name,description,price,category_id,image_url,is_available,featured)
 VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[d.name,d.description||null,d.price,d.category_id||null,d.image_url||null,d.is_available??true,d.featured??false]);
 res.status(201).json({food:rows[0]});
}));
router.patch('/admin/foods/:id',auth,adminOnly,asyncRoute(async(req,res)=>{
 const d=z.object({name:z.string().min(2).optional(),description:z.string().optional(),price:z.number().positive().optional(),category_id:z.number().int().nullable().optional(),image_url:z.string().url().nullable().optional(),is_available:z.boolean().optional(),featured:z.boolean().optional()}).parse(req.body);
 const fields=['name','description','price','category_id','image_url','is_available','featured']; const vals=[]; const sets=[];
 for(const k of fields) if(d[k]!==undefined){vals.push(d[k]);sets.push(`${k}=$${vals.length}`);}
 if(!sets.length)return res.status(400).json({message:'No changes supplied'});
 vals.push(req.params.id);const {rows}=await pool.query(`UPDATE foods SET ${sets.join(',')},updated_at=NOW() WHERE id=$${vals.length} RETURNING *`,vals);
 if(!rows[0])return res.status(404).json({message:'Food not found'});res.json({food:rows[0]});
}));
router.delete('/admin/foods/:id',auth,adminOnly,asyncRoute(async(req,res)=>{await pool.query('DELETE FROM foods WHERE id=$1',[req.params.id]);res.json({message:'Food deleted'});}));
router.post('/admin/categories',auth,adminOnly,asyncRoute(async(req,res)=>{
 const d=z.object({name:z.string().min(2),slug:z.string().min(2)}).parse(req.body);
 const {rows}=await pool.query('INSERT INTO categories(name,slug) VALUES($1,$2) RETURNING *',[d.name,d.slug]);res.status(201).json({category:rows[0]});
}));
router.get('/cart',auth,asyncRoute(async(req,res)=>{
 const c=await pool.query('INSERT INTO carts(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET updated_at=NOW() RETURNING id',[req.user.id]);
 const {rows}=await pool.query(`SELECT ci.id,ci.quantity,f.id food_id,f.name,f.price,f.image_url,(ci.quantity*f.price)::numeric(10,2) line_total
 FROM cart_items ci JOIN foods f ON f.id=ci.food_id WHERE ci.cart_id=$1 ORDER BY ci.id`,[c.rows[0].id]);
 res.json({items:rows,total:money(rows.reduce((s,x)=>s+Number(x.line_total),0))});
}));
router.post('/cart/items',auth,asyncRoute(async(req,res)=>{
 const d=z.object({food_id:z.number().int(),quantity:z.number().int().min(1).max(50).default(1)}).parse(req.body);
 const c=await pool.query('INSERT INTO carts(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET updated_at=NOW() RETURNING id',[req.user.id]);
 const f=await pool.query('SELECT id FROM foods WHERE id=$1 AND is_available=true',[d.food_id]);if(!f.rows[0])return res.status(404).json({message:'Food unavailable'});
 await pool.query(`INSERT INTO cart_items(cart_id,food_id,quantity) VALUES($1,$2,$3)
 ON CONFLICT(cart_id,food_id) DO UPDATE SET quantity=cart_items.quantity+EXCLUDED.quantity`,[c.rows[0].id,d.food_id,d.quantity]);
 res.status(201).json({message:'Cart updated'});
}));
router.patch('/cart/items/:id',auth,asyncRoute(async(req,res)=>{
 const qty=z.number().int().min(1).max(50).parse(req.body.quantity);
 const {rowCount}=await pool.query(`UPDATE cart_items ci SET quantity=$1 FROM carts c WHERE ci.cart_id=c.id AND c.user_id=$2 AND ci.id=$3`,[qty,req.user.id,req.params.id]);
 if(!rowCount)return res.status(404).json({message:'Cart item not found'});res.json({message:'Quantity updated'});
}));
router.delete('/cart/items/:id',auth,asyncRoute(async(req,res)=>{
 await pool.query('DELETE FROM cart_items ci USING carts c WHERE ci.cart_id=c.id AND c.user_id=$1 AND ci.id=$2',[req.user.id,req.params.id]);res.json({message:'Item removed'});
}));
router.post('/addresses',auth,asyncRoute(async(req,res)=>{
 const d=z.object({label:z.string().optional(),recipient_name:z.string().min(2),phone:z.string().min(6),address_line:z.string().min(5),area:z.string().optional(),city:z.string().min(2),is_default:z.boolean().optional()}).parse(req.body);
 if(d.is_default)await pool.query('UPDATE addresses SET is_default=false WHERE user_id=$1',[req.user.id]);
 const {rows}=await pool.query(`INSERT INTO addresses(user_id,label,recipient_name,phone,address_line,area,city,is_default)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[req.user.id,d.label||null,d.recipient_name,d.phone,d.address_line,d.area||null,d.city,d.is_default||false]);
 res.status(201).json({address:rows[0]});
}));
router.get('/addresses',auth,asyncRoute(async(req,res)=>{const {rows}=await pool.query('SELECT * FROM addresses WHERE user_id=$1 ORDER BY is_default DESC,id DESC',[req.user.id]);res.json({addresses:rows});}));
router.post('/coupons/validate',auth,asyncRoute(async(req,res)=>{
 const d=z.object({code:z.string().min(2),subtotal:z.number().positive()}).parse(req.body);
 const {rows}=await pool.query(`SELECT * FROM coupons WHERE code=upper($1) AND is_active AND (expires_at IS NULL OR expires_at>NOW())
 AND (usage_limit IS NULL OR used_count<usage_limit) AND min_order<=$2`,[d.code,d.subtotal]);
 if(!rows[0])return res.status(400).json({message:'Coupon is invalid or does not meet the conditions'});
 const c=rows[0];let discount=c.discount_type==='percent'?d.subtotal*Number(c.discount_value)/100:Number(c.discount_value);
 if(c.max_discount)discount=Math.min(discount,Number(c.max_discount));discount=Math.min(discount,d.subtotal);
 res.json({code:c.code,discount:money(discount)});
}));
router.post('/orders',auth,asyncRoute(async(req,res)=>{
 const d=z.object({address_id:z.number().int(),payment_method:z.enum(['COD','BKASH','NAGAD','SSLCOMMERZ']),coupon_code:z.string().optional(),delivery_notes:z.string().max(500).optional()}).parse(req.body);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const a=await client.query('SELECT id FROM addresses WHERE id=$1 AND user_id=$2',[d.address_id,req.user.id]);
  if(!a.rows[0]){await client.query('ROLLBACK');return res.status(400).json({message:'Select a valid delivery address'});}
  const cart=await client.query(`SELECT ci.food_id,ci.quantity,f.name,f.price FROM carts c JOIN cart_items ci ON ci.cart_id=c.id JOIN foods f ON f.id=ci.food_id WHERE c.user_id=$1 AND f.is_available FOR UPDATE OF ci`,[req.user.id]);
  if(!cart.rows.length){await client.query('ROLLBACK');return res.status(400).json({message:'Your cart is empty'});}
  const subtotal=money(cart.rows.reduce((s,x)=>s+Number(x.price)*x.quantity,0));
  let discount=0,coupon=null;
  if(d.coupon_code){
   const cr=await client.query(`SELECT * FROM coupons WHERE code=upper($1) AND is_active AND (expires_at IS NULL OR expires_at>NOW()) AND (usage_limit IS NULL OR used_count<usage_limit) AND min_order<=$2 FOR UPDATE`,[d.coupon_code,subtotal]);
   if(!cr.rows[0]){await client.query('ROLLBACK');return res.status(400).json({message:'Coupon is invalid'});}
   coupon=cr.rows[0];discount=coupon.discount_type==='percent'?subtotal*Number(coupon.discount_value)/100:Number(coupon.discount_value);
   if(coupon.max_discount)discount=Math.min(discount,Number(coupon.max_discount));discount=money(Math.min(discount,subtotal));
  }
  const fee=60,total=money(subtotal-discount+fee);
  const status='Pending';
  const o=await client.query(`INSERT INTO ordersu(user_id,address_id,subtotal,discount,delivery_fee,total,coupon_code,payment_method,payment_status,delivery_notes)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,'Pending',$9) RETURNING *`,
  [req.user.id,d.address_id,subtotal,discount,fee,total,coupon?.code||null,d.payment_method,d.delivery_notes||null]);
  for(const item of cart.rows)await client.query(`INSERT INTO order_items(order_id,food_id,food_name,unit_price,quantity,line_total)
  VALUES($1,$2,$3,$4,$5,$6)`,[o.rows[0].id,item.food_id,item.name,item.price,item.quantity,money(Number(item.price)*item.quantity)]);
  if(coupon)await client.query('UPDATE coupons SET used_count=used_count+1 WHERE id=$1',[coupon.id]);
  await client.query('DELETE FROM cart_items WHERE cart_id=(SELECT id FROM carts WHERE user_id=$1)',[req.user.id]);
  await client.query('COMMIT');
  res.status(201).json({order:o.rows[0],message:'Order placed. Payment remains pending until verified.'});
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}));
router.get('/orders/mine',auth,asyncRoute(async(req,res)=>{
 const {rows}=await pool.query('SELECT * FROM ordersu WHERE user_id=$1 ORDER BY created_at DESC',[req.user.id]);res.json({orders:rows});
}));
router.get('/orders/:id',auth,asyncRoute(async(req,res)=>{
 const q=await pool.query('SELECT * FROM ordersu WHERE id=$1 AND ($2::bigint IS NULL OR user_id=$2)',[req.params.id,req.user.role==='admin'?null:req.user.id]);
 if(!q.rows[0])return res.status(404).json({message:'Order not found'});
 const items=await pool.query('SELECT * FROM order_items WHERE order_id=$1',[req.params.id]);res.json({order:q.rows[0],items:items.rows});
}));
router.get('/admin/orders',auth,adminOnly,asyncRoute(async(req,res)=>{const {rows}=await pool.query('SELECT o.*,u.name customer_name,u.phone FROM ordersu o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC');res.json({orders:rows});}));
router.patch('/admin/orders/:id/status',auth,adminOnly,asyncRoute(async(req,res)=>{
 const allowed=['Pending','Confirmed','Preparing','Ready for Pickup','Out for Delivery','Delivered','Cancelled'];
 const status=z.enum(allowed).parse(req.body.status);
 const {rows}=await pool.query('UPDATE ordersu SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *',[status,req.params.id]);
 if(!rows[0])return res.status(404).json({message:'Order not found'});res.json({order:rows[0]});
}));
router.get('/admin/overview',auth,adminOnly,asyncRoute(async(req,res)=>{
 const q=await pool.query(`SELECT (SELECT COUNT(*) FROM users WHERE role='customer') users,
 (SELECT COUNT(*) FROM restaurants) restaurants,(SELECT COUNT(*) FROM foods) foods,
 (SELECT COUNT(*) FROM ordersu) orders,(SELECT COALESCE(SUM(total),0) FROM ordersu WHERE payment_status='Paid' OR payment_method='COD' AND status='Delivered') revenue`);
 res.json({overview:q.rows[0]});
}));
router.get('/admin/customers',auth,adminOnly,asyncRoute(async(req,res)=>{const {rows}=await pool.query("SELECT id,name,email,phone,is_active,created_at FROM users WHERE role='customer' ORDER BY created_at DESC");res.json({customers:rows});}));
router.post('/admin/coupons',auth,adminOnly,asyncRoute(async(req,res)=>{
 const d=z.object({code:z.string().min(3),discount_type:z.enum(['percent','fixed']),discount_value:z.number().positive(),min_order:z.number().nonnegative().optional(),max_discount:z.number().positive().optional(),usage_limit:z.number().int().positive().optional(),expires_at:z.string().datetime().optional()}).parse(req.body);
 const {rows}=await pool.query(`INSERT INTO coupons(code,discount_type,discount_value,min_order,max_discount,usage_limit,expires_at)
 VALUES(upper($1),$2,$3,$4,$5,$6,$7) RETURNING *`,[d.code,d.discount_type,d.discount_value,d.min_order||0,d.max_discount||null,d.usage_limit||null,d.expires_at||null]);res.status(201).json({coupon:rows[0]});
}));
router.post('/reviews',auth,asyncRoute(async(req,res)=>{
 const d=z.object({food_id:z.number().int(),rating:z.number().int().min(1).max(5),comment:z.string().max(1000).optional(),order_id:z.number().int().optional()}).parse(req.body);
 const {rows}=await pool.query(`INSERT INTO reviews(user_id,food_id,rating,comment,order_id)
 VALUES($1,$2,$3,$4,$5) RETURNING *`,[req.user.id,d.food_id,d.rating,d.comment||null,d.order_id||null]);res.status(201).json({review:rows[0]});
}));
router.get('/foods/:id/reviews',asyncRoute(async(req,res)=>{const {rows}=await pool.query('SELECT r.*,u.name customer_name FROM reviews r JOIN users u ON u.id=r.user_id WHERE food_id=$1 ORDER BY created_at DESC',[req.params.id]);res.json({reviews:rows});}));
router.get('/favorites',auth,asyncRoute(async(req,res)=>{const {rows}=await pool.query('SELECT f.* FROM favorites v JOIN foods f ON f.id=v.food_id WHERE v.user_id=$1',[req.user.id]);res.json({foods:rows});}));
router.post('/favorites/:foodId',auth,asyncRoute(async(req,res)=>{await pool.query('INSERT INTO favorites(user_id,food_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.user.id,req.params.foodId]);res.json({message:'Added to favorites'});}));
router.delete('/favorites/:foodId',auth,asyncRoute(async(req,res)=>{await pool.query('DELETE FROM favorites WHERE user_id=$1 AND food_id=$2',[req.user.id,req.params.foodId]);res.json({message:'Removed from favorites'});}));
router.post('/payments/:orderId/initialize',auth,asyncRoute(async(req,res)=>{
 const {rows}=await pool.query('SELECT * FROM ordersu WHERE id=$1 AND user_id=$2',[req.params.orderId,req.user.id]);
 if(!rows[0])return res.status(404).json({message:'Order not found'});
 if(rows[0].payment_method==='COD')return res.status(400).json({message:'Cash on Delivery does not require gateway initialization'});
 return res.status(501).json({message:'Online payment is not enabled. Configure official merchant credentials and implement verified provider callbacks before enabling this endpoint.'});
}));
export default router;
